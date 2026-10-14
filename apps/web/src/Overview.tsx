import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DashboardSummary } from '@stock/shared';
import { CategoryChart, MovementChart, StockChart } from './DashboardCharts';
import { historyLink } from './dashboard-model';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react';
import { useDashboard } from './inventory-api';
import { dateLabel, isExit, presentProduct, stockStatus, typeLabels, unitCodes } from './inventory-model';
import { DataState } from './data-controls';
import { ProductIdentity, Status, StockMeter } from './inventory-ui';

export function Overview() {
  const [period, setPeriod] = useState(7);
  const [previousPeriod, setPreviousPeriod] = useState(7);
  const client = useQueryClient();
  const query = useDashboard(period);
  const summary = query.data ?? client.getQueryData<DashboardSummary>(['dashboard', previousPeriod]);
  const changePeriod = (days: number) => { setPreviousPeriod(summary?.periodDays ?? period); setPeriod(days); };
  const attention = (summary?.low ?? 0) + (summary?.out ?? 0);
  return <DataState pending={query.isPending && !summary} error={summary ? null : query.error} retry={query.refetch}>{summary && <div className="overview-page">
    <div className="catalog-actions"><div className="inline-actions"><Link className="primary-button" to="/products/new"><Plus size={16} aria-hidden="true" />Novo produto</Link><Link className="secondary-button" to="/movements">Movimentar estoque</Link></div></div>
    <div className="dashboard-grid">
      <section className="hero-stock" aria-labelledby="stock-title"><div className="hero-main"><h2 id="stock-title">Produtos ativos</h2><div className="hero-value">{summary.products}<span>produtos</span></div></div><StockChart summary={summary} /></section>
      <section className={'risk-panel' + (attention === 0 ? ' risk-clear' : '')} aria-labelledby="risk-title"><div><h2 id="risk-title">{attention === 0 ? 'Nenhum produto em atenção' : 'Requerem atenção'}</h2><div className="risk-value">{summary.low + summary.out}<span>produtos</span></div></div><p className="panel-subtitle">Produtos no estoque mínimo ou sem saldo disponível.</p><Link className="panel-link" to={attention === 0 ? '/products' : '/products?stock=attention'}>{attention === 0 ? 'Consultar catálogo' : 'Ver produtos em atenção'}<ArrowUpRight size={17} /></Link></section>
      <section className="activity-panel" aria-labelledby="activity-title"><h2 id="activity-title">Atividade recente</h2><div className="activity-list">{summary.recent.map(movement => <Link to={historyLink(new Intl.DateTimeFormat('en-CA', { timeZone: summary.timezone }).format(new Date(movement.createdAt)), new Intl.DateTimeFormat('en-CA', { timeZone: summary.timezone }).format(new Date(movement.createdAt)), movement.type, movement.product.sku)} className={'activity-row activity-row-' + (isExit(movement.type) ? 'out' : 'in')} key={movement.id}><span className="activity-product">{movement.product.name}<small>{typeLabels[movement.type]} · {dateLabel(movement.createdAt)}</small></span><strong className={isExit(movement.type) ? 'out-text' : 'in-text'}>{isExit(movement.type) ? '−' : '+'}{movement.quantity} <small>{unitCodes[movement.product.unit]}</small></strong></Link>)}{summary.recent.length === 0 && <p className="panel-subtitle">Nenhuma movimentação registrada.</p>}</div><Link className="activity-link" to="/history">Todas as movimentações <ArrowRight size={16} /></Link></section>
      <MovementChart summary={summary} requested={period} change={changePeriod} busy={query.isFetching && (query.isPlaceholderData || !query.data)} error={Boolean(query.error)} retry={query.refetch} />
    </div>
    <div className="dashboard-breakdown">      <section className="attention-panel" aria-labelledby="attention-title"><div className="dark-panel-heading"><h2 id="attention-title">Prioridades de reposição</h2><Link className="icon-button" to="/products?stock=attention" aria-label="Ver produtos que precisam de atenção"><ArrowUpRight size={18} /></Link></div><div className="attention-list">{summary.priorities.map(record => { const product = presentProduct(record); return <div className="attention-row" key={product.id}><ProductIdentity product={product} /><span className="attention-meter"><StockMeter stock={product.stock} minimum={product.minimum} name={product.name} /><small>{record.stock} {product.unit} / mín. {record.minimumStock}</small></span><Status {...stockStatus(product.stock, product.minimum)} /></div>; })}{summary.priorities.length === 0 && <p className="panel-subtitle">Nenhum produto precisa de reposição.</p>}</div></section><CategoryChart summary={summary} /></div>
    <section className="dashboard-operational" aria-label="Resumo operacional"><div className="cost-summary"><span className="block-label">VALOR ATUAL A CUSTO</span><strong>{Number(summary.costValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong><small>{summary.productsWithoutCost} produtos sem custo informado, excluídos do valor.</small></div><div className="day-summary"><h2>Movimentos hoje · {summary.to.split('-').reverse().join('/')}</h2><Link to={historyLink(summary.to, summary.to, 'ENTRY')}>Entradas <strong>{summary.today.entries}</strong></Link><Link to={historyLink(summary.to, summary.to, 'EXIT')}>Saídas <strong>{summary.today.exits}</strong></Link><span>Ajustes <strong>{summary.today.adjustments}</strong></span></div></section>
  </div>}</DataState>;
}
