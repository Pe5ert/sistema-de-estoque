import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowRight, Barcode, Minus, Plus } from 'lucide-react';
import { stockStatus, reasonLabels, presentProduct, type ProductPresentation } from './inventory-model';
import { useInventoryMutation, useProduct } from './inventory-api';
import { apiClient } from './lib/api';
import type { MovementRecord, ProductRecord, MovementReason } from '@stock/shared';
import { Field, fieldAccessibility, QuantityInput } from './form-controls';
import { formatQuantity, normalizeDecimal, parseDecimal } from './product-form-model';
import { ProductThumbnail, Status, StockMeter } from './inventory-ui';

const previewSchema = z.object({ quantity: z.string().refine((value) => (parseDecimal(value, 3) ?? 0) > 0, 'Informe uma quantidade maior que zero, como 1 ou 2,5.'), type: z.enum(['Entrada', 'Saída']), reason: z.string().trim().min(1, 'Informe o motivo.') });
type PreviewFields = { quantity: string; type: 'Entrada' | 'Saída'; reason: string };

export function MovementWorkbench() {
  const mutation = useInventoryMutation((body: Record<string, unknown>) => apiClient<MovementRecord>('/stock-movements', { method: 'POST', body: JSON.stringify(body) }));
  const saving = useRef(false);
  const lookupVersion = useRef(0);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [result, setResult] = useState<MovementRecord | null>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const [lookupFocus, setLookupFocus] = useState(false);
  const [code, setCode] = useState('');
  const [selected, setSelected] = useState<ProductPresentation | null>(null);
  const productQuery = useProduct(selected?.id);
  const liveProduct = productQuery.data ?? selected;
  const [matches, setMatches] = useState<readonly ProductPresentation[]>([]);
  const [lookupState, setLookupState] = useState<'waiting' | 'found' | 'missing' | 'ambiguous'>('waiting');
  const { register, control, handleSubmit, watch, setFocus, reset, setError, clearErrors, formState: { errors } } = useForm<PreviewFields>({ defaultValues: { quantity: '1', type: 'Entrada', reason: '' } });
  const type = watch('type');
  const reason = watch('reason');
  const quantityText = watch('quantity');
  const quantity = parseDecimal(quantityText, 3);
  const preview = liveProduct && quantity !== null && quantity > 0 && !result ? { before: liveProduct.stock, after: Math.round((liveProduct.stock + (type === 'Saída' ? -quantity : quantity)) * 1000) / 1000, quantity, type } : null;
  useEffect(() => {
    if (lookupFocus && selected) { setFocus('quantity'); setLookupFocus(false); }
  }, [lookupFocus, selected, setFocus]);
  const resetPreview = () => { setResult(null); clearErrors(); mutation.reset(); };
  const chooseProduct = (product: ProductPresentation) => {
    setSelected(product); setMatches([]); setLookupState('found');
    reset({ quantity: '1', type, reason: '' }); resetPreview(); setLookupFocus(true);
  };
  const lookup = async () => {
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
    if (!liveProduct || productQuery.isError || productQuery.isPending) return;
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
    const quantity = parseDecimal(data.quantity, 3)!;
    const after = Math.round((liveProduct.stock + (data.type === 'Saída' ? -quantity : quantity)) * 1000) / 1000;
    if (after < 0) { setError('quantity', { message: 'Saldo insuficiente para esta saída.' }); setFocus('quantity'); return; }
    if (saving.current || result) return;
    saving.current = true;
    try {
      const movement = await mutation.mutateAsync({ productId: liveProduct.id, type: data.type === 'Entrada' ? 'ENTRY' : 'EXIT', quantity: normalizeDecimal(data.quantity, 3), reason: data.reason });
      setResult(movement); setSelected(presentProduct(movement.product));
    } catch { /* mutation exposes the actionable API error below */ }
    finally { saving.current = false; }
  };

  return <section className={'operation-workbench' + (selected ? ' operation-ready' : '')} aria-labelledby="scan-title">
    <div className="scan-stage">
      <div className="scan-main">
        <div className="scan-kicker"><Barcode size={19} aria-hidden="true" /><span>POSTO DE OPERAÇÃO</span></div>
        <h2 id="scan-title">{selected ? 'Produto identificado' : 'Localizar produto'}</h2>
        <form className="scan-lookup" onSubmit={(event) => { event.preventDefault(); void lookup(); }}>
          <label htmlFor="scan-code">SKU OU CÓDIGO DE BARRAS</label>
          <div className="scan-input-wrap"><Barcode size={21} aria-hidden="true" /><input ref={codeInput} id="scan-code" value={code} disabled={mutation.isPending} onChange={(event) => { lookupVersion.current++; setLookupBusy(false); setCode(event.target.value); setSelected(null); setMatches([]); setLookupState('waiting'); setLookupError(''); resetPreview(); }} placeholder="Bipar código ou digitar SKU" aria-invalid={lookupState === 'missing'} aria-describedby="scan-feedback scan-hint" autoComplete="off" /><button disabled={lookupBusy || mutation.isPending} type="submit" className="scan-submit">{lookupBusy ? 'Consultando…' : 'Localizar'} <ArrowRight size={17} aria-hidden="true" /></button></div>
        </form>
        <p className={'scan-feedback' + (lookupState === 'missing' ? ' scan-feedback-error' : '')} id="scan-feedback" role="status">
          {lookupError || (lookupState === 'found' ? 'Produto encontrado.' : lookupState === 'missing' ? 'Código não encontrado. Confira a leitura ou consulte Produtos.' : lookupState === 'ambiguous' ? 'Este código identifica mais de um produto. Selecione o item abaixo.' : 'Aguardando leitura do SKU ou código de barras.')}
        </p>
        {matches.length > 1 && <div className="lookup-matches">{matches.map((product) => <button type="button" className="secondary-button" key={product.id} onClick={() => chooseProduct(product)}>{product.name} · {product.sku}</button>)}</div>}
        <p className="scan-hint" id="scan-hint">Leitor como teclado + Enter.</p>
      </div>
      <div className="scan-example" aria-live="polite">
        {selected ? <>
          <span className="block-label">PRODUTO LOCALIZADO</span>
          <div className="selected-product"><ProductThumbnail imageUrl={selected.imageUrl} name={selected.name} /><span><strong>{selected.name}</strong><small>{selected.sku} · {selected.category}</small></span></div>
          <div className="scan-example-balance"><span>SALDO ATUAL</span><strong>{liveProduct?.stock} <small>{selected.unit}</small></strong></div>
          <StockMeter stock={liveProduct!.stock} minimum={liveProduct!.minimum} name={selected.name} /><Status {...stockStatus(liveProduct!.stock, liveProduct!.minimum)} />
        </> : <div className="scan-awaiting"><Barcode size={32} aria-hidden="true" /><strong>Identifique o item</strong><p>O produto e seu saldo aparecerão aqui após a consulta.</p></div>}
      </div>
    </div>
    <form className="movement-form" noValidate onSubmit={handleSubmit(confirm)} onChange={resetPreview} onKeyDown={(event) => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault(); }}>
      <fieldset disabled={!selected || productQuery.isPending || productQuery.isError || mutation.isPending || Boolean(result)}>
        <legend className="sr-only">Registrar movimentação</legend>
        <Field id="movement-quantity" label="Quantidade" error={errors.quantity?.message}><Controller name="quantity" control={control} render={({ field }) => <QuantityInput id="movement-quantity" value={field.value} inputRef={field.ref} onChange={(value) => { field.onChange(value); resetPreview(); }} onBlur={field.onBlur} unit={selected?.unit ?? 'un'} error={errors.quantity?.message} disabled={!selected} />} /></Field>
        <div className="operation-field"><span className="field-label" id="movement-type-label">TIPO DE MOVIMENTO</span><div className="type-selector" role="radiogroup" aria-labelledby="movement-type-label">{(['Entrada', 'Saída'] as const).map((item) => <label key={item} className={'type-option type-' + (item === 'Entrada' ? 'in' : 'out') + (type === item ? ' type-selected' : '')}><input type="radio" value={item} {...register('type')} />{item === 'Entrada' ? <Plus size={15} aria-hidden="true" /> : <Minus size={15} aria-hidden="true" />}{item}</label>)}</div></div>
        <div className="reason-field"><Field id="movement-reason" label="Motivo" error={errors.reason?.message}><select id="movement-reason" {...register('reason')} {...fieldAccessibility('movement-reason', errors.reason?.message)}><option value="">Selecione o motivo</option>{(Object.keys(reasonLabels) as MovementReason[]).filter(key => key !== 'INITIAL_STOCK').map(key => <option value={key} key={key}>{reasonLabels[key]}</option>)}</select></Field></div>
        <button type="submit" className="primary-button preview-button" disabled={mutation.isPending || Boolean(preview && preview.after < 0)} aria-busy={mutation.isPending}>{mutation.isPending ? 'Registrando…' : type === 'Saída' ? 'Confirmar saída' : 'Confirmar entrada'}<ArrowRight size={17} aria-hidden="true" /></button>
      </fieldset>
      {preview && <div className={'operation-feedback' + (preview.after < 0 ? ' operation-feedback-error' : '')} role="status">
        <div><strong>{preview.after < 0 ? 'Saldo insuficiente para esta saída' : `${preview.type} de ${formatQuantity(preview.quantity)} ${selected?.unit} · ${selected?.name}`}</strong><small>{reasonLabels[reason as MovementReason]}</small></div>
        <span className="preview-balance">{formatQuantity(preview.before)}<ArrowRight size={18} aria-hidden="true" /><strong>{preview.after < 0 ? 'Insuficiente' : formatQuantity(preview.after)}</strong></span>
        <small>Saldo previsto · confirmado ao registrar</small>
      </div>}
      {mutation.error && <p className="field-error" role="alert">{mutation.error.message}</p>}
      {productQuery.error && <p className="field-error" role="alert">{productQuery.error.message} <button type="button" className="text-button" onClick={() => void productQuery.refetch()}>Tentar novamente</button></p>}
      {result && <div className="operation-feedback" role="status"><strong>Movimentação registrada · {result.product.name} · {result.quantity} {selected?.unit}</strong><span className="preview-balance">{result.previousStock}<ArrowRight size={18} /><strong>{result.resultingStock}</strong></span></div>}
      {(selected || result) && <button type="button" className="text-button" disabled={mutation.isPending} onClick={() => { reset({ quantity: '1', type, reason: '' }); resetPreview(); setCode(''); setSelected(null); setLookupState('waiting'); codeInput.current?.focus(); }}>Próximo produto</button>}
      <p className="operation-note">{selected ? result ? 'Movimento registrado. Leia o próximo produto para continuar.' : 'Confira o saldo previsto antes de confirmar.' : 'Localize um produto para movimentar o estoque.'}</p>
    </form>
  </section>;
}
