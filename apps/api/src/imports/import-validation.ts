import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { z } from 'zod';
import { importFields, type ImportMapping, type ImportCategoryMapping, type ImportIssue } from '@stock/shared';
import { ProductCreate } from '../inventory/inventory.dto';
import type { FileRow } from './import-file';

export const setupSchema = z.object({
  mapping: z.partialRecord(z.enum(importFields), z.number().int().min(0).max(29)),
  categoryMappings: z.array(z.discriminatedUnion('action', [
    z.object({ source: z.string().trim().min(1).max(120), action: z.literal('map'), categoryId: z.uuid() }).strict(),
    z.object({ source: z.string().trim().min(1).max(120), action: z.literal('create'), name: z.string().trim().min(1).max(120) }).strict(),
  ])).max(100),
  revision: z.number().int().positive(),
}).strict().superRefine((value, context) => {
  const keys = value.categoryMappings.map(choice => choice.source.trim().toLocaleLowerCase('pt-BR'));
  if (new Set(keys).size !== keys.length) context.addIssue({ code: 'custom', message: 'Escolha uma ação por categoria.', path: ['categoryMappings'] });
});
export const confirmSchema = z.object({ revision: z.number().int().positive() }).strict();
const placeholderId = '00000000-0000-4000-8000-000000000000';
export const categoryKey = (value: string) => value.trim().toLocaleLowerCase('pt-BR');
const units: Record<string, string> = { un: 'UNIT', unidade: 'UNIT', unit: 'UNIT', cx: 'BOX', caixa: 'BOX', box: 'BOX', pct: 'PACK', pacote: 'PACK', pack: 'PACK', kg: 'KG', quilograma: 'KG', g: 'G', grama: 'G', l: 'LITER', litro: 'LITER', liter: 'LITER', ml: 'ML', mililitro: 'ML', m: 'METER', metro: 'METER', meter: 'METER' };
const fieldMessages: Record<string, string> = { name: 'Nome obrigatório, até 200 caracteres.', sku: 'SKU obrigatório, até 80 caracteres.', barcode: 'Código de barras deve ter até 80 caracteres.', unit: 'Unidade inválida. Use UN, CX, PCT, KG, G, L, ML ou M.', minimumStock: 'Mínimo inválido: número não negativo com até 3 casas.', costPrice: 'Custo inválido: número não negativo com até 2 casas.', salePrice: 'Venda inválida: número não negativo com até 2 casas.', initialEntry: 'Saldo inicial inválido: até 3 casas e não negativo.', imageUrl: 'Imagem deve ser URL HTTP(S) válida, sem credenciais.' };
export type ImportCategory = { id: string; name: string; active: boolean };
export type ValidatedRow = { row: number; category: string; product: ProductCreate; initialStock: string };
export function suggestedMapping(headers: string[]): ImportMapping {
  const aliases: Record<string, typeof importFields[number]> = { nome: 'name', produto: 'name', 'nome do produto': 'name', sku: 'sku', 'ref.': 'sku', referencia: 'sku', 'código de barras': 'barcode', barcode: 'barcode', ean: 'barcode', categoria: 'category', unidade: 'unit', 'estoque mínimo': 'minimumStock', custo: 'costPrice', venda: 'salePrice', 'preço de venda': 'salePrice', 'saldo inicial': 'initialStock', qtd: 'initialStock', 'imagem url': 'imageUrl' };
  const result: ImportMapping = {};
  headers.forEach((name, index) => { const field = aliases[name.trim().toLowerCase()]; if (field && result[field] === undefined) result[field] = index; });
  return result;
}
export function validateImportRows(rows: FileRow[], headers: string[], mapping: ImportMapping, choices: ImportCategoryMapping[], categories: ImportCategory[], existing: { sku: string; barcode: string | null }[]) {
  const issues: ImportIssue[] = [];
  const values = Object.values(mapping);
  for (const field of ['name', 'sku', 'category', 'unit'] as const) if (mapping[field] === undefined) issues.push({ row: 0, field, message: 'Mapeie a coluna obrigatória: ' + ({ name: 'Nome', sku: 'SKU', category: 'Categoria', unit: 'Unidade' })[field] + '.' });
  if (new Set(values).size !== values.length || values.some(value => value >= headers.length)) issues.push({ row: 0, field: 'mapping', message: 'Cada coluna deve corresponder a um único campo, dentro do arquivo.' });
  if (issues.length) return { issues, rows: [] as ValidatedRow[], unknownCategories: [] as string[], newCategories: [] as { source: string; name: string }[] };
  const decision = new Map(choices.map(choice => [categoryKey(choice.source), choice]));
  if (decision.size !== choices.length) throw new BadRequestException('Escolha uma única ação por categoria da planilha.');
  const skuRows = new Map<string, number[]>(), barcodeRows = new Map<string, number[]>();
  const duplicateSku = new Set(existing.map(p => p.sku.toLowerCase()));
  const duplicateBarcode = new Set(existing.flatMap(p => p.barcode ? [p.barcode] : []));
  const unknown = new Map<string, string>(), newCategories = new Map<string, { source: string; name: string }>();
  const normalized: ValidatedRow[] = [];
  for (const source of rows) {
    const issue = (field: string, message: string) => issues.push({ row: source.row, field, message });
    const get = (field: typeof importFields[number]) => {
      const cell = source.cells[mapping[field] ?? -1];
      if (cell?.error) issue(field, cell.error);
      if ((field === 'sku' || field === 'barcode') && cell?.numeric) issue(field, 'Código numérico no Excel. Formate como Texto e confira o original; não é possível recuperar zeros ou dígitos perdidos.');
      return cell?.text.trim() ?? '';
    };
    const sku = get('sku'), barcode = get('barcode'), category = get('category');
    const choice = decision.get(categoryKey(category));
    const matched = categories.filter(c => categoryKey(c.name) === categoryKey(category));
    let categoryId = placeholderId;
    if (!category) issue('category', 'Categoria obrigatória.');
    else if (choice?.action === 'map') {
      const target = categories.find(c => c.id === choice.categoryId && c.active);
      if (target) categoryId = target.id; else issue('category', 'Categoria mapeada não existe ou está inativa. Escolha outra.');
    } else if (choice?.action === 'create') {
      if (categories.some(c => categoryKey(c.name) === categoryKey(choice.name))) issue('category', 'O nome da nova categoria já existe. Mapeie para a categoria ativa correta.');
      else newCategories.set(categoryKey(category), { source: category, name: choice.name });
    } else if (matched.length === 1 && matched[0].active) categoryId = matched[0].id;
    else { if (!unknown.has(categoryKey(category))) unknown.set(categoryKey(category), category); issue('category', 'Categoria desconhecida, inativa ou ambígua. Mapeie ou confirme a criação.'); }
    const decimal = (field: typeof importFields[number], defaultValue: string | null) => {
      const value = get(field);
      if (!value) return defaultValue;
      // No grouping, currency signs, exponent or negative values. Exact strings.
      return value.replace(',', '.');
    };
    const initialStock = decimal('initialStock', '0')!;
    if (!/^\d{1,15}(?:\.\d{1,3})?$/.test(initialStock)) issue('initialStock', 'Saldo inicial inválido: número não negativo, até 3 casas, sem separador de milhar.');
    const input = plainToInstance(ProductCreate, { name: get('name'), sku, barcode: barcode || null, categoryId, unit: units[get('unit').toLowerCase()] ?? '', minimumStock: decimal('minimumStock', '0'), costPrice: decimal('costPrice', null), salePrice: decimal('salePrice', null), imageUrl: get('imageUrl') || null, active: true, ...(/^\d{1,15}(?:\.\d{1,3})?$/.test(initialStock) && /[1-9]/.test(initialStock) ? { initialEntry: { quantity: initialStock } } : {}) });
    for (const error of validateSync(input)) issue(error.property, fieldMessages[error.property] ?? 'Valor inválido.');
    if (duplicateSku.has(sku.toLowerCase())) issue('sku', 'SKU já cadastrado no sistema. Produtos existentes não serão alterados.');
    if (barcode && duplicateBarcode.has(barcode)) issue('barcode', 'Código de barras já cadastrado no sistema.');
    if (sku) skuRows.set(sku.toLowerCase(), [...(skuRows.get(sku.toLowerCase()) ?? []), source.row]);
    if (barcode) barcodeRows.set(barcode, [...(barcodeRows.get(barcode) ?? []), source.row]);
    normalized.push({ row: source.row, category, product: input, initialStock });
  }
  for (const [field, codes] of [['sku', skuRows], ['barcode', barcodeRows]] as const) for (const affected of codes.values()) if (affected.length > 1) for (const row of affected) issues.push({ row, field, message: 'Código repetido no arquivo (linhas ' + affected.slice(0, 10).join(', ') + ').' });
  const newNames = new Map<string, string>();
  for (const item of newCategories.values()) {
    const key = categoryKey(item.name);
    if (newNames.has(key) && newNames.get(key) !== categoryKey(item.source)) issues.push({ row: 0, field: 'category', message: 'Duas categorias da planilha tentam criar o mesmo nome. Mapeie ambas para uma categoria existente.' });
    newNames.set(key, categoryKey(item.source));
  }
  return { issues, rows: normalized, unknownCategories: [...unknown.values()], newCategories: [...newCategories.values()] };
}
