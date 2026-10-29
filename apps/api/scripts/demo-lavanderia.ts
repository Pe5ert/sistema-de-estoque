/**
 * Dados de demonstração: lavanderia industrial que vende e aluga EPI.
 * Uso (somente desenvolvimento, após `pnpm db:seed`):
 *   pnpm --filter @stock/api exec tsx scripts/demo-lavanderia.ts
 * Gera ~60 dias de histórico com datas retroativas. Recusa rodar se já houver produtos de demo.
 */
import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient, type Customer, type MovementReason, type MovementType, type ProductUnit, type Supplier } from '../src/generated/prisma/client';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });

const connectionString = process.env.DATABASE_URL;
const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
if (!connectionString || !adminEmail || process.env.NODE_ENV === 'production') {
  throw new Error('Configure DATABASE_URL e SEED_ADMIN_EMAIL no .env (apenas desenvolvimento).');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const D = (v: number | string) => new Prisma.Decimal(v);

// RNG determinístico: a demo sai igual toda vez que o banco for recriado.
let seed = 20261028;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]) => arr[int(0, arr.length - 1)];

const DAYS = 60;
const now = new Date();
// Horário comercial em Brasília (UTC-3, como a interface), independente do fuso da máquina.
function at(daysAgo: number, hour = int(7, 17)) {
  const d = new Date(now.getTime() - daysAgo * 86400000 - 3 * 3600000);
  d.setUTCHours(hour + 3, int(0, 59), int(0, 59), 0);
  return d > now ? new Date(now.getTime() - int(5, 120) * 60000) : d;
}

type Item = {
  sku: string; name: string; category: string; unit: ProductUnit;
  cost: string; price: string; min: number; initial: number;
  saleRate: number; // saídas por venda/dia (média)
  rental?: boolean; internal?: boolean; endLow?: boolean;
};

const items: Item[] = [
  { sku: 'EPI-LUV-NIT-M', name: 'Luva nitrílica descartável M (cx 100)', category: 'Proteção das mãos', unit: 'BOX', cost: '28.50', price: '46.90', min: 20, initial: 90, saleRate: 1.6 },
  { sku: 'EPI-LUV-NIT-G', name: 'Luva nitrílica descartável G (cx 100)', category: 'Proteção das mãos', unit: 'BOX', cost: '28.50', price: '46.90', min: 20, initial: 70, saleRate: 1.4, endLow: true },
  { sku: 'EPI-LUV-RAS-09', name: 'Luva de raspa cano curto tam. 9', category: 'Proteção das mãos', unit: 'UNIT', cost: '9.80', price: '18.50', min: 30, initial: 120, saleRate: 2.2 },
  { sku: 'EPI-LUV-PVC-45', name: 'Luva PVC forrada 45 cm', category: 'Proteção das mãos', unit: 'UNIT', cost: '14.20', price: '26.90', min: 15, initial: 50, saleRate: 0.9 },
  { sku: 'EPI-BOT-PVC-40', name: 'Bota PVC branca cano longo nº 40', category: 'Calçados de segurança', unit: 'UNIT', cost: '42.00', price: '79.90', min: 6, initial: 24, saleRate: 0.35, rental: true },
  { sku: 'EPI-BOT-PVC-42', name: 'Bota PVC branca cano longo nº 42', category: 'Calçados de segurança', unit: 'UNIT', cost: '42.00', price: '79.90', min: 6, initial: 18, saleRate: 0.4, rental: true, endLow: true },
  { sku: 'EPI-BTN-ACO-41', name: 'Botina de segurança bico de aço nº 41', category: 'Calçados de segurança', unit: 'UNIT', cost: '68.00', price: '119.90', min: 5, initial: 20, saleRate: 0.3 },
  { sku: 'EPI-AVT-PVC', name: 'Avental PVC impermeável 1,20 m', category: 'Vestimentas', unit: 'UNIT', cost: '16.90', price: '32.00', min: 12, initial: 60, saleRate: 0.8, rental: true },
  { sku: 'EPI-JAL-BRA-G', name: 'Jaleco brim branco G', category: 'Vestimentas', unit: 'UNIT', cost: '38.00', price: '69.90', min: 10, initial: 45, saleRate: 0.3, rental: true },
  { sku: 'EPI-UNI-BRI-M', name: 'Uniforme brim calça + camisa M', category: 'Vestimentas', unit: 'UNIT', cost: '74.00', price: '129.00', min: 10, initial: 60, saleRate: 0.25, rental: true },
  { sku: 'EPI-PFF2', name: 'Respirador PFF2 sem válvula', category: 'Proteção respiratória', unit: 'UNIT', cost: '2.70', price: '5.90', min: 100, initial: 500, saleRate: 9 },
  { sku: 'EPI-MSC-DESC', name: 'Máscara descartável tripla (cx 50)', category: 'Proteção respiratória', unit: 'BOX', cost: '11.00', price: '22.90', min: 15, initial: 40, saleRate: 0.9, endLow: true },
  { sku: 'EPI-OCU-INC', name: 'Óculos de proteção incolor', category: 'Proteção visual e auditiva', unit: 'UNIT', cost: '6.40', price: '13.90', min: 20, initial: 80, saleRate: 1.2 },
  { sku: 'EPI-PRT-PLUG', name: 'Protetor auricular plug silicone', category: 'Proteção visual e auditiva', unit: 'UNIT', cost: '1.90', price: '4.50', min: 50, initial: 300, saleRate: 4 },
  { sku: 'EPI-TOU-DESC', name: 'Touca descartável sanfonada (pct 100)', category: 'Descartáveis', unit: 'PACK', cost: '12.50', price: '24.90', min: 10, initial: 35, saleRate: 0.7 },
  { sku: 'LAV-DET-IND-20', name: 'Detergente industrial alcalino 20 L', category: 'Insumos de lavagem', unit: 'UNIT', cost: '138.00', price: '0', min: 4, initial: 14, saleRate: 0, internal: true },
  { sku: 'LAV-ALV-CLO-5', name: 'Alvejante clorado 5 L', category: 'Insumos de lavagem', unit: 'UNIT', cost: '19.90', price: '0', min: 8, initial: 30, saleRate: 0, internal: true, endLow: true },
  { sku: 'LAV-AMA-5', name: 'Amaciante concentrado 5 L', category: 'Insumos de lavagem', unit: 'UNIT', cost: '27.50', price: '0', min: 6, initial: 20, saleRate: 0, internal: true },
  { sku: 'LAV-SACO-HAMP', name: 'Saco hamper hospitalar 100 L', category: 'Insumos de lavagem', unit: 'UNIT', cost: '3.20', price: '6.50', min: 50, initial: 250, saleRate: 3 },
];

const customers = [
  { code: 'CLI-001', name: 'Hospital São Lucas' },
  { code: 'CLI-002', name: 'Frigorífico Boa Carne' },
  { code: 'CLI-003', name: 'Hotel Praia Mar' },
  { code: 'CLI-004', name: 'Construtora Horizonte' },
  { code: 'CLI-005', name: 'Restaurante Sabor do Sertão' },
  { code: 'CLI-006', name: 'Clínica Vida Plena' },
];

const suppliers = [
  { name: 'Nordeste EPI Distribuidora Ltda', tradeName: 'Nordeste EPI', document: '11222333000181', phone: '(85) 3333-1200', contact: 'Márcia' },
  { name: 'Química Limpa Industrial Ltda', tradeName: 'Química Limpa', document: '44555666000172', phone: '(85) 3444-5600', contact: 'Rogério' },
];

async function main() {
  const found = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!found) throw new Error('Usuário admin não encontrado. Rode `pnpm db:seed` antes.');
  const admin = await prisma.user.update({ where: { id: found.id }, data: { name: 'Gestor GAVYO' } });
  if (await prisma.product.count({ where: { sku: { startsWith: 'EPI-' } } })) {
    throw new Error('Dados de demo já existem. Recrie o banco (docker compose down -v) para gerar de novo.');
  }

  const cats = new Map<string, string>();
  for (const name of new Set(items.map((i) => i.category))) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    cats.set(name, c.id);
  }
  const custRows: Customer[] = [];
  for (const c of customers) custRows.push(await prisma.customer.upsert({ where: { code: c.code }, update: {}, create: c }));
  const supRows: Supplier[] = [];
  for (const s of suppliers) supRows.push(await prisma.supplier.upsert({ where: { document: s.document }, update: {}, create: s }));

  // 1) Produtos e histórico simulado em memória, em ordem cronológica por produto.
  type Mv = { type: MovementType; reason: MovementReason; qty: number; at: Date; notes?: string; reference?: string; customer?: (typeof custRows)[number] | null; anonymous?: boolean; purchase?: boolean };
  const plan = new Map<string, { product: { id: string }; item: Item; mvs: Mv[] }>();

  for (const item of items) {
    const product = await prisma.product.create({
      data: {
        sku: item.sku, name: item.name, categoryId: cats.get(item.category)!, unit: item.unit,
        costPrice: item.cost, salePrice: item.price === '0' ? null : item.price,
        minimumStock: item.min, stock: 0,
        description: item.rental ? 'Disponível para venda e aluguel.' : item.internal ? 'Consumo interno da lavanderia.' : null,
      },
    });
    const mvs: Mv[] = [{ type: 'ENTRY', reason: 'INITIAL_STOCK', qty: item.initial, at: at(DAYS, 8), notes: 'Saldo de implantação' }];
    let stock = item.initial;
    for (let day = DAYS - 1; day >= 0; day--) {
      const weekend = at(day).getDay() % 6 === 0;
      if (weekend && rand() < 0.7) continue;
      const tail = item.endLow && day < 12 ? 1.8 : 1; // acelera consumo no fim para gerar alerta
      if (item.saleRate > 0) {
        const n = Math.round(item.saleRate * tail * (0.4 + rand() * 1.2));
        if (n > 0 && stock - n >= 0) {
          const ident = rand() < 0.75;
          mvs.push({ type: 'EXIT', reason: 'SALE', qty: n, at: at(day), customer: ident ? pick(custRows) : null, anonymous: !ident, reference: `PED-${int(1000, 9999)}` });
          stock -= n;
        }
      }
      if (item.internal && rand() < 0.55) {
        const n = int(1, 2) * (tail > 1 ? 2 : 1);
        if (stock - n >= 0) { mvs.push({ type: 'EXIT', reason: 'INTERNAL_USE', qty: n, at: at(day), notes: 'Consumo na lavagem' }); stock -= n; }
      }
      if (item.rental && rand() < 0.18) {
        const n = int(2, 6);
        if (stock - n >= 0) {
          const c = pick(custRows);
          mvs.push({ type: 'EXIT', reason: 'OTHER', qty: n, at: at(day), notes: `Saída para aluguel – ${c.name}`, reference: `ALG-${int(100, 999)}` });
          stock -= n;
          const back = day - int(5, 15);
          if (back >= 0) {
            const lost = rand() < 0.15 ? 1 : 0;
            mvs.push({ type: 'ENTRY', reason: 'RETURN', qty: n - lost, at: at(back), notes: `Devolução de aluguel – ${c.name}` });
            if (lost) mvs.push({ type: 'EXIT', reason: 'LOSS', qty: 0, at: at(back), notes: 'Peça danificada na devolução' }); // placeholder, ajustado abaixo
          }
        }
      }
      // Reposição por compra quando cai abaixo do mínimo (exceto itens que devem terminar baixos).
      if (stock < item.min * 1.6 && !(item.endLow && day < 14) && day > 2) {
        const n = item.initial - stock;
        mvs.push({ type: 'ENTRY', reason: 'PURCHASE', qty: n, at: at(day, 16), purchase: true });
        stock += n;
      }
    }
    // perdas: substitui placeholder por 1 unidade
    for (const m of mvs) if (m.reason === 'LOSS' && m.qty === 0) m.qty = 1;
    mvs.sort((a, b) => a.at.getTime() - b.at.getTime());
    plan.set(item.sku, { product, item, mvs });
  }

  // 2) Grava movimentos recalculando saldos na ordem real (devoluções podem cair depois de outras saídas).
  const purchaseMvs: Array<{ sku: string; movementId: string; qty: number; at: Date }> = [];
  for (const { product, item, mvs } of plan.values()) {
    let stock = D(0);
    const rows: Prisma.StockMovementCreateManyInput[] = [];
    for (const m of mvs) {
      const out = m.type === 'EXIT' || m.type === 'ADJUSTMENT_OUT';
      if (out && stock.lt(m.qty)) continue; // nunca negativo
      const prev = stock;
      stock = out ? stock.minus(m.qty) : stock.plus(m.qty);
      const id = randomUUID();
      const sale = m.reason === 'SALE';
      rows.push({
        id, productId: product.id, userId: admin.id, type: m.type, reason: m.reason,
        quantity: m.qty, previousStock: prev, resultingStock: stock, createdAt: m.at,
        notes: m.notes ?? null, reference: m.reference ?? null,
        customerId: sale && m.customer ? m.customer.id : null,
        buyerIdentification: sale ? (m.customer ? 'IDENTIFIED' : 'ANONYMOUS') : null,
        customerNameSnapshot: sale && m.customer ? m.customer.name : null,
        customerCodeSnapshot: sale && m.customer ? m.customer.code : null,
      });
      if (m.purchase) purchaseMvs.push({ sku: item.sku, movementId: id, qty: m.qty, at: m.at });
    }
    // Devoluções de aluguel entram depois na linha do tempo; garante que os itens críticos terminem abaixo do mínimo.
    if (item.endLow && stock.gte(item.min)) {
      const target = Math.floor(item.min / 2);
      const qty = stock.minus(target);
      const c = custRows[0];
      rows.push({
        id: randomUUID(), productId: product.id, userId: admin.id, type: 'EXIT', reason: 'SALE',
        quantity: qty, previousStock: stock, resultingStock: D(target), createdAt: new Date(((rows.at(-1)?.createdAt as Date | undefined)?.getTime() ?? now.getTime() - 3600000) / 2 + now.getTime() / 2),
        reference: `PED-${int(1000, 9999)}`, customerId: c.id, buyerIdentification: 'IDENTIFIED',
        customerNameSnapshot: c.name, customerCodeSnapshot: c.code,
      });
      stock = D(target);
    }
    await prisma.$transaction([
      prisma.stockMovement.createMany({ data: rows }),
      prisma.product.update({ where: { id: product.id }, data: { stock } }),
    ]);
  }

  // 3) Pedidos de compra recebidos ligados às entradas por compra.
  const supplierFor = (sku: string) => (sku.startsWith('LAV-') && !sku.includes('SACO') ? supRows[1] : supRows[0]);
  const byDay = new Map<string, typeof purchaseMvs>();
  for (const p of purchaseMvs) {
    const key = `${supplierFor(p.sku).id}|${p.at.toISOString().slice(0, 10)}`;
    byDay.set(key, [...(byDay.get(key) ?? []), p]);
  }
  for (const group of byDay.values()) {
    const sup = supplierFor(group[0].sku);
    const when = group[0].at;
    const created = new Date(when.getTime() - 3 * 86400000);
    const lines = group.map((g) => ({ g, info: plan.get(g.sku)! }));
    const total = lines.reduce((s, l) => s.plus(D(l.info.item.cost).times(l.g.qty)), D(0));
    const order = await prisma.purchaseOrder.create({
      data: {
        supplierId: sup.id, supplierName: sup.name, supplierDocument: sup.document, createdBy: admin.id,
        status: 'RECEIVED', total, createdAt: created, sentAt: created,
        items: { create: lines.map(({ g, info }) => ({
          productId: info.product.id, productName: info.item.name, sku: info.item.sku, unit: info.item.unit,
          quantity: g.qty, received: g.qty, unitCost: info.item.cost, total: D(info.item.cost).times(g.qty),
        })) },
      },
      include: { items: true },
    });
    const receiptId = randomUUID();
    await prisma.purchaseReceipt.create({
      data: {
        id: receiptId, orderId: order.id, createdBy: admin.id, createdAt: when,
        requestHash: createHash('sha256').update(receiptId).digest('hex'),
        items: { create: lines.map(({ g, info }) => ({
          orderItemId: order.items.find((i) => i.productId === info.product.id)!.id, quantity: g.qty, movementId: g.movementId,
        })) },
      },
    });
    await prisma.stockMovement.updateMany({ where: { id: { in: group.map((g) => g.movementId) } }, data: { reference: receiptId, notes: `Pedido PC-${order.number.toString().padStart(6, '0')} · ${sup.name}` } });
  }

  // 4) Um pedido enviado e ainda não recebido, para os itens que terminaram abaixo do mínimo.
  const low = items.filter((i) => i.endLow && !i.sku.startsWith('LAV-'));
  const sent = new Date(now.getTime() - 2 * 86400000);
  await prisma.purchaseOrder.create({
    data: {
      supplierId: supRows[0].id, supplierName: supRows[0].name, supplierDocument: supRows[0].document, createdBy: admin.id,
      status: 'SENT', createdAt: sent, sentAt: sent, notes: 'Reposição urgente – previsão de entrega em 5 dias',
      total: low.reduce((s, i) => s.plus(D(i.cost).times(i.initial)), D(0)),
      items: { create: low.map((i) => ({
        productId: plan.get(i.sku)!.product.id, productName: i.name, sku: i.sku, unit: i.unit,
        quantity: i.initial, unitCost: i.cost, total: D(i.cost).times(i.initial),
      })) },
    },
  });

  const count = await prisma.stockMovement.count({ where: { product: { sku: { startsWith: 'EPI-' } } } });
  console.info(`Demo pronta: ${items.length} produtos, ${customers.length} clientes, ${suppliers.length} fornecedores, ${byDay.size + 1} pedidos, ${count}+ movimentos de EPI.`);
}

main()
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
