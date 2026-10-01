import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { argon2id, hash } from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });

const connectionString = process.env.DATABASE_URL;
const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (
  !connectionString ||
  !adminEmail ||
  !adminPassword ||
  adminPassword.length < 8 ||
  adminPassword.length > 128 ||
  process.env.NODE_ENV === 'production'
) {
  throw new Error(
    'Configure DATABASE_URL, SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD (8 a 128 caracteres; apenas desenvolvimento) no .env.',
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const samples = [
  {
    sku: 'CAB-USB-C-1M',
    name: 'Cabo USB-C 1 m',
    category: 'Acessórios',
    unit: 'UNIT',
    costPrice: '18.90',
    salePrice: '34.90',
    minimumStock: '8',
    initialStock: '24',
  },
  {
    sku: 'CX-ORG-M',
    name: 'Caixa organizadora M',
    category: 'Organização',
    unit: 'UNIT',
    costPrice: '32.00',
    salePrice: '55.00',
    minimumStock: '5',
    initialStock: '12',
  },
  {
    sku: 'FITA-EMB-48',
    name: 'Fita para embalagem 48 mm',
    category: 'Embalagens',
    unit: 'UNIT',
    costPrice: '5.40',
    salePrice: '9.90',
    minimumStock: '10',
    initialStock: '30',
  },
] as const;

async function main() {
  const passwordHash = await hash(adminPassword!, { type: argon2id });
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      name: 'Administrador de desenvolvimento',
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
    },
  });

  for (const item of samples) {
    const category = await prisma.category.upsert({
      where: { name: item.category },
      update: {},
      create: { name: item.category },
    });

    await prisma.$transaction(async (tx) => {
      const product = await tx.product.upsert({
        where: { sku: item.sku },
        update: {},
        create: {
          sku: item.sku,
          name: item.name,
          categoryId: category.id,
          unit: item.unit,
          costPrice: item.costPrice,
          salePrice: item.salePrice,
          minimumStock: item.minimumStock,
          stock: '0',
        },
      });

      const reference = `seed:${item.sku}`;
      const existingMovement = await tx.stockMovement.findFirst({
        where: { productId: product.id, reference },
      });
      if (!existingMovement && product.stock.isZero()) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            userId: admin.id,
            type: 'ADJUSTMENT_IN',
            quantity: item.initialStock,
            previousStock: '0',
            resultingStock: item.initialStock,
            reason: 'INVENTORY_ADJUSTMENT',
            reference,
            notes: 'Saldo inicial do ambiente de desenvolvimento',
          },
        });
        await tx.product.update({
          where: { id: product.id },
          data: { stock: item.initialStock },
        });
      }
    });
  }

  console.info('Seed de desenvolvimento concluído.');
}

main()
  .catch(() => {
    console.error('Falha no seed. Verifique a configuração e a conexão PostgreSQL.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
