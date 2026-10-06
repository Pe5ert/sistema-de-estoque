import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryInput, CategoryPatch, MovementInput, MovementQuery, ProductCreate, ProductPatch, ProductQuery } from './inventory.dto';

export const productInclude = { category: true } as const;
export const movementInclude = { product: { include: productInclude }, user: { select: { id: true, name: true } } } as const;
export function resultingStock(stock: Prisma.Decimal, quantity: string, type: MovementInput['type']) {
  const amount = new Prisma.Decimal(quantity);
  if (!amount.isFinite() || amount.lte(0)) throw new BadRequestException('A quantidade deve ser maior que zero.');
  const next = type === 'EXIT' || type === 'ADJUSTMENT_OUT' ? stock.minus(amount) : stock.plus(amount);
  if (next.isNegative()) throw new ConflictException('Quantidade indisponível em estoque.');
  if (next.greaterThan('999999999999999.999')) throw new BadRequestException('Saldo excede o limite permitido.');
  return { amount, next };
}
// Database unique constraints remain authoritative under concurrent requests.
export function databaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Prisma 7's PostgreSQL adapter reports constraint.index in its cause;
      // older engines report meta.target. Handle both without exposing DB text.
      const adapter = error.meta?.driverAdapterError as { cause?: { constraint?: unknown } } | undefined;
      const target = JSON.stringify(error.meta?.target ?? adapter?.cause?.constraint ?? '').toLowerCase();
      throw new ConflictException(target.includes('barcode') ? 'Este código de barras já está em uso.' : target.includes('sku') ? 'Este SKU já está em uso.' : 'Este nome já está em uso.');
    }
    if (error.code === 'P2025') throw new NotFoundException('Registro não encontrado.');
    if (error.code === 'P2003') throw new BadRequestException('Categoria ou produto inválido.');
  }
  throw error;
}

@Injectable()
export class InventoryService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  categories() { return this.db.category.findMany({ orderBy: { name: 'asc' } }); }
  async createCategory(data: CategoryInput) {
    if (data.active === null) throw new BadRequestException('Situação não pode ser nula.');
    try { return await this.db.category.create({ data }); } catch (error) { databaseError(error); }
  }
  async patchCategory(id: string, data: CategoryPatch) {
    if (data.name === null || data.active === null) throw new BadRequestException('Nome e situação não podem ser nulos.');
    try { return await this.db.category.update({ where: { id }, data }); } catch (error) { databaseError(error); }
  }
  async products(query: ProductQuery) {
    const where: Prisma.ProductWhereInput = { active: query.active === 'all' ? undefined : query.active !== 'false' };
    if (query.search?.trim()) where.OR = ['name', 'sku', 'barcode'].map(field => ({ [field]: { contains: query.search!.trim(), mode: 'insensitive' } }));
    if (query.category) where.categoryId = query.category;
    const minimum = this.db.product.fields.minimumStock;
    if (query.stockStatus === 'OUT') where.stock = { lte: 0 };
    if (query.stockStatus === 'LOW') where.stock = { gt: 0, lte: minimum };
    if (query.stockStatus === 'NORMAL') where.stock = { gt: minimum };
    if (query.stockStatus === 'ATTENTION') where.stock = { lte: minimum };
    const [items, total] = await this.db.$transaction([
      this.db.product.findMany({ where, include: productInclude, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
      this.db.product.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async product(id: string) {
    const product = await this.db.product.findUnique({ where: { id }, include: productInclude });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    return product;
  }
  lookup(code: string) {
    return this.db.product.findMany({ where: { active: true, OR: [{ sku: { equals: code, mode: 'insensitive' } }, { barcode: code }] }, include: productInclude });
  }
  private async activeCategory(tx: Prisma.TransactionClient, id: string) {
    const category = await tx.category.findUnique({ where: { id } });
    if (!category?.active) throw new BadRequestException('Selecione uma categoria ativa.');
  }
  async createProduct(input: ProductCreate, userId: string) {
    const { initialEntry, ...data } = input;
    if (data.active === null) throw new BadRequestException('Situação não pode ser nula.');
    try {
      return await this.db.$transaction(async tx => {
        await this.activeCategory(tx, data.categoryId);
        const product = await tx.product.create({ data: { ...data, barcode: data.barcode || null, stock: 0 }, include: productInclude });
        if (initialEntry) {
          await this.moveInTransaction(tx, { productId: product.id, type: 'ENTRY', reason: 'INITIAL_STOCK', quantity: initialEntry.quantity }, userId);
          return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: productInclude });
        }
        return product;
      });
    } catch (error) { databaseError(error); }
  }
  // Import-only creation of fresh IDs in the caller's transaction. Initial stock
  // uses the same Decimal domain calculation and creates audit before updating balances.
  async createImportProducts(tx: Prisma.TransactionClient, inputs: ProductCreate[], userId: string, importId: string) {
    const prepared = inputs.map(({ initialEntry, ...data }) => ({ id: randomUUID(), data, initialEntry }));
    const categoryIds = [...new Set(inputs.map(input => input.categoryId))].sort();
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Category" WHERE "id" IN (${Prisma.join(categoryIds.map(id => Prisma.sql`${id}::uuid`))}) ORDER BY "id" FOR SHARE`);
    const active = await tx.category.count({ where: { id: { in: categoryIds }, active: true } });
    if (active !== categoryIds.length) throw new BadRequestException('Selecione uma categoria ativa.');
    await tx.product.createMany({ data: prepared.map(item => ({ ...item.data, id: item.id, barcode: item.data.barcode || null, stock: 0 })) });
    const balances = prepared.flatMap(item => item.initialEntry ? [{ id: item.id, ...resultingStock(new Prisma.Decimal(0), item.initialEntry.quantity, 'ENTRY') }] : []);
    if (balances.length) {
      await tx.stockMovement.createMany({ data: balances.map(item => ({ productId: item.id, userId, type: 'ENTRY', reason: 'INITIAL_STOCK', quantity: item.amount, previousStock: 0, resultingStock: item.next, reference: importId, notes: 'Estoque inicial — importação' })) });
      await tx.$executeRaw(Prisma.sql`UPDATE "Product" AS p SET "stock" = b.stock, "updatedAt" = CURRENT_TIMESTAMP FROM (VALUES ${Prisma.join(balances.map(item => Prisma.sql`(${item.id}::uuid, ${item.next.toFixed(3)}::numeric)`))}) AS b(id,stock) WHERE p."id" = b.id`);
    }
    return { products: prepared.length, movements: balances.length };
  }
  async patchProduct(id: string, data: ProductPatch) {
    for (const key of ['sku', 'name', 'categoryId', 'unit', 'minimumStock', 'active'] as const) {
      if (data[key] === null) throw new BadRequestException('Campos obrigatórios não podem ser nulos.');
    }
    try {
      return await this.db.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${id}::uuid FOR UPDATE`;
        const current = await tx.product.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('Produto não encontrado.');
        if (data.categoryId && data.categoryId !== current.categoryId) await this.activeCategory(tx, data.categoryId);
        return tx.product.update({ where: { id }, data: { ...data, ...(data.barcode === '' ? { barcode: null } : {}) }, include: productInclude });
      });
    } catch (error) { databaseError(error); }
  }
  async moveInTransaction(tx: Prisma.TransactionClient, data: MovementInput, userId: string) {
    // PostgreSQL row lock serializes stock writes for this product only. Read after lock.
    await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${data.productId}::uuid FOR UPDATE`;
    const product = await tx.product.findUnique({ where: { id: data.productId } });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    if (!product.active) throw new BadRequestException('Produto inativo não pode ser movimentado.');
    const { amount, next } = resultingStock(product.stock, data.quantity, data.type);
    const movement = await tx.stockMovement.create({ data: { ...data, quantity: amount, userId, previousStock: product.stock, resultingStock: next } });
    await tx.product.update({ where: { id: product.id }, data: { stock: next } });
    return tx.stockMovement.findUniqueOrThrow({ where: { id: movement.id }, include: movementInclude });
  }
  async move(data: MovementInput, userId: string) {
    if (data.reason === 'INITIAL_STOCK') throw new BadRequestException('Estoque inicial é registrado somente no cadastro do produto.');
    try { return await this.db.$transaction(tx => this.moveInTransaction(tx, data, userId)); } catch (error) { databaseError(error); }
  }
  async movements(query: MovementQuery) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if ((from && !Number.isFinite(from.getTime())) || (to && !Number.isFinite(to.getTime())) || (from && to && from > to)) throw new BadRequestException('Período inválido.');
    const where: Prisma.StockMovementWhereInput = { productId: query.productId, type: query.type, reason: query.reason, createdAt: { gte: from, lte: to } };
    if (query.search?.trim()) where.product = { OR: ['name', 'sku', 'barcode'].map(field => ({ [field]: { contains: query.search!.trim(), mode: 'insensitive' } })) };
    const [items, total] = await this.db.$transaction([
      this.db.stockMovement.findMany({ where, include: movementInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
      this.db.stockMovement.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async movement(id: string) {
    const item = await this.db.stockMovement.findUnique({ where: { id }, include: movementInclude });
    if (!item) throw new NotFoundException('Movimento não encontrado.');
    return item;
  }
}
