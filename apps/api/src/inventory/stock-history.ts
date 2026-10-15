import type { MovementReason, MovementType, ProductStockHistory } from '@stock/shared';
import { Prisma } from '../generated/prisma/client';
type Event = { id: string; createdAt: Date; type: MovementType; reason: MovementReason; quantity: Prisma.Decimal; previousStock: Prisma.Decimal; resultingStock: Prisma.Decimal };
export function auditedStockHistory(stock: Prisma.Decimal, events: Event[], from: Date, to: Date): ProductStockHistory {
  const base = { from: from.toISOString(), to: to.toISOString(), timezone: 'America/Sao_Paulo', openingStock: '0', closingStock: stock.toString(), total: events.length, events: [] };
  if (events.length > 5000) return { ...base, complete: false, message: 'Há mais de 5.000 movimentos. Consulte os registros completos no Histórico.' };
  let previous = new Prisma.Decimal(0);
  for (const event of events) {
    const expected = event.type === 'EXIT' || event.type === 'ADJUSTMENT_OUT' ? event.previousStock.minus(event.quantity) : event.previousStock.plus(event.quantity);
    if (!event.previousStock.equals(previous) || !expected.equals(event.resultingStock)) return { ...base, complete: false, message: 'A sequência temporal não permite confirmar a evolução do saldo. Consulte a auditoria no Histórico.' };
    previous = event.resultingStock;
  }
  if (!previous.equals(stock)) return { ...base, complete: false, message: 'O saldo e a auditoria precisam ser conferidos. Consulte o Histórico.' };
  const before = events.filter(event => event.createdAt < from).at(-1);
  return { ...base, complete: true, openingStock: before?.resultingStock.toString() ?? '0', events: events.filter(event => event.createdAt >= from && event.createdAt <= to).map(event => ({ ...event, createdAt: event.createdAt.toISOString(), quantity: event.quantity.toString(), previousStock: event.previousStock.toString(), resultingStock: event.resultingStock.toString() })) };
}
