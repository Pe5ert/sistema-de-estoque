import { useEffect, useSyncExternalStore } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
const roots: Record<string, string[]> = { '/': ['dashboard'], '/products': ['products'], '/history': ['movements'], '/movements': ['products', 'product'], '/suppliers': ['suppliers'], '/purchases': ['purchases'], '/physical-inventories': ['physical-inventories'] };
export function DataRefresh() {
  const { pathname } = useLocation(), client = useQueryClient(), keys = roots[pathname];
  const cache = client.getQueryCache();
  const predicate = (query: { queryKey: readonly unknown[] }) => Boolean(keys?.includes(String(query.queryKey[0])));
  const updated = useSyncExternalStore(callback => cache.subscribe(callback), () => {
    const times = cache.findAll({ type: 'active', predicate }).map(query => query.state.dataUpdatedAt).filter(Boolean);
    return times.length ? Math.min(...times) : 0;
  });
  const fetching = useIsFetching({ predicate });
  useEffect(() => {
    if (!keys) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine) void client.refetchQueries({ type: 'active', predicate: query => keys.includes(String(query.queryKey[0])) }); }, 60_000);
    return () => window.clearInterval(timer);
  }, [client, keys]);
  if (!keys) return null;
  return <div className="data-refresh"><span>{fetching ? 'Atualizando…' : updated ? `Consultado às ${new Date(updated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Aguardando dados'}</span><button type="button" className="text-button" disabled={Boolean(fetching)} onClick={() => { void client.refetchQueries({ type: 'active', predicate }); }}>Atualizar</button></div>;
}
