export const physicalStatusLabels = { DRAFT: 'Em contagem', COMPLETED: 'Concluído', CANCELLED: 'Cancelado' };

// Stay below the API's 100 kB JSON limit, including escaped/multibyte notes.
export function physicalCountBatches<T>(items: T[]): T[][] {
  const batches: T[][] = [];
  let batch: T[] = [];
  const encoder = new TextEncoder();
  for (const item of items) {
    const candidate = [...batch, item];
    if (batch.length && (candidate.length > 50 || encoder.encode(JSON.stringify({ revision: 2147483646, items: candidate })).length > 80 * 1024)) {
      batches.push(batch);
      batch = [];
    }
    batch.push(item);
  }
  if (batch.length) batches.push(batch);
  return batches;
}

// Strings and integer thousandths preserve all Decimal(18,3) values, including large balances.
export function normalizePhysicalQuantity(value: string): string | null | undefined {
  const text = value.trim().replace(',', '.');
  if (!text) return null;
  if (!/^\d{1,15}(?:\.\d{1,3})?$/.test(text)) return undefined;
  const [whole, fraction = ''] = text.split('.');
  return `${BigInt(whole)}${fraction ? '.' + fraction.replace(/0+$/, '') : ''}`.replace(/\.$/, '');
}
function thousandths(value: string) {
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^[+-]/, '').split('.');
  return (BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'))) * (negative ? -1n : 1n);
}
export function physicalDifference(count: string, stock: string) {
  const difference = thousandths(count) - thousandths(stock);
  const absolute = difference < 0n ? -difference : difference;
  const fraction = (absolute % 1000n).toString().padStart(3, '0').replace(/0+$/, '');
  return `${difference < 0n ? '-' : ''}${absolute / 1000n}${fraction ? '.' + fraction : ''}`;
}
export function physicalQuantityLabel(value: string, signed = false) {
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^[+-]/, '').split('.');
  const decimal = fraction.replace(/0+$/, '');
  return `${negative ? '−' : signed && thousandths(value) > 0n ? '+' : ''}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${decimal ? ',' + decimal : ''}`;
}
