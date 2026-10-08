import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Page, PhysicalInventoryRecord, PhysicalInventorySummary } from '@stock/shared';
import { apiClient } from './lib/api';
import { queryString } from './inventory-api';

export function usePhysicalInventories(page: number, status: string) {
  return useQuery({ queryKey: ['physical-inventories', { page, status }], queryFn: ({ signal }) => apiClient<Page<PhysicalInventorySummary>>('/physical-inventories?' + queryString({ page, limit: 20, status }), { signal }) });
}
export function usePhysicalInventory(id: string) {
  return useQuery({ queryKey: ['physical-inventory', id], queryFn: ({ signal }) => apiClient<PhysicalInventoryRecord>('/physical-inventories/' + id, { signal }), refetchOnWindowFocus: false });
}
export function useAcceptPhysicalInventory() {
  const client = useQueryClient();
  return (record: PhysicalInventoryRecord) => {
    client.setQueryData(['physical-inventory', record.id], record);
    void client.invalidateQueries({ queryKey: ['physical-inventories'] });
    if (record.status === 'COMPLETED') void Promise.all(['products', 'product', 'movements', 'movement', 'dashboard'].map(key => client.invalidateQueries({ queryKey: [key] })));
  };
}
