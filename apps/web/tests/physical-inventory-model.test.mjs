import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { test } from 'node:test';
import { normalizePhysicalQuantity, physicalCountBatches, physicalDifference, physicalQuantityLabel } from '../src/physical-inventory-model.ts';

test('physical count distinguishes uncounted, zero, invalid and exact decimal quantities', () => {
  for (const value of ['', ' ', '\t']) assert.equal(normalizePhysicalQuantity(value), null);
  for (const value of ['0', '00', '0,000', ' 0.000 ']) assert.equal(normalizePhysicalQuantity(value), '0');
  assert.equal(normalizePhysicalQuantity('0001,250'), '1.25');
  assert.equal(normalizePhysicalQuantity('0.001'), '0.001');
  assert.equal(normalizePhysicalQuantity('999999999999999,999'), '999999999999999.999');
  for (const value of ['-1', '1.0001', '1e3', '1,2,3', '1000000000000000', 'NaN', '1.000,50']) assert.equal(normalizePhysicalQuantity(value), undefined);
});

test('physical divergence remains exact across fractions and the full Decimal(18,3) range', () => {
  assert.equal(physicalDifference('0.3', '0.1'), '0.2');
  assert.equal(physicalDifference('0.001', '0.002'), '-0.001');
  assert.equal(physicalDifference('0', '10.125'), '-10.125');
  assert.equal(physicalDifference('5.000', '5'), '0');
  assert.equal(physicalDifference('999999999999999.999', '999999999999999.998'), '0.001');
  assert.equal(physicalDifference('0', '999999999999999.999'), '-999999999999999.999');
});

test('Portuguese labels show exact values, signs and three decimal places when needed', () => {
  assert.equal(physicalQuantityLabel('999999999999999.999'), '999.999.999.999.999,999');
  assert.equal(physicalQuantityLabel('-0.001', true), '−0,001');
  assert.equal(physicalQuantityLabel('10.125', true), '+10,125');
  assert.equal(physicalQuantityLabel('0.000', true), '0');
  assert.equal(physicalQuantityLabel('1000.250'), '1.000,25');
});

test('count batches respect row and HTTP byte limits without losing notes or order', () => {
  const items = Array.from({ length: 500 }, (_, index) => ({
    productId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    countedQuantity: index === 0 ? null : '999999999999999.999',
    notes: index % 2 ? '🧺'.repeat(500) : '\u0001'.repeat(1000),
  }));
  const batches = physicalCountBatches(items);
  assert(batches.length > 10, 'long notes require more than the ordinary ten batches');
  assert.deepEqual(batches.flat(), items, 'every count and note survives in its original order');
  for (const batch of batches) {
    assert(batch.length > 0 && batch.length <= 50);
    assert(Buffer.byteLength(JSON.stringify({ revision: 2147483646, items: batch }), 'utf8') <= 80 * 1024);
  }
  assert.deepEqual(physicalCountBatches([]), []);
  assert.deepEqual(physicalCountBatches(items.map(({ productId, countedQuantity }) => ({ productId, countedQuantity }))).map(batch => batch.length), Array(10).fill(50));
});
