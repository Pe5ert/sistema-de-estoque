import { useRef, useState } from 'react';
import { ArrowRight, ChevronRight, Copy } from 'lucide-react';
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
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const endDate = useRef<HTMLInputElement>(null);
  const invalidRange = Boolean(from && to && from > to);
  const [selected, setSelected] = useState<string | null>(null);
  const query = useMovements({ ...filters, from: from ? new Date(from + 'T00:00:00-03:00').toISOString() : '', to: to ? new Date(to + 'T23:59:59.999-03:00').toISOString() : '' }, !invalidRange);
  const hasFilters = Boolean(filters.type || filters.reason || filters.search || from || to);
  const update = (key: string, value: string) => setFilters(current => ({ ...current, [key]: value, page: 1 }));
  const clear = () => { setFilters({ page: 1, limit: 20 }); setFrom(''); setTo(''); };
  return <div className="page-stack">{!compact && <div className="history-intro"><span className="block-label">RASTREABILIDADE DE SALDO</span><p>Produto, motivo e responsável em cada alteração.</p><strong>{invalidRange ? '—' : query.data?.total ?? '…'}<small>REGISTROS</small></strong></div>}
    <section className="history-section" aria-label="Histórico de movimentações"><div className="list-heading"><h2>{compact ? 'Registro de movimentações' : 'Alterações de saldo'}</h2><span>MAIS RECENTES PRIMEIRO</span></div>
      <div className="filter-bar history-filters"><label className="select-control"><span>Movimento</span><select value={filters.type ?? ''} onChange={event => update('type', event.target.value)}><option value="">Todos</option>{Object.entries(typeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="select-control"><span>Motivo</span><select value={filters.reason ?? ''} onChange={event => update('reason', event.target.value)}><option value="">Todos</option>{Object.entries(reasonLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="search-control"><span className="sr-only">Buscar produto no histórico</span><input type="search" placeholder="Produto, SKU ou código de barras" value={filters.search ?? ''} onChange={event => update('search', event.target.value)} /></label>
        {!compact && <div className="date-range"><label className="select-control"><span>De</span><input type="date" value={from} onChange={event => { setFrom(event.target.value); update('page', '1'); }} onBlur={() => { if (invalidRange) endDate.current?.focus(); }} /></label><label className="select-control"><span>Até</span><input ref={endDate} type="date" value={to} aria-invalid={invalidRange} aria-describedby={invalidRange ? 'date-range-error' : undefined} onChange={event => { setTo(event.target.value); update('page', '1'); }} /></label>{invalidRange && <p className="field-error" role="alert" id="date-range-error">A data final deve ser igual ou posterior à inicial.</p>}</div>}
        {hasFilters && <button className="text-button" type="button" onClick={clear}>Limpar filtros</button>}
      </div>
      {invalidRange ? <div className="empty-state">Ajuste o período para consultar as movimentações.</div> : <DataState pending={query.isPending} error={query.error} retry={query.refetch}><div className="table-frame"><table className="data-table history-table"><thead><tr><th>PRODUTO / SKU</th><th>DATA / HORA</th><th>MOVIMENTO</th><th>ANTES → DEPOIS</th><th>MOTIVO</th><th>RESPONSÁVEL</th><th><span className="sr-only">Detalhes</span></th></tr></thead><tbody>{query.data?.items.map(movement => <tr className={'history-entry clickable-row history-' + (isExit(movement.type) ? 'out' : movement.type === 'ENTRY' ? 'in' : 'adjust') + (selected === movement.id ? ' row-selected' : '')} key={movement.id} tabIndex={0} aria-selected={selected === movement.id} aria-label={'Detalhes do movimento de ' + movement.product.name} onClick={event => openFromRow(event, () => setSelected(movement.id))} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setSelected(movement.id); } }}>
        <td data-label="Produto"><ProductIdentity product={presentProduct(movement.product)} /></td><td data-label="Data"><span className="date-cell">{dateLabel(movement.createdAt)}</span></td><td data-label="Movimento"><MovementAmount type={isExit(movement.type) ? 'Saída' : movement.type === 'ENTRY' ? 'Entrada' : 'Ajuste'} quantity={Number(movement.quantity)} /></td><td data-label="Antes → depois"><span className="balance-flow"><span>{movement.previousStock}<ArrowRight size={17} /><strong>{movement.resultingStock}</strong></span></span></td><td data-label="Motivo">{reasonLabels[movement.reason]}</td><td data-label="Responsável">{movement.user.name}</td><td className="row-action-cell"><button type="button" className="row-action row-detail-action" aria-label={'Ver movimento de ' + movement.product.name} onClick={() => setSelected(movement.id)}><ChevronRight size={18} aria-hidden="true" /><span className="mobile-action-label">Ver detalhes</span></button></td>
      </tr>)}</tbody></table>{query.data?.total === 0 && <div className="empty-state" role="status">Nenhuma movimentação encontrada.</div>}</div><Pagination data={query.data} change={page => setFilters(current => ({ ...current, page }))} /></DataState>}
    </section>{selected && <MovementDrawer id={selected} close={() => setSelected(null)} />}
  </div>;
}
function MovementDrawer({ id, close }: { id: string; close: () => void }) {
  const query = useMovement(id);
  const [copyNotice, setCopyNotice] = useState('');
  const item = query.data;
  const copyId = async () => { try { await navigator.clipboard.writeText(id); setCopyNotice('ID copiado.'); } catch { setCopyNotice('Não foi possível copiar. Selecione o ID abaixo.'); } };
  return <DetailDrawer title="Detalhes do movimento" close={close}><DataState pending={query.isPending} error={query.error} retry={query.refetch}>{item && <><h2>{item.product.name}</h2><p className="detail-meta">{item.product.sku}</p><dl className="detail-facts">
    {Object.entries({ Tipo: typeLabels[item.type as MovementType], Quantidade: item.quantity + ' ' + unitCodes[item.product.unit], 'Saldo anterior': item.previousStock + ' ' + unitCodes[item.product.unit], 'Saldo resultante': item.resultingStock + ' ' + unitCodes[item.product.unit], Motivo: reasonLabels[item.reason as MovementReason], Responsável: item.user.name, Referência: item.reference ?? 'Não informada', Observação: item.notes ?? 'Não informada', 'Data / hora': dateLabel(item.createdAt) }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl><div className="detail-id"><span>ID do movimento</span><code>{id}</code><button className="text-button" type="button" onClick={() => void copyId()}><Copy size={15} aria-hidden="true" />Copiar ID</button>{copyNotice && <p role="status">{copyNotice}</p>}</div></>}</DataState></DetailDrawer>;
}
