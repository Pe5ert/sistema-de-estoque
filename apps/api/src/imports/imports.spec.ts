import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import { canImportProducts } from '@stock/shared';
import { parseImportFile } from './import-file';
import { suggestedMapping, validateImportRows, setupSchema } from './import-validation';
import { ImportsService } from './imports.service';
import { InventoryService } from '../inventory/inventory.service';
import { Prisma, type ImportJob } from '../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

const categoryId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', userId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const headers = 'Nome;SKU;Código de barras;Categoria;Unidade;Estoque mínimo;Custo;Venda;Saldo inicial';
const csv = (count = 1, category = 'Acessórios') => Buffer.from(headers + '\n' + Array.from({ length: count }, (_, i) => `Produto ${i};SKU-${i};000${String(i).padStart(10, '0')};${category};UN;2,5;19,90;;3,125`).join('\n'));
const categories = [{ id: categoryId, name: 'Acessórios', active: true }];
for (const count of [10, 100, 1000, 2000]) test(`parse and validate ${count} rows without numeric conversion`, async () => {
  const parsed = await parseImportFile('produtos.csv', csv(count));
  const result = validateImportRows(parsed.rows, parsed.headers, suggestedMapping(parsed.headers), [], categories, []);
  assert.equal(result.issues.length, 0); assert.equal(result.rows.length, count);
  assert.equal(result.rows[0].product.barcode, '0000000000000');
  assert.equal(result.rows[0].product.costPrice, '19.90'); assert.equal(result.rows[0].product.salePrice, null);
  assert.equal(result.rows[0].product.initialEntry?.quantity, '3.125');
});
test('row/byte/column limits, invalid encoding, file type and empty file are explicit errors', async () => {
  await assert.rejects(parseImportFile('a.csv', csv(2001)), /2.000/);
  await assert.rejects(parseImportFile('a.csv', Buffer.alloc(5 * 1024 * 1024 + 1)), /5 MB/);
  await assert.rejects(parseImportFile('a.xls', csv()), /CSV ou XLSX/);
  await assert.rejects(parseImportFile('a.csv', Buffer.from([0xff, 0xfe])), /UTF-8/);
  await assert.rejects(parseImportFile('a.csv', Buffer.from('')), /5 MB/);
  await assert.rejects(parseImportFile('a.csv', Buffer.from('Nome;SKU\n')), /pelo menos/);
  await assert.rejects(parseImportFile('a.csv', Buffer.from('Nome;Nome\nx;y')), /cabeçalhos/);
});
test('CSV comma/tab, quoted delimiter, blank records and logical source lines', async () => {
  const parsed = await parseImportFile('a.csv', Buffer.from('\uFEFFNome;SKU\n"Produto; azul";0001\n\n;\nOutro;0002\n'));
  assert.equal(parsed.delimiter, ';'); assert.equal(parsed.rows.length, 2); assert.equal(parsed.ignoredRows, 2);
  assert.equal(parsed.rows[0].cells[0].text, 'Produto; azul'); assert.equal(parsed.rows[1].row, 5);
  assert.equal((await parseImportFile('a.csv', Buffer.from('Nome,SKU\nProduto,0001'))).delimiter, ',');
  assert.equal((await parseImportFile('a.csv', Buffer.from('Nome\tSKU\nProduto\t0001'))).delimiter, '\t');
});
test('XLSX text codes, numeric codes, cached and unresolved formulas, long codes', async () => {
  const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet('Produtos');
  sheet.addRow(headers.split(';')); sheet.addRow(['P', '000123', '000999', 'Acessórios', 'UN', 0, { formula: '1+1', result: 2 }, null, 0]);
  sheet.addRow(['P2', 1234567890123456, null, 'Acessórios', 'UN', 0, { formula: '1+1' }, null, 0]);
  sheet.addRow(['P3', 'a'.repeat(81), null, 'Acessórios', 'UN', 0, null, null, 0]);
  const parsed = await parseImportFile('a.xlsx', Buffer.from(await workbook.xlsx.writeBuffer()));
  const result = validateImportRows(parsed.rows, parsed.headers, suggestedMapping(parsed.headers), [], categories, []);
  assert.equal(result.rows[0].product.sku, '000123'); assert.equal(result.rows[0].product.costPrice, '2');
  assert(result.issues.some(issue => issue.row === 3 && issue.field === 'sku' && issue.message.includes('Código numérico')));
  assert(result.issues.some(issue => issue.row === 3 && issue.message.includes('Fórmula')));
  assert(result.issues.some(issue => issue.row === 4 && issue.field === 'sku'));
  sheet.addRow(['P4', 'X', '', 'Acessórios', 'UN', 0, null, null, -1]);
  workbook.addWorksheet('Outra').addRow(['extra']);
  await assert.rejects(parseImportFile('a.xlsx', Buffer.from(await workbook.xlsx.writeBuffer())), /uma aba/);
});
test('all duplicate rows, existing inactive codes and invalid stock/unit/prices block preview', async () => {
  const parsed = await parseImportFile('a.csv', csv(2));
  parsed.rows[1].cells[1].text = 'sku-0'; parsed.rows[1].cells[2].text = parsed.rows[0].cells[2].text;
  parsed.rows[0].cells[4].text = 'CXA'; parsed.rows[0].cells[8].text = '-1'; parsed.rows[0].cells[6].text = '1.234,50';
  const result = validateImportRows(parsed.rows, parsed.headers, suggestedMapping(parsed.headers), [], categories, [{ sku: 'SKU-0', barcode: parsed.rows[0].cells[2].text }]);
  assert(result.issues.filter(issue => issue.message.includes('repetido')).length === 4);
  for (const field of ['sku', 'barcode', 'unit', 'initialStock', 'costPrice']) assert(result.issues.some(issue => issue.field === field));
});
test('category choices are explicit, grouped by case, and inactive targets are rejected', async () => {
  const parsed = await parseImportFile('a.csv', csv(2, 'Nova'));
  parsed.rows[1].cells[3].text = 'nova';
  const mapping = suggestedMapping(parsed.headers);
  assert.deepEqual(validateImportRows(parsed.rows, parsed.headers, mapping, [], categories, []).unknownCategories, ['Nova']);
  const choices = [{ source: 'Nova', action: 'create' as const, name: 'Nova revisada' }];
  assert.equal(validateImportRows(parsed.rows, parsed.headers, mapping, choices, categories, []).issues.length, 0);
  assert.equal(validateImportRows(parsed.rows, parsed.headers, mapping, [{ source: 'Nova', action: 'map', categoryId }], [{ ...categories[0], active: false }], []).issues.length, 2);
  assert.equal(setupSchema.safeParse({ mapping, categoryMappings: [...choices, { ...choices[0], source: 'nova' }], revision: 1 }).success, false);
});

// Transactional memory fixture proves service boundaries/idempotency locally.
// It does not substitute for the opt-in PostgreSQL rollback suite.
function fixture() {
  let state = { jobs: [] as ImportJob[], categories: structuredClone(categories), products: [] as { id: string; sku: string; barcode: string | null; categoryId: string; stock: string }[], movements: [] as Record<string, unknown>[], role: 'MANAGER', active: true };
  let queued: Promise<void> = Promise.resolve();
  const tx = {
    $queryRaw: async () => [],
    $executeRaw: async (query: Prisma.Sql) => { for (let i = 0; i < query.values.length; i += 2) state.products.find(p => p.id === query.values[i])!.stock = query.values[i + 1] as string; },
    user: { findUnique: async () => ({ role: state.role, active: state.active }) },
    category: { findMany: async () => state.categories, count: async ({ where }: { where: { id: { in: string[] }; active: boolean } }) => state.categories.filter(c => c.active && where.id.in.includes(c.id)).length, create: async ({ data }: { data: { name: string; active: boolean } }) => { const item = { id: randomUUID(), ...data }; state.categories.push(item); return item; } },
    product: { findMany: async () => state.products, createMany: async ({ data }: { data: typeof state.products }) => { state.products.push(...data); } },
    stockMovement: { createMany: async ({ data }: { data: Record<string, unknown>[] }) => { state.movements.push(...data); } },
    importJob: {
      create: async ({ data }: { data: Partial<ImportJob> }) => { const job = { id: randomUUID(), status: 'PREVIEW', revision: 1, importedRows: 0, result: null, error: null, createdAt: new Date(), updatedAt: new Date(), ...data } as ImportJob; state.jobs.push(job); return job; },
      findUnique: async ({ where }: { where: { id: string } }) => state.jobs.find(job => job.id === where.id),
      update: async ({ where, data }: { where: { id: string }; data: Omit<Partial<ImportJob>, 'revision'> & { revision?: number | { increment: number } } }) => { const job = state.jobs.find(job => job.id === where.id)!; const { revision, ...rest } = data; Object.assign(job, rest); if (revision) job.revision = typeof revision === 'number' ? revision : job.revision + revision.increment; return job; },
    },
  };
  const db = { ...tx, $transaction: async (perform: (client: typeof tx) => Promise<unknown>) => {
    const previous = queued; let release!: () => void; queued = new Promise(resolve => { release = resolve; }); await previous;
    const saved = JSON.parse(JSON.stringify(state)) as typeof state;
    saved.jobs.forEach(job => { job.createdAt = new Date(job.createdAt); job.updatedAt = new Date(job.updatedAt); });
    try { return await perform(tx); } catch (error) { state = saved; throw error; } finally { release(); }
  } } as unknown as PrismaService;
  const inventory = new InventoryService(db), service = new ImportsService(db, inventory);
  return { service, inventory, state: () => state };
}
test('concurrent confirmation and refresh return one result, exact stock and initial audit', async () => {
  const f = fixture(), job = await f.service.upload({ originalname: 'a.csv', buffer: csv(10) }, userId);
  const [a, b] = await Promise.all([f.service.confirm(job.id, userId, { revision: job.revision }), f.service.confirm(job.id, userId, { revision: job.revision })]);
  assert.equal(a.status, 'COMPLETED'); assert.deepEqual(a.result, b.result);
  assert.equal(f.state().products.length, 10); assert.equal(f.state().movements.length, 10);
  assert.equal(f.state().products[0].stock, '3.125');
  assert.equal(f.state().movements[0].reason, 'INITIAL_STOCK'); assert.equal(f.state().movements[0].reference, job.id);
  assert.equal((await f.service.get(job.id, userId)).status, 'COMPLETED');
  await assert.rejects(f.service.get(job.id, randomUUID()), /não encontrada/);
});
test('failure after product/movement writes rolls back entire batch and records failure once', async () => {
  const f = fixture(); const initial = await f.service.upload({ originalname: 'a.csv', buffer: csv(10, 'Nova') }, userId);
  const job = await f.service.setup(initial.id, userId, { revision: initial.revision, mapping: initial.mapping, categoryMappings: [{ source: 'Nova', action: 'create', name: 'Nova' }] });
  const original = f.inventory.createImportProducts.bind(f.inventory);
  f.inventory.createImportProducts = async (...args) => { await original(...args); throw new Error('injected write failure'); };
  const result = await f.service.confirm(job.id, userId, { revision: job.revision });
  assert.equal(result.status, 'FAILED'); assert.equal(f.state().products.length, 0); assert.equal(f.state().movements.length, 0); assert.equal(f.state().categories.length, 1);
  assert.equal((await f.service.confirm(job.id, userId, { revision: job.revision })).status, 'FAILED');
  f.inventory.createImportProducts = original;
  const reviewed = await f.service.setup(job.id, userId, { revision: job.revision, mapping: job.mapping, categoryMappings: job.categoryMappings });
  assert.equal((await f.service.confirm(job.id, userId, { revision: reviewed.revision })).status, 'COMPLETED');
});
test('confirmation revalidates duplicates, categories, revision and permissions', async () => {
  const f = fixture(), job = await f.service.upload({ originalname: 'a.csv', buffer: csv() }, userId);
  await assert.rejects(f.service.confirm(job.id, userId, { revision: 999 }), /revisão mudou/);
  f.state().categories[0].active = false;
  await assert.rejects(f.service.confirm(job.id, userId, { revision: job.revision }), /Há erros/);
  f.state().categories[0].active = true; f.state().role = 'OPERATOR';
  await assert.rejects(f.service.confirm(job.id, userId, { revision: job.revision }), /permissão/);
  assert.equal(f.state().products.length, 0);
  assert.equal(canImportProducts('ADMIN'), true); assert.equal(canImportProducts('MANAGER'), true); assert.equal(canImportProducts('OPERATOR'), false);
});
