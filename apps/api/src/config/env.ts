import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().startsWith('postgresql://'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WEB_ORIGIN: z.url().refine((value) => {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
  }, 'WEB_ORIGIN deve ser uma origem HTTP(S) sem caminho ou barra final.'),
  JWT_SECRET: z.string().trim().min(32, 'JWT_SECRET deve conter ao menos 32 caracteres.'),
  BACKUP_DIRECTORY: z.string().min(1).default('../../var/backups'),
  BACKUP_DATABASE_URL: z.string().startsWith('postgresql://').optional(),
  DIRECT_URL: z.string().startsWith('postgresql://').optional(),
  BACKUP_PG_DUMP_PATH: z.string().min(1).default('pg_dump'),
  BACKUP_PG_RESTORE_PATH: z.string().min(1).default('pg_restore'),
  BACKUP_AUTO_ENABLED: z.enum(['true', 'false']).default('true').transform(value => value === 'true'),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().min(31).max(3650).default(365),
  BACKUP_TIMEOUT_SECONDS: z.coerce.number().int().min(10).max(86400).default(1800),
  BACKUP_HOUR: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('02:00'),
  BACKUP_TIME_ZONE: z.string().refine(value => {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
  }, 'Use um fuso horário IANA válido.').default('America/Fortaleza'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
});

export function validateEnv(input: Record<string, unknown>) {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Configuração inválida: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}
