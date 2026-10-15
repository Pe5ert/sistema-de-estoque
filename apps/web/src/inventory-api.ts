import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryRecord, DashboardSummary, MovementRecord, Page, ProductRecord } from '@stock/shared';
import { useDebouncedValue } from './motion';
import { apiClient } from './lib/api';
import { presentProduct } from './inventory-model';

export type Filters = Record<string, string | number | undefined>;
export function queryString(filters: Filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.toString();
}
export function useProducts(filters: Filters) {
  const search = useDebouncedValue(filters.search);
  const waiting = search !== filters.search;
  const query = useQuery({ queryKey: ['products', { ...filters, search }], placeholderData: keepPreviousData, queryFn: async ({ signal }) => {
    const page = await apiClient<Page<ProductRecord>>('/products?' + queryString({ ...filters, search }), { signal });
    return { ...page, items: page.items.map(presentProduct) };
  } });
  return { ...query, isFetching: query.isFetching || waiting, isPlaceholderData: query.isPlaceholderData || waiting };
}
export function useProduct(id?: string | null) {
  return useQuery({ queryKey: ['product', id], enabled: Boolean(id), queryFn: async ({ signal }) => presentProduct(await apiClient<ProductRecord>('/products/' + id, { signal })) });
}
export function useCategories() { return useQuery({ queryKey: ['categories'], queryFn: ({ signal }) => apiClient<CategoryRecord[]>('/categories', { signal }) }); }
export function useMovements(filters: Filters, enabled = true) {
  const search = useDebouncedValue(filters.search);
  const waiting = search !== filters.search;
  const settled = { ...filters, search };
  const query = useQuery({ queryKey: ['movements', settled], placeholderData: keepPreviousData, enabled, queryFn: ({ signal }) => apiClient<Page<MovementRecord>>('/stock-movements?' + queryString(settled), { signal }) });
  return { ...query, isFetching: query.isFetching || waiting, isPlaceholderData: query.isPlaceholderData || waiting };
}
export function useMovement(id?: string | null) { return useQuery({ queryKey: ['movement', id], enabled: Boolean(id), queryFn: ({ signal }) => apiClient<MovementRecord>('/stock-movements/' + id, { signal }) }); }
export function useDashboard(days = 7) { return useQuery({ queryKey: ['dashboard', days], placeholderData: keepPreviousData, queryFn: ({ signal }) => apiClient<DashboardSummary>('/dashboard/summary?days=' + days, { signal }) }); }
export function useInventoryMutation<T, V>(perform: (input: V) => Promise<T>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: perform, onSuccess: async () => {
    await Promise.all(['products', 'product', 'movements', 'movement', 'dashboard', 'categories', 'global-search', 'product-history'].map(key => client.invalidateQueries({ queryKey: [key] })));
  } });
}
