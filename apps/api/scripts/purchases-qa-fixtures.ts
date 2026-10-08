import 'reflect-metadata';
import assert from 'node:assert/strict';
import { hash } from 'argon2';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service';

// Opt-in fixture setup for manual browser QA. Refuse application/shared URLs.
const url = process.env.TEST_PURCHASE_DATABASE_URL;
assert(url, 'Set TEST_PURCHASE_DATABASE_URL explicitly.');
const target = new URL(url);
assert(['127.0.0.1', 'localhost'].includes(target.hostname) && target.pathname.endsWith('_purchases_test'));
const db = new PrismaService(new ConfigService({ DATABASE_URL: url }));
async function main() {
  const passwordHash = await hash('ComprasQA2026!');
  for (const role of ['ADMIN', 'MANAGER', 'OPERATOR'] as const) await db.user.upsert({ where: { email: role.toLowerCase() + '@purchases.example.test' }, create: { name: 'QA Compras ' + role, role, email: role.toLowerCase() + '@purchases.example.test', passwordHash }, update: { active: true, passwordHash } });
  const category = await db.category.upsert({ where: { name: 'QA Compras' }, create: { name: 'QA Compras' }, update: {} });
  for (const [sku, name, barcode, unit] of [['COMPRA-QA-001', 'Tecido azul QA', '7890000000011', 'METER'], ['COMPRA-QA-002', 'Botões QA', '7890000000028', 'UNIT']] as const) await db.product.upsert({ where: { sku }, create: { sku, name, barcode, unit, categoryId: category.id, costPrice: '9.99', minimumStock: '120' }, update: {} });
  console.log('Local QA fixtures ready; admin/manager/operator @purchases.example.test. Password: ComprasQA2026!');
}
main().finally(() => db.$disconnect());
