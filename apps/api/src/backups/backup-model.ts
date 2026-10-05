import { spawn } from 'node:child_process';
import { z } from 'zod';

export const scheduleSchema = z.object({
  enabled: z.boolean(), frequency: z.enum(['WEEKLY', 'MONTHLY']),
  weekday: z.number().int().min(0).max(6), hour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
export type BackupSchedule = z.infer<typeof scheduleSchema>;
export const recordSchema = z.object({
  id: z.string().uuid(), status: z.enum(['RUNNING', 'READY', 'FAILED']),
  source: z.enum(['MANUAL', 'AUTOMATIC']), startedAt: z.string().datetime(), finishedAt: z.string().datetime().nullable(),
  author: z.string(), period: z.string().nullable(), bytes: z.number().nonnegative(), sha256: z.string(),
  error: z.string().nullable(),
});
export type BackupRecord = z.infer<typeof recordSchema>;
export const backupIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// libpq credentials travel in the child environment, never in argv or output.
export function databaseEnvironment(connection: string): NodeJS.ProcessEnv {
  const url = new URL(connection);
  if (url.protocol !== 'postgresql:' || !url.hostname || !url.pathname.slice(1)) throw new Error('INVALID_DATABASE');
  const env: NodeJS.ProcessEnv = {};
  for (const key of ['PATH', 'SystemRoot', 'TMPDIR', 'TEMP', 'LANG', 'LC_ALL']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  Object.assign(env, {
    PGHOST: url.hostname.replace(/^\[|\]$/g, ''), PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGCONNECT_TIMEOUT: '15',
  });
  for (const [parameter, variable] of [['sslmode', 'PGSSLMODE'], ['channel_binding', 'PGCHANNELBINDING'], ['sslrootcert', 'PGSSLROOTCERT']] as const) {
    const value = url.searchParams.get(parameter);
    if (value) env[variable] = value;
  }
  return env;
}

export function runTool(binary: string, args: string[], env: NodeJS.ProcessEnv, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // stderr can contain database credentials; it is deliberately not logged or returned.
    const child = spawn(binary, args, { env, stdio: 'ignore', shell: false });
    let expired = false;
    const timer = setTimeout(() => { expired = true; child.kill('SIGKILL'); }, timeoutMs);
    child.once('error', () => { clearTimeout(timer); reject(new Error('TOOL_UNAVAILABLE')); });
    child.once('close', code => {
      clearTimeout(timer);
      if (expired) reject(new Error('TIMEOUT'));
      else if (code !== 0) reject(new Error('TOOL_FAILED'));
      else resolve();
    });
  });
}

export function scheduleWindow(now: Date, timeZone: string, schedule: BackupSchedule) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  const [hours, minutes] = schedule.hour.split(':').map(Number);
  const minuteOfDay = Number(parts.hour) * 60 + Number(parts.minute);
  if (schedule.frequency === 'WEEKLY') {
    const elapsed = (date.getUTCDay() - schedule.weekday + 7) % 7;
    date.setUTCDate(date.getUTCDate() - elapsed);
    return { period: `WEEKLY:${date.toISOString().slice(0, 10)}`, due: elapsed > 0 || minuteOfDay >= hours * 60 + minutes };
  }
  return { period: `MONTHLY:${parts.year}-${parts.month}`, due: Number(parts.day) > 1 || minuteOfDay >= hours * 60 + minutes };
}
