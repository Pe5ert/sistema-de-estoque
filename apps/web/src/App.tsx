import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Boxes, ChevronRight, ClipboardCheck, HardDrive, History, LayoutDashboard, Menu, Package, X,
} from 'lucide-react';
import { Link, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { UserSession } from './auth/UserSession';
import { Overview } from './Overview';
import { Movements, HistoryPage } from './History';
import { ProductFormPage } from './ProductForm';
import { Products } from './Products';
import { BackupsPage, BackupsFeedbackMonitor } from './Backups';
import { ProductImportPage } from './ProductImport';
import { PhysicalInventoriesPage } from './PhysicalInventories';
import { PhysicalInventoryDetailPage } from './PhysicalInventoryDetail';
import { useAuth } from './auth/auth';
import { hasPermission } from '@stock/shared';
import { PermissionRoute } from './auth/PermissionRoute';
import { Suppliers, SupplierFormPage } from './Suppliers';
import { Purchases, PurchaseDetail } from './Purchases';
import { PurchaseFormPage } from './PurchaseForm';

const navigation = [
  { path: '/', label: 'Visão geral', icon: LayoutDashboard, description: 'Pulso do estoque e prioridades do dia.' },
  { path: '/products', label: 'Produtos', icon: Package, description: 'Catálogo, disponibilidade e pontos de atenção.' },
  { path: '/movements', label: 'Movimentações', icon: ArrowLeftRight, description: 'Entradas, saídas e ajustes em uma só leitura.' },
  { path: '/history', label: 'Histórico', icon: History, description: 'Rastro de cada alteração de saldo.' },
  { path: '/physical-inventories', label: 'Inventário físico', icon: ClipboardCheck, description: 'Contagem do estoque real, divergências e ajustes.' },
  { path: '/backups', label: 'Backups', icon: HardDrive, description: 'Cópias completas e agendamento do estoque.' },
  { path: '/suppliers', label: 'Fornecedores', icon: Boxes, description: 'Contatos e pedidos dos fornecedores da operação.' },
  { path: '/purchases', label: 'Compras', icon: Package, description: 'Pedidos, entregas parciais e recebimentos no estoque.' },
] as const;

function Shell() {
  const { currentUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const current = location.pathname === '/products/import'
    ? { path: '/products', label: 'Importar produtos', description: 'Traga o catálogo da planilha e confira antes de gravar.' }
    : location.pathname === '/products/new'
    ? { path: '/products', label: 'Novo produto', description: 'Identifique, configure e siga para o próximo item.' }
    : /^\/products\/.+\/edit$/.test(location.pathname)
      ? { path: '/products', label: 'Editar produto', description: 'Atualize os dados do catálogo. O saldo permanece preservado.' }
      : location.pathname === '/suppliers/new' ? { label: 'Novo fornecedor', description: 'Identificação e contatos para os próximos pedidos.' }
      : /^\/suppliers\/.+\/edit$/.test(location.pathname) ? { label: 'Editar fornecedor', description: 'Atualize contatos ou inative o cadastro preservando os pedidos.' }
      : location.pathname === '/purchases/new' ? { label: 'Novo pedido', description: 'Escolha fornecedor, produtos e custos negociados.' }
      : /^\/purchases\/.+\/edit$/.test(location.pathname) ? { label: 'Editar rascunho', description: 'Revise quantidades e custos antes de enviar.' }
      : /^\/purchases\/.+/.test(location.pathname) ? { label: 'Pedido de compra', description: 'Acompanhe entregas, saldos pendentes e recebimentos.' }
      : navigation.find((item) => item.path === location.pathname || item.path !== '/' && location.pathname.startsWith(item.path + '/')) ?? navigation[0];

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    sidebar.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
      if (event.key === 'Tab') {
        const links = sidebar.current?.querySelectorAll<HTMLElement>('a,button:not(:disabled)');
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
        onClick={() => setMenuOpen(false)}
        className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link-active' : '')}>
        <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="app-layout">
      <BackupsFeedbackMonitor />
      <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
      {menuOpen && <button className="sidebar-backdrop" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}
      <aside ref={sidebar} className={'sidebar' + (menuOpen ? ' sidebar-open' : '')} id="primary-sidebar" aria-label="Áreas de trabalho">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)} aria-label="GAVYO Estoque, visão geral">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span className="brand-wordmark">GAVYO<span>ESTOQUE</span></span>
        </Link>
        <div className="sidebar-rule" />
        <nav aria-label="Navegação principal">
          <div className="nav-group"><span className="nav-group-label">PAINEL</span>{navItem(navigation[0])}</div>
          <div className="nav-group"><span className="nav-group-label">OPERAÇÃO</span>{navigation.slice(1, 5).map(navItem)}</div>
          <div className="nav-group"><span className="nav-group-label">COMPRAS</span>{navigation.slice(6).map(navItem)}</div>
          {hasPermission(currentUser?.role, 'backup.manage') && <div className="nav-group"><span className="nav-group-label">ADMINISTRAÇÃO</span>{navItem(navigation[5])}</div>}
        </nav>
        <UserSession />
        <div className="sidebar-footer">
          <Boxes size={20} strokeWidth={1.6} aria-hidden="true" />
          <span>CONTROLE DE ESTOQUE<small>Área operacional</small></span>
        </div>
      </aside>
      <div className="workspace" inert={menuOpen}>
        <header className="topbar">
          <div className="topbar-leading">
            <button ref={menuButton} className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} aria-controls="primary-sidebar">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="topbar-system">GAVYO ESTOQUE</span>
            <ChevronRight size={15} aria-hidden="true" />
            <strong>{current.label}</strong>
          </div>
          <div className="topbar-demo">CONTROLE OPERACIONAL</div>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div><h1>{current.label}</h1><p className="page-description">{current.description}</p></div>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}><Route element={<Shell />}>
      <Route index element={<Overview />} />
      <Route path="products" element={<Products />} />
      <Route path="products/new" element={<PermissionRoute permission="product.create"><ProductFormPage /></PermissionRoute>} />
      <Route path="products/import" element={<PermissionRoute permission="product.import"><ProductImportPage /></PermissionRoute>} />
      <Route path="products/:id/edit" element={<PermissionRoute permission="product.update"><ProductFormPage /></PermissionRoute>} />
      <Route path="movements" element={<Movements />} />
      <Route path="history" element={<HistoryPage />} />
      <Route path="physical-inventories" element={<PhysicalInventoriesPage />} />
      <Route path="physical-inventories/:id" element={<PhysicalInventoryDetailPage />} />
      <Route path="suppliers" element={<PermissionRoute permission="supplier.read"><Suppliers /></PermissionRoute>} />
      <Route path="suppliers/new" element={<PermissionRoute permission="supplier.manage"><SupplierFormPage /></PermissionRoute>} />
      <Route path="suppliers/:id/edit" element={<PermissionRoute permission="supplier.manage"><SupplierFormPage /></PermissionRoute>} />
      <Route path="purchases" element={<PermissionRoute permission="purchase.read"><Purchases /></PermissionRoute>} />
      <Route path="purchases/new" element={<PermissionRoute permission="purchase.manage"><PurchaseFormPage /></PermissionRoute>} />
      <Route path="purchases/:id/edit" element={<PermissionRoute permission="purchase.manage"><PurchaseFormPage /></PermissionRoute>} />
      <Route path="purchases/:id" element={<PermissionRoute permission="purchase.read"><PurchaseDetail /></PermissionRoute>} />
      <Route path="backups" element={<PermissionRoute permission="backup.manage"><BackupsPage /></PermissionRoute>} />
    </Route></Route></Routes>
  );
}
