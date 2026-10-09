import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MAX_PHYSICAL_INVENTORY_COUNT_UPDATES, MAX_PHYSICAL_INVENTORY_PRODUCTS, type PhysicalInventoryRecord, type PhysicalInventorySummary } from '@stock/shared';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resultingStock } from '../inventory/inventory.service';
import { PhysicalInventoryCancelDto, PhysicalInventoryCountsDto, PhysicalInventoryCreateDto, PhysicalInventoryQuery } from './physical-inventories.dto';

const actor = { select: { id: true, name: true } } as const;
const include = {
  createdBy: actor, completedBy: actor, cancelledBy: actor,
  items: { orderBy: [{ name: 'asc' }, { productId: 'asc' }], include: { product: { include: { _count: { select: { stockMovements: true } } } } } },
} satisfies Prisma.PhysicalInventoryInclude;
type Inventory = Prisma.PhysicalInventoryGetPayload<{ include: typeof include }>;
type Item = Inventory['items'][number];
const transactionOptions = { maxWait: 10000, timeout: 30000 } as const;

// Counting movements also detects ABA: a balance can change and return to its
// snapshot, even when timestamp precision cannot distinguish very rapid writes.
export function inventoryItemConflict(item: Item) {
  return !item.product.active || item.unit !== item.product.unit || !item.snapshotStock.eq(item.product.stock)
    || item.snapshotUpdatedAt.getTime() !== item.product.updatedAt.getTime()
    || item.snapshotMovementCount !== item.product._count.stockMovements;
}
export function inventoryResponse(inventory: Inventory): PhysicalInventoryRecord {
  const items = inventory.items.map(item => ({
    productId: item.productId, sku: item.sku, name: item.name, unit: item.unit,
    snapshotStock: item.snapshotStock.toFixed(3), snapshotUpdatedAt: item.snapshotUpdatedAt.toISOString(),
    countedQuantity: item.countedQuantity?.toFixed(3) ?? null, notes: item.notes,
    countedById: item.countedById, countedAt: item.countedAt?.toISOString() ?? null,
    currentStock: item.product.stock.toFixed(3), currentUpdatedAt: item.product.updatedAt.toISOString(),
    currentActive: item.product.active, currentUnit: item.product.unit,
    divergence: item.countedQuantity?.minus(item.snapshotStock).toFixed(3) ?? null,
    conflict: inventory.status === 'DRAFT' && inventoryItemConflict(item),
  }));
  return {
    id: inventory.id, title: inventory.title, status: inventory.status, revision: inventory.revision,
    categoryId: inventory.categoryId, categoryName: inventory.categoryName,
    createdBy: inventory.createdBy, completedBy: inventory.completedBy, cancelledBy: inventory.cancelledBy,
    createdAt: inventory.createdAt.toISOString(), updatedAt: inventory.updatedAt.toISOString(),
    completedAt: inventory.completedAt?.toISOString() ?? null, cancelledAt: inventory.cancelledAt?.toISOString() ?? null,
    cancellationNotes: inventory.cancellationNotes, adjustmentCount: inventory.adjustmentCount,
    totalItems: items.length, countedItems: items.filter(item => item.countedQuantity !== null).length,
    divergentItems: items.filter(item => item.divergence !== null && !new Prisma.Decimal(item.divergence).isZero()).length,
    conflictedItems: items.filter(item => item.conflict).length, items,
  };
}

@Injectable()
export class PhysicalInventoriesService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  private async load(tx: Prisma.TransactionClient, id: string) {
    const inventory = await tx.physicalInventory.findUnique({ where: { id }, include });
    if (!inventory) throw new NotFoundException('Inventário não encontrado.');
    return inventory;
  }
  private async lock(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT "id" FROM "PhysicalInventory" WHERE "id" = ${id}::uuid FOR UPDATE`;
    return this.load(tx, id);
  }
  private revision(inventory: Inventory, revision: number) {
    if (inventory.status !== 'DRAFT') throw new ConflictException('Este inventário já foi encerrado.');
    if (inventory.revision !== revision) throw new ConflictException({ message: 'A contagem foi alterada por outra pessoa. Recarregue o inventário antes de continuar.', code: 'INVENTORY_REVISION_CONFLICT', revision: inventory.revision });
  }
  private async lockProducts(tx: Prisma.TransactionClient, inventory: Inventory) {
    const ids = inventory.items.map(item => item.productId).sort();
    if (ids.length) await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))}) ORDER BY "id" FOR UPDATE`);
    return this.load(tx, inventory.id);
  }
  private async change<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
    try { return await this.db.$transaction(operation, transactionOptions); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2028'].includes(error.code)) throw new ConflictException('Outro registro está usando estes produtos. Aguarde e tente novamente.');
      throw error;
    }
  }
  async list(query: PhysicalInventoryQuery) {
    const where = { status: query.status };
    const [records, total] = await this.db.$transaction([
      this.db.physicalInventory.findMany({ where, include, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
      this.db.physicalInventory.count({ where }),
    ]);
    const items: PhysicalInventorySummary[] = records.map(record => {
      const { items: _items, ...summary } = inventoryResponse(record);
      void _items;
      return summary;
    });
    return { items, total, page: query.page, limit: query.limit };
  }
  async get(id: string) { return this.change(async tx => inventoryResponse(await this.load(tx, id))); }
  async create(input: PhysicalInventoryCreateDto, userId: string) {
    return this.change(async tx => {
      const category = input.categoryId ? await tx.category.findUnique({ where: { id: input.categoryId } }) : null;
      if (input.categoryId && !category?.active) throw new BadRequestException('Selecione uma categoria ativa.');
      const products = await tx.product.findMany({ where: { active: true, categoryId: input.categoryId }, orderBy: { id: 'asc' }, take: MAX_PHYSICAL_INVENTORY_PRODUCTS + 1, include: { _count: { select: { stockMovements: true } } } });
      if (!products.length) throw new BadRequestException('Não há produtos ativos para contar neste inventário.');
      if (products.length > MAX_PHYSICAL_INVENTORY_PRODUCTS) throw new BadRequestException(`O inventário aceita até ${MAX_PHYSICAL_INVENTORY_PRODUCTS} produtos. Selecione uma categoria para reduzir a contagem.`);
      // Lock the selected rows and read after waiting, so snapshot balance and
      // movement count refer to the same point in time for each product.
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(products.map(product => Prisma.sql`${product.id}::uuid`))}) ORDER BY "id" FOR UPDATE`);
      const current = await tx.product.findMany({ where: { id: { in: products.map(product => product.id) }, active: true, categoryId: input.categoryId }, include: { _count: { select: { stockMovements: true } } } });
      if (current.length !== products.length) throw new ConflictException('Um produto foi desativado ou mudou de categoria enquanto o inventário era aberto. Tente novamente.');
      const inventory = await tx.physicalInventory.create({ data: {
        title: input.title, categoryId: input.categoryId, categoryName: category?.name ?? null, createdById: userId,
      } });
      await tx.physicalInventoryItem.createMany({ data: current.map(product => ({ inventoryId: inventory.id, productId: product.id, sku: product.sku, name: product.name, unit: product.unit, snapshotStock: product.stock, snapshotUpdatedAt: product.updatedAt, snapshotMovementCount: product._count.stockMovements })) });
      return inventoryResponse(await this.load(tx, inventory.id));
    });
  }
  async counts(id: string, input: PhysicalInventoryCountsDto, userId: string) {
    if (!input.items.length || input.items.length > MAX_PHYSICAL_INVENTORY_COUNT_UPDATES) throw new BadRequestException('Salve de 1 a 50 contagens por vez.');
    if (new Set(input.items.map(item => item.productId)).size !== input.items.length) throw new BadRequestException('Não repita o mesmo produto na contagem.');
    return this.change(async tx => {
      const inventory = await this.lock(tx, id);
      this.revision(inventory, input.revision);
      const ids = new Set(inventory.items.map(item => item.productId));
      if (input.items.some(item => !ids.has(item.productId))) throw new BadRequestException('Produto não pertence a este inventário.');
      for (const item of input.items) {
        // DTO rejects omitted quantities; zero is a counted quantity, null clears it.
        const value = item.countedQuantity === null ? null : new Prisma.Decimal(item.countedQuantity);
        if (value !== null && (!value.isFinite() || value.isNegative() || value.gt('999999999999999.999') || value.decimalPlaces() > 3)) throw new BadRequestException('Contagem inválida. Use quantidade não negativa com até três casas decimais.');
        await tx.physicalInventoryItem.update({ where: { inventoryId_productId: { inventoryId: id, productId: item.productId } }, data: {
          countedQuantity: value, ...(item.notes !== undefined ? { notes: item.notes } : {}), countedById: value === null ? null : userId, countedAt: value === null ? null : new Date(),
        } });
      }
      await tx.physicalInventory.update({ where: { id }, data: { revision: { increment: 1 } } });
      return inventoryResponse(await this.load(tx, id));
    });
  }
  async refresh(id: string, revision: number) {
    return this.change(async tx => {
      let inventory = await this.lock(tx, id);
      this.revision(inventory, revision);
      inventory = await this.lockProducts(tx, inventory);
      const conflicts = inventory.items.filter(inventoryItemConflict);
      const inactive = conflicts.filter(item => !item.product.active);
      if (inactive.length) throw new ConflictException({ message: 'Há produtos desativados neste inventário. Reative os produtos ou cancele a contagem e abra outra.', code: 'INVENTORY_PRODUCT_CONFLICT', productIds: inactive.map(item => item.productId) });
      if (conflicts.length) {
        await tx.$executeRaw(Prisma.sql`UPDATE "PhysicalInventoryItem" AS i SET
          "sku" = p.sku, "name" = p.name, "unit" = p.unit,
          "snapshotStock" = p.stock, "snapshotUpdatedAt" = p.updated,
          "snapshotMovementCount" = p.movements,
          "countedQuantity" = NULL, "countedById" = NULL, "countedAt" = NULL
          FROM (VALUES ${Prisma.join(conflicts.map(item => Prisma.sql`(${item.productId}::uuid, ${item.product.sku}::text, ${item.product.name}::text, ${item.product.unit}::"ProductUnit", ${item.product.stock.toFixed(3)}::numeric, ${item.product.updatedAt}::timestamp, ${item.product._count.stockMovements}::integer)`))}) AS p(id,sku,name,unit,stock,updated,movements)
          WHERE i."inventoryId" = ${id}::uuid AND i."productId" = p.id`);
        await tx.physicalInventory.update({ where: { id }, data: { revision: { increment: 1 } } });
      }
      return inventoryResponse(await this.load(tx, id));
    });
  }
  async complete(id: string, revision: number, userId: string) {
    return this.change(async tx => {
      let inventory = await this.lock(tx, id);
      if (inventory.status === 'COMPLETED') return inventoryResponse(inventory);
      this.revision(inventory, revision);
      inventory = await this.lockProducts(tx, inventory);
      const conflicts = inventory.items.filter(inventoryItemConflict);
      if (conflicts.length) throw new ConflictException({ message: 'O estoque mudou durante a contagem. Atualize os saldos e reconte os produtos alterados antes de concluir.', code: 'INVENTORY_PRODUCT_CONFLICT', productIds: conflicts.map(item => item.productId) });
      if (inventory.items.some(item => item.countedQuantity === null)) throw new BadRequestException('Conte todos os produtos antes de concluir o inventário. Zero também precisa ser informado.');
      const adjustments = inventory.items.flatMap(item => {
        const delta = item.countedQuantity!.minus(item.product.stock);
        if (delta.isZero()) return [];
        const type = delta.isPositive() ? 'ADJUSTMENT_IN' as const : 'ADJUSTMENT_OUT' as const;
        const { amount, next } = resultingStock(item.product.stock, delta.abs().toFixed(3), type);
        return [{ item, type, amount, next }];
      });
      if (adjustments.length) {
        await tx.stockMovement.createMany({ data: adjustments.map(({ item, type, amount, next }) => ({ productId: item.productId, userId, type, quantity: amount, previousStock: item.product.stock, resultingStock: next, reason: 'INVENTORY_ADJUSTMENT', reference: `inventory:${id}`, notes: `Inventário: ${inventory.title}${item.notes ? ` — ${item.notes}` : ''}` })) });
        // All product rows are already locked in UUID order; one batch preserves
        // Decimal precision and the same audit invariants as ordinary movements.
        await tx.$executeRaw(Prisma.sql`UPDATE "Product" AS p SET "stock" = b.stock, "updatedAt" = clock_timestamp() FROM (VALUES ${Prisma.join(adjustments.map(({ item, next }) => Prisma.sql`(${item.productId}::uuid, ${next.toFixed(3)}::numeric)`))}) AS b(id,stock) WHERE p."id" = b.id`);
      }
      await tx.physicalInventory.update({ where: { id }, data: { status: 'COMPLETED', revision: { increment: 1 }, completedById: userId, completedAt: new Date(), adjustmentCount: adjustments.length } });
      return inventoryResponse(await this.load(tx, id));
    });
  }
  async cancel(id: string, input: PhysicalInventoryCancelDto, userId: string) {
    return this.change(async tx => {
      const inventory = await this.lock(tx, id);
      this.revision(inventory, input.revision);
      await tx.physicalInventory.update({ where: { id }, data: { status: 'CANCELLED', revision: { increment: 1 }, cancelledById: userId, cancelledAt: new Date(), cancellationNotes: input.notes ?? null } });
      return inventoryResponse(await this.load(tx, id));
    });
  }
}
