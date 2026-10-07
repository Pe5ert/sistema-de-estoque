import type { ReactNode } from 'react';
import type { Page } from '@stock/shared';
import { Alert } from './feedback';
export function DataState({ pending, error, retry, children, retainContentOnError = false }: { pending: boolean; error: Error | null; retry: () => unknown; children: ReactNode; retainContentOnError?: boolean }) {
  if (pending) return <div className="empty-state" role="status">Carregando…</div>;
  return <>{error && <Alert tone="error" title="Não foi possível carregar os dados." action={{ label: 'Tentar novamente', run: () => { retry(); } }}>{error.message}</Alert>}{(!error || retainContentOnError) && children}</>;
}
export function Pagination({ data, change }: { data?: Pick<Page<unknown>, 'page' | 'limit' | 'total'>; change: (page: number) => void }) {
  if (!data) return null;
  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  return <div className="pagination"><span>{data.total} registros · página {data.page} de {pages}</span><button className="secondary-button" type="button" disabled={data.page <= 1} onClick={() => change(data.page - 1)}>Anterior</button><button className="secondary-button" type="button" disabled={data.page >= pages} onClick={() => change(data.page + 1)}>Próxima</button></div>;
}
