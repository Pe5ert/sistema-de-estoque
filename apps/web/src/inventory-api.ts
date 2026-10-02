import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryRecord, DashboardSummary, MovementRecord, Page, ProductRecord } from '@stock/shared';
import { apiClient } from './lib/api';
import { presentProduct } from './inventory-model';

export type Filters = Record<string, string | number | undefined>;
export function queryString(filters: Filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params.toString();
}
export function useProducts(filters: Filters) {
  return useQuery({ queryKey: ['products', filters], queryFn: async ({ signal }) => {
    const page = await apiClient<Page<ProductRecord>>('/products?' + queryString(filters), { signal });
    return { ...page, items: page.items.map(presentProduct) };
  } });
}
export function useProduct(id?: string | null) {
  return useQuery({ queryKey: ['product', id], enabled: Boolean(id), queryFn: async ({ signal }) => presentProduct(await apiClient<ProductRecord>('/products/' + id, { signal })) });
}
export function useCategories() { return useQuery({ queryKey: ['categories'], queryFn: ({ signal }) => apiClient<CategoryRecord[]>('/categories', { signal }) }); }
export function useMovements(filters: Filters) { return useQuery({ queryKey: ['movements', filters], queryFn: ({ signal }) => apiClient<Page<MovementRecord>>('/stock-movements?' + queryString(filters), { signal }) }); }
export function useMovement(id?: string | null) { return useQuery({ queryKey: ['movement', id], enabled: Boolean(id), queryFn: ({ signal }) => apiClient<MovementRecord>('/stock-movements/' + id, { signal }) }); }
export function useDashboard() { return useQuery({ queryKey: ['dashboard'], queryFn: ({ signal }) => apiClient<DashboardSummary>('/dashboard/summary', { signal }) }); }
export function useInventoryMutation<T, V>(perform: (input: V) => Promise<T>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: perform, onSuccess: async () => {
    await Promise.all(['products', 'product', 'movements', 'movement', 'dashboard', 'categories'].map(key => client.invalidateQueries({ queryKey: [key] })));
  } });
}
