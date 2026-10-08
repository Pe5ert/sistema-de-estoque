import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Page, PurchaseRecord, SupplierRecord } from '@stock/shared';
import { apiClient } from './lib/api';
import { queryString, type Filters } from './inventory-api';
export function useSuppliers(filters: Filters) { return useQuery({ queryKey: ['suppliers', filters], queryFn: ({ signal }) => apiClient<Page<SupplierRecord> & { overview: { active: number; inactive: number } }>('/suppliers?' + queryString(filters), { signal }) }); }
export function useSupplier(id?: string) { return useQuery({ queryKey: ['supplier', id], enabled: Boolean(id), queryFn: ({ signal }) => apiClient<SupplierRecord>('/suppliers/' + id, { signal }) }); }
export function useOrders(filters: Filters) { return useQuery({ queryKey: ['purchases', filters], queryFn: ({ signal }) => apiClient<Page<PurchaseRecord>>('/purchase-orders?' + queryString(filters), { signal }) }); }
export function useOrder(id?: string) { return useQuery({ queryKey: ['purchase', id], enabled: Boolean(id), queryFn: ({ signal }) => apiClient<PurchaseRecord>('/purchase-orders/' + id, { signal }) }); }
export function usePurchaseMutation<T, V>(perform: (input: V) => Promise<T>) {
  const client = useQueryClient(); return useMutation({ mutationFn: perform, onSuccess: async () => { await Promise.all(['suppliers', 'supplier', 'purchases', 'purchase', 'products', 'product', 'movements', 'movement', 'dashboard'].map(key => client.invalidateQueries({ queryKey: [key] }))); } });
}
