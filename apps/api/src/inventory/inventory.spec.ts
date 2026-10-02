import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { configureAuthHttp } from '../auth/auth.http';
import { InventoryModule } from './inventory.module';
import { InventoryService, databaseError, resultingStock } from './inventory.service';
import { HttpExceptionFilter } from '../common/http-exception.filter';

describe('Decimal inventory arithmetic', () => {
  test('fractional entries, exits and both adjustment directions stay exact', () => {
    for (const type of ['ENTRY', 'ADJUSTMENT_IN'] as const) assert.equal(resultingStock(new Prisma.Decimal('0.1'), '0.2', type).next.toString(), '0.3');
    for (const type of ['EXIT', 'ADJUSTMENT_OUT'] as const) assert.equal(resultingStock(new Prisma.Decimal('0.3'), '0.2', type).next.toString(), '0.1');
    assert.equal(resultingStock(new Prisma.Decimal('999999999999999.998'), '0.001', 'ENTRY').next.toString(), '999999999999999.999');
  });
  test('zero, negative, insufficient and overflowing stock are rejected', () => {
    for (const amount of ['0', '-1']) assert.throws(() => resultingStock(new Prisma.Decimal(10), amount, 'ENTRY'), /maior que zero/);
    assert.throws(() => resultingStock(new Prisma.Decimal(5), '8', 'EXIT'), /Quantidade indisponível/);
    assert.throws(() => resultingStock(new Prisma.Decimal('999999999999999.999'), '0.001', 'ENTRY'), /limite/);
  });
  test('database uniqueness conflicts identify SKU and barcode, other failures propagate', () => {
    for (const [target, label] of [['Product_sku_lower_key', 'SKU'], ['barcode', 'barras'], ['name', 'nome']]) {
      const error = new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test', meta: { target: [target] } });
      assert.throws(() => databaseError(error), new RegExp(label));
    }
    const error = new Error('transaction failed');
    assert.throws(() => databaseError(error), error);
  });
});

// Only HTTP/validation/auth boundaries are stubbed here. PostgreSQL behavior has
// a separate opt-in suite; these tests cannot prove row locks or DB rollback.
describe('operational HTTP boundaries without PostgreSQL', () => {
  const id = '957333d6-2822-449e-81f3-454f2a90be2f';
  const actor = 'd5742179-1503-444f-9eaa-88d38a148144';
  const origin = 'http://localhost:5173';
  let app: INestApplication, base: string, cookie: string;
  let calls = 0;
  const service = {
    categories: async () => [],
    createProduct: async (body: unknown, userId: string) => { calls++; return { body, userId }; },
    patchProduct: async (_id: string, body: unknown) => { calls++; return body; },
    move: async (body: unknown, userId: string) => { calls++; return { body, userId }; },
    products: async (query: unknown) => { calls++; return query; },
    movements: async (query: unknown) => query,
  };
  before(async () => {
    const module = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ JWT_SECRET: randomBytes(32).toString('hex'), WEB_ORIGIN: origin })] }), InventoryModule] })
      .overrideProvider(PrismaService).useValue({ user: { findUnique: async ({ where }: { where: { id: string } }) => where.id === actor ? { id: actor, name: 'HTTP fixture', email: 'fixture@example.test', role: 'OPERATOR', active: true } : null } })
      .overrideProvider(InventoryService).useValue(service).compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api'); configureAuthHttp(app, app.get(ConfigService));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api`;
    cookie = 'stock_session=' + await app.get(JwtService).signAsync({ sub: actor });
  });
  after(async () => { await app?.close(); });
  function request(path: string, body?: unknown, method = body ? 'POST' : 'GET', session = true, requestOrigin = origin) {
    return fetch(base + path, { method, headers: { Origin: requestOrigin, 'Content-Type': 'application/json', ...(session ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  const product = { sku: 'A-001', name: 'Cable', categoryId: id, unit: 'UNIT', minimumStock: '2.5', costPrice: null, salePrice: null };
  const movement = { productId: id, type: 'EXIT', reason: 'SALE', quantity: '8' };
  test('all operational endpoint groups require an authenticated session', async () => {
    for (const path of ['/categories', '/products', '/stock-movements', '/dashboard/summary']) assert.equal((await request(path, undefined, 'GET', false)).status, 401);
  });
  test('write requests preserve existing origin protection', async () => {
    assert.equal((await request('/products', product, 'POST', true, 'https://wrong.example')).status, 403);
  });
  test('create accepts nullable optional prices and uses session author', async () => {
    const response = await request('/products', { ...product, initialEntry: { quantity: '100' } });
    assert.equal(response.status, 201);
    const result = await response.json() as { userId: string; body: typeof product };
    assert.equal(result.userId, actor); assert.equal(result.body.costPrice, null);
  });
  test('stock/userId cannot be smuggled through PATCH or POST', async () => {
    const before = calls;
    assert.equal((await request('/products/' + id, { stock: '1000' }, 'PATCH')).status, 400);
    assert.equal((await request('/products', { ...product, stock: '1000' })).status, 400);
    assert.equal((await request('/stock-movements', { ...movement, userId: id })).status, 400);
    assert.equal(calls, before);
  });
  test('movement author is taken exclusively from the existing session', async () => {
    const response = await request('/stock-movements', movement);
    assert.equal(response.status, 201);
    assert.equal((await response.json() as { userId: string }).userId, actor);
  });
  test('invalid decimals, nested quantities, URL schemes and pagination fail before service calls', async () => {
    const before = calls;
    for (const body of [{ ...product, minimumStock: '1.0001' }, { ...product, costPrice: 10 }, { ...product, salePrice: '1.234' }, { ...product, imageUrl: 'data:image/png;base64,abc' }, { ...product, initialEntry: { quantity: '1', stock: '2' } }]) assert.equal((await request('/products', body)).status, 400);
    for (const query of ['page=0', 'limit=101', 'active=yes', 'stockStatus=BOGUS', 'category=oops']) assert.equal((await request('/products?' + query)).status, 400);
    assert.equal(calls, before);
  });
  test('server pagination and stock filters are typed, defaults applied', async () => {
    const response = await request('/products?page=2&limit=10&stockStatus=LOW&active=all');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { page: 2, limit: 10, stockStatus: 'LOW', active: 'all' });
  });
});
