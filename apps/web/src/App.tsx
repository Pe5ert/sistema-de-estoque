import { useEffect, useState } from 'react';
import {
  ArrowLeftRight, ArrowRight, ArrowUpRight,
  Barcode, Boxes, ChevronRight, History, LayoutDashboard, Menu, Package, X,
} from 'lucide-react';
import { Link, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { movements, products, stockStatus } from './demo-data';

const navigation = [
  { path: '/', label: 'Visão geral', icon: LayoutDashboard, description: 'Pulso do estoque e prioridades do dia.', number: '01' },
  { path: '/products', label: 'Produtos', icon: Package, description: 'Catálogo, disponibilidade e pontos de atenção.', number: '02' },
  { path: '/movements', label: 'Movimentações', icon: ArrowLeftRight, description: 'Entradas, saídas e ajustes em uma só leitura.', number: '03' },
  { path: '/history', label: 'Histórico', icon: History, description: 'Rastro de cada alteração de saldo.', number: '04' },
] as const;

const lowStock = products.filter((product) => product.stock > 0 && product.stock <= product.minimum);
const outOfStock = products.filter((product) => product.stock === 0);
const available = products.filter((product) => product.stock > product.minimum);
const totalUnits = products.reduce((total, product) => total + product.stock, 0);
const movementCounts = {
  in: movements.filter((movement) => movement.type === 'Entrada').length,
  out: movements.filter((movement) => movement.type === 'Saída').length,
  adjust: movements.filter((movement) => movement.type === 'Ajuste').length,
};

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const current = navigation.find((item) => item.path === location.pathname) ?? navigation[0];

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const navItem = (item: (typeof navigation)[number]) => {
    const Icon = item.icon;
    return (
      <NavLink key={item.path} to={item.path} end={item.path === '/'}
        className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link-active' : '')}>
        <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="app-layout">
      {menuOpen && <button className="sidebar-backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}
      <aside className={'sidebar' + (menuOpen ? ' sidebar-open' : '')} id="primary-sidebar">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)} aria-label="Sistema de Estoque, visão geral">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span className="brand-wordmark">ESTOQUE<span>V2</span></span>
        </Link>
        <div className="sidebar-rule" />
        <nav aria-label="Navegação principal">
          <div className="nav-group"><span className="nav-group-label">PAINEL</span>{navItem(navigation[0])}</div>
          <div className="nav-group"><span className="nav-group-label">OPERAÇÃO</span>{navigation.slice(1, 3).map(navItem)}</div>
          <div className="nav-group"><span className="nav-group-label">RASTREIO</span>{navItem(navigation[3])}</div>
        </nav>
        <div className="sidebar-footer">
          <Boxes size={20} strokeWidth={1.6} aria-hidden="true" />
          <span>CONTROLE DE ESTOQUE<small>Ambiente de demonstração</small></span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-leading">
            <button className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} aria-controls="primary-sidebar">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="topbar-system">SISTEMA / ESTOQUE</span>
            <ChevronRight size={15} aria-hidden="true" />
            <strong>{current.label}</strong>
          </div>
          <div className="topbar-demo">DADOS FICTÍCIOS <span className="topbar-demo-suffix">/ PRÉVIA VISUAL</span></div>
        </header>
        <main className="main-content" id="main-content">
          <div className="page-heading">
            <div><div className="eyebrow"><span>{current.number} / 04</span> ÁREA DE TRABALHO</div><h1>{current.label}</h1><p className="page-description">{current.description}</p></div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Status({ label, tone }: { label: string; tone: 'success' | 'warning' | 'danger' | 'info' }) {
  return <span className={'status status-' + tone}>{label}</span>;
}

function StockMeter({ stock, minimum, name }: { stock: number; minimum: number; name: string }) {
  const width = Math.min((stock / (minimum * 2)) * 100, 100);
  const tone = stock === 0 ? 'danger' : stock <= minimum ? 'warning' : 'success';
  return (
    <div className={'stock-meter stock-meter-' + tone} role="img"
      aria-label={name + ': ' + stock + ' unidades disponíveis, mínimo ' + minimum + '. A marca central indica o mínimo.'}>
      <span style={{ width: width + '%' }} /><i aria-hidden="true" />
    </div>
  );
}

function Overview() {
  const attention = [...outOfStock, ...lowStock];
  return (
    <div className="overview-page">
      <div className="dashboard-grid">
        <section className="hero-stock" aria-labelledby="stock-title">
          <div className="hero-topline"><span className="block-label">POSIÇÃO ATUAL</span></div>
          <div className="hero-main"><h2 id="stock-title">Unidades em estoque</h2><div className="hero-value">{totalUnits.toLocaleString('pt-BR')}<span>un.</span></div><p>Distribuídas em {products.length} produtos do catálogo de demonstração.</p></div>
          <div className="hero-spectrum" role="img" aria-label={available.length + ' produtos em estoque, ' + lowStock.length + ' com estoque baixo e ' + outOfStock.length + ' sem estoque'}>
            <span className="spectrum-success" style={{ flex: available.length }} />
            <span className="spectrum-warning" style={{ flex: lowStock.length }} />
            <span className="spectrum-danger" style={{ flex: outOfStock.length }} />
          </div>
          <div className="hero-legend"><span>{available.length} estáveis</span><span>{lowStock.length} baixos</span><span>{outOfStock.length} zerado</span></div>
        </section>
        <section className="risk-panel" aria-labelledby="risk-title">
          <div className="risk-topline"><span className="block-label">ALERTAS DE ESTOQUE</span></div>
          <div><h2 id="risk-title">Requerem atenção</h2><div className="risk-value">{attention.length}<span>produtos</span></div></div>
          <div className="risk-breakdown"><span><strong>{lowStock.length}</strong> abaixo do mínimo</span><span><strong>{outOfStock.length}</strong> sem estoque</span></div>
          <Link className="panel-link" to="/products">Ver catálogo <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </section>
        <section className="activity-panel" aria-labelledby="activity-title">
          <div className="dark-panel-heading"><span className="block-label">FLUXO RECENTE</span></div>
          <h2 id="activity-title">Atividade</h2><p className="panel-subtitle">Últimos registros de demonstração</p>
          <div className="activity-list">
            {movements.slice(0, 5).map((movement) => (
              <div className={'activity-row activity-row-' + (movement.type === 'Saída' ? 'out' : movement.type === 'Entrada' ? 'in' : 'adjust')} key={movement.id}>
                <span className="activity-product">{movement.product}<small>{movement.type} · {movement.date}</small></span>
                <strong className={movement.type === 'Saída' ? 'out-text' : movement.type === 'Entrada' ? 'in-text' : 'adjust-text'}>{movement.type === 'Saída' ? '−' : '+'}{movement.quantity} <small>un.</small></strong>
              </div>
            ))}
          </div>
          <Link className="activity-link" to="/movements">Todas as movimentações <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
        <section className="attention-panel" aria-labelledby="attention-title">
          <div className="dark-panel-heading"><span className="block-label">FILA DE ATENÇÃO</span><Link to="/products" aria-label="Ver todos os produtos"><ArrowUpRight size={18} /></Link></div>
          <h2 id="attention-title">Prioridades de reposição</h2>
          <div className="attention-list">
            {attention.map((product) => {
              const status = stockStatus(product.stock, product.minimum);
              return (
                <div className="attention-row" key={product.sku}>
                  <span className="attention-product"><strong>{product.name}</strong><small>{product.sku}</small></span>
                  <span className="attention-meter"><StockMeter stock={product.stock} minimum={product.minimum} name={product.name} /><small>{product.stock} un. / mín. {product.minimum}</small></span>
                  <Status label={status.label} tone={status.tone} />
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <div className="overview-footnote"><span>PAINEL DE DEMONSTRAÇÃO</span><span>Os valores exibidos são exemplos locais.</span></div>
    </div>
  );
}

function Products() {
  return (
    <div className="page-stack">
      <div className="catalog-banner">
        <div><span className="block-label">CATÁLOGO OPERACIONAL</span><h2>Disponibilidade por produto</h2><p>Saldo, referência mínima e situação em uma linha.</p></div>
        <div className="catalog-totals"><span><strong>{products.length}</strong> produtos</span><span><strong>{lowStock.length + outOfStock.length}</strong> atenção</span></div>
      </div>
      <section className="list-section" aria-labelledby="catalog-title">
        <div className="list-heading"><h2 id="catalog-title">Produtos</h2><span>{products.length} REGISTROS DE EXEMPLO</span></div>
        <div className="table-frame">
          <table className="data-table product-table">
            <thead><tr><th scope="col">PRODUTO / IDENTIFICAÇÃO</th><th scope="col">DISPONÍVEL</th><th scope="col">REFERÊNCIA</th><th scope="col">SITUAÇÃO</th></tr></thead>
            <tbody>{products.map((product) => {
              const status = stockStatus(product.stock, product.minimum);
              return (
                <tr key={product.sku} className={'product-row row-' + status.tone}>
                  <td data-label="Produto"><strong>{product.name}</strong><small>{product.sku} <span>·</span> {product.category}</small></td>
                  <td data-label="Disponível"><div className="stock-number">{product.stock}<span>{product.unit}</span></div><StockMeter stock={product.stock} minimum={product.minimum} name={product.name} /></td>
                  <td data-label="Mínimo"><strong className="reference-value">{product.minimum} {product.unit}</strong><small>estoque mínimo</small></td>
                  <td data-label="Situação"><Status label={status.label} tone={status.tone} /></td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <div className="table-note"><span className="meter-legend"><i /> A marca na barra indica o estoque mínimo.</span><span>Dados fictícios para avaliação visual.</span></div>
      </section>
    </div>
  );
}

function Movements() {
  const example = products[0];
  return (
    <div className="page-stack">
      <section className="scan-stage" aria-labelledby="scan-title">
        <div className="scan-main">
          <div className="scan-kicker"><Barcode size={19} aria-hidden="true" /><span>POSTO DE LEITURA</span></div>
          <h2 id="scan-title">Leitura de código</h2>
          <p>Consulta por SKU ou código de barras. A leitura permanece desativada nesta prévia visual.</p>
          <label htmlFor="scan-preview">SKU OU CÓDIGO DE BARRAS</label>
          <div className="scan-input-wrap"><Barcode size={21} aria-hidden="true" /><input id="scan-preview" type="text" placeholder="Bipar ou digitar código" disabled /><span>PRÉVIA VISUAL</span></div>
        </div>
        <div className="scan-example" aria-label="Produto de exemplo, dados fictícios">
          <span className="block-label">PRODUTO DE EXEMPLO</span>
          <strong>{example.name}</strong>
          <span className="scan-example-sku">{example.sku} · {example.category}</span>
          <div className="scan-example-balance"><span>SALDO ATUAL</span><strong>{example.stock} <small>{example.unit}</small></strong></div>
          <StockMeter stock={example.stock} minimum={example.minimum} name={example.name} />
        </div>
      </section>
      <div className="movement-summary" aria-label="Resumo dos movimentos de demonstração">
        <div><span>ENTRADAS</span><strong className="in-text">{movementCounts.in}</strong><small>registros</small></div>
        <div><span>SAÍDAS</span><strong className="out-text">{movementCounts.out}</strong><small>registros</small></div>
        <div><span>AJUSTES</span><strong>{movementCounts.adjust}</strong><small>registro</small></div>
      </div>
      <section className="list-section" aria-labelledby="movements-title">
        <div className="list-heading"><h2 id="movements-title">Registro de movimentações</h2><span>{movements.length} REGISTROS DE EXEMPLO</span></div>
        <div className="table-frame">
          <table className="data-table movement-table">
            <thead><tr><th scope="col">DATA / HORA</th><th scope="col">PRODUTO</th><th scope="col">MOVIMENTO</th><th scope="col">MOTIVO</th><th scope="col">RESPONSÁVEL</th></tr></thead>
            <tbody>{movements.map((movement) => (
              <tr key={movement.id}>
                <td data-label="Data"><span className="date-cell">{movement.date}</span></td>
                <td data-label="Produto"><strong>{movement.product}</strong><small>{movement.sku}</small></td>
                <td data-label="Movimento"><span className={'delta delta-' + (movement.type === 'Saída' ? 'out' : movement.type === 'Entrada' ? 'in' : 'adjust')}>{movement.type === 'Saída' ? '−' : '+'}{movement.quantity}<small>{movement.type}</small></span></td>
                <td data-label="Motivo">{movement.reason}</td>
                <td data-label="Responsável">{movement.author}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function HistoryPage() {
  return (
    <div className="page-stack">
      <div className="history-intro"><span className="block-label">RASTREABILIDADE DE SALDO</span><p>Cada registro mostra o movimento e os saldos antes e depois da alteração.</p><strong>{movements.length.toString().padStart(2, '0')}<small>EVENTOS</small></strong></div>
      <section className="history-section" aria-labelledby="history-title">
        <div className="list-heading"><h2 id="history-title">Linha de alterações</h2><span>MAIS RECENTES PRIMEIRO</span></div>
        <ol className="history-list">
          {movements.map((movement) => (
            <li className="history-entry" key={movement.id}>
              <span className={'history-rail history-' + (movement.type === 'Saída' ? 'out' : movement.type === 'Entrada' ? 'in' : 'adjust')} aria-hidden="true"><i /></span>
              <span className="history-identity"><strong>{movement.product}</strong><small>{movement.id} · {movement.date}</small></span>
              <span className={'history-delta delta-' + (movement.type === 'Saída' ? 'out' : movement.type === 'Entrada' ? 'in' : 'adjust')}>{movement.type === 'Saída' ? '−' : '+'}{movement.quantity}<small>{movement.type}</small></span>
              <span className="balance-flow"><small>SALDO</small><span>{movement.before}<ArrowRight size={17} aria-hidden="true" /><strong>{movement.after}</strong></span></span>
              <span className="history-author"><small>REGISTRADO POR</small>{movement.author}</span>
            </li>
          ))}
        </ol>
      </section>
      <div className="overview-footnote"><span>HISTÓRICO DE DEMONSTRAÇÃO</span><span>Saldos e movimentos fictícios para avaliar a interface.</span></div>
    </div>
  );
}

export function App() {
  return (
    <Routes><Route element={<Shell />}>
      <Route index element={<Overview />} />
      <Route path="products" element={<Products />} />
      <Route path="movements" element={<Movements />} />
      <Route path="history" element={<HistoryPage />} />
    </Route></Routes>
  );
}
