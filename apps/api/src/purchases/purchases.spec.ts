import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { INestApplication } from '@nestjs/common';
import type { UserRole } from '@stock/shared';
import { configureAuthHttp } from '../auth/auth.http';
import { HttpExceptionFilter } from '../common/http-exception.filter';
import { PrismaService } from '../prisma/prisma.service';
import { PurchasesModule } from './purchases.module';
import { PurchasesService, receiptHash } from './purchases.service';

test('receipt fingerprint ignores item ordering and equivalent decimal formatting', () => {
  const first = { receiptId: randomUUID(), items: [{ orderItemId: 'a', quantity: '1.000' }, { orderItemId: 'b', quantity: '2' }] };
  assert.equal(receiptHash('order', first), receiptHash('order', { ...first, items: [...first.items].reverse().map(item => ({ ...item, quantity: Number(item.quantity).toString() })) }));
  assert.notEqual(receiptHash('order', first), receiptHash('order', { ...first, notes: 'Different delivery' }));
});
describe('suppliers and purchases permissions through HTTP', () => {
  const actor = randomUUID(), id = randomUUID(), origin = 'http://localhost:5173';
  let app: INestApplication, base: string, cookie: string, calls = 0, role: UserRole = 'ADMIN', active = true;
  const hit = async () => { calls++; return { id }; };
  const order = { supplierId: id, items: [{ productId: id, quantity: '1', unitCost: '0' }] };
  const cases = [
    { path: '/suppliers', method: 'GET', read: true },
    { path: '/suppliers/' + id, method: 'GET', read: true },
    { path: '/suppliers', method: 'POST', body: { name: 'QA supplier' } },
    { path: '/suppliers/' + id, method: 'PATCH', body: { active: false } },
    { path: '/purchase-orders', method: 'GET', read: true },
    { path: '/purchase-orders/' + id, method: 'GET', read: true },
    { path: '/purchase-orders', method: 'POST', body: order },
    { path: '/purchase-orders/' + id, method: 'PATCH', body: { ...order, revision: 1 } },
    { path: '/purchase-orders/' + id + '/send', method: 'POST', body: { revision: 1 } },
    { path: '/purchase-orders/' + id + '/cancel', method: 'POST', body: { revision: 1 } },
    { path: '/purchase-orders/' + id + '/receipts/' + id, method: 'GET', read: true },
    { path: '/purchase-orders/' + id + '/receipts', method: 'POST', body: { receiptId: id, items: [{ orderItemId: id, quantity: '1' }] } },
  ];
  before(async () => {
    const module = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ JWT_SECRET: randomBytes(32).toString('hex'), WEB_ORIGIN: origin })] }), PurchasesModule] })
      .overrideProvider(PrismaService).useValue({ user: { findUnique: async () => ({ id: actor, role, active, name: 'QA', email: 'qa@example.test' }) } })
      .overrideProvider(PurchasesService).useValue(Object.fromEntries(['suppliers', 'supplier', 'saveSupplier', 'orders', 'order', 'saveOrder', 'transition', 'receipt', 'receive'].map(name => [name, hit]))).compile();
    app = module.createNestApplication({ logger: false }); app.setGlobalPrefix('api'); configureAuthHttp(app, app.get(ConfigService)); app.useGlobalFilters(new HttpExceptionFilter()); await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api`;
    cookie = 'stock_session=' + await app.get(JwtService).signAsync({ sub: actor, role: 'ADMIN' });
  });
  after(async () => { await app?.close(); });
  function request(item: { path: string; method: string; body?: unknown }, session = cookie) { return fetch(base + item.path, { method: item.method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(session ? { Cookie: session } : {}) }, ...(item.body ? { body: JSON.stringify(item.body) } : {}) }); }
  for (const profile of ['ADMIN', 'MANAGER', 'OPERATOR'] as const) test(profile + ' respects all purchase and supplier routes', async () => {
    role = profile;
    for (const item of cases) {
      const count = calls, allowed = item.read || profile !== 'OPERATOR', response = await request(item);
      assert.equal(response.status, allowed ? item.method === 'POST' ? 201 : 200 : 403, profile + ' ' + item.path);
      assert.equal(calls - count, allowed ? 1 : 0); await response.arrayBuffer();
    }
  });
  test('no session, disabled account, malformed decimals and author smuggling fail before service', async () => {
    const count = calls;
    for (const item of cases) { assert.equal((await request(item, '')).status, 401); }
    active = false; assert.equal((await request(cases[0])).status, 401); active = true; role = 'MANAGER';
    assert.equal((await request({ ...cases[6], body: { ...order, createdBy: actor } as typeof order })).status, 400);
    assert.equal((await request({ ...cases[6], body: { ...order, items: [{ productId: id, quantity: '1.0001', unitCost: '0' }] } })).status, 400);
    assert.equal(calls, count);
  });
});
