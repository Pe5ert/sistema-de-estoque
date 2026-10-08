import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import test from 'node:test';
import { createImportErrorCsv, importIssueFieldLabel } from '../src/import-report.ts';

const requireApi = createRequire(new URL('../../api/package.json', import.meta.url));
const { parse } = requireApi('csv-parse/sync');
const readReport = csv => parse(csv, { bom: true, delimiter: ';' });

test('error report preserves every diagnostic, Portuguese labels and original physical lines', () => {
  const issues = [
    { row: 0, field: 'mapping', message: 'Escolha as colunas obrigatórias.' },
    { row: 2, field: 'barcode', message: 'Código duplicado.' },
    ...Array.from({ length: 60 }, (_, index) => ({ row: index + 3, field: 'name', message: `Erro ${index + 1}` })),
    { row: 90, field: 'constructor', message: 'Campo desconhecido.' },
  ];
  const csv = createImportErrorCsv(issues);
  assert.equal(csv.charCodeAt(0), 0xfeff, 'UTF-8 BOM helps Excel display Portuguese accents');
  assert(csv.startsWith('\uFEFF"Linha";"Campo";"Erro"\r\n'));
  const rows = readReport(csv);
  assert.equal(rows.length, issues.length + 1, 'the export includes errors beyond the fifty shown on screen');
  assert.deepEqual(rows[0], ['Linha', 'Campo', 'Erro']);
  assert.deepEqual(rows[1], ['Cabeçalho', 'Cabeçalho', issues[0].message]);
  assert.deepEqual(rows[2], ['2', 'Código de barras', issues[1].message]);
  assert.deepEqual(rows.slice(3, 63), issues.slice(2, 62).map(issue => [String(issue.row), 'Nome', issue.message]));
  assert.deepEqual(rows.at(-1), ['90', 'constructor', 'Campo desconhecido.']);
});

test('CSV diagnostics round-trip quotes, semicolons and embedded newlines without splitting records', () => {
  const message = 'Categoria "Limpeza; geral" inválida.\nConfira a linha seguinte.\r\nAção: corrigir 🧺.';
  const csv = createImportErrorCsv([{ row: 17, field: 'category', message }]);
  assert(csv.includes('""Limpeza; geral""'));
  assert.deepEqual(readReport(csv), [['Linha', 'Campo', 'Erro'], ['17', 'Categoria', message]]);
});

test('spreadsheet formula prefixes remain inert text, including leading whitespace', () => {
  const values = ['=HYPERLINK("https://example.invalid")', '+SUM(1;2)', '-1+2', '@SUM(1;2)', '  =1+1', '\t+1+1', '\r\n-1+1', ' \t@A1'];
  const issues = values.map((value, index) => ({ row: index + 2, field: value, message: value }));
  const rows = readReport(createImportErrorCsv(issues)).slice(1);
  for (let index = 0; index < values.length; index++) {
    assert.deepEqual(rows[index], [String(index + 2), "'" + values[index], "'" + values[index]]);
    assert(!/^\s*[=+\-@]/.test(rows[index][1]));
    assert(!/^\s*[=+\-@]/.test(rows[index][2]));
  }
});


test('file correction labels distinguish the header from product lines and name initial stock', () => {
  assert.equal(importIssueFieldLabel('mapping'), 'Cabeçalho');
  assert.equal(importIssueFieldLabel('initialEntry'), 'Saldo inicial');
  assert.deepEqual(readReport(createImportErrorCsv([
    { row: 0, field: 'sku', message: 'Use SKU no cabeçalho.' },
    { row: 7, field: 'initialEntry', message: 'Corrija o saldo inicial.' },
  ])), [
    ['Linha', 'Campo', 'Erro'],
    ['Cabeçalho', 'SKU', 'Use SKU no cabeçalho.'],
    ['7', 'Saldo inicial', 'Corrija o saldo inicial.'],
  ]);
});
