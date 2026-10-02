import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { movementInclude, productInclude } from './inventory.service';

@Injectable()
export class DashboardService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async summary() {
    return this.db.$transaction(async tx => {
      const [metrics] = await tx.$queryRaw<Array<{ units: string; products: number; normal: number; low: number; out: number; costValue: string; productsWithoutCost: number }>>`
        SELECT COALESCE(sum("stock"),0)::text AS units, count(*)::int AS products,
          count(*) FILTER (WHERE "stock" > "minimumStock")::int AS normal,
          count(*) FILTER (WHERE "stock" > 0 AND "stock" <= "minimumStock")::int AS low,
          count(*) FILTER (WHERE "stock" <= 0)::int AS out,
          COALESCE(sum("stock" * "costPrice"),0)::text AS "costValue",
          count(*) FILTER (WHERE "costPrice" IS NULL)::int AS "productsWithoutCost"
        FROM "Product" WHERE active = true`;
      const [today] = await tx.$queryRaw<Array<{ entries: number; exits: number; adjustments: number }>>`
        SELECT count(*) FILTER (WHERE type = 'ENTRY')::int AS entries,
          count(*) FILTER (WHERE type = 'EXIT')::int AS exits,
          count(*) FILTER (WHERE type IN ('ADJUSTMENT_IN','ADJUSTMENT_OUT'))::int AS adjustments
        FROM "StockMovement" WHERE ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date`;
      const days = await tx.$queryRaw<Array<{ date: string; entries: string; exits: string; entryRecords: number; exitRecords: number }>>`
        WITH days AS (SELECT generate_series((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date - 6,
          (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date, interval '1 day')::date AS day)
        SELECT to_char(days.day,'YYYY-MM-DD') AS date,
          COALESCE(sum(m.quantity) FILTER (WHERE m.type = 'ENTRY'),0)::text AS entries,
          COALESCE(sum(m.quantity) FILTER (WHERE m.type = 'EXIT'),0)::text AS exits,
          count(m.id) FILTER (WHERE m.type = 'ENTRY')::int AS "entryRecords",
          count(m.id) FILTER (WHERE m.type = 'EXIT')::int AS "exitRecords"
        FROM days LEFT JOIN "StockMovement" m ON (m."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date = days.day
        GROUP BY days.day ORDER BY days.day`;
      const priorities = await tx.product.findMany({ where: { active: true, stock: { lte: this.db.product.fields.minimumStock } }, include: productInclude, orderBy: [{ stock: 'asc' }, { name: 'asc' }], take: 8 });
      const recent = await tx.stockMovement.findMany({ include: movementInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 5 });
      return { ...metrics, today, days, priorities, recent, timezone: 'America/Sao_Paulo' };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
