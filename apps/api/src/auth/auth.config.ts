import type { CookieOptions } from 'express';
import type { ConfigService } from '@nestjs/config';

export const SESSION_COOKIE = 'stock_session';
export const SESSION_SECONDS = 8 * 60 * 60;

export function sessionCookieOptions(config: ConfigService): CookieOptions {
  const web = new URL(config.getOrThrow<string>('WEB_ORIGIN'));
  const localHttp = web.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(web.hostname);
  return {
    httpOnly: true,
    secure: config.getOrThrow<string>('NODE_ENV') === 'production' || !localHttp,
    sameSite: 'lax',
    path: '/',
  };
}
