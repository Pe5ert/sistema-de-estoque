import type { ProductUnit, UserRole } from './index';

export const physicalInventoryStatuses = ['DRAFT', 'COMPLETED', 'CANCELLED'] as const;
export type PhysicalInventoryStatus = typeof physicalInventoryStatuses[number];
export const MAX_PHYSICAL_INVENTORY_PRODUCTS = 500;
export const MAX_PHYSICAL_INVENTORY_COUNT_UPDATES = 50;
export const canCompletePhysicalInventory = (role: UserRole | undefined) => role === 'ADMIN' || role === 'MANAGER';
export interface PhysicalInventorySummary {
  id: string; title: string; status: PhysicalInventoryStatus; revision: number;
  categoryId: string | null; categoryName: string | null;
  createdBy: { id: string; name: string };
  completedBy: { id: string; name: string } | null;
  cancelledBy: { id: string; name: string } | null;
  createdAt: string; updatedAt: string; completedAt: string | null; cancelledAt: string | null;
  cancellationNotes: string | null; adjustmentCount: number;
  totalItems: number; countedItems: number; divergentItems: number; conflictedItems: number;
}
export interface PhysicalInventoryItemRecord {
  productId: string; sku: string; name: string; unit: ProductUnit;
  snapshotStock: string; snapshotUpdatedAt: string;
  countedQuantity: string | null; notes: string | null;
  countedById: string | null; countedAt: string | null;
  currentStock: string; currentUpdatedAt: string; currentActive: boolean; currentUnit: ProductUnit;
  divergence: string | null; conflict: boolean;
}
export interface PhysicalInventoryRecord extends PhysicalInventorySummary { items: PhysicalInventoryItemRecord[]; }
export interface PhysicalInventoryCreate { title: string; categoryId?: string; }
export interface PhysicalInventoryCountInput {
  revision: number;
  items: { productId: string; countedQuantity: string | null; notes?: string | null }[];
}
export interface PhysicalInventoryRevisionInput { revision: number; }
export interface PhysicalInventoryCancelInput extends PhysicalInventoryRevisionInput { notes?: string | null; }
