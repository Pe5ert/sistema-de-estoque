import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { hasPermission, type SupplierRecord } from '@stock/shared';
import { Plus, Search } from 'lucide-react';
import { useAuth } from './auth/auth';
import { useSuppliers, useSupplier, useOrders, usePurchaseMutation } from './purchases-api';
import { DataState, Pagination } from './data-controls';
import { DetailDrawer, openFromRow } from './DetailDrawer';
import { Field } from './form-controls';
import { Alert, ConfirmDialog, useFeedback } from './feedback';
import { apiClient, ApiError } from './lib/api';
import { useUnsavedForm } from './UnsavedForm';
import { money, orderNumber } from './purchase-model';
import { purchaseStatusLabels } from '@stock/shared';

export function Suppliers() {
  const { currentUser } = useAuth(), allowed = hasPermission(currentUser?.role, 'supplier.manage');
  const [params, setParams] = useSearchParams(), [selected, setSelected] = useState<string>();
  const query = useSuppliers({ search: params.get('q') ?? '', active: params.get('active') ?? 'true', page: Number(params.get('page')) || 1 });
  const filter = (key: string, value: string) => { const next = new URLSearchParams(params); next.delete('page'); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: true }); };
  return <div className="page-stack procurement-page">
    <div className="catalog-actions">{allowed && <Link className="primary-button" to="/suppliers/new"><Plus size={16} />Novo fornecedor</Link>}</div>

    <section className="list-section"><div className="list-heading"><h2 className="sr-only">Fornecedores</h2><div className="supplier-counts"><span><strong>{query.data?.overview.active ?? '—'}</strong> ativos</span><span><strong>{query.data?.overview.inactive ?? '—'}</strong> inativos</span></div><span>{query.data?.total ?? '…'} encontrados</span></div><div className="filter-bar"><label className="search-control"><Search size={18} /><span className="sr-only">Buscar fornecedor</span><input aria-label="Buscar fornecedor" placeholder="Nome, CPF/CNPJ ou contato" value={params.get('q') ?? ''} onChange={event => filter('q', event.target.value)} /></label><label className="select-control"><span>Situação</span><select aria-label="Situação do fornecedor" value={params.get('active') ?? 'true'} onChange={event => filter('active', event.target.value)}><option value="true">Ativos</option><option value="false">Inativos</option><option value="all">Todos</option></select></label></div>
      <DataState pending={query.isPending} error={query.error} retry={query.refetch}><div className="table-frame"><table className="data-table procurement-table"><thead><tr><th>FORNECEDOR</th><th>CPF/CNPJ</th><th>CONTATO</th><th>TELEFONE / E-MAIL</th><th>SITUAÇÃO</th></tr></thead><tbody>{query.data?.items.map(supplier => <tr className="clickable-row" key={supplier.id} tabIndex={0} aria-label={'Detalhes de ' + supplier.name} onClick={event => openFromRow(event, () => setSelected(supplier.id))} onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setSelected(supplier.id); } }}><td data-label="Fornecedor"><strong>{supplier.name}</strong><small>{supplier.tradeName}</small></td><td data-label="CPF/CNPJ">{supplier.document ?? 'Não informado'}</td><td data-label="Contato">{supplier.contact ?? 'Não informado'}</td><td data-label="Telefone / e-mail">{supplier.phone ?? '—'}<small>{supplier.email ?? '—'}</small></td><td data-label="Situação"><span className={'procurement-status ' + (supplier.active ? 'success-text' : 'muted-text')}>{supplier.active ? 'Ativo' : 'Inativo'}</span></td></tr>)}</tbody></table>{query.data?.total === 0 && <div className="empty-state"><strong>Nenhum fornecedor encontrado.</strong><p>Cadastre um fornecedor ou ajuste a busca e os filtros.</p></div>}</div><Pagination data={query.data} change={page => { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next); }} /></DataState></section>
    {selected && <SupplierDrawer id={selected} close={() => setSelected(undefined)} />}
  </div>;
}
function SupplierDrawer({ id, close }: { id: string; close: () => void }) {
  const query = useSupplier(id), orders = useOrders({ supplierId: id, limit: 10 }); const { currentUser } = useAuth(); const supplier = query.data;
  return <DetailDrawer title="Detalhes do fornecedor" close={close}><DataState pending={query.isPending} error={query.error} retry={query.refetch}>{supplier && <><h2>{supplier.name}</h2><p className="detail-meta">{supplier.tradeName}</p><dl className="detail-facts">{[['CPF/CNPJ', supplier.document], ['Contato', supplier.contact], ['E-mail', supplier.email], ['Telefone', supplier.phone], ['Endereço', supplier.address], ['Situação', supplier.active ? 'Ativo' : 'Inativo']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Não informado'}</dd></div>)}</dl><p>{supplier.notes}</p>{hasPermission(currentUser?.role, 'supplier.manage') && <Link className="secondary-button" to={'/suppliers/' + id + '/edit'}>Editar fornecedor</Link>}<h3>Pedidos relacionados</h3><DataState pending={orders.isPending} error={orders.error} retry={orders.refetch}>{orders.data?.items.map(order => <Link className="procurement-related" key={order.id} to={'/purchases/' + order.id}><strong>{orderNumber(order.number)}</strong><span>{purchaseStatusLabels[order.status]} · {money(order.total)}</span></Link>)}{orders.data?.total === 0 && <p>Nenhum pedido registrado.</p>}{orders.data && orders.data.total > 10 && <Link to={'/purchases?supplierId=' + id}>Ver todos os pedidos</Link>}</DataState></>}</DataState></DetailDrawer>;
}
export function SupplierFormPage() {
  const { id } = useParams(), query = useSupplier(id);
  return <DataState pending={Boolean(id && query.isPending)} error={id ? query.error : null} retry={query.refetch} retainContentOnError={Boolean(query.data)}><SupplierForm key={id ?? 'new'} supplier={query.data} /></DataState>;
}
function SupplierForm({ supplier }: { supplier?: SupplierRecord }) {
  const navigate = useNavigate(), { notify } = useFeedback();
  const saving = useRef(false);
  useEffect(() => { document.getElementById('supplier-name')?.focus(); }, []);
  const [values, setValues] = useState(() => ({ name: supplier?.name ?? '', tradeName: supplier?.tradeName ?? '', document: supplier?.document ?? '', email: supplier?.email ?? '', phone: supplier?.phone ?? '', contact: supplier?.contact ?? '', address: supplier?.address ?? '', notes: supplier?.notes ?? '', active: supplier?.active ?? true }));
  const [dirty, setDirty] = useState(false), [error, setError] = useState(''), [documentError, setDocumentError] = useState(''), [confirm, setConfirm] = useState(false);
  const mutation = usePurchaseMutation((body: typeof values) => apiClient('/suppliers' + (supplier ? '/' + supplier.id : ''), { method: supplier ? 'PATCH' : 'POST', body: JSON.stringify(body) })); const leave = useUnsavedForm(dirty, mutation.isPending);
  async function save() {
    if (saving.current) return; saving.current = true;
    setError(''); setDocumentError('');
    const documentValue = values.document.replace(/[.\-/\s]/g, '').toUpperCase();
    if (documentValue && !/^(?:\d{11}|[A-Z0-9]{12}\d{2})$/.test(documentValue)) { setDocumentError('Informe CPF com 11 dígitos ou CNPJ com 14 caracteres.'); document.getElementById('supplier-document')?.focus(); saving.current = false; return; }
    try { await mutation.mutateAsync(values); leave.saved.current = true; notify({ tone: 'success', title: supplier ? 'Fornecedor atualizado com sucesso.' : 'Fornecedor cadastrado com sucesso.' }); navigate('/suppliers'); }
    catch (error) { if (error instanceof ApiError && error.status === 409) { setDocumentError('Este CPF/CNPJ já está em uso.'); document.getElementById('supplier-document')?.focus(); } else setError(error instanceof Error ? error.message : 'Não foi possível salvar o fornecedor.'); }
    finally { saving.current = false; }
  }
  return <form className="procurement-form" onSubmit={event => { event.preventDefault(); if (mutation.isPending) return; if (supplier?.active && !values.active) setConfirm(true); else void save(); }}>
    {leave.dialog}{confirm && <ConfirmDialog title="Inativar fornecedor?" description="O fornecedor não poderá ser usado em novos pedidos. Pedidos e recebimentos já registrados serão preservados." confirmLabel="Inativar e salvar" cancel={() => setConfirm(false)} confirm={() => { setConfirm(false); void save(); }} />}
    {error && <Alert tone="error" title="Não foi possível salvar o fornecedor.">{error}</Alert>}
    <fieldset disabled={mutation.isPending}><legend>Identificação e contato</legend><div className="procurement-fields">{(['name', 'tradeName', 'document', 'email', 'phone', 'contact', 'address'] as const).map(key => <Field key={key} id={'supplier-' + key} label={({ name: 'Nome ou razão social', tradeName: 'Nome fantasia', document: 'CPF/CNPJ', email: 'E-mail', phone: 'Telefone', contact: 'Contato responsável', address: 'Endereço' })[key]} error={key === 'document' ? documentError : undefined}><input id={'supplier-' + key} value={values[key]} required={key === 'name'} type={key === 'email' ? 'email' : 'text'} maxLength={key === 'address' ? 1000 : key === 'phone' ? 40 : key === 'document' ? 20 : key === 'contact' ? 120 : key === 'email' ? 180 : 200} aria-invalid={key === 'document' && Boolean(documentError)} aria-describedby={key === 'document' && documentError ? 'supplier-document-error' : undefined} onChange={event => { setDirty(true); setValues({ ...values, [key]: event.target.value }); }} /></Field>)}</div><Field id="supplier-notes" label="Observações"><textarea id="supplier-notes" maxLength={5000} value={values.notes} onChange={event => { setDirty(true); setValues({ ...values, notes: event.target.value }); }} /></Field><label><input type="checkbox" checked={values.active} onChange={event => { setDirty(true); setValues({ ...values, active: event.target.checked }); }} />Fornecedor ativo</label></fieldset>
    <div className="form-actions"><button type="button" className="text-button" disabled={mutation.isPending} onClick={() => navigate('/suppliers')}>Cancelar</button><button className="primary-button" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando…' : 'Salvar fornecedor'}</button></div>
  </form>;
}
