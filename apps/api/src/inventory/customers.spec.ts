import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID, randomBytes } from 'node:crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { InventoryModule } from './inventory.module';
import { InventoryService } from './inventory.service';
import { Client } from 'pg';
import { PrismaService } from '../prisma/prisma.service';
import { configureAuthHttp } from '../auth/auth.http';
import { HttpExceptionFilter } from '../common/http-exception.filter';
import type { CustomerRecord, MovementRecord, Page } from '@stock/shared';

const testUrl = process.env.TEST_CUSTOMERS_DATABASE_URL;
test('customers and audited sales: real HTTP, PostgreSQL and retry safety', { skip: !testUrl, timeout: 90_000 }, async t => {
  const url = new URL(testUrl!);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname.endsWith('_stock_test'));
  assert.notEqual(testUrl, process.env.DATABASE_URL);
  const db = new PrismaService(new ConfigService({ DATABASE_URL: testUrl }));
  const origin = 'http://localhost:5173', tag = randomUUID();
  const admin = await db.user.create({ data: { name: 'QA gerente', email: tag + '@example.test', passwordHash: 'fixture', role: 'MANAGER' } });
  const operator = await db.user.create({ data: { name: 'QA operador', email: tag + '-op@example.test', passwordHash: 'fixture', role: 'OPERATOR' } });
  const category = await db.category.create({ data: { name: tag } });
  const module = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ DATABASE_URL: testUrl, JWT_SECRET: randomBytes(32).toString('hex'), WEB_ORIGIN: origin, NODE_ENV: 'test' })] }), InventoryModule] }).overrideProvider(PrismaService).useValue(db).compile();
  const app = module.createNestApplication({ logger: false }); app.setGlobalPrefix('api'); configureAuthHttp(app, app.get(ConfigService)); app.useGlobalFilters(new HttpExceptionFilter());
  try {
    await app.listen(0, '127.0.0.1'); const base = await app.getUrl() + '/api';
    const tokens = await Promise.all([admin, operator].map(user => app.get(JwtService).signAsync({ sub: user.id })));
    const request = (path: string, body?: unknown, method = body ? 'POST' : 'GET', role = 0, requestOrigin = origin) => fetch(base + path, { method, headers: { Origin: requestOrigin, 'Content-Type': 'application/json', Cookie: role < 0 ? '' : 'stock_session=' + tokens[role] }, ...(body ? { body: JSON.stringify(body) } : {}) });
    let customer: CustomerRecord, movement: MovementRecord;
    const productResponse = await request('/products', { name: 'Produto QA clientes', sku: tag, categoryId: category.id, unit: 'KG', minimumStock: '1', initialEntry: { quantity: '100' } });
    assert.equal(productResponse.status, 201); const product = await productResponse.json() as { id: string };
    const sale = { productId: product.id, type: 'EXIT', reason: 'SALE', quantity: '1.125', buyerIdentification: 'IDENTIFIED', requestId: randomUUID() };
    await t.test('operators create/search; only managers update; authentication, origin and fields guarded', async () => {
      assert.equal((await request('/customers', undefined, 'GET', -1)).status, 401);
      assert.equal((await request('/customers', { name: 'Cliente' }, 'POST', 1, 'https://wrong.example')).status, 403);
      assert.equal((await request('/customers', { name: '   ' })).status, 400);
      assert.equal((await request('/customers', { name: 'Cliente', document: 'secret' })).status, 400);
      const created = await request('/customers', { name: 'Comprador QA ' + tag }, 'POST', 1); assert.equal(created.status, 201); customer = await created.json() as CustomerRecord;
      assert.match(customer.code, /^CLI-[A-F0-9]{12}$/);
      const duplicateName = await request('/customers', { name: customer.name }); assert.equal(duplicateName.status, 201); assert.notEqual((await duplicateName.json() as CustomerRecord).code, customer.code);
      assert.equal((await request('/customers/' + customer.id, { active: false }, 'PATCH', 1)).status, 403);
      assert.equal((await request('/customers/' + customer.id, { active: null }, 'PATCH')).status, 400);
      const found = await (await request('/customers?search=' + customer.code)).json() as Page<CustomerRecord>; assert.equal(found.items[0].id, customer.id);
      assert.equal((await request('/customers?page=0')).status, 400);
    });
    await t.test('explicit buyer, movement compatibility, snapshots cannot be forged', async () => {
      assert.equal((await request('/stock-movements', { ...sale, customerId: customer.id, buyerIdentification: undefined })).status, 400);
      assert.equal((await request('/stock-movements', { ...sale, customerId: customer.id, requestId: undefined })).status, 400);
      assert.equal((await request('/stock-movements', { ...sale, type: 'ENTRY', customerId: customer.id })).status, 400);
      assert.equal((await request('/stock-movements', { ...sale, reason: 'LOSS', customerId: customer.id })).status, 400);
      assert.equal((await request('/stock-movements', { ...sale, customerId: customer.id, customerNameSnapshot: 'Forged' })).status, 400);
      assert.equal((await request('/stock-movements', { ...sale, buyerIdentification: 'ANONYMOUS', customerId: customer.id })).status, 400);
      const response = await request('/stock-movements', { ...sale, customerId: customer.id }); assert.equal(response.status, 201); movement = await response.json() as MovementRecord;
      assert.equal(movement.customerNameSnapshot, customer.name); assert.equal(movement.customerCodeSnapshot, customer.code); assert.equal(movement.resultingStock, '98.875');
    });
    await t.test('concurrent/retried request has one movement and rejects changed payload', async () => {
      const body = { ...sale, customerId: customer.id, quantity: '0.1', requestId: randomUUID() };
      const responses = await Promise.all([request('/stock-movements', body), request('/stock-movements', body)]);
      assert.deepEqual(responses.map(response => response.status), [201, 201]);
      const items = await Promise.all(responses.map(response => response.json() as Promise<MovementRecord>)); assert.equal(items[0].id, items[1].id);
      assert.equal(await db.stockMovement.count({ where: { userId: admin.id, requestId: body.requestId } }), 1);
      assert.equal((await request('/stock-movements', { ...body, quantity: '0.2' })).status, 409);
    });
    await t.test('rename/inactivation preserve snapshots; replay remains valid; new sale rejected', async () => {
      assert.equal((await request('/customers/' + customer.id, { name: 'Nome atual alterado', active: false }, 'PATCH')).status, 200);
      const old = await (await request('/stock-movements/' + movement.id)).json() as MovementRecord; assert.equal(old.customerNameSnapshot, customer.name);
      const replay = await request('/stock-movements', { ...sale, customerId: customer.id }); assert.equal(replay.status, 201); assert.equal((await replay.json() as MovementRecord).id, movement.id);
      assert.equal((await request('/stock-movements', { ...sale, customerId: customer.id, requestId: randomUUID() })).status, 400);
      const active = await (await request('/customers?search=' + customer.code)).json() as Page<CustomerRecord>; assert.equal(active.total, 0);
      const history = await (await request('/stock-movements?customerId=' + customer.id)).json() as Page<MovementRecord>; assert.equal(history.total, 2);
    });
    await t.test('anonymous explicit, oversell rollback, legacy and database consistency', async () => {
      const anon = await request('/stock-movements', { ...sale, buyerIdentification: 'ANONYMOUS', requestId: randomUUID() }); assert.equal(anon.status, 201); assert.equal((await anon.json() as MovementRecord).customerId, null);
      const before = await db.product.findUniqueOrThrow({ where: { id: product.id } });
      assert.equal((await request('/stock-movements', { ...sale, buyerIdentification: 'ANONYMOUS', quantity: '999', requestId: randomUUID() })).status, 409);
      assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock.toString(), before.stock.toString());
      const legacy = await db.$transaction(tx => app.get(InventoryService).moveInTransaction(tx, { productId: product.id, type: 'EXIT', reason: 'SALE', quantity: '1' }, admin.id)); assert.equal(legacy.buyerIdentification, null);
      await assert.rejects(db.stockMovement.create({ data: { userId: admin.id, productId: product.id, type: 'ENTRY', reason: 'PURCHASE', quantity: '1', previousStock: '1', resultingStock: '2', customerId: customer.id } }));
      await assert.rejects(db.customer.delete({ where: { id: customer.id } }));
    });
    await t.test('inactivation and sale serialize on customer lock; non-sale retry is safe too', async () => {
      const fresh = await (await request('/customers', { name: 'Cliente concorrência ' + tag })).json() as CustomerRecord;
      const blocker = new Client({ connectionString: testUrl }); await blocker.connect();
      try {
        await blocker.query('BEGIN'); await blocker.query('SELECT id FROM "Customer" WHERE id=$1::uuid FOR UPDATE', [fresh.id]);
        const waitForLocks = async (count: number) => {
          for (let attempt = 0; attempt < 100; attempt++) {
            await blocker.query('SELECT pg_stat_clear_snapshot()');
            const result = await blocker.query("SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%Customer%' AND pid<>pg_backend_pid()");
            if (result.rows[0].count >= count) return;
            await new Promise(resolve => setTimeout(resolve, 20));
          }
          assert.fail('Expected customer row-lock contention');
        };
        const patch = request('/customers/' + fresh.id, { active: false }, 'PATCH'); await waitForLocks(1);
        const exit = request('/stock-movements', { ...sale, customerId: fresh.id, requestId: randomUUID() }); await waitForLocks(2);
        await blocker.query('COMMIT'); assert.equal((await patch).status, 200); assert.equal((await exit).status, 400);
        assert.equal(await db.stockMovement.count({ where: { customerId: fresh.id } }), 0);
      } finally { await blocker.query('ROLLBACK'); await blocker.end(); }
      const entry = { productId: product.id, type: 'ENTRY', reason: 'PURCHASE', quantity: '0.125', requestId: randomUUID() };
      const first = await (await request('/stock-movements', entry)).json() as MovementRecord;
      const replay = await (await request('/stock-movements', entry)).json() as MovementRecord; assert.equal(first.id, replay.id);
    });
  } finally { await app.close(); await db.$disconnect(); }
});
