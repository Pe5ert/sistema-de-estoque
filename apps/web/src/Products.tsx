import { useState } from 'react';
import { ChevronRight, Pencil, Plus, Search } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { stockStatus, dateLabel, reasonLabels, typeLabels } from './inventory-model';
import { useCategories, useProducts, useProduct, useMovements } from './inventory-api';
import { DataState, Pagination } from './data-controls';
import { DetailDrawer, openFromRow } from './DetailDrawer';
import { CategoryManager } from './CategoryManager';
import { ProductIdentity, ProductThumbnail, Status, StockMeter } from './inventory-ui';
import { canImportProducts } from '@stock/shared';
import { useAuth } from './auth/auth';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Products() {
  const { currentUser } = useAuth();
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const statusFilter = params.get('stock') ?? '';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const query = useProducts({ page, limit: 20, search, category, stockStatus: ({ success: 'NORMAL', danger: 'OUT', warning: 'LOW', attention: 'ATTENTION' } as Record<string, string>)[statusFilter], active: params.get('active') ?? 'true' });
  const filtered = query.data?.items ?? [];
  const hasFilters = Boolean(search || category || statusFilter || (params.get('active') && params.get('active') !== 'true'));
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (key !== 'page') next.delete('page');
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };


  return (
    <div className="page-stack">
      {notice && <div className="form-notice" role="status">{notice}</div>}
      <div className="catalog-actions"><span>Cadastro e consulta do catálogo</span><div className="inline-actions">{canImportProducts(currentUser?.role) && <Link className="secondary-button" to="/products/import">Importar planilha</Link>}<CategoryManager onOpen={() => setSelectedId(null)} /><Link className="primary-button" to="/products/new"><Plus size={16} aria-hidden="true" />Novo produto</Link></div></div>
      <section className="list-section" aria-labelledby="catalog-title">
        <div className="list-heading catalog-heading"><h2 id="catalog-title">Catálogo de produtos</h2><span aria-live="polite">{query.data?.total ?? '…'} produtos</span></div>
        <div className="filter-bar">
          <label className="search-control"><Search size={18} aria-hidden="true" /><span className="sr-only">Buscar produto, SKU ou código de barras</span><input type="search" value={search} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Buscar produto, SKU ou código de barras" /></label>
          <label className="select-control"><span>Categoria</span><select aria-label="Categoria" value={category} onChange={(event) => updateFilter('category', event.target.value)}><option value="">Todas</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="select-control"><span>Estoque</span><select aria-label="Estoque" value={statusFilter} onChange={(event) => updateFilter('stock', event.target.value)}><option value="">Todos</option><option value="success">Em estoque</option><option value="attention">Requer atenção</option><option value="warning">Estoque baixo</option><option value="danger">Sem estoque</option></select></label>
          {hasFilters && <button type="button" className="text-button" onClick={() => setParams({})}>Limpar filtros</button>}
          <label className="select-control"><span>Cadastro</span><select aria-label="Situação do cadastro" value={params.get('active') ?? 'true'} onChange={event => updateFilter('active', event.target.value)}><option value="true">Ativos</option><option value="false">Inativos</option><option value="all">Todos</option></select></label>
        </div>
        {categoriesQuery.error && <p className="field-error" role="alert">Não foi possível carregar categorias. <button className="text-button" onClick={() => void categoriesQuery.refetch()}>Tentar novamente</button></p>}
        <DataState pending={query.isPending} error={query.error} retry={query.refetch}>
        <div className="table-frame">
          <table className="data-table product-table">
            <thead><tr><th scope="col">PRODUTO / SKU</th><th scope="col">DISPONÍVEL</th><th scope="col">MÍNIMO</th><th scope="col">PREÇO</th><th scope="col">SITUAÇÃO</th><th scope="col"><span className="sr-only">Detalhes</span></th></tr></thead>
            <tbody>{filtered.map((product) => {
              const status = stockStatus(product.stock, product.minimum);
              return <tr key={product.id} tabIndex={0} aria-selected={selectedId === product.id} aria-label={'Detalhes de ' + product.name} className={'product-row clickable-row row-' + status.tone + (selectedId === product.id ? ' row-selected' : '')} onClick={event => openFromRow(event, () => setSelectedId(product.id))} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setSelectedId(product.id); } }}>
                <td data-label="Produto"><ProductIdentity product={product} /></td>
                <td data-label="Disponível"><div className="stock-number">{product.stock}<span>{product.unit}</span></div><StockMeter stock={product.stock} minimum={product.minimum} name={product.name} /></td>
                <td data-label="Mínimo"><strong className="reference-value">{product.minimum} <span>{product.unit}</span></strong></td>
                <td data-label="Preço" className={'price-cell' + (product.price == null ? ' price-missing' : '')}>{product.price == null ? <span aria-label="Preço não informado">—</span> : currency.format(product.price)}</td>
                <td data-label="Situação"><Status label={status.label} tone={status.tone} /></td>
                <td className="row-action-cell"><button type="button" className="row-action row-detail-action" aria-label={'Ver detalhes de ' + product.name} onClick={() => setSelectedId(product.id)}><ChevronRight size={18} aria-hidden="true" /><span className="mobile-action-label">Ver detalhes</span></button></td>
              </tr>;
            })}</tbody>
          </table>
          {filtered.length === 0 && <div className="empty-state" role="status"><Search size={24} aria-hidden="true" /><strong>Nenhum produto encontrado para estes filtros.</strong><p>Confira o nome ou SKU, ou limpe os filtros para ver o catálogo.</p><button type="button" className="secondary-button" onClick={() => setParams({})}>Limpar filtros</button></div>}
        </div>
        <Pagination data={query.data} change={page => updateFilter('page', String(page))} />
        </DataState>
        <div className="table-note"><span className="meter-legend"><i /> A marca na barra indica o mínimo.</span><span>Preços não informados aparecem como —.</span></div>
      </section>
      {selectedId && <ProductDrawer id={selectedId} close={() => setSelectedId(null)} />}
    </div>
  );
}

function ProductDrawer({ id, close }: { id: string; close: () => void }) {
  const query = useProduct(id);
  const movements = useMovements({ productId: id, limit: 5, page: 1 });
  const product = query.data;
  return <DetailDrawer title="Identificação do produto" close={close}><DataState pending={query.isPending} error={query.error} retry={query.refetch}>{product && <>
    <ProductThumbnail imageUrl={product.imageUrl} name={product.name} large /><h2>{product.name}</h2><p className="detail-meta">{product.sku} · {product.category}</p><Status {...stockStatus(product.stock, product.minimum)} />
    <dl className="detail-facts"><div><dt>Saldo atual</dt><dd>{product.record.stock} {product.unit}</dd></div><div><dt>Estoque mínimo</dt><dd>{product.record.minimumStock} {product.unit}</dd></div><div><dt>Custo</dt><dd>{product.costPrice == null ? 'Não informado' : currency.format(product.costPrice)}</dd></div><div><dt>Venda</dt><dd>{product.price == null ? 'Não informado' : currency.format(product.price)}</dd></div><div><dt>Código de barras</dt><dd>{product.barcode ?? 'Não informado'}</dd></div><div><dt>Cadastro</dt><dd>{product.active ? 'Ativo' : 'Inativo'}</dd></div></dl>
    {product.description && <p className="detail-meta">{product.description}</p>}<div className="detail-actions"><Link className="secondary-button" to={'/products/' + id + '/edit'}><Pencil size={16} aria-hidden="true" />Editar produto</Link></div><h3>Movimentações recentes</h3>
    <DataState pending={movements.isPending} error={movements.error} retry={movements.refetch}>{movements.data?.items.map(item => <p className="detail-meta" key={item.id}>{typeLabels[item.type]} · {item.quantity} {product.unit}<br />{dateLabel(item.createdAt)} · {reasonLabels[item.reason]}</p>)}{movements.data?.total === 0 && <p className="detail-meta">Nenhuma movimentação registrada.</p>}</DataState>
  </>}</DataState></DetailDrawer>;
}
