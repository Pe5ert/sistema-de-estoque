import type { MovementReason, MovementType, ProductRecord, ProductUnit } from '@stock/shared';
export interface ProductPresentation {
  id: string; sku: string; barcode?: string | null; name: string; description?: string | null;
  category: string; categoryId: string; unit: string; stock: number; minimum: number;
  imageUrl?: string | null; price?: number | null; costPrice?: number | null; active: boolean; record: ProductRecord;
}
export const unitCodes: Record<ProductUnit, string> = { UNIT: 'un', BOX: 'cx', PACK: 'pct', KG: 'kg', G: 'g', LITER: 'l', ML: 'ml', METER: 'm' };
export function apiUnit(unit: string): ProductUnit { return (Object.entries(unitCodes).find(([, code]) => code === unit)?.[0] ?? 'UNIT') as ProductUnit; }
export function presentProduct(record: ProductRecord): ProductPresentation {
  return { id: record.id, sku: record.sku, name: record.name, barcode: record.barcode, category: record.category.name,
    categoryId: record.categoryId, description: record.description, imageUrl: record.imageUrl, unit: unitCodes[record.unit],
    stock: Number(record.stock), minimum: Number(record.minimumStock), price: record.salePrice == null ? null : Number(record.salePrice),
    costPrice: record.costPrice == null ? null : Number(record.costPrice), active: record.active, record };
}
export function stockStatus(stock: number, minimum: number) {
  if (stock <= 0) return { label: 'Sem estoque', tone: 'danger' } as const;
  if (stock <= minimum) return { label: 'Estoque baixo', tone: 'warning' } as const;
  return { label: 'Em estoque', tone: 'success' } as const;
}
export const reasonLabels: Record<MovementReason, string> = { INITIAL_STOCK: 'Estoque inicial', PURCHASE: 'Compra', SALE: 'Venda', INTERNAL_USE: 'Uso interno', RETURN: 'Devolução', LOSS: 'Perda', INVENTORY_ADJUSTMENT: 'Ajuste de inventário', OTHER: 'Outro' };
export const typeLabels: Record<MovementType, string> = { ENTRY: 'Entrada', EXIT: 'Saída', ADJUSTMENT_IN: 'Ajuste de entrada', ADJUSTMENT_OUT: 'Ajuste de saída' };
export const dateLabel = (value: string) => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
export const isExit = (type: MovementType) => type === 'EXIT' || type === 'ADJUSTMENT_OUT';
