import test from 'node:test';
import assert from 'node:assert/strict';
import { URL } from 'node:url';
import { normalizeSearch, productSearchLink, searchActions } from '../src/global-search-model.ts';

test('global search matches Portuguese labels, operation aliases and multiple words', () => {
  assert.equal(normalizeSearch('  INVENTÁRIO Físico '), 'inventario fisico');
  assert.equal(searchActions('saída', 'OPERATOR')[0].path, '/movements');
  assert.equal(searchActions('criar produto', 'OPERATOR')[0].path, '/products/new');
  assert.equal(searchActions('inventario', 'MANAGER')[0].path, '/physical-inventories');
  assert.deepEqual(searchActions('xyz inexistente', 'ADMIN'), []);
});
test('function shortcuts follow the role matrix and anonymous users get none', () => {
  assert.deepEqual(searchActions('backup', 'OPERATOR'), []);
  assert.deepEqual(searchActions('backup', 'MANAGER'), []);
  assert.equal(searchActions('backup', 'ADMIN')[0].path, '/backups');
  assert.deepEqual(searchActions('importar', 'OPERATOR'), []);
  assert.equal(searchActions('importar', 'MANAGER')[0].path, '/products/import');
  assert.deepEqual(searchActions('', undefined), []);
});
test('product selection preserves exact SKU and record identity in the destination', () => {
  const url = new URL(productSearchLink('id-123', 'SKU / A&B+01'), 'https://example.test');
  assert.equal(url.pathname, '/products');
  assert.equal(url.searchParams.get('q'), 'SKU / A&B+01');
  assert.equal(url.searchParams.get('detail'), 'id-123');
  assert.equal(url.searchParams.get('active'), 'all');
});
