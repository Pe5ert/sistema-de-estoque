import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { Page } from '@stock/shared';
import { Alert } from './feedback';
import { BusyIndicator } from './motion';
export function DataState({ pending, error, retry, children, retainContentOnError = false, updating = false, previousResults = false }: { pending: boolean; error: Error | null; retry: () => unknown; children: ReactNode; retainContentOnError?: boolean; updating?: boolean; previousResults?: boolean }) {
  const content = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (previousResults && content.current?.contains(document.activeElement)) restore.current = document.activeElement as HTMLElement;
    if (content.current) content.current.inert = previousResults;
    if (!previousResults && restore.current) {
      if (restore.current.isConnected && (document.activeElement === document.body || content.current?.contains(document.activeElement))) restore.current.focus({ preventScroll: true });
      restore.current = null;
    }
  }, [previousResults, pending]);
  if (pending) return <div className="data-loading" role="status" aria-busy="true"><span><BusyIndicator />Carregando…</span><div className="loading-skeleton" aria-hidden="true">{[0, 1, 2, 3].map(row => <div key={row}><i /><i /><i /></div>)}</div></div>;
  return <div className="data-state" aria-busy={updating}>{error && <Alert tone="error" title={retainContentOnError ? 'Não foi possível atualizar os dados.' : 'Não foi possível carregar os dados.'} action={{ label: 'Tentar novamente', run: () => { retry(); } }}>{retainContentOnError && 'Os dados exibidos podem estar desatualizados. '}{error.message}</Alert>}{(updating || previousResults) && <p className="data-update-status" role="status"><BusyIndicator />{previousResults ? 'Atualizando filtros. Exibindo os resultados anteriores.' : 'Atualizando dados…'}</p>}{(!error || retainContentOnError) && <div ref={content} className="data-content">{children}</div>}</div>;
}
export function Pagination({ data, change, busy = false }: { data?: Pick<Page<unknown>, 'page' | 'limit' | 'total'>; change: (page: number) => void; busy?: boolean }) {
  if (!data) return null;
  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  return <nav className="pagination" aria-label="Páginas dos resultados" aria-busy={busy}><span role="status">{data.total} {data.total === 1 ? 'registro' : 'registros'} · página {data.page} de {pages}</span>{pages > 1 && <><button className="secondary-button" type="button" disabled={busy || data.page <= 1} onClick={() => change(data.page - 1)}>Anterior</button><button className="secondary-button" type="button" disabled={busy || data.page >= pages} onClick={() => change(data.page + 1)}>Próxima</button></>}</nav>;
}
