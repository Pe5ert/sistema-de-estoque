import type { ProductRecord, ProductUnit, MovementRecord } from './index';
export const purchaseStatuses = ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] as const;
export type PurchaseStatus = typeof purchaseStatuses[number];
export const purchaseStatusLabels: Record<PurchaseStatus, string> = { DRAFT: 'Rascunho', SENT: 'Enviado', PARTIALLY_RECEIVED: 'Parcialmente recebido', RECEIVED: 'Recebido', CANCELLED: 'Cancelado' };
export interface SupplierRecord {
  id: string; name: string; tradeName: string | null; document: string | null; email: string | null;
  phone: string | null; contact: string | null; address: string | null; notes: string | null; active: boolean;
  createdAt: string; updatedAt: string;
}
export interface PurchaseItemRecord {
  id: string; productId: string; productName: string; sku: string; unit: ProductUnit; quantity: string;
  received: string; unitCost: string; total: string; product: ProductRecord;
}
export interface ReceiptRecord {
  id: string; orderId: string; createdAt: string; notes: string | null; creator: { id: string; name: string };
  items: { id: string; orderItemId: string; quantity: string; movementId: string; movement: MovementRecord }[];
}
export interface PurchaseRecord {
  id: string; number: number; supplierId: string; supplierName: string; supplierDocument: string | null;
  status: PurchaseStatus; revision: number; notes: string | null; total: string; createdAt: string; updatedAt: string;
  sentAt: string | null; cancelledAt: string | null; creator: { id: string; name: string }; supplier: SupplierRecord;
  items: PurchaseItemRecord[]; receipts: ReceiptRecord[];
}
