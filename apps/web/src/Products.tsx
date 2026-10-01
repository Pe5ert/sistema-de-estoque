import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Plus, Search, X } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { stockStatus, type ProductPresentation } from './demo-data';
import { useDemoCatalog } from './catalog';
import { ProductIdentity, ProductThumbnail, Status, StockMeter } from './inventory-ui';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Products() {
  const { products } = useDemoCatalog();
  const categories = [...new Set(products.map((product) => product.category))];
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const statusFilter = params.get('stock') ?? '';
  const [selected, setSelected] = useState<ProductPresentation | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const filtered = products.filter((product) => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const matchesTerm = `${product.name} ${product.sku}`.toLocaleLowerCase('pt-BR').includes(term);
    const tone = stockStatus(product.stock, product.minimum).tone;
    return matchesTerm && (!category || product.category === category)
      && (!statusFilter || (statusFilter === 'attention' ? tone !== 'success' : tone === statusFilter));
  });
  const attentionCount = products.filter((product) => product.stock <= product.minimum).length;
  const hasFilters = Boolean(search || category || statusFilter);
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);

  return (
    <div className="page-stack">
      {notice && <div className="form-notice" role="status">{notice}</div>}
      <div className="catalog-actions"><span>Cadastro e consulta do catálogo</span><Link className="primary-button" to="/products/new"><Plus size={16} aria-hidden="true" />Novo produto</Link></div>
      <section className="list-section" aria-labelledby="catalog-title">
        <div className="list-heading catalog-heading"><h2 id="catalog-title">Catálogo de produtos</h2><div className="catalog-counts"><span aria-live="polite">{filtered.length} de {products.length} produtos</span><span className="attention-count">{attentionCount} em atenção</span></div></div>
        <div className="filter-bar">
          <label className="search-control"><Search size={18} aria-hidden="true" /><span className="sr-only">Buscar produto ou SKU</span><input type="search" value={search} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Buscar produto ou SKU" /></label>
          <label className="select-control"><span>Categoria</span><select aria-label="Categoria" value={category} onChange={(event) => updateFilter('category', event.target.value)}><option value="">Todas</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="select-control"><span>Estoque</span><select aria-label="Estoque" value={statusFilter} onChange={(event) => updateFilter('stock', event.target.value)}><option value="">Todos</option><option value="success">Em estoque</option><option value="attention">Requer atenção</option><option value="warning">Estoque baixo</option><option value="danger">Sem estoque</option></select></label>
          {hasFilters && <button type="button" className="text-button" onClick={() => setParams({})}>Limpar filtros</button>}
        </div>
        <div className="table-frame">
          <table className="data-table product-table">
            <thead><tr><th scope="col">PRODUTO / SKU</th><th scope="col">DISPONÍVEL</th><th scope="col">MÍNIMO</th><th scope="col">PREÇO</th><th scope="col">SITUAÇÃO</th><th scope="col"><span className="sr-only">Detalhes</span></th></tr></thead>
            <tbody>{filtered.map((product) => {
              const status = stockStatus(product.stock, product.minimum);
              return <tr key={product.sku} className={'product-row row-' + status.tone}>
                <td data-label="Produto"><ProductIdentity product={product} /></td>
                <td data-label="Disponível"><div className="stock-number">{product.stock}<span>{product.unit}</span></div><StockMeter stock={product.stock} minimum={product.minimum} name={product.name} /></td>
                <td data-label="Mínimo"><strong className="reference-value">{product.minimum} <span>{product.unit}</span></strong></td>
                <td data-label="Preço" className={'price-cell' + (product.price == null ? ' price-missing' : '')}>{product.price == null ? <span aria-label="Preço não informado">—</span> : currency.format(product.price)}</td>
                <td data-label="Situação"><Status label={status.label} tone={status.tone} /></td>
                <td className="row-action-cell"><button type="button" className="row-action" aria-label={'Ver detalhes de ' + product.name} onClick={() => setSelected(product)}><ArrowUpRight size={18} aria-hidden="true" /><span className="mobile-action-label">Ver detalhes</span></button></td>
              </tr>;
            })}</tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state" role="status"><Search size={24} aria-hidden="true" /><strong>Nenhum produto encontrado para estes filtros.</strong><p>Confira o nome ou SKU, ou limpe os filtros para ver o catálogo.</p><button type="button" className="secondary-button" onClick={() => setParams({})}>Limpar filtros</button></div>}
        </div>
        <div className="table-note"><span className="meter-legend"><i /> A marca na barra indica o mínimo.</span><span>Preços não informados aparecem como —.</span></div>
      </section>
      <dialog className="product-dialog" ref={dialog} aria-labelledby="product-detail-title" onCancel={() => setSelected(null)} onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setSelected(null);
      }}>
        {selected && <>
          <div className="detail-header"><span className="block-label">IDENTIFICAÇÃO DO PRODUTO</span><button type="button" className="row-action" aria-label="Fechar detalhes" onClick={() => setSelected(null)}><X size={20} /></button></div>
          <ProductThumbnail imageUrl={selected.imageUrl} name={selected.name} large />
          <h2 id="product-detail-title">{selected.name}</h2><p className="detail-meta">{selected.sku} · {selected.category}</p>
          <Status {...stockStatus(selected.stock, selected.minimum)} />
          <dl className="detail-facts"><div><dt>Saldo atual</dt><dd>{selected.stock} <small>{selected.unit}</small></dd></div><div><dt>Estoque mínimo</dt><dd>{selected.minimum} <small>{selected.unit}</small></dd></div><div><dt>Preço</dt><dd>{selected.price == null ? 'Não informado' : currency.format(selected.price)}</dd></div></dl>
          <StockMeter stock={selected.stock} minimum={selected.minimum} name={selected.name} />
          {selected.barcode && <p className="detail-meta">Código de barras: {selected.barcode}</p>}
          {selected.description && <p className="detail-meta">{selected.description}</p>}
          {selected.initialEntry && <p className="initial-entry-note">Entrada inicial preparada: {selected.initialEntry.quantity} {selected.unit}. Saldo ainda não alterado.</p>}
          <Link className="primary-button" to={'/products/' + encodeURIComponent(selected.id ?? selected.sku) + '/edit'}>Editar produto</Link>
          <p className="detail-note">Dados fictícios · consulta de demonstração</p>
        </>}
      </dialog>
    </div>
  );
}
