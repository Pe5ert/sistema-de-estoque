import type { DashboardSummary, MovementType } from '@stock/shared';

export function groupMovementDays(days: DashboardSummary['days'], size: number) {
  if (!Number.isInteger(size) || size < 1) throw new Error('Intervalo inválido');
  return Array.from({ length: Math.ceil(days.length / size) }, (_, index) => {
    const group = days.slice(index * size, (index + 1) * size);
    return { from: group[0].date, to: group[group.length - 1].date,
      entries: group.reduce((sum, day) => sum + day.entryRecords, 0),
      exits: group.reduce((sum, day) => sum + day.exitRecords, 0) };
  });
}
export const shortDay = (date: string) => date.slice(8, 10) + '/' + date.slice(5, 7);
export function historyLink(from: string, to: string, type?: MovementType, search?: string) {
  const params = new URLSearchParams({ from, to });
  if (type) params.set('type', type);
  if (search) params.set('q', search);
  return '/history?' + params.toString();
}
export function calendarDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
}
