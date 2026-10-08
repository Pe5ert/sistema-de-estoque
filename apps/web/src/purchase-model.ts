import { normalizeDecimal } from './product-form-model';
export function scaled(value: string, places: number): bigint | null {
  const text = normalizeDecimal(value, places); if (!text) return null;
  const [whole, fraction = ''] = text.split('.'); return BigInt(whole + fraction.padEnd(places, '0'));
}
export function decimalString(value: bigint, places = 3): string {
  const negative = value < 0n; const text = (negative ? -value : value).toString().padStart(places + 1, '0');
  const fraction = text.slice(-places).replace(/0+$/, ''); return (negative ? '-' : '') + text.slice(0, -places) + (fraction ? '.' + fraction : '');
}
export function money(value: string): string {
  const cents = scaled(value, 2); if (cents === null) return '—';
  const text = cents.toString().padStart(3, '0'); return 'R$ ' + text.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + text.slice(-2);
}
export function itemCents(quantity: string, cost: string): bigint | null {
  const q = scaled(quantity, 3), c = scaled(cost, 2); return q === null || c === null ? null : (q * c + 500n) / 1000n;
}
export const orderNumber = (number: number) => 'PC-' + String(number).padStart(6, '0');
