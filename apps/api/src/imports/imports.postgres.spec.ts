import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { ImportsService } from './imports.service';
import { configureAuthHttp } from '../auth/auth.http';
import { HttpExceptionFilter } from '../common/http-exception.filter';

// Opt-in only: never load DATABASE_URL from a developer's .env for these writes.
const connection = process.env.TEST_IMPORT_DATABASE_URL;
test('PostgreSQL: atomic import, concurrency, revalidation, audit and authenticated HTTP', { skip: !connection }, async t => {
  const url = new URL(connection!);
  assert(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname.endsWith('_import_test'), 'Use a dedicated loopback database ending in _import_test.');
  const db = new PrismaService(new ConfigService({ DATABASE_URL: connection }));
  const prefix = randomUUID().slice(0, 8), categoryName = `QA-${prefix}`;
  const user = await db.user.create({ data: { name: 'Import QA', email: `${prefix}@example.local`, passwordHash: 'unused-test-hash', role: 'ADMIN' } });
  const category = await db.category.create({ data: { name: categoryName } });
  const inventory = new InventoryService(db), service = new ImportsService(db, inventory);
  const csv = (count: number, tag: string, name = categoryName) => Buffer.from('Nome;SKU;Código de barras;Categoria;Unidade;Estoque mínimo;Custo;Venda;Saldo inicial\n' + Array.from({ length: count }, (_, i) => `QA ${i};${prefix}-${tag}-${i};000${prefix}${tag}${i};${name};UN;2,5;19,90;;3,125`).join('\n'));
  try {
    for (const count of [10, 100, 1000]) await t.test(`${count} rows, concurrent confirm and refresh`, async () => {
      const job = await service.upload({ originalname: `${count}.csv`, buffer: csv(count, `n${count}`) }, user.id);
      assert.equal(job.issues.length, 0);
      const [first, repeated] = await Promise.all([service.confirm(job.id, user.id, { revision: job.revision }), service.confirm(job.id, user.id, { revision: job.revision })]);
      assert.equal(first.status, 'COMPLETED'); assert.deepEqual(first.result, repeated.result);
      const movements = await db.stockMovement.findMany({ where: { reference: job.id }, include: { product: true } });
      assert.equal(movements.length, count);
      for (const movement of movements) {
        assert.equal(movement.reason, 'INITIAL_STOCK'); assert.equal(movement.userId, user.id);
        assert.equal(movement.previousStock.toString(), '0'); assert.equal(movement.resultingStock.toString(), '3.125');
        assert.equal(movement.product.stock.toString(), '3.125'); assert.equal(movement.product.costPrice?.toString(), '19.9');
        assert(movement.product.barcode?.startsWith('000'));
      }
      assert.deepEqual((await new ImportsService(db, inventory).get(job.id, user.id)).result, first.result);
    });
    await t.test('real writes roll back categories, products and audit together', async () => {
      const newName = `${categoryName}-rollback`;
      const uploaded = await service.upload({ originalname: 'rollback.csv', buffer: csv(10, 'rollback', newName) }, user.id);
      const job = await service.setup(uploaded.id, user.id, { revision: uploaded.revision, mapping: uploaded.mapping, categoryMappings: [{ source: newName, action: 'create', name: newName }] });
      const original = inventory.createImportProducts.bind(inventory);
      inventory.createImportProducts = async (...args) => { await original(...args); throw new Error('Injected failure after all writes'); };
      try {
        assert.equal((await service.confirm(job.id, user.id, { revision: job.revision })).status, 'FAILED');
        assert.equal(await db.product.count({ where: { sku: { startsWith: `${prefix}-rollback` } } }), 0);
        assert.equal(await db.stockMovement.count({ where: { reference: job.id } }), 0);
        assert.equal(await db.category.count({ where: { name: newName } }), 0);
        assert.equal((await service.confirm(job.id, user.id, { revision: job.revision })).status, 'FAILED');
      } finally { inventory.createImportProducts = original; }
    });
    await t.test('category changed after preview blocks confirmation without writes', async () => {
      const job = await service.upload({ originalname: 'race.csv', buffer: csv(1, 'race') }, user.id);
      await db.category.update({ where: { id: category.id }, data: { active: false } });
      await assert.rejects(service.confirm(job.id, user.id, { revision: job.revision }), /Há erros/);
      assert.equal(await db.product.count({ where: { sku: `${prefix}-race-0` } }), 0);
      await db.category.update({ where: { id: category.id }, data: { active: true } });
    });
    await t.test('a code registered after preview is revalidated', async () => {
      const job = await service.upload({ originalname: 'duplicate.csv', buffer: csv(1, 'late') }, user.id);
      await db.product.create({ data: { name: 'Concurrent registration', sku: `${prefix}-late-0`, barcode: `000${prefix}late0`, categoryId: category.id } });
      await assert.rejects(service.confirm(job.id, user.id, { revision: job.revision }), /Há erros/);
      assert.equal(await db.stockMovement.count({ where: { reference: job.id } }), 0);
      const preview = await service.get(job.id, user.id);
      assert(preview.issues.some(issue => issue.field === 'sku'));
      assert(preview.issues.some(issue => issue.field === 'barcode'));
    });
    await t.test('database constraint is the final boundary when conflict occurs after validation', async () => {
      const job = await service.upload({ originalname: 'constraint.csv', buffer: csv(10, 'constraint') }, user.id);
      const original = inventory.createImportProducts.bind(inventory);
      inventory.createImportProducts = async (...args) => {
        await db.product.create({ data: { name: 'Concurrent registration', sku: `${prefix}-constraint-9`, categoryId: category.id } });
        return original(...args);
      };
      try {
        const result = await service.confirm(job.id, user.id, { revision: job.revision });
        assert.equal(result.status, 'FAILED'); assert.match(result.error!, /Outro cadastro/);
        assert.equal(await db.product.count({ where: { sku: { startsWith: `${prefix}-constraint-` } } }), 1);
        assert.equal(await db.stockMovement.count({ where: { reference: job.id } }), 0);
      } finally { inventory.createImportProducts = original; }
    });
    await t.test('HTTP: multipart, origin, current role, ownership, templates and repeat', async () => {
      Object.assign(process.env, { DATABASE_URL: connection, WEB_ORIGIN: 'http://localhost:5174', JWT_SECRET: 'isolated-import-test-secret-at-least-32-characters', BACKUP_AUTO_ENABLED: 'false', BACKUP_DIRECTORY: join(tmpdir(), `stock-import-http-${prefix}`), NODE_ENV: 'test' });
      const { AppModule } = await import('../app.module');
      const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
      const app = module.createNestApplication({ logger: false });
      app.setGlobalPrefix('api'); configureAuthHttp(app, app.get(ConfigService)); app.useGlobalFilters(new HttpExceptionFilter());
      await app.listen(0, '127.0.0.1');
      const base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}/api/imports`;
      const token = await app.get(JwtService).signAsync({ sub: user.id, role: 'ADMIN' });
      const headers = { Cookie: `stock_session=${token}`, Origin: 'http://localhost:5174' };
      try {
        assert.equal((await fetch(base)).status, 401);
        assert.equal((await fetch(base, { headers })).status, 200);
        const template = await fetch(base + '/template?format=xlsx', { headers });
        assert.equal(template.status, 200); assert.match(template.headers.get('content-disposition')!, /modelo-produtos.xlsx/);
        assert.equal((await fetch(base + '/template?format=exe', { headers })).status, 400);
        const body = () => { const form = new FormData(); form.append('file', new Blob([csv(10, 'http')]), 'http.csv'); return form; };
        assert.equal((await fetch(base, { method: 'POST', headers: { ...headers, Origin: 'https://untrusted.example' }, body: body() })).status, 403);
        const response = await fetch(base, { method: 'POST', headers, body: body() }); assert.equal(response.status, 201);
        const job = await response.json() as { id: string; revision: number; issues: unknown[] }; assert.equal(job.issues.length, 0);
        const confirm = () => fetch(base + '/' + job.id + '/confirm', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: job.revision }) });
        const results = await Promise.all([confirm(), confirm()]);
        for (const result of results) { assert.equal(result.status, 201); assert.equal((await result.json() as { status: string }).status, 'COMPLETED'); }
        assert.equal(await db.stockMovement.count({ where: { reference: job.id } }), 10);
        await db.user.update({ where: { id: user.id }, data: { role: 'OPERATOR' } });
        assert.equal((await fetch(base, { headers })).status, 403);
        await db.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
        const other = await db.user.create({ data: { name: 'Other QA', email: `${prefix}-other@example.local`, passwordHash: 'unused', role: 'MANAGER' } });
        const otherToken = await app.get(JwtService).signAsync({ sub: other.id });
        assert.equal((await fetch(base + '/' + job.id, { headers: { Cookie: `stock_session=${otherToken}` } })).status, 404);
      } finally { await app.close(); }
    });
  } finally { await db.$disconnect(); }
});
