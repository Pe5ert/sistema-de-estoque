import assert from 'node:assert/strict';
import { test } from 'node:test';
import { URL } from 'node:url';
import { calendarDate, groupMovementDays, historyLink } from '../src/dashboard-model.ts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { MovementChart, StockChart, CategoryChart } from '../src/DashboardCharts.tsx';

test('30/90 day grouping preserves records, dates and zero intervals without summing incompatible units', () => {
  for (const period of [7, 30, 90]) {
    const days = Array.from({ length: period }, (_, index) => ({ date: new Date(Date.UTC(2026, 6, index + 1)).toISOString().slice(0, 10), entryRecords: index % 4, exitRecords: index % 3, entries: '99999', exits: '0.001' }));
    for (const size of [1, 3, 5, 7, 15]) {
      const groups = groupMovementDays(days, size);
      assert.equal(groups[0].from, days[0].date); assert.equal(groups.at(-1).to, days.at(-1).date);
      assert.equal(groups.reduce((sum, group) => sum + group.entries, 0), days.reduce((sum, day) => sum + day.entryRecords, 0));
      assert.equal(groups.reduce((sum, group) => sum + group.exits, 0), days.reduce((sum, day) => sum + day.exitRecords, 0));
    }
  }
  assert.deepEqual(groupMovementDays([], 1), []);
  assert.throws(() => groupMovementDays([], 0));
});
test('drill-down encodes interval, type and SKU; malformed calendar dates do not reach History', () => {
  const params = new URL('https://example.test' + historyLink('2026-10-01', '2026-10-09', 'ENTRY', 'SKU & 1')).searchParams;
  assert.equal(params.get('type'), 'ENTRY'); assert.equal(params.get('q'), 'SKU & 1');
  assert.equal(params.get('from'), '2026-10-01'); assert.equal(params.get('to'), '2026-10-09');
  for (const date of [null, '', '2026-02-30', '2026-13-01', 'abc']) assert.equal(calendarDate(date), '');
  assert.equal(calendarDate('2024-02-29'), '2024-02-29');
});

test('zero-data dashboard charts retain useful links, recovery and a textual alternative without invalid scale', () => {
  const summary = { products: 0, normal: 0, low: 0, out: 0, categories: [], periodDays: 7, from: '2026-10-03', to: '2026-10-09', days: Array.from({ length: 7 }, (_, index) => ({ date: '2026-10-0' + (index + 3), entryRecords: 0, exitRecords: 0, entries: '0', exits: '0' })) };
  const render = component => renderToStaticMarkup(createElement(MemoryRouter, null, component));
  const movements = render(createElement(MovementChart, { summary, requested: 30, busy: false, error: true, change() {}, retry() {} }));
  assert(movements.includes('Falha ao atualizar')); assert(movements.includes('Tentar novamente'));
  assert(movements.includes('Consultar dados em tabela')); assert(movements.includes('scaleY(0)'));
  assert(!movements.includes('NaN')); assert(!movements.includes('<table'));
  const empty = render(createElement(MovementChart, { summary, requested: 7, busy: false, error: false, change() {}, retry() {} }));
  assert(empty.includes('Nenhuma entrada ou saída neste período.'));
  assert(render(createElement(StockChart, { summary })).includes('Nenhum produto ativo.'));
  assert(render(createElement(CategoryChart, { summary })).includes('Nenhum produto ativo para comparar.'));
});
