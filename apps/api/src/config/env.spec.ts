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

test('backup settings have safe monthly defaults and reject invalid schedules', () => {
  const input = { JWT_SECRET: randomBytes(32).toString('hex'), DATABASE_URL: 'postgresql://local:local@localhost/test', WEB_ORIGIN: 'http://localhost:5173' };
  const defaults = validateEnv(input);
  assert.equal(defaults.BACKUP_AUTO_ENABLED, true);
  assert.equal(defaults.BACKUP_HOUR, '02:00');
  assert.equal(defaults.BACKUP_RETENTION_DAYS, 365);
  assert.equal(validateEnv({ ...input, BACKUP_AUTO_ENABLED: 'false' }).BACKUP_AUTO_ENABLED, false);
  for (const settings of [{ BACKUP_AUTO_ENABLED: 'yes' }, { BACKUP_HOUR: '25:00' }, { BACKUP_RETENTION_DAYS: '0' }, { BACKUP_TIME_ZONE: 'invalid-zone' }]) {
    assert.throws(() => validateEnv({ ...input, ...settings }));
  }
});
