// Cria/ajusta o .env para o Codespace: front e API na mesma origem (Vite faz proxy de /api).
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const { CODESPACE_NAME, GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: domain } = process.env;
if (!existsSync('.env')) copyFileSync('.env.example', '.env');
let env = readFileSync('.env', 'utf8');
const set = (key, value, onlyIfEmpty = false) => {
  const re = new RegExp(`^${key}=(.*)$`, 'm');
  const cur = env.match(re);
  if (onlyIfEmpty && cur && cur[1].trim()) return;
  env = cur ? env.replace(re, `${key}=${value}`) : `${env.trimEnd()}\n${key}=${value}\n`;
};
set('JWT_SECRET', randomBytes(32).toString('hex'), true);
set('BACKUP_AUTO_ENABLED', 'false');
set('VITE_API_URL', '/api');
set('WEB_ORIGIN', CODESPACE_NAME && domain ? `https://${CODESPACE_NAME}-5173.${domain}` : 'http://localhost:5173');
writeFileSync('.env', env);
console.info('.env pronto. Login da demo: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD do .env.');
