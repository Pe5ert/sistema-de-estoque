import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight, ArrowRight, ArrowUpRight,
  Boxes, ChevronRight, History, LayoutDashboard, Menu, Package, X,
} from 'lucide-react';
import { Link, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { movements, stockStatus } from './demo-data';
import { DemoCatalogProvider, useDemoCatalog } from './catalog';
import { ProductFormPage } from './ProductForm';
import { Products } from './Products';
import { MovementWorkbench } from './MovementWorkbench';
import { MovementAmount, ProductIdentity, Status, StockMeter } from './inventory-ui';

const navigation = [
  { path: '/', label: 'Visão geral', icon: LayoutDashboard, description: 'Pulso do estoque e prioridades do dia.' },
  { path: '/products', label: 'Produtos', icon: Package, description: 'Catálogo, disponibilidade e pontos de atenção.' },
  { path: '/movements', label: 'Movimentações', icon: ArrowLeftRight, description: 'Entradas, saídas e ajustes em uma só leitura.' },
  { path: '/history', label: 'Histórico', icon: History, description: 'Rastro de cada alteração de saldo.' },
] as const;

const movementCounts = {
  in: movements.filter((movement) => movement.type === 'Entrada').length,
  out: movements.filter((movement) => movement.type === 'Saída').length,
  adjust: movements.filter((movement) => movement.type === 'Ajuste').length,
};

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const current = location.pathname === '/products/new'
    ? { path: '/products', label: 'Novo produto', description: 'Identifique, configure e siga para o próximo item.' }
    : /^\/products\/.+\/edit$/.test(location.pathname)
      ? { path: '/products', label: 'Editar produto', description: 'Atualize os dados do catálogo. O saldo permanece preservado.' }
      : navigation.find((item) => item.path === location.pathname) ?? navigation[0];

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    sidebar.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
      if (event.key === 'Tab') {
        const links = sidebar.current?.querySelectorAll<HTMLAnchorElement>('a');
        if (!links?.length) return;
        const first = links[0];
        const last = links[links.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => { window.removeEventListener('keydown', closeOnEscape); menuButton.current?.focus(); };
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
      <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
      {menuOpen && <button className="sidebar-backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}
      <aside ref={sidebar} className={'sidebar' + (menuOpen ? ' sidebar-open' : '')} id="primary-sidebar" aria-label="Áreas de trabalho">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)} aria-label="Sistema de Estoque, visão geral">
          <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span className="brand-wordmark">ESTOQUE<span>V2</span></span>
        </Link>
        <div className="sidebar-rule" />
        <nav aria-label="Navegação principal">
          <div className="nav-group"><span className="nav-group-label">PAINEL</span>{navItem(navigation[0])}</div>
          <div className="nav-group"><span className="nav-group-label">OPERAÇÃO</span>{navigation.slice(1).map(navItem)}</div>
        </nav>
        <div className="sidebar-footer">
          <Boxes size={20} strokeWidth={1.6} aria-hidden="true" />
          <span>CONTROLE DE ESTOQUE<small>Ambiente de demonstração</small></span>
        </div>
      </aside>
      <div className="workspace" inert={menuOpen}>
        <header className="topbar">
          <div className="topbar-leading">
            <button ref={menuButton} className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} aria-controls="primary-sidebar">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="topbar-system">SISTEMA / ESTOQUE</span>
            <ChevronRight size={15} aria-hidden="true" />
            <strong>{current.label}</strong>
          </div>
          <div className="topbar-demo">DEMONSTRAÇÃO <span className="topbar-demo-suffix">/ DADOS FICTÍCIOS</span></div>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div><div className="eyebrow">{current.path === '/' ? 'POSIÇÃO DO ESTOQUE' : 'OPERAÇÃO / ESTOQUE'}</div><h1>{current.label}</h1><p className="page-description">{current.description}</p></div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Overview() {
  const { products } = useDemoCatalog();
  const lowStock = products.filter((product) => product.stock > 0 && product.stock <= product.minimum);
  const outOfStock = products.filter((product) => product.stock === 0);
  const available = products.filter((product) => product.stock > product.minimum);
  const totalUnits = products.reduce((total, product) => total + product.stock, 0);
  const attention = [...outOfStock, ...lowStock];
  return (
    <div className="overview-page">
      <div className="dashboard-grid">
        <section className="hero-stock" aria-labelledby="stock-title">
          <div className="hero-topline"><span className="block-label">POSIÇÃO ATUAL</span></div>
          <div className="hero-main"><h2 id="stock-title">Unidades em estoque</h2><div className="hero-value">{totalUnits.toLocaleString('pt-BR')}<span>un.</span></div><p>{products.length} produtos no catálogo</p></div>
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
          <Link className="panel-link" to="/products?stock=attention">Ver produtos em atenção <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </section>
        <section className="activity-panel" aria-labelledby="activity-title">
          <div className="dark-panel-heading"><span className="block-label">FLUXO RECENTE</span></div>
          <h2 id="activity-title">Atividade recente</h2><p className="panel-subtitle">Entradas, saídas e ajustes</p>
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
          <div className="dark-panel-heading"><span className="block-label">FILA DE ATENÇÃO</span><Link to="/products?stock=attention" aria-label="Ver produtos que precisam de atenção"><ArrowUpRight size={18} /></Link></div>
          <h2 id="attention-title">Prioridades de reposição</h2>
          <div className="attention-list">
            {attention.map((product) => {
              const status = stockStatus(product.stock, product.minimum);
              return (
                <div className="attention-row" key={product.sku}>
                  <ProductIdentity product={product} />
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

function Movements() {
  const { products } = useDemoCatalog();
  return (
    <div className="page-stack">
      <MovementWorkbench />
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
                <td data-label="Produto"><ProductIdentity product={products.find((product) => product.sku === movement.sku) ?? { name: movement.product, sku: movement.sku }} /></td>
                <td data-label="Movimento"><MovementAmount type={movement.type} quantity={movement.quantity} /></td>
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
  const [typeFilter, setTypeFilter] = useState('');
  const filtered = movements.filter((movement) => !typeFilter || movement.type === typeFilter);
  return (
    <div className="page-stack">
      <div className="history-intro"><span className="block-label">RASTREABILIDADE DE SALDO</span><p>Produto, motivo e responsável em cada alteração.</p><strong>{movements.length}<small>REGISTROS</small></strong></div>
      <section className="history-section" aria-labelledby="history-title">
        <div className="list-heading"><h2 id="history-title">Alterações de saldo</h2><span>MAIS RECENTES PRIMEIRO</span></div>
        <div className="filter-bar history-filters"><label className="select-control"><span>Movimento</span><select aria-label="Movimento" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">Todos</option><option>Entrada</option><option>Saída</option><option>Ajuste</option></select></label><span className="filter-count" aria-live="polite">{filtered.length} registros</span></div>
        <div className="table-frame"><table className="data-table history-table">
          <thead><tr><th scope="col">PRODUTO / REGISTRO</th><th scope="col">DATA / HORA</th><th scope="col">MOVIMENTO</th><th scope="col">ANTES → DEPOIS</th><th scope="col">MOTIVO</th><th scope="col">RESPONSÁVEL</th></tr></thead>
          <tbody>{filtered.map((movement) => <tr className={'history-entry history-' + (movement.type === 'Saída' ? 'out' : movement.type === 'Entrada' ? 'in' : 'adjust')} key={movement.id}>
            <td data-label="Produto"><strong>{movement.product}</strong><small>{movement.id} · {movement.sku}</small></td>
            <td data-label="Data"><span className="date-cell">{movement.date}</span></td>
            <td data-label="Movimento"><MovementAmount type={movement.type} quantity={movement.quantity} /></td>
            <td data-label="Antes → depois"><span className="balance-flow"><span>{movement.before}<ArrowRight size={17} aria-hidden="true" /><strong>{movement.after}</strong></span></span></td>
            <td data-label="Motivo">{movement.reason}</td><td data-label="Responsável">{movement.author}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
      <div className="overview-footnote"><span>HISTÓRICO DE DEMONSTRAÇÃO</span><span>Saldos e movimentos fictícios para avaliar a interface.</span></div>
    </div>
  );
}

export function App() {
  return (
    <DemoCatalogProvider><Routes><Route element={<Shell />}>
      <Route index element={<Overview />} />
      <Route path="products" element={<Products />} />
      <Route path="products/new" element={<ProductFormPage />} />
      <Route path="products/:id/edit" element={<ProductFormPage />} />
      <Route path="movements" element={<Movements />} />
      <Route path="history" element={<HistoryPage />} />
    </Route></Routes></DemoCatalogProvider>
  );
}
