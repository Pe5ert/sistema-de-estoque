import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowRight, Barcode, Minus, Plus } from 'lucide-react';
import { stockStatus, reasonLabels, presentProduct, type ProductPresentation } from './inventory-model';
import { useInventoryMutation, useProduct } from './inventory-api';
import { apiClient, ApiError } from './lib/api';
import { hasPermission, type CustomerRecord, type MovementRecord, type ProductRecord, type MovementReason } from '@stock/shared';
import { CustomerPicker } from './Customers';
import { useUnsavedForm } from './UnsavedForm';
import { useAuth } from './auth/auth';
import { Field, fieldAccessibility, QuantityInput } from './form-controls';
import { formatQuantity, normalizeDecimal, parseDecimal } from './product-form-model';
import { ProductThumbnail, Status, StockMeter } from './inventory-ui';
import { useFeedback, Alert } from './feedback';

const previewSchema = z.object({ quantity: z.string().refine((value) => (parseDecimal(value, 3) ?? 0) > 0, 'Informe uma quantidade maior que zero, como 1 ou 2,5.'), type: z.enum(['Entrada', 'Saída']), reason: z.string().trim().min(1, 'Informe o motivo.') });
type PreviewFields = { quantity: string; type: 'Entrada' | 'Saída'; reason: string };

export function MovementWorkbench() {
  const { currentUser } = useAuth();
  const { notify } = useFeedback();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useInventoryMutation((body: Record<string, unknown>) => apiClient<MovementRecord>('/stock-movements', { method: 'POST', body: JSON.stringify(body) }));
  const saving = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const attemptedPayload = useRef<string | null>(null);
  const [buyerMode, setBuyerMode] = useState<'' | 'IDENTIFIED' | 'ANONYMOUS'>('');
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [buyerError, setBuyerError] = useState('');
  const lookupVersion = useRef(0);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [result, setResult] = useState<MovementRecord | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const [focusCode, setFocusCode] = useState(true);
  const [code, setCode] = useState('');
  const [selected, setSelected] = useState<ProductPresentation | null>(null);
  const productQuery = useProduct(selected?.id);
  const liveProduct = productQuery.data ?? selected;
  const [matches, setMatches] = useState<readonly ProductPresentation[]>([]);
  const [lookupState, setLookupState] = useState<'waiting' | 'found' | 'missing' | 'ambiguous'>('waiting');
  const { register, control, handleSubmit, watch, setValue, setFocus, reset, setError, clearErrors, formState: { errors } } = useForm<PreviewFields>({ defaultValues: { quantity: '1', type: 'Entrada', reason: '' } });
  const type = watch('type');
  const reason = watch('reason');
  const isSale = type === 'Saída' && reason === 'SALE';
  const leave = useUnsavedForm(Boolean(selected && !result), mutation.isPending);
  const quantityText = watch('quantity');
  const availableReasons = (Object.keys(reasonLabels) as MovementReason[]).filter(key => key !== 'INITIAL_STOCK' && (key !== 'INVENTORY_ADJUSTMENT' || hasPermission(currentUser?.role, 'stock.adjust')) && (type === 'Entrada' ? !['SALE', 'INTERNAL_USE', 'LOSS'].includes(key) : key !== 'PURCHASE'));
  useEffect(() => {
    if (reason && !availableReasons.includes(reason as MovementReason)) setValue('reason', '');
  }, [type, reason, currentUser?.role, setValue]);
  const quantity = parseDecimal(quantityText, 3);
  const preview = liveProduct && quantity !== null && quantity > 0 && !result ? { before: liveProduct.stock, after: Math.round((liveProduct.stock + (type === 'Saída' ? -quantity : quantity)) * 1000) / 1000, quantity, type } : null;
  useEffect(() => {
    if (focusCode && !mutation.isPending) {
      codeInput.current?.focus();
      codeInput.current?.select();
      setFocusCode(false);
    }
  }, [focusCode, mutation.isPending]);
  const resetPreview = () => { setResult(null); clearErrors(); mutation.reset(); };
  const prepareNext = () => {
    requestId.current = crypto.randomUUID(); attemptedPayload.current = null;
    setBuyerMode(''); setCustomer(null); setBuyerError('');
    lookupVersion.current++;
    setLookupBusy(false); setLookupError(''); setMatches([]);
    setCode(''); setSelected(null); setLookupState('waiting');
    reset({ quantity: '1', type, reason: '' }); setFocusCode(true);
  };
  const chooseProduct = (product: ProductPresentation) => {
    requestId.current = crypto.randomUUID(); attemptedPayload.current = null;
    setBuyerMode(''); setCustomer(null); setBuyerError('');
    setSelected(product); setMatches([]); setLookupState('found');
    reset({ quantity: '1', type, reason: '' }); resetPreview(); setFocusCode(true);
  };
  const lookup = async () => {
    if (selected || saving.current || lookupBusy) return;
    if (!code.trim()) { setLookupError('Informe o SKU ou código de barras.'); return; }
    const version = ++lookupVersion.current;
    setLookupBusy(true); setLookupError('');
    try {
    const found = (await apiClient<ProductRecord[]>('/products/lookup?code=' + encodeURIComponent(code.trim()))).map(presentProduct);
    if (version !== lookupVersion.current) return;
    if (found.length === 1) { chooseProduct(found[0]); return; }
    setSelected(null); setMatches(found);
    setLookupState(found.length > 1 ? 'ambiguous' : 'missing');
    resetPreview();
    reset({ quantity: '1', type, reason: '' });
    } catch (error) { if (version === lookupVersion.current) setLookupError(error instanceof Error ? error.message : 'Falha ao consultar o produto.'); }
    finally { if (version === lookupVersion.current) setLookupBusy(false); }
  };
  const confirm = async (values: PreviewFields) => {
    if (saving.current || result || !liveProduct || productQuery.isError || productQuery.isPending) return;
    const validated = previewSchema.safeParse(values);
    if (!validated.success) {
      for (const issue of validated.error.issues) {
        const field = issue.path[0] as keyof PreviewFields;
        setError(field, { message: issue.message });
      }
      setFocus(validated.error.issues[0].path[0] as keyof PreviewFields);
      return;
    }
    const data = validated.data;
    if (!availableReasons.includes(data.reason as MovementReason)) { setError('reason', { message: 'Selecione um motivo compatível com o tipo de movimento.' }); setFocus('reason'); return; }
    const quantity = parseDecimal(data.quantity, 3)!;
    const after = Math.round((liveProduct.stock + (data.type === 'Saída' ? -quantity : quantity)) * 1000) / 1000;
    if (isSale && (!buyerMode || (buyerMode === 'IDENTIFIED' && !customer))) {
      setBuyerError('Selecione um cliente ou escolha Sem identificação.');
      document.getElementById(buyerMode === 'IDENTIFIED' ? 'movement-customer' : 'buyer-identified')?.focus(); return;
    }
    const payload = { productId: liveProduct.id, type: data.type === 'Entrada' ? 'ENTRY' : 'EXIT', quantity: normalizeDecimal(data.quantity, 3), reason: data.reason, requestId: requestId.current,
      ...(isSale ? { buyerIdentification: buyerMode, ...(buyerMode === 'IDENTIFIED' ? { customerId: customer!.id } : {}) } : {}) };
    const signature = JSON.stringify(payload);
    if (attemptedPayload.current && attemptedPayload.current !== signature) {
      notify({ tone: 'error', title: 'Confira a tentativa anterior no Histórico.', description: 'Os dados foram alterados após uma tentativa. Confira se ela foi registrada antes de usar Próximo produto para iniciar outra operação.', key: 'movement' }); return;
    }
    if (after < 0 && !attemptedPayload.current) { setError('quantity', { message: 'Saldo insuficiente para esta saída.' }); setFocus('quantity'); return; }
    if (saving.current || result) return;
    saving.current = true;
    attemptedPayload.current = signature;
    try {
      const movement = await mutation.mutateAsync(payload);
      setResult(movement); prepareNext();
      notify({ tone: 'success', title: data.type + ' registrada com sucesso.', description: liveProduct.name + ' · saldo: ' + movement.resultingStock + ' ' + liveProduct.unit, action: { label: 'Ver no Histórico', run: () => navigate('/history') }, key: 'movement' });
    } catch (error) {
      if (error instanceof ApiError && ([400, 403, 404, 422].includes(error.status) || error.message === 'Quantidade indisponível em estoque.')) attemptedPayload.current = null;
      if (error instanceof ApiError && error.status === 400 && error.message.startsWith('Cliente inativo')) {
        setCustomer(null); setBuyerError(error.message); void queryClient.invalidateQueries({ queryKey: ['customers'] });
        requestAnimationFrame(() => document.getElementById('movement-customer')?.focus());
        return;
      }
      if (error instanceof ApiError && error.message === 'Quantidade indisponível em estoque.') { setError('quantity', { message: 'Saldo insuficiente para esta saída.' }); setFocus('quantity'); void productQuery.refetch(); }
      else notify({ tone: 'error', title: 'Não foi possível registrar a movimentação.', description: 'Confira o Histórico e o saldo antes de tentar novamente. ' + (error instanceof Error ? error.message : ''), key: 'movement' });
    }
    finally { saving.current = false; }
  };

  return <section className={'operation-workbench' + (selected ? ' operation-ready' : '')} aria-labelledby="scan-title">
    {leave.dialog}
    <div className="scan-stage">
      <div className="scan-main">

        <h2 id="scan-title">{selected ? 'Produto identificado' : 'Localizar produto'}</h2>
        <form className="scan-lookup" onSubmit={(event) => { event.preventDefault(); void lookup(); }}>
          <label htmlFor="scan-code">SKU OU CÓDIGO DE BARRAS</label>
          <div className="scan-input-wrap"><Barcode size={21} aria-hidden="true" /><input ref={codeInput} id="scan-code" value={code} readOnly={Boolean(selected)} disabled={mutation.isPending} onChange={(event) => { lookupVersion.current++; setLookupBusy(false); setCode(event.target.value); setMatches([]); setLookupState('waiting'); setLookupError(''); resetPreview(); }} placeholder="Bipar código ou digitar SKU" aria-invalid={lookupState === 'missing' || Boolean(lookupError)} aria-describedby="scan-feedback scan-hint" autoComplete="off" spellCheck={false} /><button disabled={Boolean(selected) || lookupBusy || mutation.isPending} type="submit" className="scan-submit" aria-busy={lookupBusy}>{lookupBusy ? 'Consultando…' : 'Localizar'} <ArrowRight size={17} aria-hidden="true" /></button></div>
        </form>
        <p className={'scan-feedback' + (lookupState === 'missing' || lookupError ? ' scan-feedback-error' : '')} id="scan-feedback" role="status">
          {lookupError || (lookupBusy ? 'Consultando o código…' : lookupState === 'found' ? 'Produto encontrado. Confira a quantidade e o motivo.' : lookupState === 'missing' ? 'Código não encontrado. Confira a leitura ou consulte Produtos.' : lookupState === 'ambiguous' ? 'Este código identifica mais de um produto. Selecione o item abaixo.' : '')}
        </p>
        {matches.length > 1 && <div className="lookup-matches">{matches.map((product) => <button type="button" className="secondary-button" key={product.id} onClick={() => chooseProduct(product)}>{product.name} · {product.sku}</button>)}</div>}
        <p className="scan-hint" id="scan-hint">{selected ? 'Tab para quantidade. Próximo produto troca o item.' : 'Digite ou bipe o código e pressione Enter.'}</p>
      </div>
      <div className="scan-example" aria-live="polite">
        {selected ? <>

          <div className="selected-product" key={selected.id}><ProductThumbnail imageUrl={selected.imageUrl} name={selected.name} /><span><strong>{selected.name}</strong><small>{selected.sku} · {selected.category}</small></span></div>
          <div className="scan-example-balance"><span>SALDO ATUAL</span><strong>{liveProduct?.stock} <small>{selected.unit}</small></strong></div>
          <StockMeter stock={liveProduct!.stock} minimum={liveProduct!.minimum} name={selected.name} /><Status {...stockStatus(liveProduct!.stock, liveProduct!.minimum)} />
        </> : <div className="scan-awaiting"><Barcode size={32} aria-hidden="true" /><strong>Identifique o item</strong></div>}
      </div>
    </div>
    <form className="movement-form" noValidate onSubmit={handleSubmit(confirm)} onChange={resetPreview} onKeyDown={(event) => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault(); }}>
      <fieldset disabled={!selected || productQuery.isPending || productQuery.isError || mutation.isPending || Boolean(result)}>
        <legend className="sr-only">Registrar movimentação</legend>
        <Field id="movement-quantity" label="Quantidade" error={errors.quantity?.message}><Controller name="quantity" control={control} render={({ field }) => <QuantityInput id="movement-quantity" value={field.value} inputRef={field.ref} onChange={(value) => { field.onChange(value); resetPreview(); }} onBlur={field.onBlur} unit={selected?.unit ?? 'un'} error={errors.quantity?.message} disabled={!selected} />} /></Field>
        <div className="operation-field"><span className="field-label" id="movement-type-label">TIPO DE MOVIMENTO</span><div className="type-selector" role="radiogroup" aria-labelledby="movement-type-label">{(['Entrada', 'Saída'] as const).map((item) => <label key={item} className={'type-option type-' + (item === 'Entrada' ? 'in' : 'out') + (type === item ? ' type-selected' : '')}><input type="radio" value={item} {...register('type')} />{item === 'Entrada' ? <Plus size={15} aria-hidden="true" /> : <Minus size={15} aria-hidden="true" />}{item}</label>)}</div></div>
        <div className="reason-field"><Field id="movement-reason" label="Motivo" error={errors.reason?.message}><select id="movement-reason" {...register('reason')} {...fieldAccessibility('movement-reason', errors.reason?.message)}><option value="">Selecione o motivo</option>{availableReasons.map(key => <option value={key} key={key}>{reasonLabels[key]}</option>)}</select></Field></div>
        {!isSale && <button type="submit" className="primary-button preview-button" disabled={mutation.isPending || Boolean(preview && preview.after < 0 && !attemptedPayload.current)} aria-busy={mutation.isPending}>{mutation.isPending ? 'Registrando…' : type === 'Saída' ? 'Confirmar saída' : 'Confirmar entrada'}<ArrowRight size={17} aria-hidden="true" /></button>}
      </fieldset>
      {isSale && <section className="movement-customer-section" aria-labelledby="buyer-title"><h3 id="buyer-title">Comprador</h3><div className="buyer-options">
        <label><input id="buyer-identified" type="radio" name="buyerMode" checked={buyerMode === 'IDENTIFIED'} disabled={mutation.isPending} onChange={() => { setBuyerMode('IDENTIFIED'); setBuyerError(''); }} />Identificar cliente</label>
        <label><input type="radio" name="buyerMode" checked={buyerMode === 'ANONYMOUS'} disabled={mutation.isPending} onChange={() => { setBuyerMode('ANONYMOUS'); setBuyerError(''); }} />Sem identificação</label>
      </div>{buyerMode === 'IDENTIFIED' && <CustomerPicker selected={customer} choose={item => { setCustomer(item); setBuyerError(''); }} disabled={mutation.isPending} error={buyerError} />}
      {buyerMode !== 'IDENTIFIED' && buyerError && <p className="field-error" role="alert">{buyerError}</p>}</section>}
      {preview && <div className={'operation-feedback' + (preview.after < 0 ? ' operation-feedback-error' : '')} role="status">
        <div><strong>{preview.after < 0 ? 'Saldo insuficiente para esta saída' : `${preview.type} de ${formatQuantity(preview.quantity)} ${selected?.unit} · ${selected?.name}`}</strong><small>{reasonLabels[reason as MovementReason]}{isSale ? ' · Comprador: ' + (buyerMode === 'ANONYMOUS' ? 'Sem identificação' : customer ? customer.name + ' · ' + customer.code : 'Selecione um cliente') : ''}</small></div>
        <span className="preview-balance">{formatQuantity(preview.before)}<ArrowRight size={18} aria-hidden="true" /><strong>{preview.after < 0 ? 'Insuficiente' : formatQuantity(preview.after)}</strong></span>
        <small>Saldo previsto · confirmado ao registrar</small>
      </div>}
      {isSale && <div className="inline-actions"><button id="sale-confirm" type="submit" className="primary-button" disabled={!selected || mutation.isPending || productQuery.isPending || productQuery.isError || Boolean(result) || Boolean(preview && preview.after < 0 && !attemptedPayload.current)}>{mutation.isPending ? 'Registrando…' : 'Confirmar venda'}<ArrowRight size={17} aria-hidden="true" /></button></div>}
      {productQuery.error && <Alert tone="error" title="Saldo indisponível." action={{ label: 'Tentar novamente', run: () => { void productQuery.refetch(); } }}>{productQuery.error.message}</Alert>}
      {result && <div className="operation-feedback" role="status"><strong>Movimentação registrada · {result.product.name} · {result.quantity} {presentProduct(result.product).unit}</strong><span className="preview-balance">{result.previousStock}<ArrowRight size={18} aria-hidden="true" /><strong>{result.resultingStock}</strong></span></div>}
      {(selected || result) && <button type="button" className="text-button" disabled={mutation.isPending} onClick={() => { resetPreview(); prepareNext(); }}>Próximo produto</button>}
      {(selected || result) && <p className="operation-note">{result ? 'Movimento registrado. Campo pronto para o próximo código.' : selected ? 'Confira o saldo previsto antes de confirmar.' : 'Localize um produto para movimentar o estoque.'}</p>}
    </form>
  </section>;
}
