import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
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
  const password = randomBytes(24).toString('hex');
  const productIds: string[] = [];
  let fixturesCreated = false;
  before(async () => {
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
      db.user.create({ data: { id: userId, name: tag, email: tag + '@example.test', passwordHash: await hash(password, { type: argon2id }), role: 'OPERATOR' } }),
      db.category.create({ data: { id: categoryId, name: tag } }),
    ]); fixturesCreated = true;
    const login = await request('/auth/login', { email: tag + '@example.test', password }); assert.equal(login.status, 200);
    cookie = login.headers.get('set-cookie')!.split(';')[0];
    baseline = await (await request('/dashboard/summary')).json() as DashboardSummary;
  });
  after(async () => {
    try {
      if (fixturesCreated) await db.$transaction([
        db.product.updateMany({ where: { id: { in: productIds } }, data: { active: false } }),
        db.category.update({ where: { id: categoryId }, data: { active: false } }),
        db.user.update({ where: { id: userId }, data: { active: false } }),
      ]);
    } finally { await app?.close(); await db?.$disconnect(); }
  });
  function request(path: string, body?: unknown, method = body ? 'POST' : 'GET') {
    return fetch(base + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
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
    const results = await Promise.all([1, 2].map(() => request('/stock-movements', { productId: racingProduct.id, type: 'EXIT', reason: 'SALE', quantity: '8' })));
    assert.deepEqual(results.map(response => response.status).sort(), [201, 409]);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: racingProduct.id } })).stock.toString(), '2');
    assert.equal(await db.stockMovement.count({ where: { productId: racingProduct.id } }), 2);
    const summary = await (await request('/dashboard/summary')).json() as DashboardSummary;
    assert.equal(new Prisma.Decimal(summary.units).minus(baseline.units).toString(), '82');
    assert.equal(new Prisma.Decimal(summary.costValue).minus(baseline.costValue).toString(), '980');
    assert.equal(summary.products - baseline.products, 2); assert.equal(summary.normal - baseline.normal, 2);
    assert.equal(summary.today.entries - baseline.today.entries, 2); assert.equal(summary.today.exits - baseline.today.exits, 2); assert.equal(summary.days.length, 7);
    assert.equal((await request('/auth/logout', {})).status, 200); cookie = '';
    assert.equal((await request('/products')).status, 401);
    const login = await request('/auth/login', { email: tag + '@example.test', password }); assert.equal(login.status, 200); cookie = login.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await (await request('/products/' + product.id)).json() as ProductRecord).stock, '80');
  });
});
