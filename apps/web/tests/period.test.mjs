import assert from 'node:assert/strict';
import { test } from 'node:test';
import { operationalDate, periodDates, invalidPeriod, operationalBoundary } from '../src/period-model.ts';
test('operational periods use Sao Paulo days across UTC midnight and month/leap-year boundaries', () => {
  const now = new Date('2024-03-01T01:00:00Z');
  assert.equal(operationalDate(now), '2024-02-29');
  assert.deepEqual(periodDates(7, now), { from: '2024-02-23', to: '2024-02-29' });
  assert.deepEqual(periodDates(1, now), { from: '2024-02-29', to: '2024-02-29' });
  assert(invalidPeriod('2026-02-30', '2026-03-01')); assert(invalidPeriod('2026-10-03', '2026-10-02'));
  assert(!invalidPeriod('2026-10-03', '2026-10-03')); assert(!invalidPeriod('', ''));
});

test('custom calendar boundaries include historical DST and the complete final day', () => {
  assert.equal(operationalBoundary('2026-10-15'), '2026-10-15T03:00:00.000Z');
  assert.equal(operationalBoundary('2026-10-15', true), '2026-10-16T02:59:59.999Z');
  assert.equal(operationalBoundary('2018-11-04'), '2018-11-04T03:00:00.000Z');
  assert.equal(operationalBoundary('2018-11-04', true), '2018-11-05T01:59:59.999Z');
});
