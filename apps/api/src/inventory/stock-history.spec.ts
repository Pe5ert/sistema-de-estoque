import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma } from '../generated/prisma/client';
import { auditedStockHistory } from './stock-history';
const decimal = (n: string) => new Prisma.Decimal(n);
const event = (id: string, previous: string, next: string, quantity: string, day: number, type: 'ENTRY' | 'EXIT' = 'ENTRY') => ({ id, previousStock: decimal(previous), resultingStock: decimal(next), quantity: decimal(quantity), createdAt: new Date(Date.UTC(2026, 9, day)), type, reason: 'OTHER' as const });
test('history uses audited opening balance, exact decimals and complete chronological events', () => {
  const events = [event('a', '0', '0.3', '0.3', 1), event('b', '0.3', '0.1', '0.2', 3, 'EXIT')];
  const result = auditedStockHistory(decimal('0.1'), events, new Date('2026-10-02Z'), new Date('2026-10-04Z'));
  assert.equal(result.complete, true); assert.equal(result.openingStock, '0.3'); assert.equal(result.events.length, 1); assert.equal(result.events[0].resultingStock, '0.1');
  assert.equal(auditedStockHistory(decimal('0'), [], new Date(), new Date()).complete, true);
});
test('partial, inconsistent, excessive and ambiguous chronological histories never become a chart', () => {
  const from = new Date('2026-10-01Z'), to = new Date('2026-10-04Z');
  for (const events of [[event('a', '2', '3', '1', 1)], [event('a', '0', '3', '1', 1)], Array(5001).fill(event('a', '0', '1', '1', 1))]) assert.equal(auditedStockHistory(decimal('3'), events, from, to).complete, false);
  assert.equal(auditedStockHistory(decimal('1'), [], from, to).complete, false);
});
