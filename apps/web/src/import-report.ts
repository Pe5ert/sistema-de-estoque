import type { ImportField, ImportIssue } from '@stock/shared';

export const importFieldLabels: Record<ImportField, string> = { name: 'Nome', sku: 'SKU', barcode: 'Código de barras', category: 'Categoria', unit: 'Unidade', minimumStock: 'Estoque mínimo', costPrice: 'Custo', salePrice: 'Venda', initialStock: 'Saldo inicial', imageUrl: 'Imagem URL' };

export function importIssueFieldLabel(field: string): string {
  if (field === 'mapping') return 'Cabeçalho';
  if (field === 'initialEntry') return importFieldLabels.initialStock;
  return Object.hasOwn(importFieldLabels, field) ? importFieldLabels[field as ImportField] : field;
}

export function createImportErrorCsv(issues: readonly ImportIssue[]): string {
  const lines = [['Linha', 'Campo', 'Erro'], ...issues.map(issue => [
    issue.row ? String(issue.row) : 'Cabeçalho',
    importIssueFieldLabel(issue.field),
    issue.message,
  ])];
  // Quoted diagnostics must remain text when opened in a spreadsheet.
  const escape = (value: string) => '"' + (/^\s*[=+\-@]/.test(value) ? "'" : '') + value.replace(/"/g, '""') + '"';
  return '\uFEFF' + lines.map(line => line.map(escape).join(';')).join('\r\n');
}
