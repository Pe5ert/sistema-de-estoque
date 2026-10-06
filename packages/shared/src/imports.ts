export const importFields = ['name', 'sku', 'barcode', 'category', 'unit', 'minimumStock', 'costPrice', 'salePrice', 'initialStock', 'imageUrl'] as const;
export type ImportField = typeof importFields[number];
export const PRODUCT_IMPORT_ACTION = 'product.import';
export const canImportProducts = (role?: string) => role === 'ADMIN' || role === 'MANAGER';
export type ImportMapping = Partial<Record<ImportField, number>>;
export type ImportCategoryMapping = { source: string; action: 'map'; categoryId: string } | { source: string; action: 'create'; name: string };
export type ImportIssue = { row: number; field: string; message: string };
export interface ImportResult { products: number; categories: number; movements: number; ignoredRows: number }
export interface ImportPreview {
  id: string; status: 'PREVIEW' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; revision: number;
  fileName: string; format: string; delimiter: string | null; createdAt: string;
  headers: string[]; mapping: ImportMapping; categoryMappings: ImportCategoryMapping[];
  totalRows: number; ignoredRows: number; validRows: number; issues: ImportIssue[];
  unknownCategories: string[]; rows: { row: number; name: string; sku: string; category: string; initialStock: string; unit: string }[];
  result: ImportResult | null; error: string | null;
}
