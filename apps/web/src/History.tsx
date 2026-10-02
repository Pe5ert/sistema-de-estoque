import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useMovement, useMovements, type Filters } from './inventory-api';
import { dateLabel, isExit, presentProduct, reasonLabels, typeLabels, unitCodes } from './inventory-model';
import { ProductIdentity, MovementAmount } from './inventory-ui';
import { DataState, Pagination } from './data-controls';
import { DetailDrawer, openFromRow } from './DetailDrawer';
import type { MovementReason, MovementType } from '@stock/shared';
import { MovementWorkbench } from './MovementWorkbench';

export function Movements() { return <div className="page-stack"><MovementWorkbench /><HistoryTable compact /></div>; }
export function HistoryPage() { return <HistoryTable />; }

function HistoryTable({ compact = false }: { compact?: boolean }) {
  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 20 });
  const [selected, setSelected] = useState<string | null>(null);
  const query = useMovements(filters);
  const update = (key: string, value: string) => setFilters(current => ({ ...current, [key]: value, page: 1 }));
  return <div className="page-stack">{!compact && <div className="history-intro"><span className="block-label">RASTREABILIDADE DE SALDO</span><p>Produto, motivo e responsável em cada alteração.</p><strong>{query.data?.total ?? '…'}<small>REGISTROS</small></strong></div>}
    <section className="history-section" aria-label="Histórico de movimentações"><div className="list-heading"><h2>{compact ? 'Registro de movimentações' : 'Alterações de saldo'}</h2><span>MAIS RECENTES PRIMEIRO</span></div>
      <div className="filter-bar history-filters"><label className="select-control"><span>Movimento</span><select value={filters.type ?? ''} onChange={event => update('type', event.target.value)}><option value="">Todos</option>{Object.entries(typeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="select-control"><span>Motivo</span><select value={filters.reason ?? ''} onChange={event => update('reason', event.target.value)}><option value="">Todos</option>{Object.entries(reasonLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="search-control"><span className="sr-only">Buscar produto no histórico</span><input type="search" placeholder="Produto, SKU ou código de barras" value={filters.search ?? ''} onChange={event => update('search', event.target.value)} /></label>
        {!compact && <><label className="select-control"><span>De</span><input type="date" onChange={event => update('from', event.target.value ? new Date(event.target.value + 'T00:00:00-03:00').toISOString() : '')} /></label><label className="select-control"><span>Até</span><input type="date" onChange={event => update('to', event.target.value ? new Date(event.target.value + 'T23:59:59.999-03:00').toISOString() : '')} /></label></>}
      </div>
      <DataState pending={query.isPending} error={query.error} retry={query.refetch}><div className="table-frame"><table className="data-table history-table"><thead><tr><th>PRODUTO / REGISTRO</th><th>DATA / HORA</th><th>MOVIMENTO</th><th>ANTES → DEPOIS</th><th>MOTIVO</th><th>RESPONSÁVEL</th></tr></thead><tbody>{query.data?.items.map(movement => <tr className={'history-entry clickable-row history-' + (isExit(movement.type) ? 'out' : movement.type === 'ENTRY' ? 'in' : 'adjust')} key={movement.id} tabIndex={0} aria-label={'Detalhes do movimento de ' + movement.product.name} onClick={event => openFromRow(event, () => setSelected(movement.id))} onKeyDown={event => { if (event.target === event.currentTarget && event.key === 'Enter') { event.preventDefault(); setSelected(movement.id); } }}>
        <td data-label="Produto"><ProductIdentity product={presentProduct(movement.product)} /><small>{movement.id}</small></td><td data-label="Data"><span className="date-cell">{dateLabel(movement.createdAt)}</span></td><td data-label="Movimento"><MovementAmount type={isExit(movement.type) ? 'Saída' : movement.type === 'ENTRY' ? 'Entrada' : 'Ajuste'} quantity={Number(movement.quantity)} /></td><td data-label="Antes → depois"><span className="balance-flow"><span>{movement.previousStock}<ArrowRight size={17} /><strong>{movement.resultingStock}</strong></span></span></td><td data-label="Motivo">{reasonLabels[movement.reason]}</td><td data-label="Responsável">{movement.user.name}</td>
      </tr>)}</tbody></table>{query.data?.total === 0 && <div className="empty-state" role="status">Nenhuma movimentação encontrada.</div>}</div><Pagination data={query.data} change={page => setFilters(current => ({ ...current, page }))} /></DataState>
    </section>{selected && <MovementDrawer id={selected} close={() => setSelected(null)} />}
  </div>;
}
function MovementDrawer({ id, close }: { id: string; close: () => void }) {
  const query = useMovement(id);
  const item = query.data;
  return <DetailDrawer title="Detalhes do movimento" close={close}><DataState pending={query.isPending} error={query.error} retry={query.refetch}>{item && <><h2>{item.product.name}</h2><p className="detail-meta">{item.product.sku}</p><dl className="detail-facts">
    {Object.entries({ Tipo: typeLabels[item.type as MovementType], Quantidade: item.quantity + ' ' + unitCodes[item.product.unit], 'Saldo anterior': item.previousStock, 'Saldo resultante': item.resultingStock, Motivo: reasonLabels[item.reason as MovementReason], Responsável: item.user.name, Referência: item.reference ?? 'Não informada', Observação: item.notes ?? 'Não informada', 'Data / hora': dateLabel(item.createdAt) }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl></>}</DataState></DetailDrawer>;
}
