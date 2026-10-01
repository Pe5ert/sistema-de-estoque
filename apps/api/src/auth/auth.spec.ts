import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { Controller, Get, INestApplication, UseGuards, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { argon2id, hash, verify } from 'argon2';
import { UserRole } from '../generated/prisma/client';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { HttpExceptionFilter } from '../common/http-exception.filter';
import { AuthModule } from './auth.module';
import { configureAuthHttp } from './auth.http';
import { SESSION_COOKIE, SESSION_SECONDS, sessionCookieOptions } from './auth.config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles, RolesGuard } from './roles.guard';

// RBAC is exercised through a real guard/controller pair used only by tests.
@Controller('auth-test')
@UseGuards(JwtAuthGuard, RolesGuard)
class RoleProbeController {
  @Get('admin')
  @Roles(UserRole.ADMIN)
  admin() { return { allowed: true }; }
}

describe('cookie authentication HTTP integration', { concurrency: false }, () => {
  let app: INestApplication;
  let base: string;
  let cookie: string;
  let jwt: JwtService;
  const password = 'Development-test-only!';
  const origin = 'http://localhost:5173';
  const account = {
    id: '566d7ca3-903f-47b5-a0e1-9e28d667a286', name: 'Auth test',
    email: 'admin@estoque.local', role: UserRole.ADMIN as UserRole, active: true, passwordHash: '',
  };
  const repository = {
    user: { findUnique: async ({ where }: { where: { email?: string; id?: string } }) =>
      where.email === account.email || where.id === account.id ? { ...account } : null },
  };

  before(async () => {
    account.passwordHash = await hash(password, { type: argon2id });
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({
          JWT_SECRET: randomBytes(32).toString('hex'), NODE_ENV: 'test', WEB_ORIGIN: origin,
        })] }),
        PrismaModule, AuthModule,
      ],
      controllers: [RoleProbeController],
    }).overrideProvider(PrismaService).useValue(repository).compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    configureAuthHttp(app, app.get(ConfigService));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/api`;
    jwt = app.get(JwtService);
  });
  after(async () => { await app?.close(); });

  async function request(path: string, options: RequestInit = {}) {
    return fetch(`${base}${path}`, { ...options, headers: {
      Origin: origin, 'Content-Type': 'application/json', ...options.headers,
    } });
  }
  function login(email: string, enteredPassword = password) {
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: enteredPassword }) });
  }

  test('Argon2id verifies passwords and does not store plaintext', async () => {
    assert.match(account.passwordHash, /^\$argon2id\$/);
    assert.notEqual(account.passwordHash, password);
    assert.equal(await verify(account.passwordHash, password), true);
    assert.equal(await verify(account.passwordHash, 'wrong'), false);
  });

  test('valid normalized login returns only public fields and creates an 8h HttpOnly cookie', async () => {
    const response = await login('  ADMIN@ESTOQUE.LOCAL  ');
    assert.equal(response.status, 200);
    const body = await response.json() as Record<string, unknown>;
    assert.deepEqual(Object.keys(body).sort(), ['email', 'id', 'name', 'role']);
    assert.equal(body.email, account.email);
    const header = response.headers.get('set-cookie')!;
    assert.match(header, /HttpOnly/);
    assert.match(header, /SameSite=Lax/);
    assert.match(header, /Path=\//);
    assert.match(header, /Max-Age=28800/);
    assert.doesNotMatch(header, /; Secure/);
    cookie = header.split(';')[0];
    const token = decodeURIComponent(cookie.slice(`${SESSION_COOKIE}=`.length));
    const payload = await jwt.verifyAsync(token);
    assert.equal(payload.sub, account.id);
    assert.equal(payload.exp - payload.iat, SESSION_SECONDS);
    assert.equal(payload.email, undefined);
    assert.equal(payload.passwordHash, undefined);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  });

  test('wrong password, absent email and inactive account have identical generic errors', async () => {
    const wrong = await login(account.email, 'wrong');
    const missing = await login('missing@estoque.local');
    account.active = false;
    const inactive = await login(account.email);
    account.active = true;
    for (const response of [wrong, missing, inactive]) {
      assert.equal(response.status, 401);
      assert.equal((await response.json() as Record<string, unknown>).message, 'E-mail ou senha inválidos.');
      assert.equal(response.headers.get('set-cookie'), null);
    }
  });

  test('malformed and oversized input is rejected by DTO validation', async () => {
    assert.equal((await login('invalid')).status, 400);
    assert.equal((await login(account.email, 'x'.repeat(129))).status, 400);
    const missing = await request('/auth/login', { method: 'POST', body: '{}' });
    assert.equal(missing.status, 400);
  });

  test('/me restores a valid session without exposing hashes or tokens', async () => {
    const response = await request('/auth/me', { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      id: account.id, name: account.name, email: account.email, role: account.role,
    });
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });

  test('/me rejects missing, invalid, expired and deleted-user sessions', async () => {
    const expired = await jwt.signAsync({ sub: account.id }, { expiresIn: -1 });
    const deleted = await jwt.signAsync({ sub: 'bbda70c8-1c8d-4794-8aa9-569213ab2f19' });
    const malformed = await jwt.signAsync({ sub: 'invalid-subject' });
    for (const token of [undefined, 'invalid', expired, deleted, malformed]) {
      const response = await request('/auth/me', { headers: token ? { Cookie: `${SESSION_COOKIE}=${token}` } : {} });
      assert.equal(response.status, 401);
    }
  });

  test('disabling an account revokes existing access; database role overrides stale JWT', async () => {
    account.active = false;
    try {
      assert.equal((await request('/auth/me', { headers: { Cookie: cookie } })).status, 401);
    } finally { account.active = true; }
    account.role = UserRole.OPERATOR;
    try {
      const response = await request('/auth/me', { headers: { Cookie: cookie } });
      assert.equal((await response.json() as Record<string, unknown>).role, 'OPERATOR');
    } finally { account.role = UserRole.ADMIN; }
  });

  test('RBAC grants ADMIN and rejects MANAGER/OPERATOR with 403', async () => {
    assert.equal((await request('/auth-test/admin', { headers: { Cookie: cookie } })).status, 200);
    for (const role of [UserRole.MANAGER, UserRole.OPERATOR]) {
      account.role = role;
      try {
        assert.equal((await request('/auth-test/admin', { headers: { Cookie: cookie } })).status, 403);
      } finally { account.role = UserRole.ADMIN; }
    }
    assert.equal((await request('/auth-test/admin')).status, 401);
  });

  test('logout clears the cookie with matching attributes and is idempotent', async () => {
    const response = await request('/auth/logout', { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(response.status, 204);
    const header = response.headers.get('set-cookie')!;
    assert.match(header, /^stock_session=;/);
    assert.match(header, /Expires=Thu, 01 Jan 1970/);
    assert.match(header, /HttpOnly/);
    assert.match(header, /SameSite=Lax/);
    assert.match(header, /Path=\//);
    assert.equal((await request('/auth/logout', { method: 'POST' })).status, 204);
  });

  test('production cookie is Secure; development cookie works on local HTTP', () => {
    const production = new ConfigService({ NODE_ENV: 'production', WEB_ORIGIN: origin });
    assert.equal(sessionCookieOptions(production).secure, true);
    assert.equal(sessionCookieOptions(app.get(ConfigService)).secure, false);
    for (const webOrigin of ['https://localhost:5173', 'http://internal.example']) {
      assert.equal(sessionCookieOptions(new ConfigService({ NODE_ENV: 'development', WEB_ORIGIN: webOrigin })).secure, true);
    }
  });

  test('write requests reject untrusted or missing Origin before setting cookies', async () => {
    for (const untrusted of ['https://attacker.example', 'null', '']) {
      for (const path of ['/auth/login', '/auth/logout']) {
        const response = await request(path, { method: 'POST', headers: { Origin: untrusted }, body: '{}' });
        assert.equal(response.status, 403);
        assert.equal(response.headers.get('set-cookie'), null);
      }
    }
  });

  test('Swagger exposes safe user DTO and login body plus cookie security', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().addCookieAuth(SESSION_COOKIE).build());
    const loginDoc = document.paths['/api/auth/login']?.post;
    assert.ok(loginDoc?.requestBody);
    assert.ok(loginDoc.responses['401']);
    assert.ok(loginDoc.responses['429']);
    const user = document.components?.schemas?.UserResponseDto;
    assert.ok(user && 'properties' in user);
    assert.deepEqual(Object.keys(user.properties!).sort(), ['email', 'id', 'name', 'role']);
  });

  test('login is limited to 8 attempts/minute/IP without locking the account', async () => {
    await login(account.email);
    const response = await login(account.email);
    assert.equal(response.status, 429);
    assert.ok(response.headers.get('retry-after'));
    assert.equal(account.active, true);
    assert.equal((await request('/auth/me', { headers: { Cookie: cookie } })).status, 200);
  });
});
