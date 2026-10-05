import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { BackupsService } from './backups.service';
import { databaseEnvironment, runTool, scheduleWindow } from './backup-model';

async function fixture(extra: Record<string, unknown> = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'stock-backup-test-'));
  const service = new BackupsService(new ConfigService({ DATABASE_URL: 'postgresql://user:secret@127.0.0.1:1/absent', BACKUP_DIRECTORY: directory, BACKUP_AUTO_ENABLED: false, ...extra }));
  await service.onModuleInit();
  return { service, directory, close: async () => { await service.onModuleDestroy(); await rm(directory, { recursive: true, force: true }); } };
}
async function settled(service: BackupsService) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const result = await service.list();
    if (!result.inProgress) return result;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Backup did not settle');
}

test('credentials remain out of arguments, process secrets and errors', async () => {
  const env = databaseEnvironment('postgresql://name%40test:p%40ss%2Fword@127.0.0.1:5540/test?schema=public&sslmode=require&channel_binding=require');
  assert.equal(env.PGUSER, 'name@test'); assert.equal(env.PGPASSWORD, 'p@ss/word');
  assert.equal(env.PGSSLMODE, 'require'); assert.equal(env.PGCHANNELBINDING, 'require');
  assert.equal(env.JWT_SECRET, undefined); assert.equal(env.DATABASE_URL, undefined);
  await assert.rejects(runTool('/missing/pg_dump', [], env, 1000), /TOOL_UNAVAILABLE/);
});

test('monthly/weekly scheduling respects Fortaleza time, rollover and missed runs', () => {
  const monthly = { enabled: true, frequency: 'MONTHLY' as const, weekday: 1, hour: '02:00' };
  assert.equal(scheduleWindow(new Date('2026-11-01T04:59:00Z'), 'America/Fortaleza', monthly).due, false);
  assert.deepEqual(scheduleWindow(new Date('2026-11-01T05:00:00Z'), 'America/Fortaleza', monthly), { due: true, period: 'MONTHLY:2026-11' });
  assert.equal(scheduleWindow(new Date('2026-11-05T04:00:00Z'), 'America/Fortaleza', monthly).due, true);
  const weekly = { ...monthly, frequency: 'WEEKLY' as const };
  assert.deepEqual(scheduleWindow(new Date('2026-10-05T05:00:00Z'), 'America/Fortaleza', weekly), { due: true, period: 'WEEKLY:2026-10-05' });
  assert.equal(scheduleWindow(new Date('2026-10-05T04:59:00Z'), 'America/Fortaleza', weekly).due, false);
  assert.equal(scheduleWindow(new Date('2027-01-03T15:00:00Z'), 'America/Fortaleza', weekly).period, 'WEEKLY:2026-12-28');
});

test('hung tool is terminated without exposing its arguments or stderr', async () => {
  await assert.rejects(runTool(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { PATH: process.env.PATH }, 50), /TIMEOUT/);
});

test('failed dump never becomes downloadable and refuses overlapping jobs', async () => {
  const fixtureData = await fixture({ BACKUP_PG_DUMP_PATH: '/missing/pg_dump' });
  const { service, directory } = fixtureData;
  try {
    const first = await service.create('Administrador');
    await assert.rejects(service.create('Outro administrador'), /andamento/);
    const result = await settled(service);
    assert.equal(result.items[0].status, 'FAILED');
    assert.doesNotMatch(JSON.stringify(result), /secret|postgresql:\/\//);
    assert.equal((await readdir(directory)).some(name => name.endsWith('.partial') || name.endsWith('.dump')), false);
    await assert.rejects(service.download(first.id), /disponível/);
    await assert.rejects(service.download('../../.env'));
  } finally { await fixtureData.close(); }
});

test('administrator schedule persists across service restart', async () => {
  const fixtureData = await fixture();
  try {
    const schedule = { enabled: false, frequency: 'WEEKLY' as const, weekday: 5, hour: '19:30' };
    await fixtureData.service.updateSchedule(schedule);
    await fixtureData.service.onModuleDestroy();
    const second = new BackupsService(new ConfigService({ DATABASE_URL: 'postgresql://local:local@localhost/test', BACKUP_DIRECTORY: fixtureData.directory }));
    await second.onModuleInit();
    assert.deepEqual((await second.list()).schedule, schedule);
    await second.onModuleDestroy();
    assert.equal((await readFile(join(fixtureData.directory, 'schedule.json'), 'utf8')).includes('local'), false);
  } finally { await fixtureData.close(); }
});

test('failed automatic period waits an hour before retrying', async () => {
  const fixtureData = await fixture({ BACKUP_PG_DUMP_PATH: '/missing/pg_dump' });
  try {
    await fixtureData.service.updateSchedule({ enabled: true, frequency: 'MONTHLY', weekday: 1, hour: '00:00' });
    await fixtureData.service.tick();
    await settled(fixtureData.service);
    await fixtureData.service.tick();
    assert.equal((await fixtureData.service.list()).total, 1);
  } finally { await fixtureData.close(); }
});

test('crashed worker is marked failed and its partial file is removed on restart', async () => {
  const fixtureData = await fixture();
  try {
    await fixtureData.service.onModuleDestroy();
    const id = '566d7ca3-903f-47b5-a0e1-9e28d667a286';
    await writeFile(join(fixtureData.directory, `${id}.json`), JSON.stringify({ id, source: 'MANUAL', status: 'RUNNING', startedAt: new Date().toISOString(), finishedAt: null, author: 'Teste', period: null, bytes: 0, sha256: '', error: null }));
    await writeFile(join(fixtureData.directory, `${id}.partial`), 'incomplete');
    await mkdir(join(fixtureData.directory, '.lock'));
    await writeFile(join(fixtureData.directory, '.lock', 'owner.json'), JSON.stringify({ pid: 2147483647, host: hostname() }));
    const second = new BackupsService(new ConfigService({ DATABASE_URL: 'postgresql://local:local@localhost/test', BACKUP_DIRECTORY: fixtureData.directory, BACKUP_AUTO_ENABLED: false }));
    await second.onModuleInit();
    assert.equal((await second.list()).items[0].status, 'FAILED');
    assert.equal((await readdir(fixtureData.directory)).includes(`${id}.partial`), false);
    await second.onModuleDestroy();
  } finally { await fixtureData.close(); }
});
