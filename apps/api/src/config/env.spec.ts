import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateEnv } from './env';

test('accepts the required local configuration', () => {
  const result = validateEnv({
    DATABASE_URL: 'postgresql://local:local@localhost:5432/stock_v2',
    WEB_ORIGIN: 'http://localhost:5173',
  });
  assert.equal(result.API_PORT, 3000);
});

test('rejects an invalid API port', () => {
  assert.throws(() =>
    validateEnv({
      DATABASE_URL: 'postgresql://local:local@localhost:5432/stock_v2',
      API_PORT: '99999',
      WEB_ORIGIN: 'http://localhost:5173',
    }),
  );
});
