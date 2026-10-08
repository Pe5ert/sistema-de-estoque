import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hasPermission, type Permission, type UserRole } from '@stock/shared';
import { InventoryModule } from '../inventory/inventory.module';
import { InventoryService } from '../inventory/inventory.service';
import { DashboardService } from '../inventory/dashboard.service';
import { ImportsModule } from '../imports/imports.module';
import { ImportsService } from '../imports/imports.service';
import { BackupsModule } from '../backups/backups.module';
import { BackupsService } from '../backups/backups.service';
import { PrismaService } from '../prisma/prisma.service';
import { configureAuthHttp } from './auth.http';
import { HttpExceptionFilter } from '../common/http-exception.filter';

// Real controllers, guards, cookies, DTOs and HTTP. Persistence is deliberately
// stubbed here: denied requests must never reach a service or perform a write.
describe('product permission matrix through real HTTP guards', { concurrency: false }, () => {
  const actor = randomUUID(), id = randomUUID(), origin = 'http://localhost:5173';
  let role: UserRole = 'ADMIN', active = true, calls = 0;
  let app: INestApplication, base: string, cookie: string;
  const hit = async () => { calls++; return { id }; };
  const product = { sku: 'RBAC-001', name: 'Permission fixture', categoryId: id, unit: 'UNIT', minimumStock: '0', initialEntry: { quantity: '10' } };
  const movement = { productId: id, type: 'EXIT', reason: 'SALE', quantity: '1' };
  const cases: { path: string; method: string; body?: unknown; allowed: readonly UserRole[]; status: number }[] = [
    { path: '/categories', method: 'GET', allowed: ['ADMIN', 'MANAGER', 'OPERATOR'], status: 200 },
    { path: '/categories', method: 'POST', body: { name: 'Permission fixture' }, allowed: ['ADMIN', 'MANAGER'], status: 201 },
    { path: '/categories/' + id, method: 'PATCH', body: { active: false }, allowed: ['ADMIN', 'MANAGER'], status: 200 },
    { path: '/products', method: 'GET', allowed: ['ADMIN', 'MANAGER', 'OPERATOR'], status: 200 },
    { path: '/products/lookup?code=RBAC', method: 'GET', allowed: ['ADMIN', 'MANAGER', 'OPERATOR'], status: 200 },
    { path: '/products/' + id, method: 'GET', allowed: ['ADMIN', 'MANAGER', 'OPERATOR'], status: 200 },
    { path: '/products', method: 'POST', body: product, allowed: ['ADMIN', 'MANAGER', 'OPERATOR'], status: 201 },
    { path: '/products/' + id, method: 'PATCH', body: { name: 'Edited' }, allowed: ['ADMIN', 'MANAGER'], status: 200 },
    { path: '/products/' + id, method: 'PATCH', body: { active: false }, allowed: ['ADMIN', 'MANAGER'], status: 200 },
    { path: '/stock-movements', method: 'GET', allowed: ['ADMIN', 'MANAGER', 'OPERATOR'], status: 200 },
    { path: '/stock-movements/' + id, method: 'GET', allowed: ['ADMIN', 'MANAGER', 'OPERATOR'], status: 200 },
    ...['ENTRY', 'EXIT'].map(type => ({ path: '/stock-movements', method: 'POST', body: { ...movement, type }, allowed: ['ADMIN', 'MANAGER', 'OPERATOR'] as const, status: 201 })),
    ...['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'].map(type => ({ path: '/stock-movements', method: 'POST', body: { ...movement, type }, allowed: ['ADMIN', 'MANAGER'] as const, status: 201 })),
    { path: '/stock-movements', method: 'POST', body: { ...movement, reason: 'INVENTORY_ADJUSTMENT' }, allowed: ['ADMIN', 'MANAGER'], status: 201 },
    { path: '/dashboard/summary', method: 'GET', allowed: ['ADMIN', 'MANAGER', 'OPERATOR'], status: 200 },
    { path: '/imports', method: 'GET', allowed: ['ADMIN', 'MANAGER'], status: 200 },
    { path: '/imports/template?format=csv', method: 'GET', allowed: ['ADMIN', 'MANAGER'], status: 200 },
    { path: '/imports', method: 'POST', allowed: ['ADMIN', 'MANAGER'], status: 201 },
    { path: '/imports/' + id, method: 'GET', allowed: ['ADMIN', 'MANAGER'], status: 200 },
    { path: '/imports/' + id, method: 'PATCH', body: {}, allowed: ['ADMIN', 'MANAGER'], status: 200 },
    { path: '/imports/' + id + '/confirm', method: 'POST', body: {}, allowed: ['ADMIN', 'MANAGER'], status: 201 },
    { path: '/backups', method: 'GET', allowed: ['ADMIN'], status: 200 },
    { path: '/backups', method: 'POST', allowed: ['ADMIN'], status: 202 },
    { path: '/backups/schedule', method: 'PATCH', body: { enabled: true, frequency: 'MONTHLY', weekday: 0, hour: '02:00' }, allowed: ['ADMIN'], status: 200 },
    { path: '/backups/' + id + '/download', method: 'GET', allowed: ['ADMIN'], status: 200 },
  ];
  before(async () => {
    const module = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ JWT_SECRET: randomBytes(32).toString('hex'), WEB_ORIGIN: origin })] }), InventoryModule, ImportsModule, BackupsModule] })
      .overrideProvider(PrismaService).useValue({ user: { findUnique: async () => ({ id: actor, name: 'Permission fixture', email: 'permission@example.test', role, active }) } })
      .overrideProvider(InventoryService).useValue(Object.fromEntries(['categories', 'createCategory', 'patchCategory', 'products', 'lookup', 'product', 'createProduct', 'patchProduct', 'movements', 'movement', 'move'].map(name => [name, hit])))
      .overrideProvider(DashboardService).useValue({ summary: hit })
      .overrideProvider(ImportsService).useValue({ list: hit, upload: hit, get: hit, setup: hit, confirm: hit, template: async () => { calls++; return Buffer.from('name,sku'); } })
      .overrideProvider(BackupsService).useValue({ list: hit, create: hit, updateSchedule: hit, download: hit }).compile();
    app = module.createNestApplication({ logger: false }); app.setGlobalPrefix('api');
    configureAuthHttp(app, app.get(ConfigService)); app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api`;
    // The claim intentionally stays ADMIN while the repository role changes.
    cookie = 'stock_session=' + await app.get(JwtService).signAsync({ sub: actor, role: 'ADMIN' });
  });
  after(async () => { await app?.close(); });
  function request(item: typeof cases[number], session = cookie) {
    return fetch(base + item.path, { method: item.method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(session ? { Cookie: session } : {}) }, ...(item.body ? { body: JSON.stringify(item.body) } : {}) });
  }
  for (const profile of ['ADMIN', 'MANAGER', 'OPERATOR'] as const) test(profile + ' permissions cover reads, writes, adjustments, import and backups', async () => {
    role = profile;
    for (const item of cases) {
      const before = calls, allowed = item.allowed.includes(profile);
      const response = await request(item);
      assert.equal(response.status, allowed ? item.status : 403, `${profile}: ${item.method} ${item.path} ${JSON.stringify(item.body ?? '')}`);
      assert.equal(calls - before, allowed ? 1 : 0, 'Denied action must not reach its service');
      await response.arrayBuffer();
    }
  });
  test('unauthenticated and disabled users cannot reach any operational service', async () => {
    const before = calls;
    for (const item of cases) { const response = await request(item, ''); assert.equal(response.status, 401); await response.arrayBuffer(); }
    active = false;
    try { assert.equal((await request(cases[6])).status, 401); } finally { active = true; }
    assert.equal(calls, before);
  });
  test('unknown and missing roles fail closed in the shared policy', () => {
    for (const permission of ['product.create', 'product.update', 'stock.move', 'stock.adjust', 'category.manage', 'product.import', 'backup.manage'] satisfies Permission[]) {
      assert.equal(hasPermission(undefined, permission), false);
      assert.equal(hasPermission('UNKNOWN', permission), false);
    }
  });
});
