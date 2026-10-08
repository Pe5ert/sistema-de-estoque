import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { hasPermission, type Permission } from '@stock/shared';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService, movementInclude, productInclude } from '../inventory/inventory.service';
import { OrderInput, OrderQuery, OrderUpdate, ReceiptInput, SupplierInput, SupplierPatch, SupplierQuery } from './purchases.dto';

const actor = { select: { id: true, name: true } } as const;
const receiptInclude = { creator: actor, items: { include: { movement: { include: movementInclude } } } } as const;
const orderInclude = { supplier: true, creator: actor, items: { include: { product: { include: productInclude } }, orderBy: { sku: 'asc' as const } }, receipts: { include: receiptInclude, orderBy: { createdAt: 'desc' as const } } } as const;
const maximumMoney = new Prisma.Decimal('9999999999999999.99');
export function receiptHash(orderId: string, input: ReceiptInput) {
  return createHash('sha256').update(JSON.stringify({ orderId, notes: input.notes ?? null, items: input.items.map(item => ({ orderItemId: item.orderItemId, quantity: new Prisma.Decimal(item.quantity).toString() })).sort((a, b) => a.orderItemId.localeCompare(b.orderItemId)) })).digest('hex');
}
function unique(ids: string[]) { if (new Set(ids).size !== ids.length) throw new BadRequestException('Não repita o mesmo produto ou item na operação.'); }
function positive(value: string) { const amount = new Prisma.Decimal(value); if (!amount.isFinite() || amount.lte(0) || amount.gt('999999999999999.999')) throw new BadRequestException('Informe uma quantidade positiva dentro do limite.'); return amount; }

@Injectable()
export class PurchasesService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(InventoryService) private readonly inventory: InventoryService) {}
  private async authorize(tx: Prisma.TransactionClient, userId: string, permission: Permission) {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR SHARE`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user?.active || !hasPermission(user.role, permission)) throw new ForbiddenException('Você não tem permissão para esta ação.');
  }
  async suppliers(query: SupplierQuery) {
    const where: Prisma.SupplierWhereInput = { active: query.active === 'all' ? undefined : query.active !== 'false' };
    if (query.search?.trim()) where.OR = ['name', 'tradeName', 'document', 'email', 'contact'].map(field => ({ [field]: { contains: field === 'document' ? query.search!.replace(/[.\-/\s]/g, '').toUpperCase() : query.search!.trim(), mode: 'insensitive' } }));
    const [items, total, active, inactive] = await this.db.$transaction([
      this.db.supplier.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
      this.db.supplier.count({ where }), this.db.supplier.count({ where: { active: true } }), this.db.supplier.count({ where: { active: false } }),
    ]);
    return { items, total, page: query.page, limit: query.limit, overview: { active, inactive } };
  }
  async supplier(id: string) {
    const record = await this.db.supplier.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Fornecedor não encontrado.'); return record;
  }
  async saveSupplier(data: SupplierInput | SupplierPatch, userId: string, id?: string) {
    if (data.name === null || data.active === null) throw new BadRequestException('Nome e situação não podem ser nulos.');
    try {
      return await this.db.$transaction(async tx => {
        await this.authorize(tx, userId, 'supplier.manage');
        if (id) { await tx.$queryRaw`SELECT "id" FROM "Supplier" WHERE "id" = ${id}::uuid FOR UPDATE`; if (!await tx.supplier.findUnique({ where: { id } })) throw new NotFoundException('Fornecedor não encontrado.'); }
        return id ? tx.supplier.update({ where: { id }, data }) : tx.supplier.create({ data: data as SupplierInput });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Este CPF/CNPJ já está em uso.');
      throw error;
    }
  }
  async orders(query: OrderQuery) {
    const where: Prisma.PurchaseOrderWhereInput = { supplierId: query.supplierId, status: query.status };
    if (query.search?.trim()) {
      const search = query.search.trim(), number = Number(search.replace(/^PC-?/i, ''));
      where.OR = [{ supplierName: { contains: search, mode: 'insensitive' } }, { items: { some: { OR: [{ sku: { contains: search, mode: 'insensitive' } }, { productName: { contains: search, mode: 'insensitive' } }] } } }];
      if (Number.isSafeInteger(number) && number > 0 && number <= 2147483647) where.OR.push({ number });
    }
    const [items, total] = await this.db.$transaction([this.db.purchaseOrder.findMany({ where, include: orderInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit }), this.db.purchaseOrder.count({ where })]);
    return { items, total, page: query.page, limit: query.limit };
  }
  async order(id: string) { const order = await this.db.purchaseOrder.findUnique({ where: { id }, include: orderInclude }); if (!order) throw new NotFoundException('Pedido não encontrado.'); return order; }
  private async lockOrder(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT "id" FROM "PurchaseOrder" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const order = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Pedido não encontrado.'); return order;
  }
  private async prepare(tx: Prisma.TransactionClient, input: OrderInput) {
    await tx.$queryRaw`SELECT "id" FROM "Supplier" WHERE "id" = ${input.supplierId}::uuid FOR SHARE`;
    const supplier = await tx.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier?.active) throw new BadRequestException('Selecione um fornecedor ativo.');
    unique(input.items.map(item => item.productId));
    const ids = input.items.map(item => item.productId).sort();
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))}) ORDER BY "id" FOR SHARE`);
    const products = await tx.product.findMany({ where: { id: { in: ids }, active: true } });
    if (products.length !== ids.length) throw new BadRequestException('Selecione somente produtos ativos.');
    const items = input.items.map(item => {
      const product = products.find(product => product.id === item.productId)!;
      const quantity = positive(item.quantity), unitCost = new Prisma.Decimal(item.unitCost);
      if (!unitCost.isFinite() || unitCost.lt(0) || unitCost.gt(maximumMoney)) throw new BadRequestException('Informe um custo válido.');
      const total = quantity.mul(unitCost).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      if (total.gt(maximumMoney)) throw new BadRequestException('Valor do item excede o limite.');
      return { productId: product.id, productName: product.name, sku: product.sku, unit: product.unit, quantity, unitCost, total };
    });
    const total = items.reduce((sum, item) => sum.plus(item.total), new Prisma.Decimal(0));
    if (total.gt(maximumMoney)) throw new BadRequestException('Valor do pedido excede o limite.');
    return { supplierId: supplier.id, supplierName: supplier.name, supplierDocument: supplier.document, total, notes: input.notes ?? null, items };
  }
  async saveOrder(input: OrderInput | OrderUpdate, userId: string, id?: string) {
    return this.db.$transaction(async tx => {
      await this.authorize(tx, userId, 'purchase.manage');
      if (id) {
        const current = await this.lockOrder(tx, id);
        if (current.status !== 'DRAFT') throw new ConflictException('Somente rascunhos podem ser editados.');
        if (current.revision !== (input as OrderUpdate).revision) throw new ConflictException('O pedido foi atualizado por outra pessoa. Recarregue antes de continuar.');
      }
      const { items, ...header } = await this.prepare(tx, input);
      if (id) {
        await tx.purchaseOrderItem.deleteMany({ where: { orderId: id } });
        return tx.purchaseOrder.update({ where: { id }, data: { ...header, revision: { increment: 1 }, items: { create: items } }, include: orderInclude });
      }
      return tx.purchaseOrder.create({ data: { ...header, createdBy: userId, items: { create: items } }, include: orderInclude });
    });
  }
  async transition(id: string, revision: number, action: 'send' | 'cancel', userId: string) {
    return this.db.$transaction(async tx => {
      await this.authorize(tx, userId, 'purchase.manage');
      const order = await this.lockOrder(tx, id);
      if (order.revision !== revision) throw new ConflictException('O pedido foi atualizado por outra pessoa. Recarregue antes de continuar.');
      if (action === 'send') {
        if (order.status !== 'DRAFT') throw new ConflictException('Somente rascunhos podem ser enviados.');
        const prepared = await this.prepare(tx, { supplierId: order.supplierId, items: order.items.map(item => ({ productId: item.productId, quantity: item.quantity.toString(), unitCost: item.unitCost.toString() })) });
        if (prepared.items.some(item => item.unit !== order.items.find(original => original.productId === item.productId)!.unit)) throw new ConflictException('A unidade de um produto mudou. Revise o pedido antes de continuar.');
      } else if (!['DRAFT', 'SENT', 'PARTIALLY_RECEIVED'].includes(order.status)) throw new ConflictException('Este pedido não pode ser cancelado.');
      return tx.purchaseOrder.update({ where: { id }, data: { status: action === 'send' ? 'SENT' : 'CANCELLED', revision: { increment: 1 }, ...(action === 'send' ? { sentAt: new Date() } : { cancelledAt: new Date() }) }, include: orderInclude });
    });
  }
  async receipt(orderId: string, receiptId: string) {
    const receipt = await this.db.purchaseReceipt.findUnique({ where: { id: receiptId }, include: receiptInclude });
    if (!receipt || receipt.orderId !== orderId.toLowerCase()) throw new NotFoundException('Recebimento não encontrado.'); return receipt;
  }
  async receive(orderId: string, input: ReceiptInput, userId: string) {
    orderId = orderId.toLowerCase();
    input = { ...input, receiptId: input.receiptId.toLowerCase(), items: input.items.map(item => ({ ...item, orderItemId: item.orderItemId.toLowerCase() })) };
    unique(input.items.map(item => item.orderItemId));
    input.items.forEach(item => positive(item.quantity));
    const requestHash = receiptHash(orderId, input);
    return this.db.$transaction(async tx => {
      await this.authorize(tx, userId, 'purchase.receive');
      // Serialize a receipt ID globally, including collision with another order.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${input.receiptId}::text, 0))`;
      const order = await this.lockOrder(tx, orderId);
      const previous = await tx.purchaseReceipt.findUnique({ where: { id: input.receiptId }, include: receiptInclude });
      if (previous) {
        if (previous.orderId !== orderId || previous.requestHash !== requestHash) throw new ConflictException('Identificador de recebimento já usado com outros dados.');
        return { receipt: previous, repeated: true };
      }
      if (!['SENT', 'PARTIALLY_RECEIVED'].includes(order.status)) throw new ConflictException('Este pedido não está disponível para recebimento.');
      const entries = input.items.map(entry => {
        const item = order.items.find(item => item.id === entry.orderItemId);
        if (!item) throw new BadRequestException('Item não pertence a este pedido.');
        const quantity = positive(entry.quantity);
        if (quantity.gt(item.quantity.minus(item.received))) throw new ConflictException('Quantidade superior ao saldo pendente do pedido.');
        return { item, quantity };
      }).sort((a, b) => a.item.productId.localeCompare(b.item.productId));
      // Stable product lock order avoids deadlocks across multi-product receipts.
      const ids = entries.map(entry => entry.item.productId);
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(ids.map(id => Prisma.sql`${id}::uuid`))}) ORDER BY "id" FOR UPDATE`);
      const currentProducts = await tx.product.findMany({ where: { id: { in: ids } }, select: { id: true, unit: true } });
      if (entries.some(entry => currentProducts.find(product => product.id === entry.item.productId)?.unit !== entry.item.unit)) throw new ConflictException('A unidade de um produto mudou. Revise o pedido antes de continuar.');
      await tx.purchaseReceipt.create({ data: { id: input.receiptId, orderId, createdBy: userId, requestHash, notes: input.notes ?? null } });
      for (const { item, quantity } of entries) {
        const movement = await this.inventory.moveInTransaction(tx, { productId: item.productId, type: 'ENTRY', reason: 'PURCHASE', quantity: quantity.toString(), reference: input.receiptId, notes: `Pedido PC-${order.number.toString().padStart(6, '0')} · ${order.supplierName}` }, userId);
        await tx.purchaseReceiptItem.create({ data: { receiptId: input.receiptId, orderItemId: item.id, quantity, movementId: movement.id } });
        await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { received: item.received.plus(quantity) } });
      }
      const remaining = await tx.purchaseOrderItem.findMany({ where: { orderId } });
      const complete = remaining.every(item => item.received.eq(item.quantity));
      await tx.purchaseOrder.update({ where: { id: orderId }, data: { status: complete ? 'RECEIVED' : 'PARTIALLY_RECEIVED', revision: { increment: 1 } } });
      return { receipt: await tx.purchaseReceipt.findUniqueOrThrow({ where: { id: input.receiptId }, include: receiptInclude }), repeated: false };
    }, { timeout: 15000, maxWait: 10000 });
  }
}
