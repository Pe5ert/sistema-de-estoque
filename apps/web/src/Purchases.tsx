import { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { hasPermission, purchaseStatuses, purchaseStatusLabels, type PurchaseRecord, type ReceiptRecord } from '@stock/shared';
import { useAuth } from './auth/auth';
import { useOrder, useOrders, usePurchaseMutation } from './purchases-api';
import { DataState, Pagination } from './data-controls';
import { openFromRow } from './DetailDrawer';
import { Alert, ConfirmDialog, useFeedback } from './feedback';
import { Field } from './form-controls';
import { apiClient, ApiError } from './lib/api';
import { dateLabel, unitCodes } from './inventory-model';
import { decimalString, money, orderNumber, scaled } from './purchase-model';
import { normalizeDecimal } from './product-form-model';
import { useUnsavedForm } from './UnsavedForm';

export function Purchases() {
  const [params, setParams] = useSearchParams(), navigate = useNavigate(), { currentUser } = useAuth();
  const query = useOrders({ search: params.get('q') ?? '', status: params.get('status') ?? '', supplierId: params.get('supplierId') ?? '', page: Number(params.get('page')) || 1 });
  const filter = (key: string, value: string) => { const next = new URLSearchParams(params); next.delete('page'); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: true }); };
  return <div className="page-stack procurement-page"><div className="catalog-actions"><span>Pedidos e entregas da sua operação</span>{hasPermission(currentUser?.role, 'purchase.manage') && <Link className="primary-button" to="/purchases/new">Novo pedido</Link>}</div><section className="list-section"><div className="list-heading"><h2>Pedidos de compra</h2><span>{query.data?.total ?? '…'} pedidos</span></div><div className="filter-bar"><label className="search-control"><span className="sr-only">Buscar pedido</span><input aria-label="Buscar pedido" value={params.get('q') ?? ''} placeholder="Número, fornecedor ou produto" onChange={event => filter('q', event.target.value)} /></label><label className="select-control"><span>Status</span><select aria-label="Status do pedido" value={params.get('status') ?? ''} onChange={event => filter('status', event.target.value)}><option value="">Todos</option>{purchaseStatuses.map(status => <option key={status} value={status}>{purchaseStatusLabels[status]}</option>)}</select></label>{params.get('supplierId') && <button className="text-button" onClick={() => filter('supplierId', '')}>Limpar fornecedor</button>}</div><DataState pending={query.isPending} error={query.error} retry={query.refetch}><div className="table-frame"><table className="data-table procurement-table"><thead><tr><th>PEDIDO / FORNECEDOR</th><th>CRIADO EM</th><th>RESPONSÁVEL</th><th>VALOR ESTIMADO</th><th>STATUS</th></tr></thead><tbody>{query.data?.items.map(order => <tr className="clickable-row" key={order.id} tabIndex={0} aria-label={'Abrir ' + orderNumber(order.number)} onClick={event => openFromRow(event, () => navigate('/purchases/' + order.id))} onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); navigate('/purchases/' + order.id); } }}><td data-label="Pedido / fornecedor"><strong>{orderNumber(order.number)}</strong><small>{order.supplierName}</small></td><td data-label="Criado em">{dateLabel(order.createdAt)}</td><td data-label="Responsável">{order.creator.name}</td><td data-label="Valor estimado">{money(order.total)}</td><td data-label="Status"><span className="procurement-status">{purchaseStatusLabels[order.status]}</span></td></tr>)}</tbody></table>{query.data?.total === 0 && <div className="empty-state"><strong>Nenhum pedido encontrado.</strong><p>Crie um rascunho ou ajuste a busca e os filtros.</p></div>}</div><Pagination data={query.data} change={page => { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next); }} /></DataState></section></div>;
}
export function PurchaseDetail() {
  const { id } = useParams(), query = useOrder(id), { currentUser } = useAuth(), { notify } = useFeedback();
  const [confirm, setConfirm] = useState<'send' | 'cancel'>(), [error, setError] = useState('');
  const changing = useRef(false);
  const mutation = usePurchaseMutation((action: 'send' | 'cancel') => apiClient('/purchase-orders/' + id + '/' + action, { method: 'POST', body: JSON.stringify({ revision: query.data?.revision }) }));
  const order = query.data, manageable = hasPermission(currentUser?.role, 'purchase.manage');
  async function transition(action: 'send' | 'cancel') {
    if (changing.current) return; changing.current = true;
    setError(''); try { await mutation.mutateAsync(action); setConfirm(undefined); notify({ tone: 'success', title: action === 'send' ? 'Pedido enviado.' : 'Pedido cancelado.', description: action === 'send' ? 'O estoque será atualizado somente ao receber mercadorias.' : 'Os recebimentos já registrados foram preservados.' }); } catch (error) { setConfirm(undefined); setError(error instanceof Error ? error.message : 'Não foi possível atualizar o pedido.'); }
    finally { changing.current = false; }
  }
  return <DataState pending={query.isPending} error={query.error} retry={query.refetch} retainContentOnError={Boolean(order)}>{order && <div className="page-stack procurement-page"><div className="catalog-actions"><Link to="/purchases" className="text-button">Voltar aos pedidos</Link><div className="inline-actions">{manageable && order.status === 'DRAFT' && <><Link className="secondary-button" to={'/purchases/' + id + '/edit'}>Editar rascunho</Link><button className="primary-button" disabled={mutation.isPending} onClick={() => setConfirm('send')}>Marcar como enviado</button></>}{manageable && ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED'].includes(order.status) && <button className="text-button" disabled={mutation.isPending} onClick={() => setConfirm('cancel')}>Cancelar pedido</button>}</div></div>
    {error && <Alert tone="error" title="Não foi possível atualizar o pedido." action={{ label: 'Atualizar pedido', run: () => { void query.refetch(); } }}>{error}</Alert>}
    <section className="procurement-order-summary"><div><span>IDENTIFICAÇÃO</span><h2>{orderNumber(order.number)}</h2><strong>{order.supplierName}</strong><p>{order.supplierDocument ?? 'Documento não informado'}</p></div><div><span>STATUS</span><strong>{purchaseStatusLabels[order.status]}</strong><p>{dateLabel(order.createdAt)} · {order.creator.name}</p></div><div><span>VALOR ESTIMADO</span><strong>{money(order.total)}</strong><p>Custos negociados no pedido</p></div></section>
    {order.status === 'CANCELLED' && <Alert tone="warning" title="Pedido cancelado.">O saldo pendente foi encerrado. As entradas recebidas anteriormente permanecem no estoque e no histórico.</Alert>}
    {order.notes && <p className="detail-meta">{order.notes}</p>}<section className="list-section"><div className="list-heading"><h2>Itens do pedido</h2></div><div className="table-frame"><table className="data-table procurement-table"><thead><tr><th>PRODUTO / SKU</th><th>SOLICITADO</th><th>RECEBIDO</th><th>{order.status === 'CANCELLED' ? 'NÃO RECEBIDO / ENCERRADO' : 'PENDENTE'}</th><th>CUSTO / TOTAL</th></tr></thead><tbody>{order.items.map(item => <tr key={item.id}><td data-label="Produto / SKU"><strong>{item.productName}</strong><small>{item.sku}</small></td><td data-label="Solicitado">{item.quantity} {unitCodes[item.unit]}</td><td data-label="Recebido">{item.received}</td><td data-label={order.status === 'CANCELLED' ? 'Encerrado sem receber' : 'Pendente'}>{decimalString(scaled(item.quantity, 3)! - scaled(item.received, 3)!)}</td><td data-label="Custo / total">{money(item.unitCost)}<small>{money(item.total)}</small></td></tr>)}</tbody></table></div></section>
    {hasPermission(currentUser?.role, 'purchase.receive') && <ReceiptForm key={order.id} order={order} />}
    <section className="list-section procurement-receipts"><div className="list-heading"><h2>Histórico de recebimentos</h2></div>{order.receipts.length ? order.receipts.map(receipt => <div className="procurement-receipt" key={receipt.id}><strong>{dateLabel(receipt.createdAt)} · {receipt.creator.name}</strong><p>{receipt.notes}</p>{receipt.items.map(entry => <p key={entry.id}>{entry.movement.product.name} · {entry.quantity} {unitCodes[entry.movement.product.unit]} · {entry.movement.previousStock} → {entry.movement.resultingStock}</p>)}<Link to={'/history?reference=' + receipt.id}>Consultar movimentos no Histórico</Link><small>Recebimento {receipt.id}</small></div>) : <div className="empty-state"><strong>Nenhuma mercadoria recebida.</strong><p>Salvar e enviar o pedido não alteram o saldo.</p></div>}</section>
    {confirm && <ConfirmDialog tone={confirm === 'send' ? 'primary' : 'danger'} title={confirm === 'send' ? 'Marcar pedido como enviado?' : 'Cancelar este pedido?'} description={confirm === 'send' ? 'Os itens e custos serão preservados. O estoque ainda não será alterado. Esta ação registra o status; não envia mensagem ao fornecedor.' : 'Somente o restante não recebido será encerrado. Nenhuma entrada será apagada ou revertida.'} confirmLabel={confirm === 'send' ? 'Marcar como enviado' : 'Cancelar pedido'} cancelLabel="Voltar ao pedido" busy={mutation.isPending} cancel={() => setConfirm(undefined)} confirm={() => { void transition(confirm); }} />}
  </div>}</DataState>;
}
const attemptSchema = z.object({ receiptId: z.string().uuid(), notes: z.string().nullable(), items: z.array(z.object({ orderItemId: z.string().uuid(), quantity: z.string().regex(/^\d+(?:\.\d{1,3})?$/) })).min(1) });
type Attempt = z.infer<typeof attemptSchema>;
function ReceiptForm({ order }: { order: PurchaseRecord }) {
  const { currentUser } = useAuth(), { notify } = useFeedback(), navigate = useNavigate(); const storageKey = 'gavyo-receipt:' + currentUser?.id + ':' + order.id;
  const receivable = ['SENT', 'PARTIALLY_RECEIVED'].includes(order.status);
  const [attempt, setAttempt] = useState<Attempt | null>(() => { try { return attemptSchema.parse(JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')); } catch { return null; } });
  const [quantities, setQuantities] = useState<Record<string, string>>({}), [notes, setNotes] = useState(''), [code, setCode] = useState(''), [scanError, setScanError] = useState(''), [error, setError] = useState(''), [review, setReview] = useState<Attempt | null>(null), [checking, setChecking] = useState(false);
  const busy = useRef(false);
  const mutation = usePurchaseMutation((body: Attempt) => apiClient<{ receipt: ReceiptRecord; repeated: boolean }>('/purchase-orders/' + order.id + '/receipts', { method: 'POST', body: JSON.stringify(body) }));
  const leave = useUnsavedForm(!attempt && Boolean(Object.values(quantities).some(value => value.trim()) || notes), mutation.isPending);
  const validLines = order.items.filter(item => (scaled(quantities[item.id] ?? '', 3) ?? 0n) > 0n);
  const invalid = order.items.some(item => { const value = quantities[item.id]?.trim(); if (!value) return false; const amount = scaled(value, 3); return amount === null || amount < 0n || amount > scaled(item.quantity, 3)! - scaled(item.received, 3)!; });
  function clearAttempt() { sessionStorage.removeItem(storageKey); setAttempt(null); }
  async function receive(body: Attempt) {
    if (busy.current) return; busy.current = true; setError('');
    try {
      // Persist before sending; a reload must reuse this exact ID and payload.
      sessionStorage.setItem(storageKey, JSON.stringify(body)); setAttempt(body);
      const result = await mutation.mutateAsync(body); clearAttempt(); setQuantities({}); setNotes(''); setReview(null);
      notify({ tone: 'success', title: result.repeated ? 'Este recebimento já foi registrado.' : 'Recebimento registrado.', description: 'Saldo e histórico atualizados.', action: { label: 'Ver no Histórico', run: () => { navigate('/history'); } } });
    } catch (error) {
      setReview(null);
      if (error instanceof ApiError && [400, 409, 403].includes(error.status)) clearAttempt();
      setError(error instanceof Error ? error.message : 'Não foi possível confirmar o recebimento. Consulte o histórico antes de tentar novamente.');
    } finally { busy.current = false; }
  }
  async function check() {
    if (!attempt || busy.current) return; busy.current = true; setChecking(true); setError('');
    try { await apiClient('/purchase-orders/' + order.id + '/receipts/' + attempt.receiptId); await mutation.mutateAsync(attempt); clearAttempt(); setQuantities({}); setNotes(''); notify({ tone: 'success', title: 'Este recebimento já foi registrado.' }); }
    catch (error) { setError(error instanceof ApiError && error.status === 404 ? 'Ainda não há confirmação. Tente novamente com o mesmo identificador.' : 'Não foi possível conferir. A tentativa foi preservada.'); }
    finally { busy.current = false; setChecking(false); }
  }
  function scan() {
    const matches = order.items.filter(item => item.sku.toLowerCase() === code.trim().toLowerCase() || item.product.barcode === code.trim());
    if (matches.length !== 1) { setScanError(matches.length ? 'Código ambíguo. Escolha o campo do produto abaixo.' : 'Código não pertence a este pedido.'); return; }
    setScanError(''); document.getElementById('receive-' + matches[0].id)?.focus();
  }
  if (!receivable && !attempt) return null;
  return <section className="procurement-form"><h2>{receivable ? 'Receber mercadorias' : 'Conferir tentativa anterior'}</h2>{leave.dialog}
    {attempt && <Alert tone="warning" title="Há uma tentativa de recebimento para conferir."><p>O identificador foi preservado. Repetir esta tentativa não duplica o estoque.</p><div className="inline-actions"><button type="button" className="secondary-button" disabled={mutation.isPending || checking} onClick={() => { void check(); }}>Conferir recebimento</button><button type="button" className="primary-button" disabled={mutation.isPending || checking} onClick={() => { void receive(attempt); }}>Tentar novamente</button></div><small>{attempt.receiptId}</small></Alert>}
    {error && <Alert tone="error" title="Não foi possível confirmar o recebimento.">{error}</Alert>}
    {receivable && <fieldset disabled={mutation.isPending || Boolean(attempt)}><legend>Conferência desta entrega</legend><Field id="receipt-code" label="Localizar item por SKU ou código de barras" error={scanError}><input id="receipt-code" value={code} onChange={event => setCode(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); scan(); } }} /></Field><button className="text-button" type="button" onClick={scan}>Localizar item</button>
    <div className="procurement-receive-lines">{order.items.map(item => {
      const pending = scaled(item.quantity, 3)! - scaled(item.received, 3)!, amount = scaled(quantities[item.id] ?? '', 3), stock = scaled(item.product.stock, 3)!;
      const fieldError = quantities[item.id]?.trim() && (amount === null || amount > pending) ? 'Quantidade superior ao pendente ou inválida.' : undefined;
      return <div className="procurement-receive-line" key={item.id}><div><strong>{item.productName}</strong><small>{item.sku} · {unitCodes[item.unit]}</small><p>Solicitado {item.quantity} · Recebido {item.received} · Pendente {decimalString(pending)}</p><span>Saldo atual {item.product.stock} → Após esta entrega {decimalString(stock + (amount ?? 0n))}</span></div><Field id={'receive-' + item.id} label={'Receber agora: ' + item.productName} error={fieldError || undefined}><input id={'receive-' + item.id} inputMode="decimal" value={quantities[item.id] ?? ''} disabled={pending === 0n || mutation.isPending || Boolean(attempt)} aria-invalid={Boolean(fieldError)} aria-describedby={fieldError ? 'receive-' + item.id + '-error' : undefined} onChange={event => setQuantities({ ...quantities, [item.id]: event.target.value })} /></Field></div>;
    })}</div><Field id="receipt-notes" label="Observações do recebimento"><textarea id="receipt-notes" maxLength={5000} value={notes} onChange={event => setNotes(event.target.value)} /></Field>
    <button className="primary-button" type="button" disabled={invalid || !validLines.length || mutation.isPending || Boolean(attempt)} onClick={() => setReview({ receiptId: crypto.randomUUID(), notes: notes.trim() || null, items: validLines.map(item => ({ orderItemId: item.id, quantity: normalizeDecimal(quantities[item.id], 3)! })) })}>{mutation.isPending ? 'Registrando…' : 'Revisar recebimento'}</button></fieldset>}
    {review && <ConfirmDialog tone="primary" title="Confirmar este recebimento?" description={review.items.map(entry => { const item = order.items.find(item => item.id === entry.orderItemId)!; return `${item.productName}: ${entry.quantity} ${unitCodes[item.unit]}`; }).join('; ') + '. As entradas serão registradas no estoque e no histórico.'} confirmLabel="Confirmar recebimento" cancelLabel="Continuar conferindo" busy={mutation.isPending} cancel={() => setReview(null)} confirm={() => { void receive(review); }} />}
  </section>;
}
