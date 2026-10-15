import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Package, Search, X } from 'lucide-react';
import type { Page, ProductRecord } from '@stock/shared';
import { useAuth } from './auth/auth';
import { apiClient } from './lib/api';
import { BusyIndicator, useDebouncedValue } from './motion';
import { productSearchLink, searchActions } from './global-search-model';

export function GlobalSearch() {
  const { currentUser } = useAuth();
  const [query, setQuery] = useState(''), [open, setOpen] = useState(false), [active, setActive] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null), root = useRef<HTMLDivElement>(null);
  const id = useId(), location = useLocation(), navigate = useNavigate();
  const text = query.trim(), term = useDebouncedValue(text);
  const products = useQuery({ queryKey: ['global-search', term], enabled: open && term.length >= 2 && Boolean(currentUser), retry: false,
    queryFn: ({ signal }) => apiClient<Page<ProductRecord>>('/products?' + new URLSearchParams({ search: term, active: 'all', limit: '6', page: '1' }), { signal }) });
  const waiting = text.length >= 2 && (text !== term || products.isFetching);
  const matches = text === term && text.length >= 2 && !products.error ? products.data?.items ?? [] : [];
  const functions = searchActions(text, currentUser?.role);
  const options = [
    ...matches.map(product => ({ label: product.name, description: `${product.sku}${product.barcode ? ' · ' + product.barcode : ''}${!product.active ? ' · Inativo' : ''}`, path: productSearchLink(product.id, product.sku), product: true })),
    ...functions.map(action => ({ label: action.label, description: 'Abrir função', path: action.path, product: false })),
    ...(text ? [{ label: `Pesquisar “${text}” em Produtos`, description: 'Ver todos os resultados', path: '/products?' + new URLSearchParams({ q: text, active: 'all' }), product: false }] : []),
  ];
  const selected = active === null ? 0 : options.findIndex(option => option.path === active);
  useEffect(() => {
    if (open) document.getElementById(`${id}-${selected}`)?.scrollIntoView({ block: 'nearest' });
  }, [id, selected, open]);
  useEffect(() => { setOpen(false); setQuery(''); setActive(null); }, [location.key]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && input.current && !input.current.closest('[inert]')) {
        event.preventDefault(); input.current.focus(); setOpen(true);
      }
    };
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    window.addEventListener('keydown', shortcut); document.addEventListener('pointerdown', outside);
    return () => { window.removeEventListener('keydown', shortcut); document.removeEventListener('pointerdown', outside); };
  }, []);
  const select = (path: string) => { setOpen(false); navigate(path); };
  return <div className="global-search" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <div className="global-search-control"><Search size={17} aria-hidden="true" />
      <input ref={input} type="search" role="combobox" aria-label="Pesquisar produtos ou funções" placeholder="Produto ou função…" value={query} maxLength={120} autoComplete="off"
        aria-autocomplete="list" aria-expanded={open} aria-controls={id} aria-activedescendant={open && options[selected] ? `${id}-${selected}` : undefined}
        onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setActive(null); setOpen(true); }}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); const next = (selected + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % Math.max(1, options.length); setActive(options[next]?.path ?? null); }
          if (event.key === 'Enter' && open && options[selected]) { event.preventDefault(); select(options[selected].path); }
        }} />
      {query ? <button type="button" className="global-search-clear" aria-label="Limpar pesquisa" onClick={() => { setQuery(''); setActive(null); input.current?.focus(); }}><X size={15} aria-hidden="true" /></button> : <kbd aria-hidden="true">Ctrl K</kbd>}
    </div>
    {open && <div className="global-search-panel">
      <p className="global-search-status" role="status">{waiting ? <><BusyIndicator />Buscando produtos…</> : text.length === 1 ? 'Digite mais uma letra para buscar produtos.' : text ? `${matches.length} ${matches.length === 1 ? 'produto' : 'produtos'} · ${functions.length} ${functions.length === 1 ? 'função' : 'funções'}` : 'Acesso rápido · digite para encontrar produtos'}</p>
      {text.length >= 2 && text === term && products.error && <div className="global-search-error" role="alert">Não foi possível buscar produtos. <button className="text-button" type="button" onClick={() => { void products.refetch(); }}>Tentar novamente</button></div>}
      {active !== null && selected < 0 && <p role="status">A opção selecionada não está mais disponível. Use as setas para escolher outra.</p>}
      <div id={id} role="listbox" aria-label="Resultados da pesquisa">
        {options.map((option, index) => <div key={option.path}>
          {(index === 0 || options[index - 1].product !== option.product) && <span className="global-search-group">{option.product ? 'Produtos' : 'Funções e navegação'}</span>}
          <Link id={`${id}-${index}`} role="option" aria-selected={selected === index} tabIndex={-1} to={option.path} onPointerMove={() => setActive(option.path)} onMouseDown={event => event.preventDefault()} onClick={() => setOpen(false)}>
            {option.product ? <Package size={17} aria-hidden="true" /> : <ArrowUpRight size={17} aria-hidden="true" />}<span><strong>{option.label}</strong><small>{option.description}</small></span>
          </Link>
        </div>)}
      </div>
      <p className="global-search-help">↑ ↓ selecionar · Enter abrir · Esc fechar</p>
    </div>}
  </div>;
}
