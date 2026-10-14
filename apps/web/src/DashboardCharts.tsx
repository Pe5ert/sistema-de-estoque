import * as React from 'react';
import { Link } from 'react-router-dom';
import type { DashboardSummary } from '@stock/shared';
import { groupMovementDays, historyLink, shortDay } from './dashboard-model';

export function MovementChart({ summary, requested, change, busy, error, retry }: {
  summary: DashboardSummary; requested: number; change: (days: number) => void;
  busy: boolean; error: boolean; retry: () => unknown;
}) {
  const [compact, setCompact] = React.useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches);
  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)');
    const update = () => setCompact(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const size = summary.periodDays === 7 ? 1 : summary.periodDays === 30 ? (compact ? 5 : 3) : (compact ? 15 : 7);
  const groups = groupMovementDays(summary.days, size);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [tableOpen, setTableOpen] = React.useState(false);
  const active = groups.find(group => group.from === selected);
  const max = Math.max(1, ...groups.flatMap(group => [group.entries, group.exits]));
  const entries = groups.reduce((sum, group) => sum + group.entries, 0);
  const exits = groups.reduce((sum, group) => sum + group.exits, 0);
  return <section className="movement-chart-panel" aria-labelledby="movement-chart-title" onKeyDown={event => { if (event.key === 'Escape') setSelected(null); }}>
    <div className="movement-chart-heading"><div><h2 id="movement-chart-title">Entradas e saídas</h2><p>Registros · {shortDay(summary.from)} a {shortDay(summary.to)} · {summary.periodDays} dias</p></div><div className="chart-periods" aria-label="Período do gráfico">{[7, 30, 90].map(days => <button type="button" key={days} aria-pressed={requested === days} onClick={() => change(days)}>{days} dias</button>)}</div></div>
    <div className="movement-chart-legend"><Link to={historyLink(summary.from, summary.to, 'ENTRY')}><i className="entry-key" />Entradas <strong>{entries}</strong></Link><Link to={historyLink(summary.from, summary.to, 'EXIT')}><i className="exit-key" />Saídas <strong>{exits}</strong></Link></div>
    <div className="chart-request-status" role="status">{busy ? `Carregando ${requested} dias. Exibindo ${summary.periodDays} dias.` : error ? <>Falha ao atualizar. Exibindo {summary.periodDays} dias. <button type="button" className="text-button" onClick={() => { retry(); }}>Tentar novamente</button></> : entries + exits === 0 ? 'Nenhuma entrada ou saída neste período.' : `Barras por ${size === 1 ? 'dia' : `intervalo de até ${size} dias`}.`}</div>
    <div className="movement-plot" aria-label="Registros por intervalo" aria-busy={busy}>
      <div className="movement-axis" aria-hidden="true"><span>{max}</span><span>{Math.ceil(max / 2)}</span><span>0</span></div>
      <div className="movement-columns" key={summary.periodDays}>{groups.map(group => <div className={'movement-column' + (active === group ? ' is-highlighted' : '')} key={group.from} onMouseEnter={() => setSelected(group.from)}>
        <div className="movement-bars">{(['ENTRY', 'EXIT'] as const).map(type => { const count = type === 'ENTRY' ? group.entries : group.exits; return <Link key={type} className={'movement-bar-link ' + (type === 'ENTRY' ? 'entry-bar' : 'exit-bar')} to={historyLink(group.from, group.to, type)} onFocus={() => setSelected(group.from)} aria-describedby={active === group ? 'movement-chart-tooltip' : undefined} aria-label={`${type === 'ENTRY' ? 'Entradas' : 'Saídas'} de ${shortDay(group.from)} a ${shortDay(group.to)}: ${count} registros. Ver Histórico.`}><span aria-hidden="true" style={{ transform: `scaleY(${count / max})` }} /></Link>; })}</div><small>{shortDay(group.from)}</small>
      </div>)}</div>
    </div>
    <div className="movement-inspector"><label>Detalhar intervalo<select value={active?.from ?? ''} onChange={event => setSelected(event.target.value || null)}><option value="">Selecione</option>{groups.map(group => <option key={group.from} value={group.from}>{shortDay(group.from)} a {shortDay(group.to)}</option>)}</select></label><div className="movement-tooltip" role={active ? 'tooltip' : undefined} id="movement-chart-tooltip">{active ? <><strong>{shortDay(active.from)} a {shortDay(active.to)}</strong><span>{active.entries} entradas · {active.exits} saídas</span></> : <span>Passe sobre as barras ou selecione um intervalo.</span>}</div></div>
    <div className="chart-detail-links">{active && <><Link to={historyLink(active.from, active.to, 'ENTRY')}>Ver entradas</Link><Link to={historyLink(active.from, active.to, 'EXIT')}>Ver saídas</Link></>}</div>
    <details className="chart-data-table" onToggle={event => setTableOpen(event.currentTarget.open)}><summary>Consultar dados em tabela</summary>{tableOpen && <table><caption>Registros de entradas e saídas por dia</caption><thead><tr><th>Data</th><th>Entradas</th><th>Saídas</th></tr></thead><tbody>{summary.days.map(day => <tr key={day.date}><th>{shortDay(day.date)}</th><td><Link to={historyLink(day.date, day.date, 'ENTRY')}>{day.entryRecords}</Link></td><td><Link to={historyLink(day.date, day.date, 'EXIT')}>{day.exitRecords}</Link></td></tr>)}</tbody></table>}</details>
  </section>;
}

export function StockChart({ summary }: { summary: DashboardSummary }) {
  const states = [{ count: summary.normal, label: 'Normais', filter: 'success', detail: 'Acima do estoque mínimo' }, { count: summary.low, label: 'Baixos', filter: 'warning', detail: 'Com saldo, até o mínimo' }, { count: summary.out, label: 'Zerados', filter: 'danger', detail: 'Sem saldo disponível' }];
  const [selected, setSelected] = React.useState<string | null>(null);
  const active = states.find(state => state.filter === selected);
  const describe = (state: typeof states[number]) => `${state.label}: ${state.count} de ${summary.products} produtos (${summary.products ? Math.round(state.count / summary.products * 100) : 0}%). ${state.detail}.`;
  return <><div className="hero-spectrum interactive-spectrum" aria-label="Distribuição dos produtos ativos">{states.filter(state => state.count > 0).map(state => <Link key={state.filter} className={'spectrum-' + state.filter} style={{ flex: state.count }} to={'/products?stock=' + state.filter} aria-label={describe(state)} onMouseEnter={() => setSelected(state.filter)} onFocus={() => setSelected(state.filter)} onKeyDown={event => { if (event.key === 'Escape') setSelected(null); }} />)}</div><div className="hero-legend interactive-legend">{states.map(state => <Link key={state.filter} to={'/products?stock=' + state.filter} aria-label={describe(state)} onMouseEnter={() => setSelected(state.filter)} onFocus={() => setSelected(state.filter)} onKeyDown={event => { if (event.key === 'Escape') setSelected(null); }}>{state.count} {state.label.toLowerCase()}</Link>)}</div><div className="stock-chart-detail" role="status">{active ? describe(active) : summary.products === 0 ? 'Nenhum produto ativo.' : 'Posição atual do estoque'}</div></>;
}

export function CategoryChart({ summary }: { summary: DashboardSummary }) {
  const max = Math.max(1, ...summary.categories.map(category => category.products));
  const row = (category: DashboardSummary['categories'][number]) => <Link className="category-chart-row" key={category.id} to={'/products?category=' + category.id} aria-label={`${category.name}: ${category.products} produtos ativos. Ver Produtos.`}><span>{category.name}</span><strong>{category.products}</strong><i aria-hidden="true"><b style={{ transform: `scaleX(${category.products / max})` }} /></i></Link>;
  return <section className="category-chart-panel"><h2>Produtos por categoria</h2><p>Produtos ativos · posição atual</p>{summary.categories.slice(0, 6).map(row)}{summary.categories.length > 6 && <details><summary>Mais {summary.categories.length - 6} categorias</summary>{summary.categories.slice(6).map(row)}</details>}{!summary.categories.length && <p>Nenhum produto ativo para comparar.</p>}</section>;
}
