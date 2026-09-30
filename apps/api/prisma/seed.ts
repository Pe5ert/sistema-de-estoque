import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { hash } from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });

const connectionString = process.env.DATABASE_URL;
const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (
  !connectionString ||
  !adminEmail ||
  !adminPassword ||
  adminPassword.length < 8
) {
  throw new Error(
    'Configure DATABASE_URL, SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD (mínimo 8 caracteres) no .env.',
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
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrador de desenvolvimento',
      email: adminEmail,
      passwordHash: await hash(adminPassword, 12),
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
  .catch((error: unknown) => {
    console.error('Falha no seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
