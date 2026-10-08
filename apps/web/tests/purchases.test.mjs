import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scaled, decimalString, money, itemCents } from '../src/purchase-model.ts';
test('purchase subtotal uses half-up cents and preserves PostgreSQL precision', () => {
  assert.equal(itemCents('1,125', '1,23'), 138n);
  assert.equal(itemCents('0,5', '0,01'), 1n);
  assert.equal(itemCents('0,499', '0,01'), 0n);
  assert.equal(money('9999999999999999.99'), 'R$ 9.999.999.999.999.999,99');
  assert.equal(scaled('999999999999999.999', 3), 999999999999999999n);
  assert.equal(decimalString(scaled('100', 3) - scaled('60', 3)), '40');
  assert.equal(itemCents('-1', '1'), null);
  assert.equal(itemCents('abc', '1'), null);
});
