import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import type { PhysicalInventoryRecord } from '@stock/shared';
import { Prisma } from '../generated/prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { PhysicalInventoriesService } from './physical-inventories.service';

// This opt-in suite never reads the application's DATABASE_URL or resets data.
// Only UUID fixtures in a dedicated loopback database are written. Audit and
// inventory records remain for inspection; our products/users are deactivated.
const connection = process.env.TEST_PHYSICAL_DATABASE_URL;
test('real PostgreSQL physical counting, atomic adjustments and concurrency', { skip: !connection }, async t => {
  const url = new URL(connection!);
  assert(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname === '/stock_physical_test', 'Use the isolated loopback stock_physical_test database.');
  const db = new PrismaService(new ConfigService({ DATABASE_URL: connection }));
  const service = new PhysicalInventoriesService(db), movements = new InventoryService(db);
  const prefix = 'physical-' + randomUUID();
  const users = await Promise.all(['ADMIN', 'OPERATOR'].map((role, index) => db.user.create({ data: {
    name: `Physical QA ${role}`, email: `${prefix}-${index}@example.test`, passwordHash: 'unused-isolated-test-hash', role: role as 'ADMIN' | 'OPERATOR',
  } })));
  const [admin, operator] = users;
  const productIds: string[] = [], categoryIds: string[] = [];
  let serial = 0;
  async function fixtures(stocks: string[]) {
    const category = await db.category.create({ data: { name: `${prefix}-${serial++}` } }); categoryIds.push(category.id);
    const products = [];
    for (const stock of stocks) {
      const product = await movements.createProduct({ name: `Fixture ${serial}`, sku: `${prefix}-${serial++}`, categoryId: category.id, unit: 'KG', minimumStock: '0', ...(new Prisma.Decimal(stock).isZero() ? {} : { initialEntry: { quantity: stock } }) }, admin.id);
      productIds.push(product.id); products.push(product);
    }
    return { category, products };
  }
  const create = (categoryId: string) => service.create({ title: 'Conferência física QA', categoryId }, operator.id);
  const save = (session: PhysicalInventoryRecord, values: (string | null)[]) => service.counts(session.id, {
    revision: session.revision, items: session.items.map((item, index) => ({ productId: item.productId, countedQuantity: values[index] })),
  }, operator.id);
  const audits = (id: string) => db.stockMovement.findMany({ where: { reference: `inventory:${id}` }, orderBy: { productId: 'asc' } });
  try {
    await t.test('exact fractions, zero, equal counts, concurrent confirmation and persisted audit', async () => {
      const { category } = await fixtures(['10.125', '0.300', '5']);
      let session = await create(category.id);
      const desired = new Map(session.items.map(item => [item.productId, item.snapshotStock === '10.125' ? '0' : item.snapshotStock === '0.300' ? '0.301' : '5']));
      session = await save(session, session.items.map(item => desired.get(item.productId)!));
      assert.equal(session.countedItems, 3); assert.equal(session.divergentItems, 2);
      assert.equal((await audits(session.id)).length, 0, 'saving a count must not move stock');
      for (const item of session.items) assert.equal((await db.product.findUniqueOrThrow({ where: { id: item.productId } })).stock.toFixed(3), item.snapshotStock);
      const results = await Promise.all([service.complete(session.id, session.revision, admin.id), service.complete(session.id, session.revision, admin.id)]);
      for (const result of results) { assert.equal(result.status, 'COMPLETED'); assert.equal(result.adjustmentCount, 2); assert.equal(result.completedBy?.id, admin.id); }
      const records = await audits(session.id); assert.equal(records.length, 2);
      for (const record of records) {
        const counted = desired.get(record.productId)!;
        assert.equal(record.userId, admin.id); assert.equal(record.reason, 'INVENTORY_ADJUSTMENT');
        assert.equal(record.resultingStock.toFixed(3), new Prisma.Decimal(counted).toFixed(3));
        assert(record.quantity.eq(record.resultingStock.minus(record.previousStock).abs()));
        assert.equal(record.type, record.resultingStock.gt(record.previousStock) ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT');
        assert.match(record.notes!, /Conferência física QA/);
      }
      assert.equal((await new PhysicalInventoriesService(db).get(session.id)).status, 'COMPLETED');
      await service.complete(session.id, 1, operator.id); assert.equal((await audits(session.id)).length, 2, 'retry cannot create duplicate audit');
      await assert.rejects(service.counts(session.id, { revision: results[0].revision, items: [{ productId: session.items[0].productId, countedQuantity: '99' }] }, operator.id), /encerrado/);
    });
    await t.test('unreported quantities block completion; null clears and zero remains counted', async () => {
      const { category } = await fixtures(['3', '0']); let session = await create(category.id);
      await assert.rejects(service.complete(session.id, session.revision, admin.id), /Conte todos/);
      session = await service.counts(session.id, { revision: session.revision, items: [{ productId: session.items[0].productId, countedQuantity: '0' }] }, operator.id);
      assert.equal(session.countedItems, 1); assert.equal(session.items[0].countedById, operator.id);
      await assert.rejects(service.complete(session.id, session.revision, admin.id), /Conte todos/);
      session = await service.counts(session.id, { revision: session.revision, items: [{ productId: session.items[0].productId, countedQuantity: null }] }, operator.id);
      assert.equal(session.countedItems, 0); assert.equal(session.items[0].countedById, null); assert.equal(session.items[0].countedAt, null);
      assert.equal((await audits(session.id)).length, 0);
    });
    await t.test('simultaneous edits use revisions and preserve the winning saved count', async () => {
      const { category } = await fixtures(['1']); const session = await create(category.id);
      const results = await Promise.allSettled(['2', '3'].map(countedQuantity => service.counts(session.id, { revision: session.revision, items: [{ productId: session.items[0].productId, countedQuantity }] }, operator.id)));
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult;
      assert.equal(rejected.reason.getStatus(), 409);
      const winner = results.find(result => result.status === 'fulfilled') as PromiseFulfilledResult<PhysicalInventoryRecord>;
      assert.equal((await service.get(session.id)).items[0].countedQuantity, winner.value.items[0].countedQuantity);
      assert.equal(winner.value.revision, session.revision + 1);
    });
    await t.test('duplicate and foreign products cannot partially save a batch', async () => {
      const { category } = await fixtures(['1']); const session = await create(category.id), productId = session.items[0].productId;
      await assert.rejects(service.counts(session.id, { revision: 1, items: [{ productId, countedQuantity: '2' }, { productId, countedQuantity: '3' }] }, operator.id), /repita/);
      await assert.rejects(service.counts(session.id, { revision: 1, items: [{ productId, countedQuantity: '2' }, { productId: randomUUID(), countedQuantity: '3' }] }, operator.id), /não pertence/);
      assert.equal((await service.get(session.id)).items[0].countedQuantity, null);
      assert.equal((await service.get(session.id)).revision, 1);
    });
    await t.test('invalid second quantity rolls back the first saved count; maximum Decimal stays exact', async () => {
      const { category } = await fixtures(['0', '999999999999999.998']); const session = await create(category.id);
      await assert.rejects(service.counts(session.id, { revision: session.revision, items: [
        { productId: session.items[0].productId, countedQuantity: '2' },
        { productId: session.items[1].productId, countedQuantity: '-1' },
      ] }, operator.id), /Contagem inválida/);
      const unchanged = await service.get(session.id); assert.equal(unchanged.revision, 1); assert.equal(unchanged.countedItems, 0);
      const counted = await save(session, session.items.map(item => item.snapshotStock === '0.000' ? '0' : '999999999999999.999'));
      await service.complete(session.id, counted.revision, admin.id);
      const records = await audits(session.id); assert.equal(records.length, 1);
      assert.equal(records[0].quantity.toFixed(3), '0.001'); assert.equal(records[0].resultingStock.toFixed(3), '999999999999999.999');
    });
    await t.test('changed stock blocks adjustments; refresh clears only changed items and preserves notes', async () => {
      const { category } = await fixtures(['10', '20']); let session = await create(category.id);
      session = await service.counts(session.id, { revision: session.revision, items: session.items.map(item => ({ productId: item.productId, countedQuantity: item.snapshotStock, notes: 'Conferido na prateleira' })) }, operator.id);
      const changed = session.items[0], unchanged = session.items[1];
      await movements.move({ productId: changed.productId, type: 'ENTRY', reason: 'PURCHASE', quantity: '1' }, operator.id);
      await assert.rejects(service.complete(session.id, session.revision, admin.id), /estoque mudou/);
      assert.equal((await audits(session.id)).length, 0);
      const refreshed = await service.refresh(session.id, session.revision);
      assert.equal(refreshed.items.find(item => item.productId === changed.productId)!.countedQuantity, null);
      assert.equal(refreshed.items.find(item => item.productId === changed.productId)!.notes, 'Conferido na prateleira');
      assert.equal(refreshed.items.find(item => item.productId === unchanged.productId)!.countedQuantity, unchanged.countedQuantity);
      assert.equal(refreshed.conflictedItems, 0); assert.equal(refreshed.revision, session.revision + 1);
      session = await service.counts(session.id, { revision: refreshed.revision, items: [{ productId: changed.productId, countedQuantity: changed.countedQuantity }] }, operator.id);
      assert.equal((await service.complete(session.id, session.revision, admin.id)).adjustmentCount, 1);
    });
    await t.test('ABA balance changes are detected even if balance and millisecond timestamp match', async () => {
      const { category } = await fixtures(['10']); let session = await create(category.id); session = await save(session, ['10']);
      const item = session.items[0];
      await movements.move({ productId: item.productId, type: 'ENTRY', reason: 'PURCHASE', quantity: '1' }, operator.id);
      await movements.move({ productId: item.productId, type: 'EXIT', reason: 'SALE', quantity: '1' }, operator.id);
      // Explicitly reproduce the timestamp-precision edge case on this fixture.
      await db.$executeRaw`UPDATE "Product" SET "updatedAt" = ${new Date(item.snapshotUpdatedAt)} WHERE "id" = ${item.productId}::uuid`;
      const latest = await service.get(session.id); assert.equal(latest.items[0].currentStock, item.snapshotStock); assert.equal(latest.items[0].currentUpdatedAt, item.snapshotUpdatedAt); assert.equal(latest.conflictedItems, 1);
      await assert.rejects(service.complete(session.id, session.revision, admin.id), /estoque mudou/);
      assert.equal((await service.refresh(session.id, session.revision)).countedItems, 0);
    });
    await t.test('unit changes and deactivation demand explicit recount or cancellation', async () => {
      const { category } = await fixtures(['1']); let session = await create(category.id); session = await save(session, ['1']);
      const productId = session.items[0].productId;
      await db.product.update({ where: { id: productId }, data: { unit: 'LITER' } });
      await assert.rejects(service.complete(session.id, session.revision, admin.id), /estoque mudou/);
      session = await service.refresh(session.id, session.revision); assert.equal(session.items[0].unit, 'LITER'); assert.equal(session.items[0].countedQuantity, null);
      await db.product.update({ where: { id: productId }, data: { active: false } });
      await assert.rejects(service.refresh(session.id, session.revision), /desativados/);
      assert.equal((await service.get(session.id)).revision, session.revision);
      const cancelled = await service.cancel(session.id, { revision: session.revision, notes: 'Produto desativado' }, admin.id);
      assert.equal(cancelled.status, 'CANCELLED'); assert.equal(cancelled.cancelledBy?.id, admin.id); assert.equal(cancelled.cancellationNotes, 'Produto desativado');
      assert.equal((await audits(session.id)).length, 0);
      assert.equal((await db.product.findUniqueOrThrow({ where: { id: productId } })).stock.toString(), '1');
      await assert.rejects(service.complete(session.id, cancelled.revision, admin.id), /encerrado/);
    });
    await t.test('failure after audit, stock and session writes rolls all three back', async () => {
      const { category } = await fixtures(['5', '9']); let session = await create(category.id); session = await save(session, ['3', '11']);
      // Only fault injection is proxied. Every write and rollback uses real PG.
      const original = db.$transaction.bind(db);
      const failingDb = new Proxy(db, { get(target, property, receiver) {
        if (property !== '$transaction') return Reflect.get(target, property, receiver);
        return (callback: (tx: Prisma.TransactionClient) => Promise<unknown>, options: { maxWait: number; timeout: number }) => original(async tx => callback(new Proxy(tx, { get(transaction, key, proxy) {
          if (key !== 'physicalInventory') return Reflect.get(transaction, key, proxy);
          return new Proxy(transaction.physicalInventory, { get(delegate, action, delegateProxy) {
            if (action !== 'update') return Reflect.get(delegate, action, delegateProxy);
            return async (args: Parameters<typeof delegate.update>[0]) => {
              const value = await delegate.update(args);
              if (args.data.status === 'COMPLETED') throw new Error('Injected failure after real writes');
              return value;
            };
          } });
        } })), options);
      } });
      await assert.rejects(new PhysicalInventoriesService(failingDb).complete(session.id, session.revision, admin.id), /Injected failure/);
      assert.equal((await audits(session.id)).length, 0);
      const persisted = await service.get(session.id); assert.equal(persisted.status, 'DRAFT'); assert.equal(persisted.revision, session.revision);
      for (const item of session.items) assert.equal((await db.product.findUniqueOrThrow({ where: { id: item.productId } })).stock.toFixed(3), item.snapshotStock);
      assert.equal((await service.complete(session.id, session.revision, admin.id)).status, 'COMPLETED');
    });
    await t.test('normal movement racing finalization keeps audit and materialized stock consistent', async () => {
      const { category } = await fixtures(['10']); let session = await create(category.id); session = await save(session, ['8']);
      const productId = session.items[0].productId;
      const [completed, entry] = await Promise.allSettled([
        service.complete(session.id, session.revision, admin.id),
        movements.move({ productId, type: 'ENTRY', reason: 'PURCHASE', quantity: '1' }, operator.id),
      ]);
      assert.equal(entry.status, 'fulfilled');
      const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
      if (completed.status === 'fulfilled') { assert.equal(product.stock.toString(), '9'); assert.equal((await audits(session.id)).length, 1); }
      else { assert.equal(completed.reason.getStatus(), 409); assert.equal(product.stock.toString(), '11'); assert.equal((await audits(session.id)).length, 0); }
      const all = await db.stockMovement.findMany({ where: { productId } });
      const aggregate = all.reduce((sum, movement) => sum.plus(movement.resultingStock.minus(movement.previousStock)), new Prisma.Decimal(0));
      assert(aggregate.eq(product.stock));
    });
    await t.test('overlapping inventories completing simultaneously cannot silently overwrite each other', async () => {
      const { category } = await fixtures(['10', '20']);
      let first = await create(category.id), second = await create(category.id);
      first = await save(first, ['8', '18']); second = await save(second, ['9', '19']);
      const results = await Promise.allSettled([service.complete(first.id, first.revision, admin.id), service.complete(second.id, second.revision, admin.id)]);
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult; assert.equal(rejected.reason.getStatus(), 409);
      assert.equal((await audits(first.id)).length + (await audits(second.id)).length, 2);
    });
    await t.test('inactive/empty categories and 501 products are blocked; 500 real adjustments complete', async () => {
      const category = await db.category.create({ data: { name: `${prefix}-volume` } }); categoryIds.push(category.id);
      await assert.rejects(create(category.id), /Não há produtos/);
      await db.category.update({ where: { id: category.id }, data: { active: false } });
      await assert.rejects(create(category.id), /categoria ativa/);
      await db.category.update({ where: { id: category.id }, data: { active: true } });
      const ids = Array.from({ length: 501 }, () => randomUUID()); productIds.push(...ids);
      await db.product.createMany({ data: ids.map((id, index) => ({ id, sku: `${prefix}-volume-${index}`, name: `Volume ${String(index).padStart(3, '0')}`, categoryId: category.id, stock: '0' })) });
      await assert.rejects(create(category.id), /até 500/);
      await db.product.update({ where: { id: ids[500] }, data: { active: false } });
      let session = await create(category.id); assert.equal(session.totalItems, 500);
      for (let index = 0; index < session.items.length; index += 50) session = await service.counts(session.id, { revision: session.revision, items: session.items.slice(index, index + 50).map(item => ({ productId: item.productId, countedQuantity: '0.001' })) }, operator.id);
      const completed = await service.complete(session.id, session.revision, admin.id); assert.equal(completed.status, 'COMPLETED'); assert.equal(completed.adjustmentCount, 500);
      assert.equal((await audits(session.id)).length, 500);
      assert.equal(await db.product.count({ where: { categoryId: category.id, active: true, stock: '0.001' } }), 500);
      const listed = await service.list({ page: 1, limit: 20, status: 'COMPLETED' }); assert(listed.items.some(item => item.id === session.id));
    });
  } finally {
    await db.$transaction([
      db.product.updateMany({ where: { id: { in: productIds } }, data: { active: false } }),
      db.category.updateMany({ where: { id: { in: categoryIds } }, data: { active: false } }),
      db.user.updateMany({ where: { id: { in: users.map(user => user.id) } }, data: { active: false } }),
    ]);
    await db.$disconnect();
  }
});
