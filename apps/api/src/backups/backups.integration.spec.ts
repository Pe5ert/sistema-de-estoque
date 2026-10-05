import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import { BackupsModule } from './backups.module';
import { BackupsService } from './backups.service';
import { databaseEnvironment, runTool } from './backup-model';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { configureAuthHttp } from '../auth/auth.http';
import { HttpExceptionFilter } from '../common/http-exception.filter';
import { UserRole } from '../generated/prisma/client';

const sourceUrl = process.env.TEST_BACKUP_DATABASE_URL;
const targetUrl = process.env.TEST_BACKUP_RESTORE_URL;

test('real PostgreSQL: ADMIN HTTP backup, complete restore, integrity, schedule and retention', { skip: !sourceUrl || !targetUrl, timeout: 90_000 }, async () => {
  // Never accept the application's DATABASE_URL or a remote/shared database for this destructive fixture.
  for (const [connection, suffix] of [[sourceUrl!, '_backup_test'], [targetUrl!, '_backup_restore_test']]) {
    const url = new URL(connection);
    assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
    assert.ok(url.pathname.endsWith(suffix));
  }
  assert.notEqual(sourceUrl, targetUrl);
  const directory = await mkdtemp(join(tmpdir(), 'stock-backup-real-'));
  const source = new Client({ connectionString: sourceUrl });
  const target = new Client({ connectionString: targetUrl });
  await Promise.all([source.connect(), target.connect()]);
  const account = { id: randomUUID(), name: 'Administrador QA', email: 'backup@qa.local', role: UserRole.ADMIN as UserRole, active: true };
  const origin = 'http://localhost:5173';
  const module = await Test.createTestingModule({
    imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({
      JWT_SECRET: randomBytes(32).toString('hex'), NODE_ENV: 'test', WEB_ORIGIN: origin,
      DATABASE_URL: sourceUrl, BACKUP_DATABASE_URL: sourceUrl, DIRECT_URL: undefined,
      BACKUP_DIRECTORY: directory, BACKUP_AUTO_ENABLED: false, BACKUP_RETENTION_DAYS: 365,
      BACKUP_PG_DUMP_PATH: process.env.TEST_PG_DUMP_PATH || 'pg_dump', BACKUP_PG_RESTORE_PATH: process.env.TEST_PG_RESTORE_PATH || 'pg_restore',
    })] }), PrismaModule, BackupsModule],
  }).overrideProvider(PrismaService).useValue({ user: { findUnique: async () => ({ ...account }) } }).compile();
  const app = module.createNestApplication({ logger: false });
  const service = app.get(BackupsService);
  app.setGlobalPrefix('api'); configureAuthHttp(app, app.get(ConfigService)); app.useGlobalFilters(new HttpExceptionFilter());
  try {
    await source.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
    await target.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
    for (const migration of ['20260930000000_init', '20261002000000_operational_inventory']) {
      await source.query(await readFile(join(process.cwd(), 'prisma/migrations', migration, 'migration.sql'), 'utf8'));
    }
    const category = randomUUID(), product = randomUUID();
    await source.query('INSERT INTO "User" (id,name,email,"passwordHash",role,"updatedAt") VALUES ($1,$2,$3,$4,$5,now())', [account.id, account.name, account.email, 'fixture-password-hash', 'ADMIN']);
    await source.query('INSERT INTO "Category" (id,name,"updatedAt") VALUES ($1,$2,now())', [category, 'Categoria QA']);
    await source.query('INSERT INTO "Product" (id,sku,name,"categoryId","stock","minimumStock","costPrice","salePrice","imageUrl","updatedAt") VALUES ($1,$2,$3,$4,80.125,10.001,12.34,NULL,$5,now())', [product, 'QA-BACKUP', 'Produto íntegro', category, 'https://example.test/product.png']);
    await source.query('INSERT INTO "StockMovement" (id,"productId","userId",type,quantity,"previousStock","resultingStock",reason) VALUES ($1,$2,$3,$4,80.125,0,80.125,$5)', [randomUUID(), product, account.id, 'ENTRY', 'INITIAL_STOCK']);
    await app.listen(0, '127.0.0.1');
    const base = `${await app.getUrl()}/api/backups`;
    const token = await app.get(JwtService).signAsync({ sub: account.id });
    const request = (path = '', options: RequestInit = {}) => fetch(`${base}${path}`, { ...options, headers: { Cookie: `stock_session=${token}`, Origin: origin, 'Content-Type': 'application/json', ...options.headers } });
    assert.equal((await fetch(base)).status, 401);
    for (const role of [UserRole.OPERATOR, UserRole.MANAGER]) {
      account.role = role;
      assert.equal((await request()).status, 403);
      assert.equal((await request('', { method: 'POST' })).status, 403);
      assert.equal((await request('/schedule', { method: 'PATCH', body: JSON.stringify({ enabled: true, frequency: 'WEEKLY', weekday: 1, hour: '02:00' }) })).status, 403);
      assert.equal((await request(`/${randomUUID()}/download`)).status, 403);
    }
    account.role = UserRole.ADMIN;
    assert.equal((await request('', { method: 'POST', headers: { Origin: 'https://attacker.test' } })).status, 403);
    assert.equal((await request('/schedule', { method: 'PATCH', body: JSON.stringify({ enabled: true, frequency: 'DAILY', weekday: 9, hour: '25:00' }) })).status, 400);
    const valid = { enabled: false, frequency: 'WEEKLY', weekday: 3, hour: '03:45' };
    assert.equal((await request('/schedule', { method: 'PATCH', body: JSON.stringify(valid) })).status, 200);
    assert.deepEqual((await (await request()).json() as { schedule: unknown }).schedule, valid);
    const response = await request('', { method: 'POST' });
    assert.equal(response.status, 202);
    const record = await response.json() as { id: string };
    assert.equal((await request('', { method: 'POST' })).status, 409);
    async function ready() {
      for (let attempt = 0; attempt < 200; attempt++) {
        const state = await service.list();
        if (!state.inProgress) return state;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error('Backup timeout');
    }
    const result = await ready();
    assert.equal(result.items[0].status, 'READY');
    assert.ok(result.items[0].bytes > 0);
    assert.match(result.items[0].sha256, /^[a-f0-9]{64}$/);
    const download = await request(`/${record.id}/download`);
    assert.equal(download.status, 200); assert.equal(download.headers.get('cache-control'), 'no-store');
    assert.match(download.headers.get('content-disposition')!, /attachment; filename="estoque-/);
    const binary = Buffer.from(await download.arrayBuffer());
    assert.equal(binary.subarray(0, 5).toString(), 'PGDMP');
    assert.equal(binary.length, result.items[0].bytes);
    const archive = join(directory, `${record.id}.dump`);
    // Change the live source after the snapshot: restore must retain the original product/audit.
    await source.query('UPDATE "Product" SET name=$1 WHERE id=$2', ['Alterado depois da cópia', product]);
    await runTool(process.env.TEST_PG_RESTORE_PATH || 'pg_restore', ['--no-owner', '--no-privileges', '--exit-on-error', '--single-transaction', '--dbname', databaseEnvironment(targetUrl!).PGDATABASE!, archive], databaseEnvironment(targetUrl!), 30_000);
    const restored = (await target.query('SELECT * FROM "Product" WHERE id=$1', [product])).rows[0];
    assert.equal(restored.name, 'Produto íntegro'); assert.equal(restored.stock, '80.125');
    assert.equal(restored.minimumStock, '10.001'); assert.equal(restored.costPrice, '12.34'); assert.equal(restored.salePrice, null);
    assert.equal((await target.query('SELECT "passwordHash" FROM "User" WHERE id=$1', [account.id])).rows[0].passwordHash, 'fixture-password-hash');
    assert.equal((await target.query('SELECT "resultingStock" FROM "StockMovement"')).rows[0].resultingStock, '80.125');
    assert.equal((await target.query('SELECT name FROM "Category"')).rows[0].name, 'Categoria QA');
    await assert.rejects(target.query('DELETE FROM "User" WHERE id=$1', [account.id]), /foreign key constraint/);
    // Retention removes an old record only when another real archive has completed.
    const manifest = join(directory, `${record.id}.json`);
    const old = JSON.parse(await readFile(manifest, 'utf8'));
    await writeFile(manifest, JSON.stringify({ ...old, startedAt: '2020-01-01T00:00:00.000Z' }));
    await service.updateSchedule({ enabled: true, frequency: 'MONTHLY', weekday: 1, hour: '00:00' });
    await service.tick();
    const automatic = await ready();
    assert.equal(automatic.total, 1); assert.equal(automatic.items[0].source, 'AUTOMATIC'); assert.equal(automatic.items[0].status, 'READY');
    await service.tick(); assert.equal((await service.list()).total, 1);
    await assert.rejects(readFile(archive));
    const newest = automatic.items[0];
    await writeFile(join(directory, `${newest.id}.dump`), 'tampered');
    assert.equal((await request(`/${newest.id}/download`)).status, 503);
    await service.updateSchedule({ enabled: false, frequency: 'MONTHLY', weekday: 1, hour: '02:00' });
  } finally {
    await app.close(); await Promise.all([source.end(), target.end()]); await rm(directory, { recursive: true, force: true });
  }
});
