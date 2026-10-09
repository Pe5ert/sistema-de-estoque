import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { ProductRecord, PurchaseRecord } from '@stock/shared';
import { useProducts } from './inventory-api';
import { useOrder, useSupplier, useSuppliers, usePurchaseMutation } from './purchases-api';
import { apiClient } from './lib/api';
import { DataState } from './data-controls';
import { Field, fieldAccessibility } from './form-controls';
import { Alert, useFeedback } from './feedback';
import { useUnsavedForm } from './UnsavedForm';
import { normalizeDecimal } from './product-form-model';
import { decimalString, itemCents, money, orderNumber } from './purchase-model';
import { unitCodes } from './inventory-model';
type Line = { product: ProductRecord; quantity: string; unitCost: string };
function quantityError(value: string) { if (!value.trim()) return undefined; const number = normalizeDecimal(value, 3); return !number || Number(number) <= 0 ? 'Informe quantidade positiva com até três casas decimais.' : undefined; }
function costError(value: string) { return value.trim() && !normalizeDecimal(value, 2) ? 'Informe custo válido com até duas casas decimais.' : undefined; }
export function PurchaseFormPage() {
  const { id } = useParams(), [params] = useSearchParams(), order = useOrder(id);
  const selectedIds = [...new Set((params.get('products') ?? '').split(',').filter(Boolean))];
  const preselected = useQuery({ queryKey: ['purchase-preselected', selectedIds], enabled: !id && selectedIds.length > 0, queryFn: async () => {
    if (selectedIds.length > 100 || selectedIds.some(value => !/^[0-9a-f-]{36}$/i.test(value))) throw new Error('Seleção de produtos inválida.');
    return Promise.all(selectedIds.map(productId => apiClient<ProductRecord>('/products/' + productId)));
  } });
  if (order.data && order.data.status !== 'DRAFT') return <Alert tone="warning" title="Este pedido não pode ser editado."><Link to={'/purchases/' + id}>Voltar ao pedido</Link></Alert>;
  return <DataState pending={Boolean(id && order.isPending) || Boolean(!id && selectedIds.length && preselected.isPending)} error={id ? order.error : selectedIds.length ? preselected.error : null} retry={() => { void order.refetch(); void preselected.refetch(); }} retainContentOnError={Boolean(order.data || preselected.data)}><PurchaseForm key={id ?? 'new'} order={order.data} preselected={preselected.data ?? []} /></DataState>;
}
function PurchaseForm({ order, preselected }: { order?: PurchaseRecord; preselected: ProductRecord[] }) {
  const navigate = useNavigate(), { notify } = useFeedback();
  const [supplierId, setSupplierId] = useState(order?.supplierId ?? ''), [supplierSearch, setSupplierSearch] = useState(''), [search, setSearch] = useState(''), [notes, setNotes] = useState(order?.notes ?? '');
  const [lines, setLines] = useState<Line[]>(() => order ? order.items.map(item => ({ product: item.product, quantity: item.quantity.replace('.', ','), unitCost: item.unitCost.replace('.', ',') })) : preselected.map(product => ({ product, quantity: '', unitCost: '' })));
  const [dirty, setDirty] = useState(Boolean(preselected.length)), [error, setError] = useState('');
  const revision = useRef(order?.revision); const suppliers = useSuppliers({ search: supplierSearch, active: 'true', limit: 100 }); const products = useProducts({ search, active: 'true', limit: 10 });
  const saving = useRef(false);
  const lookupVersion = useRef(0);
  const [lookupBusy, setLookupBusy] = useState(false), [lookupError, setLookupError] = useState('');
  const selectedSupplier = useSupplier(supplierId);
  const mutation = usePurchaseMutation((body: unknown) => apiClient<PurchaseRecord>('/purchase-orders' + (order ? '/' + order.id : ''), { method: order ? 'PATCH' : 'POST', body: JSON.stringify(body) })); const leave = useUnsavedForm(dirty, mutation.isPending);
  const total = lines.reduce((sum, item) => sum + (itemCents(item.quantity, item.unitCost) ?? 0n), 0n);
  const complete = lines.length > 0 && lines.every(item => { const quantity = normalizeDecimal(item.quantity, 3); return Boolean(quantity && Number(quantity) > 0 && normalizeDecimal(item.unitCost, 2)); });
  useEffect(() => { document.getElementById('order-supplier')?.focus(); }, []);
  useEffect(() => () => { lookupVersion.current++; }, []);
  function update(index: number, field: 'quantity' | 'unitCost', value: string) { setDirty(true); setLines(lines.map((line, i) => i === index ? { ...line, [field]: value } : line)); }
  function add(product: ProductRecord) {
    lookupVersion.current++; setLookupBusy(false); setLookupError('');
    const index = lines.findIndex(line => line.product.id === product.id);
    if (index < 0 && lines.length >= 100) { setLookupError('O pedido aceita até 100 produtos.'); return; }
    if (index < 0) { setDirty(true); setLines([...lines, { product, quantity: '', unitCost: '' }]); }
    setSearch(''); requestAnimationFrame(() => document.getElementById('order-quantity-' + (index < 0 ? lines.length : index))?.focus());
  }
  async function lookup() {
    if (!search.trim() || lookupBusy || saving.current) return;
    const version = lookupVersion.current; setLookupBusy(true); setLookupError('');
    try { const matches = await apiClient<ProductRecord[]>('/products/lookup?code=' + encodeURIComponent(search.trim())); if (version !== lookupVersion.current) return; if (matches.length === 1) add(matches[0]); else setLookupError(matches.length ? 'Código ambíguo. Escolha o produto nos resultados.' : 'Código não encontrado. Escolha um resultado ou confira a leitura.'); }
    catch (error) { if (version === lookupVersion.current) setLookupError(error instanceof Error ? error.message : 'Não foi possível localizar.'); }
    finally { if (version === lookupVersion.current) setLookupBusy(false); }
  }
  async function save() {
    if (saving.current) return; saving.current = true; setError('');
    try {
      const result = await mutation.mutateAsync({ supplierId, notes: notes || null, ...(order ? { revision: revision.current } : {}), items: lines.map(line => ({ productId: line.product.id, quantity: normalizeDecimal(line.quantity, 3), unitCost: normalizeDecimal(line.unitCost, 2) })) });
      leave.saved.current = true; notify({ tone: 'success', title: 'Pedido salvo como rascunho.', description: orderNumber(result.number) }); navigate('/purchases/' + result.id);
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível salvar o pedido.'); }
    finally { saving.current = false; }
  }
  return <form className="procurement-form order-form" onKeyDown={event => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) { event.preventDefault(); if (event.target.id === 'order-product-search') void lookup(); } }} onSubmit={event => { event.preventDefault(); if (complete && supplierId && !lookupBusy) void save(); }}>
    {leave.dialog}{error && <Alert tone="error" title="Não foi possível salvar o pedido.">{error} Seus dados continuam no formulário.</Alert>}
    <fieldset className="order-document" disabled={mutation.isPending}><legend className="sr-only">Fornecedor e produtos</legend><h2><span className="order-section-number">01</span> Fornecedor</h2><div className="procurement-fields"><Field id="supplier-search" label="Buscar fornecedor"><input id="supplier-search" placeholder="Nome ou CPF/CNPJ" value={supplierSearch} onChange={event => setSupplierSearch(event.target.value)} /></Field><Field id="order-supplier" label="Fornecedor"><select id="order-supplier" required value={supplierId} onChange={event => { setDirty(true); setSupplierId(event.target.value); }}><option value="">Selecione um fornecedor ativo</option>{supplierId && !suppliers.data?.items.some(item => item.id === supplierId) && <option value={supplierId}>{selectedSupplier.data?.name ?? order?.supplierName ?? 'Fornecedor selecionado'}</option>}{suppliers.data?.items.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></Field></div>
      {suppliers.error && <Alert tone="error" title="Não foi possível carregar fornecedores." action={{ label: 'Tentar novamente', run: () => { void suppliers.refetch(); } }} />}
      <h2 className="order-items-heading"><span className="order-section-number">02</span> Itens do pedido <small>{lines.length} {lines.length === 1 ? 'produto' : 'produtos'}</small></h2><div className="procurement-product-search"><Field id="order-product-search" label="Adicionar produtos" error={lookupError} hint={lookupBusy ? 'Consultando o código…' : 'Digite ou cole SKU/código de barras e pressione Enter; para nome, escolha nos resultados.'}><input id="order-product-search" value={search} placeholder="Buscar por nome, SKU ou código de barras" onChange={event => { lookupVersion.current++; setLookupBusy(false); setLookupError(''); setSearch(event.target.value); }} /></Field>{search && <DataState pending={products.isPending} error={products.error} retry={products.refetch}><div className="procurement-search-results">{products.data?.items.map(product => <button type="button" className="secondary-button" key={product.id} disabled={lines.some(line => line.product.id === product.id) || lines.length >= 100} onClick={() => add(product.record)}><strong>{product.name}</strong><span>{product.sku} · Adicionar</span></button>)}{products.data?.total === 0 && <p>Nenhum produto ativo encontrado.</p>}</div></DataState>}</div>
      <div className="procurement-order-lines">{lines.map((line, index) => <div className="procurement-order-line" key={line.product.id}><div><strong>{line.product.name}</strong><small>{line.product.sku} · {unitCodes[line.product.unit]}</small></div><Field id={'order-quantity-' + index} required error={quantityError(line.quantity)} label="Quantidade"><input aria-label={'Quantidade de ' + line.product.name} id={'order-quantity-' + index} {...fieldAccessibility('order-quantity-' + index, quantityError(line.quantity))} inputMode="decimal" required value={line.quantity} onChange={event => update(index, 'quantity', event.target.value)} /></Field><Field id={'order-cost-' + index} required error={costError(line.unitCost)} label="Custo unitário"><input aria-label={'Custo unitário de ' + line.product.name} id={'order-cost-' + index} {...fieldAccessibility('order-cost-' + index, costError(line.unitCost))} inputMode="decimal" required placeholder="0,00" value={line.unitCost} onChange={event => update(index, 'unitCost', event.target.value)} /></Field><div><small>Subtotal</small><strong>{itemCents(line.quantity, line.unitCost) === null ? '—' : money(decimalString(itemCents(line.quantity, line.unitCost)!, 2))}</strong></div><button className="text-button" type="button" aria-label={'Remover ' + line.product.name} onClick={() => { setDirty(true); setLines(lines.filter((_, i) => i !== index)); }}>Remover</button></div>)}</div>
      {lines.length === 0 && <div className="empty-state"><strong>Adicione produtos ao pedido.</strong><p>Busque acima por nome, SKU ou código de barras.</p></div>}
      {!complete && lines.length > 0 && <Alert tone="info" title="Revise quantidades e custos.">Quantidade deve ser positiva; custo negociado é obrigatório e pode ser zero. Até três casas na quantidade e duas no custo.</Alert>}
      <Field id="order-notes" label="Observações do pedido"><textarea id="order-notes" maxLength={5000} value={notes} onChange={event => { setDirty(true); setNotes(event.target.value); }} /></Field>
    </fieldset><aside className="order-summary" aria-label="Resumo do pedido"><h2>Resumo do pedido</h2><p className="order-draft-label">{order ? orderNumber(order.number) : "Novo pedido"} · Rascunho</p><div className="procurement-total"><span>Total estimado</span><strong>{complete ? money(decimalString(total, 2)) : 'Preencha os itens'}</strong><small>Salvar e enviar não alteram o estoque.</small></div><div className="form-actions"><button type="button" className="text-button" disabled={mutation.isPending} onClick={() => navigate(order ? '/purchases/' + order.id : '/purchases')}>Cancelar</button><button className="primary-button" disabled={mutation.isPending || lookupBusy || !complete || !supplierId}>{mutation.isPending ? 'Salvando…' : 'Salvar rascunho'}</button></div>
  </aside></form>;
}
