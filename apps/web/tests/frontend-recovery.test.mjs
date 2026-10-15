import assert from 'node:assert/strict';
import { test } from 'node:test';
import React, { createElement } from 'react';
// The API test runner uses the classic JSX transform for imported web components.
globalThis.React = React;
import { renderToStaticMarkup } from 'react-dom/server';
import { DataState, Pagination } from '../src/data-controls.tsx';
import { displayDocument } from '../src/supplier-display.ts';

test('refetch failure retains cached results with an explicit stale-data warning; first-load failure does not expose content', () => {
  const props = { pending: false, error: new Error('Conexão indisponível'), retry() {}, children: createElement('p', null, 'Produto já carregado') };
  const cached = renderToStaticMarkup(createElement(DataState, { ...props, retainContentOnError: true }));
  assert.match(cached, /Produto já carregado/); assert.match(cached, /desatualizados/); assert.match(cached, /Tentar novamente/);
  const initial = renderToStaticMarkup(createElement(DataState, props)); assert.doesNotMatch(initial, /Produto já carregado/);
});
test('one-page result uses singular and omits dead navigation while multiple pages preserve controls', () => {
  const render = total => renderToStaticMarkup(createElement(Pagination, { data: { total, page: 1, limit: 20 }, change() {} }));
  assert.match(render(1), /1 registro ·/); assert.doesNotMatch(render(1), /Anterior|Próxima/); assert.match(render(21), /Anterior/); assert.match(render(21), /Próxima/);
});
test('supplier documents are formatted only for display and malformed values remain visible', () => {
  assert.equal(displayDocument('12345678901'), '123.456.789-01'); assert.equal(displayDocument('12345678000190'), '12.345.678/0001-90'); assert.equal(displayDocument('legado'), 'legado'); assert.equal(displayDocument(null), 'Não informado');
});
