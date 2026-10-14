import test from 'node:test';
import assert from 'node:assert/strict';
import { lockPageScroll } from '../src/scroll-lock.ts';

test('overlapping menu/dialog locks restore scrolling only after both release', () => {
  const previousDocument = globalThis.document;
  globalThis.document = { body: { style: { overflow: 'auto' } } };
  try {
    const menu = lockPageScroll(), dialog = lockPageScroll();
    assert.equal(globalThis.document.body.style.overflow, 'hidden');
    menu(); menu();
    assert.equal(globalThis.document.body.style.overflow, 'hidden');
    dialog();
    assert.equal(globalThis.document.body.style.overflow, 'auto');
    const first = lockPageScroll(), second = lockPageScroll();
    second(); first();
    assert.equal(globalThis.document.body.style.overflow, 'auto');
  } finally { globalThis.document = previousDocument; }
});
