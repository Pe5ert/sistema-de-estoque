import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Boxes, ChevronRight, ClipboardCheck, HardDrive, History, LayoutDashboard, Menu, Package, X,
} from 'lucide-react';
import { Link, NavLink, Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router-dom';
import { LoginPage } from './auth/LoginPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { UserSession } from './auth/UserSession';
import { Overview } from './Overview';
import { Movements, HistoryPage } from './History';
import { ProductFormPage } from './ProductForm';
import { motionDelay } from './motion';
import { ThemeToggle } from './Theme';
import { GlobalSearch } from './GlobalSearch';
import { lockPageScroll } from './scroll-lock';
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
  { path: '/', label: 'Visão geral', icon: LayoutDashboard },
  { path: '/products', label: 'Produtos', icon: Package },
  { path: '/movements', label: 'Movimentações', icon: ArrowLeftRight },
  { path: '/history', label: 'Histórico', icon: History },
  { path: '/physical-inventories', label: 'Inventário físico', icon: ClipboardCheck },
  { path: '/backups', label: 'Backups', icon: HardDrive },
  { path: '/suppliers', label: 'Fornecedores', icon: Boxes },
  { path: '/purchases', label: 'Compras', icon: Package },
] as const;

function Shell() {
  const { currentUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const mobileMenuOpen = mobile && menuOpen;
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const change = () => { setMobile(media.matches); if (!media.matches) setMenuOpen(false); };
    change(); media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  const [menuVisible, setMenuVisible] = useState(false);
  useEffect(() => {
    if (menuOpen) { setMenuVisible(true); return; }
    const timer = window.setTimeout(() => setMenuVisible(false), motionDelay(180));
    return () => window.clearTimeout(timer);
  }, [menuOpen]);
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigationTypeRef = useRef(navigationType);
  navigationTypeRef.current = navigationType;
  const positions = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const position = navigationTypeRef.current === 'POP' ? positions.current.get(location.pathname) ?? 0 : 0;
    window.scrollTo({ top: position, behavior: 'instant' });
    document.getElementById('main-content')?.focus({ preventScroll: true });
    return () => { positions.current.set(location.pathname, window.scrollY); };
  }, [location.pathname]);
  const current = location.pathname === '/products/import'
    ? { path: '/products', label: 'Importar produtos' }
    : location.pathname === '/products/new'
    ? { path: '/products', label: 'Novo produto' }
    : /^\/products\/.+\/edit$/.test(location.pathname)
      ? { path: '/products', label: 'Editar produto' }
      : location.pathname === '/suppliers/new' ? { label: 'Novo fornecedor' }
      : /^\/suppliers\/.+\/edit$/.test(location.pathname) ? { label: 'Editar fornecedor' }
      : location.pathname === '/purchases/new' ? { label: 'Novo pedido' }
      : /^\/purchases\/.+\/edit$/.test(location.pathname) ? { label: 'Editar rascunho' }
      : /^\/purchases\/.+/.test(location.pathname) ? { label: 'Pedido de compra' }
      : navigation.find((item) => item.path === location.pathname || item.path !== '/' && location.pathname.startsWith(item.path + '/')) ?? navigation[0];

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const unlockScroll = lockPageScroll();
    const controls = () => Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a,button:not(:disabled)') ?? []).filter(node => node.getClientRects().length > 0 && !node.closest('[inert]'));
    const focusFirst = () => (sidebar.current?.querySelector<HTMLButtonElement>('.sidebar-close') ?? controls()[0])?.focus();
    focusFirst();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (document.getElementById('root')?.inert) return;
      if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); }
      if (event.key === 'Tab') {
        const links = controls();
        if (!links?.length) return;
        const first = links[0];
        const last = links[links.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    const containFocus = (event: FocusEvent) => {
      if (!document.getElementById('root')?.inert && event.target instanceof Node && !sidebar.current?.contains(event.target)) focusFirst();
    };
    window.addEventListener('keydown', closeOnEscape);
    document.addEventListener('focusin', containFocus);
    return () => {
      window.removeEventListener('keydown', closeOnEscape); document.removeEventListener('focusin', containFocus); unlockScroll();
      if (sidebar.current?.contains(document.activeElement) || document.activeElement === document.body) {
        if (menuButton.current?.getClientRects().length) menuButton.current.focus({ preventScroll: true });
        else document.getElementById('main-content')?.focus({ preventScroll: true });
      }
    };
  }, [mobileMenuOpen]);

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
      {mobile && menuVisible && <button tabIndex={-1} className={'sidebar-backdrop' + (!mobileMenuOpen ? ' is-closing' : '')} type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />}
      <aside ref={sidebar} inert={mobile && !mobileMenuOpen} className={'sidebar' + (mobileMenuOpen ? ' sidebar-open' : '')} id="primary-sidebar" aria-label="Áreas de trabalho">
        <div className="sidebar-brand-row">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)} aria-label="GAVYO Estoque, visão geral">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span className="brand-wordmark">GAVYO<span>ESTOQUE</span></span>
        </Link>
        <button className="icon-button sidebar-close" type="button" aria-label="Fechar navegação" onClick={() => setMenuOpen(false)}><X size={18} aria-hidden="true" /></button>
        </div>
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
          <span>CONTROLE DE ESTOQUE</span>
        </div>
      </aside>
      <div className="workspace" inert={mobileMenuOpen}>
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
          <div className="topbar-actions"><GlobalSearch /><ThemeToggle /></div>
        </header>
        <main className="main-content" id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <h1>{current.label}</h1>
          </div>
          <div className="route-surface" key={location.pathname}><Outlet /></div>
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
