import { z } from 'zod';
import type { ProductPresentation } from './inventory-model';

export const productUnits = [
  ['un', 'UN · Unidade'], ['cx', 'CX · Caixa'], ['pct', 'PCT · Pacote'], ['kg', 'KG · Quilograma'],
  ['g', 'G · Grama'], ['l', 'L · Litro'], ['ml', 'ML · Mililitro'], ['m', 'M · Metro'],
] as const;

// Keep typing free. Accept decimal comma/dot and pt-BR grouped monetary values.
export function normalizeDecimal(value: string, precision: number): string | null {
  let text = value.trim().replace(/^R\$\s*/, '').replace(/\s/g, '');
  if (!text || !/^[\d.,]+$/.test(text)) return null;
  if (text.includes(',')) {
    if ((text.match(/,/g) ?? []).length !== 1) return null;
    const [whole, fraction] = text.split(',');
    if (!/^\d+$/.test(whole) && !/^\d{1,3}(\.\d{3})+$/.test(whole)) return null;
    text = whole.replace(/\./g, '') + '.' + fraction;
  } else if ((text.match(/\./g) ?? []).length > 1 || (precision === 2 && /^\d{1,3}(\.\d{3})+$/.test(text))) {
    if (!/^\d{1,3}(\.\d{3})+$/.test(text)) return null;
    text = text.replace(/\./g, '');
  }
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${precision}})?$`).test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const integer = whole.replace(/^0+(?=\d)/, '');
  if (integer.length > (precision === 2 ? 16 : 15)) return null;
  return integer + (fraction ? '.' + fraction : '');
}

// Numbers are only used for bounded presentation/step buttons, never API money.
export function parseDecimal(value: string, precision: number): number | null {
  const text = normalizeDecimal(value, precision);
  if (text === null) return null;
  const [whole, fraction = ''] = text.split('.');
  if (!Number.isSafeInteger(Number(whole + fraction.padEnd(precision, '0')))) return null;
  const result = Number(text);
  return Number.isFinite(result) ? result : null;
}

export const formatQuantity = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
export const editableNumber = (value?: number | null) => value == null ? '' : String(value).replace('.', ',');

export interface ProductFormValues {
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  cost: string;
  sale: string;
  minimum: string;
  initialMode: 'none' | 'entry';
  initialQuantity: string;
  description: string;
  active: boolean;
}

export function productFormDefaults(product?: ProductPresentation): ProductFormValues {
  return {
    sku: product?.sku ?? '', barcode: product?.barcode ?? '', name: product?.name ?? '',
    category: product?.categoryId ?? '', unit: product?.unit ?? 'un', cost: product?.record.costPrice?.replace('.', ',') ?? '',
    sale: product?.record.salePrice?.replace('.', ',') ?? '', minimum: product?.record.minimumStock.replace('.', ',') ?? '0',
    initialMode: 'none', initialQuantity: '', description: product?.description ?? '', active: product?.active ?? true,
  };
}

export function validateProductForm(values: ProductFormValues, editing = false) {
  return z.object({
    sku: z.string().trim().min(1, 'SKU obrigatório.').max(80, 'Use até 80 caracteres.'),
    barcode: z.string().trim().max(80, 'Use até 80 caracteres.'),
    name: z.string().trim().min(1, 'Nome obrigatório.').max(200, 'Use até 200 caracteres.'),
    category: z.string().min(1, 'Selecione a categoria.'),
    unit: z.string().refine((value) => productUnits.some(([unit]) => unit === value), 'Selecione uma unidade.'),
    cost: z.string().refine((value) => !value.trim() || normalizeDecimal(value, 2) !== null, 'Informe um custo válido, como 19,90.'),
    sale: z.string().refine((value) => !value.trim() || normalizeDecimal(value, 2) !== null, 'Informe um preço válido, como 29,90.'),
    minimum: z.string().refine((value) => normalizeDecimal(value, 3) !== null, 'Informe um mínimo válido, como 0 ou 2,5.'),
    initialMode: z.enum(['none', 'entry']), initialQuantity: z.string(), description: z.string().trim().max(10000, 'Use até 10000 caracteres.'), active: z.boolean(),
  }).superRefine((data, context) => {
    if (!editing && data.initialMode === 'entry') {
      const quantity = normalizeDecimal(data.initialQuantity, 3);
      if (quantity === null || BigInt(quantity.replace('.', '')) === 0n) context.addIssue({ code: 'custom', path: ['initialQuantity'], message: 'A entrada inicial precisa ser maior que zero.' });
    }
  }).safeParse(values);
}
