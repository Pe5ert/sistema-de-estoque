import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { configureAuthHttp } from '../auth/auth.http';
import { HttpExceptionFilter } from '../common/http-exception.filter';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PhysicalInventoriesModule } from './physical-inventories.module';
import { PhysicalInventoriesService } from './physical-inventories.service';

// Stubs cover HTTP boundaries only. Row locks, Decimal writes and rollback are
// verified separately against an explicitly selected, isolated PostgreSQL DB.
describe('physical inventory HTTP authorization and validation', () => {
  const id = '957333d6-2822-449e-81f3-454f2a90be2f';
  const actor = 'd5742179-1503-444f-9eaa-88d38a148144';
  const origin = 'http://localhost:5173';
  let app: INestApplication, base: string, cookie: string;
  let role = 'OPERATOR', active = true, calls = 0;
  const result = (body: unknown, userId?: string) => { calls++; return { body, userId }; };
  const service = {
    list: async (query: unknown) => result(query),
    get: async (value: unknown) => result(value),
    create: async (body: unknown, userId: string) => result(body, userId),
    counts: async (_id: string, body: unknown, userId: string) => result(body, userId),
    refresh: async (_id: string, revision: number) => result(revision),
    complete: async (_id: string, revision: number, userId: string) => result(revision, userId),
    cancel: async (_id: string, body: unknown, userId: string) => result(body, userId),
  };
  before(async () => {
    const module = await Test.createTestingModule({ imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ JWT_SECRET: randomBytes(32).toString('hex'), WEB_ORIGIN: origin })] }),
      PrismaModule,
      PhysicalInventoriesModule,
    ] })
      .overrideProvider(PrismaService).useValue({ user: { findUnique: async ({ where }: { where: { id: string } }) => where.id === actor ? { id: actor, name: 'Inventory HTTP fixture', email: 'fixture@example.test', role, active } : null } })
      .overrideProvider(PhysicalInventoriesService).useValue(service).compile();
    app = module.createNestApplication({ logger: false }); app.setGlobalPrefix('api');
    configureAuthHttp(app, app.get(ConfigService));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api/physical-inventories`;
    cookie = 'stock_session=' + await app.get(JwtService).signAsync({ sub: actor, role: 'ADMIN' });
  });
  after(async () => { await app?.close(); });
  function request(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', session = true, requestOrigin = origin) {
    return fetch(base + path, { method, headers: { Origin: requestOrigin, 'Content-Type': 'application/json', ...(session ? { Cookie: cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }
  test('every route requires a session, including read and draft operations', async () => {
    for (const [path, body, method] of [
      ['', undefined, 'GET'], ['', { title: 'Count' }, 'POST'], ['/' + id, undefined, 'GET'],
      [`/${id}/counts`, { revision: 1, items: [{ productId: id, countedQuantity: '0' }] }, 'PATCH'],
      [`/${id}/refresh`, { revision: 1 }, 'POST'], [`/${id}/complete`, { revision: 1 }, 'POST'], [`/${id}/cancel`, { revision: 1 }, 'POST'],
    ] as const) assert.equal((await request(path, body, method, false)).status, 401);
  });
  test('operator can count zero and fractional quantities; authenticated author cannot be forged', async () => {
    for (const quantity of ['0', '0.001', '999999999999999.999', null]) {
      const response = await request(`/${id}/counts`, { revision: 1, items: [{ productId: id, countedQuantity: quantity }] }, 'PATCH');
      assert.equal(response.status, 200);
      assert.equal((await response.json() as { userId: string }).userId, actor);
    }
    const beforeCalls = calls;
    assert.equal((await request(`/${id}/counts`, { revision: 1, userId: id, items: [{ productId: id, countedQuantity: '1' }] }, 'PATCH')).status, 400);
    assert.equal((await request(`/${id}/counts`, { revision: 1, items: [{ productId: id, countedQuantity: '1', stock: '10' }] }, 'PATCH')).status, 400);
    assert.equal(calls, beforeCalls);
  });
  test('finalization and cancellation use the current database role, not a stale token role', async () => {
    for (const action of ['complete', 'cancel']) assert.equal((await request(`/${id}/${action}`, { revision: 1 })).status, 403);
    for (const elevated of ['MANAGER', 'ADMIN']) {
      role = elevated;
      for (const action of ['complete', 'cancel']) {
        const response = await request(`/${id}/${action}`, { revision: 1 }); assert.equal(response.status, 201);
        assert.equal((await response.json() as { userId: string }).userId, actor);
      }
    }
    role = 'OPERATOR'; active = false;
    assert.equal((await request('')).status, 401); active = true;
  });
  test('cross-origin writes fail before reaching counting or finalization', async () => {
    role = 'ADMIN'; const beforeCalls = calls;
    assert.equal((await request('', { title: 'Count' }, 'POST', true, 'https://wrong.example')).status, 403);
    assert.equal((await request(`/${id}/complete`, { revision: 1 }, 'POST', true, 'https://wrong.example')).status, 403);
    assert.equal(calls, beforeCalls); role = 'OPERATOR';
  });
  test('invalid, omitted, negative, numeric, precision and nested fields fail before service calls', async () => {
    const beforeCalls = calls;
    for (const quantity of [undefined, '', '-1', '1.0001', '1,25', '1e3', 1, '1000000000000000', 'NaN']) {
      assert.equal((await request(`/${id}/counts`, { revision: 1, items: [{ productId: id, countedQuantity: quantity }] }, 'PATCH')).status, 400);
    }
    for (const body of [
      { revision: 0, items: [{ productId: id, countedQuantity: '1' }] },
      { revision: '1', items: [{ productId: id, countedQuantity: '1' }] },
      { revision: 1, items: [] },
      { revision: 1, items: Array.from({ length: 51 }, () => ({ productId: id, countedQuantity: '1' })) },
      { revision: 1, items: [{ productId: 'bad', countedQuantity: '1' }] },
      { revision: 1, items: [{ productId: id, countedQuantity: '1', notes: 'x'.repeat(1001) }] },
    ]) assert.equal((await request(`/${id}/counts`, body, 'PATCH')).status, 400);
    assert.equal(calls, beforeCalls);
  });
  test('creation, pagination, UUIDs and revisions reject malformed input', async () => {
    role = 'ADMIN'; const beforeCalls = calls;
    for (const body of [{ title: ' ' }, { title: 'x'.repeat(161) }, { title: 'Count', categoryId: null }, { title: 'Count', categoryId: 'bad' }, { title: 'Count', stock: '10' }]) assert.equal((await request('', body)).status, 400);
    for (const query of ['page=0', 'limit=21', 'status=bogus', 'unknown=1']) assert.equal((await request('?' + query)).status, 400);
    assert.equal((await request('/bad')).status, 400);
    for (const revision of [undefined, 0, -1, 1.5, '1', 2147483647]) assert.equal((await request(`/${id}/complete`, { revision })).status, 400);
    assert.equal(calls, beforeCalls); role = 'OPERATOR';
    const created = await request('', { title: '  Conferência mensal  ' }); assert.equal(created.status, 201);
    assert.equal((await created.json() as { body: { title: string } }).body.title, 'Conferência mensal');
    const list = await request('?page=2&status=DRAFT'); assert.equal(list.status, 200);
    assert.deepEqual((await list.json() as { body: unknown }).body, { page: 2, limit: 20, status: 'DRAFT' });
  });
});
