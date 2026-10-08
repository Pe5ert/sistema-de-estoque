import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { argon2id, hash } from 'argon2';
import type { DashboardSummary, ProductRecord, MovementRecord } from '@stock/shared';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { configureAuthHttp } from '../auth/auth.http';
import { HttpExceptionFilter } from '../common/http-exception.filter';
import { InventoryModule } from './inventory.module';

// Opt-in only: never silently use the application DATABASE_URL. Apply reviewed
// migrations to a separate test database first. No reset, drop or general cleanup.
// This suite keeps its audit trail and deactivates only its own UUID fixtures.
const testUrl = process.env.TEST_DATABASE_URL;
describe('real PostgreSQL operational flow and concurrent exits', { skip: !testUrl, concurrency: false }, () => {
  let app: INestApplication, db: PrismaService, base: string, cookie: string;
  let baseline: DashboardSummary;
  const tag = 'test-' + randomUUID();
  const origin = 'http://localhost:5173';
  const userId = randomUUID(), categoryId = randomUUID();
  const secondUserId = randomUUID();
  let secondCookie: string;
  const password = randomBytes(24).toString('hex');
  const productIds: string[] = [];
  let fixturesCreated = false;
  before(async () => {
    const target = new URL(testUrl!);
    assert(['127.0.0.1', 'localhost'].includes(target.hostname) && target.pathname.endsWith('_stock_test'), 'Use a dedicated loopback database ending in _stock_test.');
    assert.notEqual(testUrl, process.env.DATABASE_URL, 'TEST_DATABASE_URL must differ from the application database');
    db = new PrismaService(new ConfigService({ DATABASE_URL: testUrl }));
    await db.$queryRaw`SELECT 1`;
    const module = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ DATABASE_URL: testUrl, JWT_SECRET: randomBytes(32).toString('hex'), WEB_ORIGIN: origin, NODE_ENV: 'test' })] }), InventoryModule] })
      .overrideProvider(PrismaService).useValue(db).compile();
    app = module.createNestApplication({ logger: false }); app.setGlobalPrefix('api');
    configureAuthHttp(app, app.get(ConfigService));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new HttpExceptionFilter()); await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/api`;
    await db.$transaction([
      db.user.create({ data: { id: userId, name: tag, email: tag + '@example.test', passwordHash: await hash(password, { type: argon2id }), role: 'MANAGER' } }),
      db.user.create({ data: { id: secondUserId, name: tag + '-second', email: tag + '-second@example.test', passwordHash: await hash(password, { type: argon2id }), role: 'OPERATOR' } }),
      db.category.create({ data: { id: categoryId, name: tag } }),
    ]); fixturesCreated = true;
    const login = await request('/auth/login', { email: tag + '@example.test', password }); assert.equal(login.status, 200);
    cookie = login.headers.get('set-cookie')!.split(';')[0];
    const secondLogin = await request('/auth/login', { email: tag + '-second@example.test', password });
    assert.equal(secondLogin.status, 200);
    secondCookie = secondLogin.headers.get('set-cookie')!.split(';')[0];
    baseline = await (await request('/dashboard/summary')).json() as DashboardSummary;
  });
  after(async () => {
    try {
      if (fixturesCreated) await db.$transaction([
        db.product.updateMany({ where: { id: { in: productIds } }, data: { active: false } }),
        db.category.update({ where: { id: categoryId }, data: { active: false } }),
        db.user.update({ where: { id: userId }, data: { active: false } }),
        db.user.update({ where: { id: secondUserId }, data: { active: false } }),
      ]);
    } finally { await app?.close(); await db?.$disconnect(); }
  });
  function request(path: string, body?: unknown, method = body ? 'POST' : 'GET', session = cookie) {
    return fetch(base + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(session ? { Cookie: session } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  async function concurrentExits(productId: string, quantity: string, count: number) {
    // Hold the row until both sessions are visibly waiting in PostgreSQL. This
    // proves lock contention instead of relying on the timing of Promise.all.
    const blocker = new Client({ connectionString: testUrl });
    await blocker.connect();
    let pending: Promise<Response[]> | undefined;
    let overlapping = false;
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT "id" FROM "Product" WHERE "id" = $1::uuid FOR UPDATE', [productId]);
      pending = Promise.all(Array.from({ length: count }, (_, index) => request('/stock-movements', {
        productId, type: 'EXIT', reason: 'SALE', quantity,
      }, 'POST', index % 2 ? secondCookie : cookie)));
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        const [{ waiting }] = await db.$queryRaw<{ waiting: bigint }[]>`SELECT COUNT(*) AS waiting FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%FOR UPDATE%'`;
        if (Number(waiting) >= 2) { overlapping = true; break; }
        await delay(10);
      }
    } finally {
      await blocker.query('ROLLBACK');
      await blocker.end();
    }
    const results = await pending!;
    assert(overlapping, 'At least two HTTP requests must overlap while waiting for the product row lock');
    return results;
  }
  test('create/edit/reload, uniqueness, movement audit, rollback, aggregation and logout persistence', async () => {
    assert.equal((await request('/auth/me')).status, 200);
    const categoryResponse = await request('/categories', { name: tag + '-second' });
    assert.equal(categoryResponse.status, 201);
    const category = await categoryResponse.json() as { id: string };
    assert.equal((await request('/categories/' + category.id, { name: tag + '-renamed', active: false }, 'PATCH')).status, 200);
    const input = { sku: tag + '-A', barcode: tag + '-barcode', name: 'Product fixture', categoryId, unit: 'UNIT', minimumStock: '5', costPrice: '12.25', salePrice: null, imageUrl: 'https://example.test/product.png', initialEntry: { quantity: '100' } };
    const created = await request('/products', input); assert.equal(created.status, 201);
    const product = await created.json() as ProductRecord; productIds.push(product.id);
    assert.equal(product.stock, '100'); assert.equal(product.salePrice, null);
    assert.equal((await (await request('/products/' + product.id)).json() as ProductRecord).imageUrl, input.imageUrl);
    assert.equal((await request('/products', { ...input, sku: input.sku.toUpperCase(), barcode: null })).status, 409);
    assert.equal((await request('/products', { ...input, sku: tag + '-B' })).status, 409);
    assert.equal((await request('/products/' + product.id, { stock: '1000' }, 'PATCH')).status, 400);
    assert.equal((await request('/products/' + product.id, { name: 'Edited fixture', imageUrl: null, salePrice: '19.9' }, 'PATCH')).status, 200);
    const edited = await (await request('/products/' + product.id)).json() as ProductRecord;
    assert.equal(edited.name, 'Edited fixture'); assert.equal(edited.stock, '100'); assert.equal(edited.imageUrl, null); assert.equal(edited.salePrice, '19.9');
    const exit = await request('/stock-movements', { productId: product.id, type: 'EXIT', reason: 'SALE', quantity: '20', reference: 'Reference fixture', notes: 'Audit fixture' }); assert.equal(exit.status, 201);
    const movement = await exit.json() as MovementRecord;
    assert.equal(movement.previousStock, '100'); assert.equal(movement.resultingStock, '80'); assert.equal(movement.user.id, userId);
    assert.equal((await (await request('/stock-movements/' + movement.id)).json() as MovementRecord).notes, 'Audit fixture');
    const countBefore = await db.stockMovement.count({ where: { productId: product.id } });
    assert.equal((await request('/stock-movements', { productId: product.id, type: 'EXIT', reason: 'SALE', quantity: '81' })).status, 409);
    assert.equal(await db.stockMovement.count({ where: { productId: product.id } }), countBefore);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock.toString(), '80');
    const failedSku = tag + '-rollback';
    assert.equal((await request('/products', { ...input, sku: failedSku, barcode: null, initialEntry: { quantity: '0' } })).status, 400);
    assert.equal(await db.product.count({ where: { sku: failedSku } }), 0, 'failed initial entry rolls product creation back');
    assert.equal((await request('/products?stockStatus=NORMAL&search=' + encodeURIComponent(input.sku))).status, 200);
    const races = await request('/products', { ...input, sku: tag + '-race', barcode: null, costPrice: null, minimumStock: '0', initialEntry: { quantity: '10' } }); assert.equal(races.status, 201);
    const racingProduct = await races.json() as ProductRecord; productIds.push(racingProduct.id);
    const results = await concurrentExits(racingProduct.id, '8', 2);
    assert.deepEqual(results.map(response => response.status).sort(), [201, 409]);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: racingProduct.id } })).stock.toString(), '2');
    assert.equal(await db.stockMovement.count({ where: { productId: racingProduct.id } }), 2);
    const winner = await results.find(response => response.status === 201)!.json() as MovementRecord;
    assert.equal(winner.previousStock, '10'); assert.equal(winner.resultingStock, '2');
    assert.equal(winner.user.id, results[0].status === 201 ? userId : secondUserId);
    const summary = await (await request('/dashboard/summary')).json() as DashboardSummary;
    assert.equal(new Prisma.Decimal(summary.units).minus(baseline.units).toString(), '82');
    assert.equal(new Prisma.Decimal(summary.costValue).minus(baseline.costValue).toString(), '980');
    assert.equal(summary.products - baseline.products, 2); assert.equal(summary.normal - baseline.normal, 2);
    assert.equal(summary.today.entries - baseline.today.entries, 2); assert.equal(summary.today.exits - baseline.today.exits, 2); assert.equal(summary.days.length, 7);
    assert.equal((await request('/auth/logout', {})).status, 204); cookie = '';
    assert.equal((await request('/products')).status, 401);
    const login = await request('/auth/login', { email: tag + '@example.test', password }); assert.equal(login.status, 200); cookie = login.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await (await request('/products/' + product.id)).json() as ProductRecord).stock, '80');
  });
  test('ten concurrent withdrawals exhaust stock exactly, with no audit for rejected requests', async () => {
    const response = await request('/products', { sku: tag + '-burst', name: 'Concurrent withdrawals', categoryId, unit: 'UNIT', minimumStock: '0', initialEntry: { quantity: '10' } });
    assert.equal(response.status, 201);
    const product = await response.json() as ProductRecord; productIds.push(product.id);
    const before = await (await request('/dashboard/summary')).json() as DashboardSummary;
    const results = await concurrentExits(product.id, '2', 10);
    assert.deepEqual(results.map(result => result.status).sort(), [...Array<number>(5).fill(201), ...Array<number>(5).fill(409)]);
    const accepted = await Promise.all(results.filter(result => result.status === 201).map(async result => await result.json() as MovementRecord));
    assert.deepEqual(accepted.map(record => Number(record.previousStock)).sort((a, b) => a - b), [2, 4, 6, 8, 10]);
    assert.deepEqual(accepted.map(record => Number(record.resultingStock)).sort((a, b) => a - b), [0, 2, 4, 6, 8]);
    const audit = await db.stockMovement.findMany({ where: { productId: product.id, type: 'EXIT' } });
    assert.equal(audit.length, 5);
    assert.deepEqual(audit.map(record => record.id).sort(), accepted.map(record => record.id).sort());
    assert(audit.every(record => record.userId === userId || record.userId === secondUserId));
    assert.equal((await (await request('/products/' + product.id)).json() as ProductRecord).stock, '0');
    const after = await (await request('/dashboard/summary')).json() as DashboardSummary;
    assert.equal(new Prisma.Decimal(before.units).minus(after.units).toString(), '10');
    assert.equal(after.today.exits - before.today.exits, 5);
  });
  test('concurrent fractional withdrawals preserve Decimal balance and audit chain', async () => {
    const response = await request('/products', { sku: tag + '-decimal', name: 'Fractional withdrawals', categoryId, unit: 'UNIT', minimumStock: '0', initialEntry: { quantity: '0.3' } });
    assert.equal(response.status, 201);
    const product = await response.json() as ProductRecord; productIds.push(product.id);
    const results = await concurrentExits(product.id, '0.1', 4);
    assert.deepEqual(results.map(result => result.status).sort(), [201, 201, 201, 409]);
    const audit = await db.stockMovement.findMany({ where: { productId: product.id, type: 'EXIT' } });
    assert.equal(audit.length, 3);
    assert.deepEqual(audit.map(record => record.previousStock.toString()).sort(), ['0.1', '0.2', '0.3']);
    assert.deepEqual(audit.map(record => record.resultingStock.toString()).sort(), ['0', '0.1', '0.2']);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).stock.toString(), '0');
  });
  test('operator can create with initial stock, but direct edits/categories/adjustments cannot write', async () => {
    const response = await request('/products', { sku: tag + '-operator', name: 'Operator creation', categoryId, unit: 'UNIT', minimumStock: '0', initialEntry: { quantity: '5' } }, 'POST', secondCookie);
    assert.equal(response.status, 201);
    const product = await response.json() as ProductRecord; productIds.push(product.id);
    const initial = await db.stockMovement.findFirstOrThrow({ where: { productId: product.id } });
    assert.equal(initial.userId, secondUserId); assert.equal(initial.reason, 'INITIAL_STOCK');
    assert.equal(initial.resultingStock.toString(), '5');
    for (const body of [{ name: 'Forbidden edit' }, { active: false }, { stock: '999' }]) {
      assert.equal((await request('/products/' + product.id, body, 'PATCH', secondCookie)).status, 403);
    }
    assert.equal((await request('/categories', { name: tag + '-forbidden' }, 'POST', secondCookie)).status, 403);
    assert.equal((await request('/categories/' + categoryId, { active: false }, 'PATCH', secondCookie)).status, 403);
    for (const body of [{ type: 'ADJUSTMENT_IN', reason: 'OTHER' }, { type: 'ADJUSTMENT_OUT', reason: 'OTHER' }, { type: 'ENTRY', reason: 'INVENTORY_ADJUSTMENT' }]) {
      assert.equal((await request('/stock-movements', { ...body, productId: product.id, quantity: '1' }, 'POST', secondCookie)).status, 403);
    }
    assert.equal(await db.stockMovement.count({ where: { productId: product.id } }), 1);
    const unchanged = await db.product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(unchanged.name, 'Operator creation'); assert.equal(unchanged.active, true); assert.equal(unchanged.stock.toString(), '5');
    assert.equal((await db.category.findUniqueOrThrow({ where: { id: categoryId } })).active, true);
    assert.equal(await db.category.count({ where: { name: tag + '-forbidden' } }), 0);
    await db.user.update({ where: { id: userId }, data: { role: 'OPERATOR' } });
    try {
      assert.equal((await request('/products/' + product.id, { name: 'Stale session edit' }, 'PATCH')).status, 403);
    } finally { await db.user.update({ where: { id: userId }, data: { role: 'MANAGER' } }); }
  });
});
