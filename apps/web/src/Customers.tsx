import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { hasPermission, type CustomerRecord, type Page } from '@stock/shared';
import { useAuth } from './auth/auth';
import { apiClient } from './lib/api';
import { queryString, type Filters } from './inventory-api';
import { useDebouncedValue } from './motion';
import { DataState, Pagination } from './data-controls';
import { DetailDrawer, openFromRow } from './DetailDrawer';
import { Alert } from './feedback';
import { Field } from './form-controls';
import { SearchCombobox } from './SearchCombobox';
import { StatefulButton } from './StatefulButton';
import { Status } from './inventory-ui';

export function useCustomers(filters: Filters) {
  const search = useDebouncedValue(filters.search);
  const query = useQuery({ queryKey: ['customers', { ...filters, search }], placeholderData: keepPreviousData, queryFn: ({ signal }) => apiClient<Page<CustomerRecord>>('/customers?' + queryString({ ...filters, search }), { signal }) });
  return { ...query, isFetching: query.isFetching || search !== filters.search };
}
export function useCustomer(id?: string | null) { return useQuery({ queryKey: ['customer', id], enabled: Boolean(id), queryFn: ({ signal }) => apiClient<CustomerRecord>('/customers/' + id, { signal }) }); }
export function buyerLabel(item: { buyerIdentification?: string | null; customerNameSnapshot?: string | null; customerCodeSnapshot?: string | null; reason: string }) {
  return item.reason !== 'SALE' ? '—' : item.buyerIdentification === 'IDENTIFIED' ? `${item.customerNameSnapshot} · ${item.customerCodeSnapshot}` : item.buyerIdentification === 'ANONYMOUS' ? 'Sem identificação' : 'Não registrado à época';
}

export function CustomerEditor({ customer, close, saved, selectAfterSave = false }: { customer?: CustomerRecord; close: () => void; saved: (customer: CustomerRecord) => void; selectAfterSave?: boolean }) {
  const { currentUser } = useAuth();
  const canEdit = !customer || hasPermission(currentUser?.role, 'customer.manage');
  useEffect(() => { if (canEdit) { const frame = requestAnimationFrame(() => document.getElementById('customer-name')?.focus()); return () => cancelAnimationFrame(frame); } }, [canEdit]);
  const [name, setName] = useState(customer?.name ?? ''), [active, setActive] = useState(customer?.active ?? true);
  const [discard, setDiscard] = useState(false), [inactivate, setInactivate] = useState(false);
  const saving = useRef(false), client = useQueryClient();
  const dirty = name !== (customer?.name ?? '') || active !== (customer?.active ?? true);
  const mutation = useMutation({ mutationFn: () => apiClient<CustomerRecord>('/customers' + (customer ? '/' + customer.id : ''), { method: customer ? 'PATCH' : 'POST', body: JSON.stringify({ name: name.trim(), ...(customer ? { active } : {}) }) }), onSuccess: async item => {
    await Promise.all([client.invalidateQueries({ queryKey: ['customers'] }), client.invalidateQueries({ queryKey: ['customer', item.id] })]); saved(item);
  } });
  useEffect(() => { if (!dirty) return; const prevent = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent); }, [dirty]);
  async function save() { if (saving.current) return; saving.current = true; try { await mutation.mutateAsync(); } catch { setInactivate(false); } finally { saving.current = false; } }
  const requestClose = () => { if (mutation.isPending) return; if (discard || inactivate) { setDiscard(false); setInactivate(false); requestAnimationFrame(() => document.getElementById('customer-name')?.focus()); } else if (dirty) setDiscard(true); else close(); };
  return <DetailDrawer title={customer ? 'Cliente' : 'Cadastrar cliente'} close={requestClose} busy={mutation.isPending} guardClose>
    {(discard || inactivate) ? <section aria-labelledby="customer-confirm-title"><h2 id="customer-confirm-title">{discard ? 'Descartar dados do cliente?' : 'Inativar cliente?'}</h2><p>{discard ? 'Somente as alterações deste cadastro serão descartadas.' : 'Novas vendas não poderão selecioná-lo. O histórico será preservado.'}</p><div className="inline-actions"><button autoFocus type="button" className="secondary-button" disabled={mutation.isPending} onClick={requestClose}>Voltar ao cadastro</button><StatefulButton type="button" className="destructive-button" disabled={mutation.isPending} state={mutation.isPending ? 'loading' : 'idle'} onClick={() => { if (discard) close(); else void save(); }}>{discard ? 'Descartar cadastro' : 'Inativar e salvar'}</StatefulButton></div></section> : <form className="customer-editor" onChange={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Enter') event.stopPropagation(); }} onSubmit={event => { event.preventDefault(); event.stopPropagation(); if (customer?.active && !active) setInactivate(true); else void save(); }}>
      <p className="table-note">Informe apenas o nome. O código interno é gerado pelo sistema.</p>
      {mutation.error && <Alert tone="error" title="Não foi possível salvar o cliente.">{mutation.error.message} Seus dados continuam aqui.</Alert>}
      <fieldset disabled={mutation.isPending || !canEdit}><legend className="sr-only">Dados do cliente</legend><Field id="customer-name" label="Nome de identificação" required><input id="customer-name" autoFocus value={name} onChange={event => setName(event.target.value)} required maxLength={120} pattern=".*\S.*" /></Field>
      {customer && <><p className="detail-meta customer-code">Código: {customer.code}</p><label className="customer-active"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />Cliente ativo</label></>}</fieldset>
      <div className="inline-actions"><button type="button" className="secondary-button" disabled={mutation.isPending} onClick={requestClose}>{canEdit ? 'Cancelar' : 'Fechar'}</button>{canEdit && <StatefulButton type="submit" disabled={mutation.isPending} state={mutation.isPending ? 'loading' : mutation.isError ? 'error' : 'idle'} errorLabel="Tentar salvar cliente">{customer ? 'Salvar alterações' : selectAfterSave ? 'Cadastrar e selecionar' : 'Cadastrar cliente'}</StatefulButton>}</div>
    </form>}
  </DetailDrawer>;
}

export function CustomerPicker({ selected, choose, error, disabled }: { selected: CustomerRecord | null; choose: (customer: CustomerRecord | null) => void; error?: string; disabled?: boolean }) {
  const [search, setSearch] = useState(''), [creating, setCreating] = useState(false);
  const query = useCustomers({ search, page: 1, limit: 10, active: 'true' });
  return <fieldset className="customer-picker" disabled={disabled}><legend className="sr-only">Selecionar comprador</legend>
    <SearchCombobox id="movement-customer" label="Cliente" placeholder="Buscar pelo nome ou código interno" options={(query.data?.items ?? []).map(item => ({ value: item.id, label: item.name, detail: item.code }))} selected={selected ? { value: selected.id, label: selected.name, detail: selected.code } : undefined} search={search} changeSearch={setSearch} choose={id => choose(query.data?.items.find(item => item.id === id) ?? null)} clear={() => choose(null)} busy={query.isFetching} error={query.isError} retry={query.refetch} total={query.data?.total} />
    {error && <p className="field-error" role="alert">{error}</p>}
    <button type="button" className="text-button" onClick={() => setCreating(true)}>Cadastrar cliente sem sair da operação</button>
    {creating && <CustomerEditor selectAfterSave close={() => setCreating(false)} saved={item => { choose(item); setSearch(''); setCreating(false); requestAnimationFrame(() => document.getElementById('movement-quantity')?.focus()); }} />}
  </fieldset>;
}

export function CustomersPage() {
  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 20, active: 'true', search: '' });
  const [editing, setEditing] = useState<CustomerRecord | null | undefined>();
  const query = useCustomers(filters);
  const updateFilter = (key: 'search' | 'active', value: string) => setFilters(current => ({ ...current, [key]: value, page: 1 }));
  return <div className="page-stack"><div className="catalog-actions"><button className="primary-button" onClick={() => setEditing(null)}>Novo cliente</button></div>
    <section className="list-section"><div className="list-heading"><h2>Clientes</h2><span>{query.data?.total ?? '—'} {query.data?.total === 1 ? 'registro' : 'registros'}</span></div><div className="filter-bar"><label className="search-control"><span className="sr-only">Buscar clientes</span><input type="search" placeholder="Nome ou código interno" value={filters.search ?? ''} onChange={event => updateFilter('search', event.currentTarget.value)} /></label><label className="select-control"><span>Situação</span><select value={filters.active} onChange={event => updateFilter('active', event.currentTarget.value)}><option value="true">Ativos</option><option value="false">Inativos</option><option value="all">Todos</option></select></label></div>
    <DataState retainContentOnError={Boolean(query.data)} pending={query.isPending} error={query.error} retry={query.refetch} updating={query.isFetching}><div className="table-frame"><table className="data-table customers-table"><thead><tr><th>CLIENTE</th><th>SITUAÇÃO</th><th>CONSULTA</th></tr></thead><tbody>{query.data?.items.map(item => <tr key={item.id} className="clickable-row" tabIndex={0} aria-label={'Cliente ' + item.name} onClick={event => openFromRow(event, () => setEditing(item))} onKeyDown={event => { if (event.currentTarget === event.target && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setEditing(item); } }}><td data-label="Cliente"><strong>{item.name}</strong><small className="backup-meta customer-code">{item.code}</small></td><td data-label="Situação"><Status label={item.active ? 'Ativo' : 'Inativo'} tone={item.active ? 'success' : 'info'} /></td><td data-label="Consulta"><div className="customer-row-actions"><Link to={'/history?reason=SALE&customerId=' + item.id}>Saídas por venda</Link><button className="text-button" aria-label={'Abrir cliente ' + item.name} onClick={() => setEditing(item)}>Detalhes</button></div></td></tr>)}</tbody></table></div>{query.data?.total === 0 && <div className="empty-state" role="status"><strong>Nenhum cliente encontrado.</strong><p>Cadastre um cliente ou ajuste a busca e a situação.</p></div>}<Pagination busy={query.isFetching} data={query.data} change={page => setFilters(current => ({ ...current, page }))} /></DataState></section>
    {editing !== undefined && <CustomerEditor key={editing?.id ?? 'new'} customer={editing ?? undefined} close={() => setEditing(undefined)} saved={() => setEditing(undefined)} />}
  </div>;
}
