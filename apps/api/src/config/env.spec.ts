import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { validateEnv } from './env';

test('accepts the required local configuration', () => {
  const result = validateEnv({
    JWT_SECRET: randomBytes(32).toString('hex'),
    DATABASE_URL: 'postgresql://local:local@localhost:5432/stock_v2',
    WEB_ORIGIN: 'http://localhost:5173',
  });
  assert.equal(result.API_PORT, 3000);
});

test('rejects an invalid API port', () => {
  assert.throws(() =>
    validateEnv({
      JWT_SECRET: randomBytes(32).toString('hex'),
      DATABASE_URL: 'postgresql://local:local@localhost:5432/stock_v2',
      API_PORT: '99999',
      WEB_ORIGIN: 'http://localhost:5173',
    }),
  );
});

for (const secret of [undefined, '', 'short', ' '.repeat(32)]) {
  test('rejects a missing or short JWT secret', () => {
    assert.throws(() => validateEnv({
      DATABASE_URL: 'postgresql://local:local@localhost:5432/stock_v2',
      WEB_ORIGIN: 'http://localhost:5173', JWT_SECRET: secret,
    }), /JWT_SECRET/);
  });
}

test('rejects wildcard and non-origin WEB_ORIGIN values', () => {
  for (const origin of ['*', 'http://localhost:5173/', 'http://localhost:5173/path']) {
    assert.throws(() => validateEnv({
      DATABASE_URL: 'postgresql://local:local@localhost:5432/stock_v2',
      WEB_ORIGIN: origin, JWT_SECRET: randomBytes(32).toString('hex'),
    }));
  }
});
