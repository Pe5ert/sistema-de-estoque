// Contratos de domínio independentes de Nest, Prisma e da interface.
export const userRoles = ['ADMIN', 'MANAGER', 'OPERATOR'] as const;
export type UserRole = (typeof userRoles)[number];

export const productUnits = [
  'UNIT',
  'BOX',
  'PACK',
  'KG',
  'G',
  'LITER',
  'ML',
  'METER',
] as const;
export type ProductUnit = (typeof productUnits)[number];

export const movementTypes = [
  'ENTRY',
  'EXIT',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
] as const;
export type MovementType = (typeof movementTypes)[number];

export const movementReasons = [
  'INITIAL_STOCK',
  'PURCHASE',
  'SALE',
  'INTERNAL_USE',
  'RETURN',
  'LOSS',
  'INVENTORY_ADJUSTMENT',
  'OTHER',
] as const;
export type MovementReason = (typeof movementReasons)[number];

// Decimal values travel as strings; API never rounds money through binary floats.
export interface CategoryRecord { id: string; name: string; description: string | null; active: boolean; }
export interface ProductRecord {
  id: string; sku: string; barcode: string | null; name: string; description: string | null;
  imageUrl: string | null; categoryId: string; category: CategoryRecord; unit: ProductUnit;
  costPrice: string | null; salePrice: string | null; stock: string; minimumStock: string;
  active: boolean; createdAt: string; updatedAt: string;
}
export interface MovementRecord {
  id: string; productId: string; product: ProductRecord; type: MovementType; quantity: string;
  previousStock: string; resultingStock: string; reason: MovementReason; reference: string | null;
  notes: string | null; createdAt: string; user: { id: string; name: string };
}
export interface Page<T> { items: T[]; total: number; page: number; limit: number; }
export interface DashboardSummary {
  units: string; products: number; normal: number; low: number; out: number;
  costValue: string; productsWithoutCost: number; priorities: ProductRecord[];
  recent: MovementRecord[]; today: { entries: number; exits: number; adjustments: number };
  days: { date: string; entries: string; exits: string; entryRecords: number; exitRecords: number }[]; timezone: string;
}
export * from './imports';
