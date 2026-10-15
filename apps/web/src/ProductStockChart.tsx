import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ProductStockHistory } from '@stock/shared';
import { apiClient } from './lib/api';
import { DataState } from './data-controls';
import { Alert } from './feedback';
import { dateLabel, typeLabels, reasonLabels } from './inventory-model';

export function ProductStockChart({ id, unit }: { id: string; unit: string }) {
  const [days, setDays] = React.useState(30), [selected, setSelected] = React.useState(0);
  const query = useQuery({ queryKey: ['product-history', id, days], queryFn: ({ signal }) => apiClient<ProductStockHistory>(`/products/${id}/stock-history?days=${days}`, { signal }) });
  const data = query.data;
  const events = data?.events ?? [];
  const activeIndex = Math.min(selected, Math.max(0, events.length - 1));
  const active = events[activeIndex];
  const start = Date.parse(data?.from ?? ''), end = Date.parse(data?.to ?? '');
  const x = (date: string) => 20 + (Date.parse(date) - start) / Math.max(1, end - start) * 560;
  const max = Math.max(1, Number(data?.openingStock ?? 0), ...events.map(event => Number(event.resultingStock)));
  const y = (value: string) => 150 - Number(value) / max * 125;
  let path = `M20,${y(data?.openingStock ?? '0')}`;
  for (const event of events) path += ` H${x(event.createdAt)} V${y(event.resultingStock)}`;
  path += ' H580';
  function inspect(event: React.PointerEvent<SVGSVGElement>) {
    if (!events.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - rect.left) / rect.width * 600;
    let closest = 0;
    for (let index = 1; index < events.length; index++) if (Math.abs(x(events[index].createdAt) - position) < Math.abs(x(events[closest].createdAt) - position)) closest = index;
    setSelected(closest);
  }
  return <section className="product-stock-chart" aria-label="Evolução do saldo"><div className="movement-chart-heading"><h3>Evolução do saldo</h3><label className="select-control"><span>Período do saldo</span><select value={days} onChange={event => { setDays(Number(event.target.value)); setSelected(0); }}>{[7, 30, 90].map(value => <option key={value} value={value}>{value} dias</option>)}</select></label></div>
    <DataState pending={query.isPending} error={query.error} retry={query.refetch}>
      {data && !data.complete ? <Alert tone="warning" title="Gráfico indisponível.">{data.message}</Alert> : data && <>
        <p className="detail-meta">Saldo no início: {data.openingStock} {unit} · Horário de Brasília</p>
        {!events.length ? <p className="empty-state">Nenhuma movimentação neste período. Saldo mantido em {data.openingStock} {unit}.</p> : <>
          <svg onPointerDown={inspect} onPointerMove={event => { if (event.pointerType === 'mouse') inspect(event); }} className="stock-step-svg" viewBox="0 0 600 175" role="img" aria-label={`Saldo de ${data.openingStock} a ${data.closingStock} ${unit}. ${events.length} movimentos no período.`}>
            <text x="20" y="15" className="area-axis">{max} {unit}</text><text x="20" y="170" className="area-axis">{dateLabel(data.from).split(',')[0]}</text><text x="580" y="170" textAnchor="end" className="area-axis">{dateLabel(data.to).split(',')[0]}</text>
            {[25, 87, 150].map(value => <line key={value} x1="20" x2="580" y1={value} y2={value} className="area-grid" />)}
            <path d={`${path} L580,150 L20,150 Z`} fill="currentColor" opacity=".10" /><path d={path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            {events.length <= 100 && events.map(event => <circle key={event.id} cx={x(event.createdAt)} cy={y(event.resultingStock)} r="2.5" fill="currentColor" />)}
            {active && <><line className="area-guide" x1={x(active.createdAt)} x2={x(active.createdAt)} y1="20" y2="150" /><circle cx={x(active.createdAt)} cy={y(active.resultingStock)} r="5" fill="currentColor" /></>}
          </svg>
          <label className="stock-event-control">Investigar movimento {activeIndex + 1} de {events.length}<input type="range" min="0" max={events.length - 1} value={activeIndex} onChange={event => setSelected(Number(event.target.value))} aria-valuetext={active ? `${dateLabel(active.createdAt)}: ${typeLabels[active.type]}, ${active.quantity}, saldo ${active.resultingStock} ${unit}` : undefined} /></label>
          {active && <div className="stock-event-detail" aria-live="polite"><strong>{dateLabel(active.createdAt)}</strong><span>{typeLabels[active.type]} · {active.quantity} {unit} · {reasonLabels[active.reason]}</span><strong>Saldo: {active.resultingStock} {unit}</strong><Link to={'/history?detail=' + active.id}>Ver registro no Histórico</Link></div>}
        </>}
      </>}
    </DataState><Link to={'/history?productId=' + id}>Consultar histórico completo</Link>
  </section>;
}
