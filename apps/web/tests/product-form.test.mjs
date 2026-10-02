import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeDecimal, parseDecimal, productFormDefaults, validateProductForm } from '../src/product-form-model.ts';

test('Brazilian prices and fractional quantities serialize as exact decimal strings', () => {
  assert.equal(normalizeDecimal('R$ 1.234,50', 2), '1234.50');
  assert.equal(normalizeDecimal('19.90', 2), '19.90');
  assert.equal(normalizeDecimal('0002,005', 3), '2.005');
  assert.equal(normalizeDecimal('1.234', 3), '1.234');
  assert.equal(normalizeDecimal('1.234', 2), '1234');
  assert.equal(normalizeDecimal('9999999999999999,99', 2), '9999999999999999.99');
  assert.equal(normalizeDecimal('999999999999999,999', 3), '999999999999999.999');
});
test('ambiguous, excessive, negative and nondecimal input is rejected', () => {
  for (const value of ['-1', 'NaN', 'Infinity', '1e3', '1,2,3', '1.23,45', '1,234', '10000000000000000']) assert.equal(normalizeDecimal(value, 2), null, value);
  assert.equal(normalizeDecimal('1.0001', 3), null);
  assert.equal(parseDecimal('999999999999999,999', 3), null, 'step buttons do not silently approximate large quantities');
});
test('unknown price stays empty/null-capable and barcode leading zeros survive validation', () => {
  const values = { ...productFormDefaults(), name: 'Cable', sku: 'C-1', category: 'category-id', barcode: '0000123456' };
  assert.equal(values.cost, ''); assert.equal(values.sale, '');
  const result = validateProductForm(values);
  assert.equal(result.success, true); assert.equal(result.data.barcode, '0000123456');
});
test('initial entry must be positive and only affects creation', () => {
  const values = { ...productFormDefaults(), name: 'Cable', sku: 'C-1', category: 'category-id', initialMode: 'entry', initialQuantity: '0' };
  assert.equal(validateProductForm(values).success, false);
  assert.equal(validateProductForm(values, true).success, true);
  assert.equal(validateProductForm({ ...values, initialQuantity: '0,001' }).success, true);
});
test('editing uses exact persisted price/minimum strings, including zero and null', () => {
  const values = productFormDefaults({ id: 'p', name: 'Cable', sku: 'C-1', categoryId: 'c', unit: 'kg', record: { costPrice: '9999999999999999.99', salePrice: '0', minimumStock: '0.001' }, active: false });
  assert.equal(values.cost, '9999999999999999,99'); assert.equal(values.sale, '0'); assert.equal(values.minimum, '0,001'); assert.equal(values.active, false);
});
