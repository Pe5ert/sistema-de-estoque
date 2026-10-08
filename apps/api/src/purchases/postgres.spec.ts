import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { INestApplication } from '@nestjs/common';
import { configureAuthHttp } from '../auth/auth.http';
import { HttpExceptionFilter } from '../common/http-exception.filter';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { PurchasesModule } from './purchases.module';
import type { PurchaseRecord, ReceiptRecord, SupplierRecord } from '@stock/shared';
type ReceiptResult = { receipt: ReceiptRecord; repeated: boolean };

// Explicit opt-in, local dedicated database only. Retain the audit records;
// deactivate only this suite's UUID fixtures, never reset or touch shared Neon.
const url = process.env.TEST_PURCHASE_DATABASE_URL;
describe('real PostgreSQL purchase integrity and simultaneous receipts', { skip: !url, concurrency: false }, () => {
  let app: INestApplication, db: PrismaService, base: string;
  const tag = 'purchase-qa-' + randomUUID(), origin = 'http://localhost:5173';
  const managers = [randomUUID(), randomUUID()], operator = randomUUID(), categoryId = randomUUID();
  let cookies: string[], supplierId: string; const products: string[] = []; let created = false;
  before(async () => {
    const target = new URL(url!); assert(['127.0.0.1', 'localhost'].includes(target.hostname) && target.pathname.endsWith('_purchases_test'), 'Use a dedicated loopback database ending in _purchases_test'); assert.notEqual(url, process.env.DATABASE_URL);
    db = new PrismaService(new ConfigService({ DATABASE_URL: url }));
    const module = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ DATABASE_URL: url, JWT_SECRET: randomBytes(32).toString('hex'), WEB_ORIGIN: origin })] }), PurchasesModule] }).overrideProvider(PrismaService).useValue(db).compile();
    app = module.createNestApplication({ logger: false }); app.setGlobalPrefix('api'); configureAuthHttp(app, app.get(ConfigService)); app.useGlobalFilters(new HttpExceptionFilter()); await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api`;
    for (const [index, id] of [...managers, operator].entries()) await db.user.create({ data: { id, name: tag + index, email: tag + index + '@example.test', passwordHash: 'unused-test-hash', role: index === 2 ? 'OPERATOR' : 'MANAGER' } });
    await db.category.create({ data: { id: categoryId, name: tag } }); created = true;
    cookies = await Promise.all([...managers, operator].map(async id => 'stock_session=' + await app.get(JwtService).signAsync({ sub: id, role: 'ADMIN' })));
    const supplier = await send('/suppliers', { name: tag, document: '12345678901' }); assert.equal(supplier.status, 201); supplierId = (await supplier.json() as SupplierRecord).id;
  });
  after(async () => {
    try { if (created) { await db.product.updateMany({ where: { id: { in: products } }, data: { active: false } }); await db.supplier.update({ where: { id: supplierId }, data: { active: false, document: null } }); await db.category.update({ where: { id: categoryId }, data: { active: false } }); await db.user.updateMany({ where: { id: { in: [...managers, operator] } }, data: { active: false } }); } }
    finally { await app?.close(); await db?.$disconnect(); }
  });
  function send(path: string, body?: unknown, method = body ? 'POST' : 'GET', session = cookies?.[0]) { return fetch(base + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(session ? { Cookie: session } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
  async function product() { const id = randomUUID(); products.push(id); return db.product.create({ data: { id, categoryId, sku: tag + '-' + products.length, name: 'QA item ' + products.length, unit: 'KG', costPrice: '9.99', minimumStock: '2' } }); }
  async function order(productId: string, quantity = '100') { const response = await send('/purchase-orders', { supplierId, items: [{ productId, quantity, unitCost: '1.23' }] }); assert.equal(response.status, 201); return await response.json() as PurchaseRecord; }
  async function sent(productId: string, quantity = '100') { const draft = await order(productId, quantity); assert.equal((await send('/purchase-orders/' + draft.id + '/send', { revision: draft.revision })).status, 201); return await (await send('/purchase-orders/' + draft.id)).json() as PurchaseRecord; }
  async function stock(id: string) { return (await db.product.findUniqueOrThrow({ where: { id } })).stock.toString(); }
  async function competing(orderId: string, bodies: unknown[]) {
    const blocker = new Client({ connectionString: url }); await blocker.connect(); let pending: Promise<Response[]> | undefined, overlap = false;
    try {
      await blocker.query('BEGIN'); await blocker.query('SELECT "id" FROM "PurchaseOrder" WHERE "id"=$1::uuid FOR UPDATE', [orderId]);
      pending = Promise.all(bodies.map((body, index) => send('/purchase-orders/' + orderId + '/receipts', body, 'POST', cookies[index % 2])));
      const deadline = Date.now() + 4000;
      while (Date.now() < deadline) { const [{ waiting }] = await db.$queryRaw<{ waiting: bigint }[]>`SELECT count(*) AS waiting FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'`; if (Number(waiting) >= 2) { overlap = true; break; } await delay(10); }
    } finally { await blocker.query('ROLLBACK'); await blocker.end(); }
    const results = await pending!; assert(overlap, 'Two HTTP sessions must actually overlap on PostgreSQL locks'); return results;
  }
  test('supplier CRUD, format normalization, uniqueness, pagination and read-only operator', async () => {
    assert.equal((await send('/suppliers', { name: 'Duplicate', document: '123.456.789-01' })).status, 409);
    assert.equal((await send('/suppliers/' + supplierId, { contact: 'QA buyer' }, 'PATCH')).status, 200);
    const page = await (await send('/suppliers?search=' + tag + '&limit=1&page=1')).json() as { total: number; items: SupplierRecord[] }; assert.equal(page.total, 1); assert.equal(page.items[0].contact, 'QA buyer');
    assert.equal((await send('/suppliers', { name: 'Denied' }, 'POST', cookies[2])).status, 403);
    assert.equal((await send('/purchase-orders', { supplierId, items: [] }, 'POST', cookies[2])).status, 403);
  });
  test('draft revision, no stock on create/send, partial/full audit, decimal, retry after complete', async () => {
    const baseline = await (await send('/dashboard/summary')).json() as { units: string };
    const item = await product(), draft = await order(item.id, '1.125'); assert.equal(draft.total, '1.38'); assert.equal(await stock(item.id), '0');
    const data = { supplierId, revision: draft.revision, items: [{ productId: item.id, quantity: '1.125', unitCost: '1.23' }] };
    assert.equal((await send('/purchase-orders/' + draft.id, data, 'PATCH')).status, 200);
    assert.equal((await send('/purchase-orders/' + draft.id, data, 'PATCH')).status, 409);
    const saved = await (await send('/purchase-orders/' + draft.id)).json() as PurchaseRecord;
    assert.equal((await send('/purchase-orders/' + draft.id + '/send', { revision: saved.revision })).status, 201); assert.equal(await stock(item.id), '0');
    const body = { receiptId: randomUUID(), notes: 'Delivery A', items: [{ orderItemId: saved.items[0].id, quantity: '0.625' }] };
    const first = await send('/purchase-orders/' + draft.id + '/receipts', body); assert.equal(first.status, 201); const result = await first.json() as ReceiptResult;
    assert.equal(result.receipt.creator.id, managers[0]); assert.equal(result.receipt.items[0].movement.previousStock, '0'); assert.equal(result.receipt.items[0].movement.resultingStock, '0.625'); assert.equal(result.receipt.items[0].movement.reference, body.receiptId);
    assert.equal((await (await send('/purchase-orders/' + draft.id)).json() as PurchaseRecord).status, 'PARTIALLY_RECEIVED');
    assert.equal((await send('/purchase-orders/' + draft.id + '/receipts', { receiptId: randomUUID(), items: [{ orderItemId: saved.items[0].id, quantity: '0.501' }] })).status, 409);
    assert.equal((await send('/purchase-orders/' + draft.id + '/receipts', { receiptId: randomUUID(), items: [{ orderItemId: saved.items[0].id, quantity: '0.5' }] })).status, 201);
    assert.equal(await stock(item.id), '1.125'); assert.equal((await (await send('/purchase-orders/' + draft.id)).json() as PurchaseRecord).status, 'RECEIVED');
    assert.equal((await (await send('/purchase-orders/' + draft.id + '/receipts', body)).json() as ReceiptResult).repeated, true); assert.equal(await stock(item.id), '1.125');
    assert.equal((await send('/purchase-orders/' + draft.id + '/receipts', { ...body, notes: 'changed' })).status, 409);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: item.id } })).costPrice!.toString(), '9.99');
    const dashboard = await (await send('/dashboard/summary')).json() as { units: string; recent: { reference: string }[] }; assert(new Prisma.Decimal(dashboard.units).eq(new Prisma.Decimal(baseline.units).plus('1.125'))); assert(dashboard.recent.some(movement => movement.reference === body.receiptId));
    const movements = await (await send('/stock-movements?productId=' + item.id)).json() as { total: number }; assert.equal(movements.total, 2);
    const linked = await (await send('/stock-movements?reference=' + body.receiptId)).json() as { total: number }; assert.equal(linked.total, 1);
    assert.equal((await send('/purchase-orders/' + draft.id + '/cancel', { revision: 4 })).status, 409);
  });
  test('simultaneous same receipt ID increments stock exactly once', async () => {
    const item = await product(), record = await sent(item.id), body = { receiptId: randomUUID(), items: [{ orderItemId: record.items[0].id, quantity: '60' }] };
    const responses = await competing(record.id, [body, body]); assert.deepEqual(responses.map(r => r.status), [201, 201]);
    const results = await Promise.all(responses.map(async r => await r.json() as ReceiptResult)); assert.deepEqual(results.map(r => r.repeated).sort(), [false, true]); assert.equal(await stock(item.id), '60'); assert.equal(await db.stockMovement.count({ where: { productId: item.id } }), 1);
  });
  test('simultaneous distinct IDs cannot receive 120 from a pending 100; cancellation preserves 60', async () => {
    const item = await product(), record = await sent(item.id);
    const bodies = [0, 1].map(() => ({ receiptId: randomUUID(), items: [{ orderItemId: record.items[0].id, quantity: '60' }] }));
    const responses = await competing(record.id, bodies); assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]); assert.equal(await stock(item.id), '60');
    const partial = await (await send('/purchase-orders/' + record.id)).json() as PurchaseRecord; assert.equal((await send('/purchase-orders/' + record.id + '/cancel', { revision: partial.revision })).status, 201);
    assert.equal(await stock(item.id), '60'); assert.equal((await send('/purchase-orders/' + record.id + '/receipts', { receiptId: randomUUID(), items: [{ orderItemId: record.items[0].id, quantity: '1' }] })).status, 409);
    const winner = bodies[responses.findIndex(response => response.status === 201)]; assert.equal((await (await send('/purchase-orders/' + record.id + '/receipts', winner)).json() as ReceiptResult).repeated, true);
  });
  test('second item failure rolls back first entry, receipt and received counters', async () => {
    const pair = [await product(), await product()].sort((a, b) => a.id.localeCompare(b.id));
    const response = await send('/purchase-orders', { supplierId, items: pair.map(item => ({ productId: item.id, quantity: '10', unitCost: '2' })) }); const record = await response.json() as PurchaseRecord;
    assert.equal((await send('/purchase-orders/' + record.id + '/send', { revision: 1 })).status, 201);
    await db.product.update({ where: { id: pair[1].id }, data: { active: false } });
    const receiptId = randomUUID(); assert.equal((await send('/purchase-orders/' + record.id + '/receipts', { receiptId, items: record.items.map(item => ({ orderItemId: item.id, quantity: '5' })) })).status, 400);
    assert.equal(await stock(pair[0].id), '0'); assert.equal(await stock(pair[1].id), '0'); assert.equal(await db.purchaseReceipt.count({ where: { id: receiptId } }), 0); assert.equal(await db.stockMovement.count({ where: { productId: { in: pair.map(item => item.id) } } }), 0);
    const reload = await (await send('/purchase-orders/' + record.id)).json() as PurchaseRecord; assert(reload.items.every(item => item.received === '0')); assert.equal(reload.status, 'SENT');
  });
  test('inactive supplier, repeated products, zero, foreign item and storage constraints are rejected', async () => {
    const item = await product();
    await db.supplier.update({ where: { id: supplierId }, data: { active: false } });
    assert.equal((await send('/purchase-orders', { supplierId, items: [{ productId: item.id, quantity: '1', unitCost: '1' }] })).status, 400);
    await db.supplier.update({ where: { id: supplierId }, data: { active: true } });
    const entry = { productId: item.id, quantity: '1', unitCost: '1' };
    assert.equal((await send('/purchase-orders', { supplierId, items: [entry, entry] })).status, 400);
    assert.equal((await send('/purchase-orders', { supplierId, items: [{ ...entry, quantity: '0' }] })).status, 400);
    const record = await sent(item.id);
    assert.equal((await send('/purchase-orders/' + record.id + '/receipts', { receiptId: randomUUID(), items: [{ orderItemId: randomUUID(), quantity: '1' }] })).status, 400);
    assert.equal((await send('/purchase-orders/' + record.id + '/receipts', { receiptId: randomUUID(), items: [{ orderItemId: record.items[0].id, quantity: '1' }] }, 'POST', cookies[2])).status, 403);
    await assert.rejects(db.$executeRaw`UPDATE "PurchaseOrderItem" SET "received"="quantity"+1 WHERE "id"=${record.items[0].id}::uuid`);
    assert.equal((await db.purchaseOrderItem.findUniqueOrThrow({ where: { id: record.items[0].id } })).received.toString(), '0');
    await db.product.update({ where: { id: item.id }, data: { unit: 'UNIT' } });
    assert.equal((await send('/purchase-orders/' + record.id + '/receipts', { receiptId: randomUUID(), items: [{ orderItemId: record.items[0].id, quantity: '1' }] })).status, 409);
    assert.equal(await stock(item.id), '0');
  });
});
