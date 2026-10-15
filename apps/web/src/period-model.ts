import { calendarDate } from './dashboard-model';
const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
export function operationalDate(now = new Date()) {
  const parts = formatter.formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}
export function periodDates(days: number, now = new Date()) {
  const to = operationalDate(now), start = new Date(to + 'T12:00:00Z');
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString().slice(0, 10), to };
}
export function invalidPeriod(from: string, to: string) {
  return Boolean((from && !calendarDate(from)) || (to && !calendarDate(to)) || (from && to && from > to));
}

const boundaries = new Map<string, string>();
// Find the actual calendar-day boundary, including historical DST transitions.
export function operationalBoundary(date: string, end = false) {
  if (!calendarDate(date)) return '';
  const key = date + (end ? ':end' : ':start');
  const cached = boundaries.get(key); if (cached) return cached;
  const day = Number(date.replaceAll('-', '')), nominal = Date.parse(date + 'T00:00:00Z');
  let low = nominal - 12 * 3600000, high = nominal + 36 * 3600000;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const current = Number(operationalDate(new Date(middle)).replaceAll('-', ''));
    if (end ? current > day : current >= day) high = middle; else low = middle + 1;
  }
  const result = new Date(low - (end ? 1 : 0)).toISOString();
  if (boundaries.size > 200) boundaries.clear(); boundaries.set(key, result); return result;
}
