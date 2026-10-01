import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArrowRight, Barcode, Minus, Plus } from 'lucide-react';
import { stockStatus, type ProductPresentation } from './demo-data';
import { useDemoCatalog } from './catalog';
import { Field, fieldAccessibility, QuantityInput } from './form-controls';
import { formatQuantity, parseDecimal } from './product-form-model';
import { ProductThumbnail, Status, StockMeter } from './inventory-ui';

const previewSchema = z.object({ quantity: z.string().refine((value) => (parseDecimal(value, 3) ?? 0) > 0, 'Informe uma quantidade maior que zero, como 1 ou 2,5.'), type: z.enum(['Entrada', 'Saída']), reason: z.string().trim().min(1, 'Informe o motivo.') });
type PreviewFields = { quantity: string; type: 'Entrada' | 'Saída'; reason: string };

export function MovementWorkbench() {
  const { products } = useDemoCatalog();
  const codeInput = useRef<HTMLInputElement>(null);
  const [lookupFocus, setLookupFocus] = useState(false);
  const [code, setCode] = useState('');
  const [selected, setSelected] = useState<ProductPresentation | null>(null);
  const [matches, setMatches] = useState<readonly ProductPresentation[]>([]);
  const [lookupState, setLookupState] = useState<'waiting' | 'found' | 'missing' | 'ambiguous'>('waiting');
  const [preview, setPreview] = useState<{ before: number; after: number; quantity: number; type: string } | null>(null);
  const { register, control, handleSubmit, watch, setFocus, reset, setError, clearErrors, formState: { errors } } = useForm<PreviewFields>({ defaultValues: { quantity: '1', type: 'Entrada', reason: '' } });
  const type = watch('type');
  const reason = watch('reason');
  useEffect(() => {
    if (lookupFocus && selected) { setFocus('quantity'); setLookupFocus(false); }
  }, [lookupFocus, selected, setFocus]);
  const resetPreview = () => { setPreview(null); clearErrors(); };
  const chooseProduct = (product: ProductPresentation) => {
    setSelected(product); setMatches([]); setLookupState('found');
    reset({ quantity: '1', type, reason: '' }); resetPreview(); setLookupFocus(true);
  };
  const lookup = () => {
    const found = products.filter((item) => item.sku.toUpperCase() === code.trim().toUpperCase() || Boolean(item.barcode && item.barcode === code.trim()));
    if (found.length === 1) { chooseProduct(found[0]); return; }
    setSelected(null); setMatches(found);
    setLookupState(found.length > 1 ? 'ambiguous' : 'missing');
    resetPreview();
    reset({ quantity: '1', type, reason: '' });
  };
  const showPreview = (values: PreviewFields) => {
    if (!selected) return;
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
    const after = Math.round((selected.stock + (data.type === 'Saída' ? -quantity : quantity)) * 1000) / 1000;
    setPreview({ before: selected.stock, after, quantity, type: data.type });
  };

  return <section className="operation-workbench" aria-labelledby="scan-title">
    <div className="scan-stage">
      <div className="scan-main">
        <div className="scan-kicker"><Barcode size={19} aria-hidden="true" /><span>POSTO DE OPERAÇÃO</span><span className="preview-tag">DEMONSTRAÇÃO</span></div>
        <h2 id="scan-title">Localizar produto</h2>
        <form className="scan-lookup" onSubmit={(event) => { event.preventDefault(); lookup(); }}>
          <label htmlFor="scan-code">SKU OU CÓDIGO DE BARRAS</label>
          <div className="scan-input-wrap"><Barcode size={21} aria-hidden="true" /><input ref={codeInput} id="scan-code" value={code} onChange={(event) => { setCode(event.target.value); setSelected(null); setMatches([]); setLookupState('waiting'); resetPreview(); }} placeholder="Bipar código ou digitar SKU" aria-invalid={lookupState === 'missing'} aria-describedby="scan-feedback scan-hint" autoComplete="off" /><button type="submit" className="scan-submit">Localizar <ArrowRight size={17} aria-hidden="true" /></button></div>
        </form>
        <p className={'scan-feedback' + (lookupState === 'missing' ? ' scan-feedback-error' : '')} id="scan-feedback" role="status">
          {lookupState === 'found' ? 'Produto encontrado no catálogo de demonstração.' : lookupState === 'missing' ? 'Código não encontrado. Confira a leitura ou consulte Produtos.' : lookupState === 'ambiguous' ? 'Este código identifica mais de um produto. Selecione o item abaixo.' : 'Aguardando leitura. Experimente CAB-001 ou MOU-002.'}
        </p>
        {matches.length > 1 && <div className="lookup-matches">{matches.map((product) => <button type="button" className="secondary-button" key={product.id} onClick={() => chooseProduct(product)}>{product.name} · {product.sku}</button>)}</div>}
        <p className="scan-hint" id="scan-hint">Leitor como teclado + Enter. Consulta ao catálogo desta sessão.</p>
      </div>
      <div className="scan-example" aria-live="polite">
        {selected ? <>
          <span className="block-label">PRODUTO LOCALIZADO</span>
          <div className="selected-product"><ProductThumbnail imageUrl={selected.imageUrl} name={selected.name} /><span><strong>{selected.name}</strong><small>{selected.sku} · {selected.category}</small></span></div>
          <div className="scan-example-balance"><span>SALDO ATUAL</span><strong>{selected.stock} <small>{selected.unit}</small></strong></div>
          <StockMeter stock={selected.stock} minimum={selected.minimum} name={selected.name} /><Status {...stockStatus(selected.stock, selected.minimum)} />
        </> : <div className="scan-awaiting"><Barcode size={32} aria-hidden="true" /><strong>Identifique o item</strong><p>O produto e seu saldo aparecerão aqui após a consulta.</p></div>}
      </div>
    </div>
    <form className="movement-form" noValidate onSubmit={handleSubmit(showPreview)} onChange={resetPreview} onKeyDown={(event) => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault(); }}>
      <fieldset disabled={!selected}>
        <legend className="sr-only">Prévia de movimentação</legend>
        <Field id="movement-quantity" label="Quantidade" error={errors.quantity?.message}><Controller name="quantity" control={control} render={({ field }) => <QuantityInput id="movement-quantity" value={field.value} inputRef={field.ref} onChange={(value) => { field.onChange(value); resetPreview(); }} onBlur={field.onBlur} unit={selected?.unit ?? 'un'} error={errors.quantity?.message} disabled={!selected} />} /></Field>
        <div className="operation-field"><span className="field-label" id="movement-type-label">TIPO DE MOVIMENTO</span><div className="type-selector" role="radiogroup" aria-labelledby="movement-type-label">{(['Entrada', 'Saída'] as const).map((item) => <label key={item} className={'type-option type-' + (item === 'Entrada' ? 'in' : 'out') + (type === item ? ' type-selected' : '')}><input type="radio" value={item} {...register('type')} />{item === 'Entrada' ? <Plus size={15} aria-hidden="true" /> : <Minus size={15} aria-hidden="true" />}{item}</label>)}</div></div>
        <div className="reason-field"><Field id="movement-reason" label="Motivo" error={errors.reason?.message}><input id="movement-reason" type="text" {...register('reason')} placeholder="Informe o motivo" maxLength={200} {...fieldAccessibility('movement-reason', errors.reason?.message)} /></Field></div>
        <button type="submit" className="primary-button preview-button">Ver prévia <ArrowRight size={17} aria-hidden="true" /></button>
      </fieldset>
      {preview && <div className={'operation-feedback' + (preview.after < 0 ? ' operation-feedback-error' : '')} role="status">
        <div><strong>{preview.after < 0 ? 'Saldo insuficiente para esta saída' : `${preview.type} de ${formatQuantity(preview.quantity)} ${selected?.unit} · ${selected?.name}`}</strong><small>{reason}</small></div>
        <span className="preview-balance">{formatQuantity(preview.before)}<ArrowRight size={18} aria-hidden="true" /><strong>{preview.after < 0 ? 'Insuficiente' : formatQuantity(preview.after)}</strong></span>
        <button type="button" className="text-button" onClick={() => { reset({ quantity: '1', type, reason: '' }); resetPreview(); setCode(''); setSelected(null); setLookupState('waiting'); codeInput.current?.focus(); }}>Próximo produto</button>
      </div>}
      <p className="operation-note">{selected ? 'A prévia não registra movimentos nem altera o estoque.' : 'Localize um produto para preparar a prévia de movimentação.'}</p>
    </form>
  </section>;
}
