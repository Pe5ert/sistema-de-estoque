import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Barcode, ArrowRight, Check, Save } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDemoCatalog } from './catalog';
import type { ProductPresentation } from './demo-data';
import { Field, fieldAccessibility, QuantityInput } from './form-controls';
import { ProductImageField } from './ProductImageField';
import { formatQuantity, parseDecimal, productFormDefaults, productUnits, validateProductForm, type ProductFormValues } from './product-form-model';

const fieldOrder: (keyof ProductFormValues)[] = ['barcode', 'name', 'sku', 'category', 'unit', 'cost', 'sale', 'minimum', 'initialQuantity', 'description'];

function keepControlVisible(form: HTMLFormElement, target: EventTarget | null) {
  if (!form.isConnected || !(target instanceof HTMLElement) || !form.contains(target) || target.closest('.form-actions') || target.matches('input[type="file"]')) return;
  const footer = form.querySelector('.form-actions');
  if (!footer) return;
  const bounds = (target.closest('.form-field') ?? target).getBoundingClientRect();
  if (bounds.bottom > footer.getBoundingClientRect().top || bounds.top < 0) target.scrollIntoView({ block: 'center' });
}

export function ProductFormPage() {
  const { id } = useParams();
  const { products } = useDemoCatalog();
  const product = id ? products.find((item) => item.id === id) : undefined;
  if (id && !product) return <div className="empty-state"><strong>Produto não encontrado nesta sessão.</strong><Link className="secondary-button" to="/products">Voltar ao catálogo</Link></div>;
  return <ProductForm key={id ?? 'new'} product={product} />;
}

function ProductForm({ product }: { product?: ProductPresentation }) {
  const navigate = useNavigate();
  const { products, saveProduct } = useDemoCatalog();
  const editing = Boolean(product);
  const [file, setFile] = useState<File | null>(null);
  const [removedImage, setRemovedImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(Boolean(product?.description));
  const [cancelRequested, setCancelRequested] = useState(false);
  const [savingAction, setSavingAction] = useState<'save' | 'another' | null>(null);
  const [focusNextProduct, setFocusNextProduct] = useState(false);
  const saving = useRef(false);
  const pointerFocusing = useRef(false);
  const { register, control, watch, handleSubmit, setError, clearErrors, reset, setFocus, formState: { errors, isSubmitting, isDirty } } = useForm<ProductFormValues>({ defaultValues: productFormDefaults(product) });
  const unit = watch('unit');
  const initialMode = watch('initialMode');
  const dirty = isDirty || Boolean(file) || removedImage;
  const categories = [...new Set(products.map((item) => item.category))];
  const busy = isSubmitting || savingAction !== null;

  useEffect(() => { setFocus(editing ? 'name' : 'barcode'); window.scrollTo({ top: 0, left: 0 }); }, [editing, setFocus]);
  useEffect(() => {
    if (focusNextProduct) { setFocus('barcode'); window.scrollTo({ top: 0, left: 0 }); setFocusNextProduct(false); }
  }, [focusNextProduct, setFocus]);
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [dirty]);

  const scannerEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); setFocus('name'); }
  };
  const submit = (action: 'save' | 'another') => handleSubmit(async (values) => {
    if (saving.current) return;
    clearErrors(); setNotice(''); setCancelRequested(false);
    const validated = validateProductForm(values, products, product?.id);
    if (!validated.success) {
      for (const issue of validated.error.issues) setError(issue.path[0] as keyof ProductFormValues, { message: issue.message });
      const firstError = fieldOrder.find((field) => validated.error.issues.some((issue) => issue.path[0] === field));
      if (firstError) setFocus(firstError);
      return;
    }
    saving.current = true; setSavingAction(action);
    try {
      const data = validated.data;
      await saveProduct({
        sku: data.sku, barcode: data.barcode || null, name: data.name, category: data.category, unit: data.unit,
        costPrice: data.cost.trim() ? parseDecimal(data.cost, 2) : null, price: data.sale.trim() ? parseDecimal(data.sale, 2) : null,
        minimum: parseDecimal(data.minimum, 3)!, description: data.description || null,
        initialEntry: !editing && data.initialMode === 'entry' ? { quantity: parseDecimal(data.initialQuantity, 3)!, reason: 'Estoque inicial' } : null,
        imageFile: file, removeImage: removedImage,
      }, product?.id);
      const message = editing ? 'Produto atualizado nesta sessão de demonstração.' : 'Produto cadastrado nesta sessão de demonstração.';
      if (action === 'another') {
        reset({ ...productFormDefaults(), category: data.category, unit: data.unit });
        setFile(null); setRemovedImage(false);
        setDetailsOpen(false);
        setNotice('Produto cadastrado nesta sessão. Próxima leitura pronta.');
        setFocusNextProduct(true);
      } else navigate('/products', { state: { notice: message } });
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Não foi possível salvar. Seus dados continuam no formulário.' });
    } finally { saving.current = false; setSavingAction(null); }
  });

  const cancel = () => { if (dirty) setCancelRequested(true); else navigate('/products'); };
  return <form className="product-form" noValidate onSubmit={submit('save')} onPointerDownCapture={() => { pointerFocusing.current = true; }} onPointerCancelCapture={() => { pointerFocusing.current = false; }} onPointerUpCapture={(event) => {
    pointerFocusing.current = false;
    const form = event.currentTarget;
    requestAnimationFrame(() => keepControlVisible(form, document.activeElement));
  }} onKeyDownCapture={() => { pointerFocusing.current = false; }} onKeyDown={(event) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault();
  }} onFocusCapture={(event) => {
    if (!pointerFocusing.current) keepControlVisible(event.currentTarget, event.target);
  }} onChange={() => { setNotice(''); setCancelRequested(false); }}>
    <div className="form-context"><span>{editing ? `Editando ${product?.sku}` : 'Cadastro de produto'}</span><span><b>*</b> Obrigatório · demais campos opcionais</span></div>
    {notice && <div className="form-notice" role="status"><Check size={17} aria-hidden="true" />{notice}</div>}
    <div className="product-form-surface">
      <div className="product-form-top">
        <section className="identification-section" aria-labelledby="identification-title">
          <div className="form-section-heading"><h2 id="identification-title">Identificação do produto</h2></div>
          <div className="identification-grid">
            <div className="barcode-field"><Field id="product-barcode" label="Código de barras" hint="Identificador físico · opcional. Enter segue para Nome." error={errors.barcode?.message}>
              <div className="code-input"><Barcode size={19} aria-hidden="true" /><input id="product-barcode" {...register('barcode')} onKeyDown={scannerEnter} maxLength={80} autoComplete="off" placeholder="Bipar código de barras ou digitar" {...fieldAccessibility('product-barcode', errors.barcode?.message, true)} /><span className="scanner-input-hint" aria-hidden="true">LEITURA POR TECLADO</span></div>
            </Field></div>
            <div className="product-name-field"><Field id="product-name" label="Nome do produto" required error={errors.name?.message}><input id="product-name" {...register('name')} maxLength={200} placeholder="Nome para identificação no catálogo" aria-required="true" {...fieldAccessibility('product-name', errors.name?.message)} /></Field></div>
            <Field id="product-sku" label="SKU" required hint="Identificador interno do produto." error={errors.sku?.message}>
              <input id="product-sku" {...register('sku')} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); setFocus('category'); } }} maxLength={80} autoComplete="off" placeholder="Digite o SKU interno" {...fieldAccessibility('product-sku', errors.sku?.message, true)} aria-required="true" />
            </Field>
            <Field id="product-category" label="Categoria" required error={errors.category?.message}><select id="product-category" {...register('category')} aria-required="true" {...fieldAccessibility('product-category', errors.category?.message)}><option value="">Selecione a categoria</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
            <Field id="product-unit" label="Unidade" required error={errors.unit?.message}><select id="product-unit" {...register('unit')} aria-required="true" {...fieldAccessibility('product-unit', errors.unit?.message)}>{productUnits.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <ProductImageField imageUrl={previewUrl ?? (removedImage ? null : product?.imageUrl)} file={file} disabled={busy} onSelect={(image) => { setFile(image); setRemovedImage(false); }} onRemove={() => { setFile(null); setRemovedImage(true); }} />
          </div>
        </section>
      </div>
      <div className="product-form-bottom">
        <section className="commercial-section" aria-labelledby="commercial-title">
          <div className="form-section-heading"><h2 id="commercial-title">Comercial</h2><span>Preços por {unit}</span></div>
          <div className="money-grid">{(['cost', 'sale'] as const).map((field) => <Field key={field} id={'product-' + field} label={field === 'cost' ? 'Preço de custo' : 'Preço de venda'} error={errors[field]?.message}>
            <div className="money-input"><span aria-hidden="true">R$</span><input id={'product-' + field} type="text" inputMode="decimal" {...register(field)} placeholder="0,00" {...fieldAccessibility('product-' + field, errors[field]?.message)} /></div>
          </Field>)}</div>
          <p className="field-hint">Preços opcionais. Deixe em branco se ainda não souber.</p>
        </section>
        <section className="stock-control-section" aria-labelledby="inventory-title">
          <div className="form-section-heading"><h2 id="inventory-title">Controle de estoque</h2><span>{editing ? 'Saldo preservado' : 'Configuração e operação'}</span></div>
          <div className="inventory-control-grid">
            <Field id="product-minimum" label="Estoque mínimo" hint={'Configuração de reposição em ' + unit + '.'} error={errors.minimum?.message}><div className="unit-input"><input id="product-minimum" type="text" inputMode="decimal" {...register('minimum')} {...fieldAccessibility('product-minimum', errors.minimum?.message, true)} /><span aria-hidden="true">{unit}</span></div></Field>
            {editing ? <div className="readonly-balance"><span>Saldo atual · consulta</span><strong>{formatQuantity(product!.stock)} <small>{unit}</small></strong><p>Entradas e saídas são feitas em Movimentações.</p></div> : <fieldset className="initial-operation"><legend>Saldo inicial</legend>
              <label><input type="radio" value="none" {...register('initialMode')} />Cadastrar sem saldo inicial</label>
              <label><input type="radio" value="entry" {...register('initialMode')} />Registrar entrada inicial</label>
              <p className="field-hint">A entrada inicial será uma movimentação.</p>
              {initialMode === 'entry' && <div className="initial-entry-fields">
                <Field id="product-initialQuantity" label="Quantidade inicial" required error={errors.initialQuantity?.message}><Controller name="initialQuantity" control={control} render={({ field }) => <QuantityInput id="product-initialQuantity" value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} unit={unit} error={errors.initialQuantity?.message} />} /></Field>
                <div className="fixed-reason"><span>Motivo</span><strong>Estoque inicial</strong></div>
              </div>}
              {initialMode === 'entry' && <p className="initial-entry-note">Entrada preparada nesta prévia. O saldo permanece zero até a integração de movimentações.</p>}
            </fieldset>}
          </div>
          {editing && product?.initialEntry && <p className="initial-entry-note">Entrada inicial preparada: {formatQuantity(product.initialEntry.quantity)} {product.unit}. Ainda não registrada no estoque.</p>}
        </section>
      </div>
      <details className="product-extra-details" open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)}><summary>Detalhes opcionais <span>Descrição</span></summary><Field id="product-description" label="Descrição"><textarea id="product-description" rows={2} {...register('description')} placeholder="Detalhes úteis para identificar ou manusear o produto" /></Field></details>
    </div>
    {errors.root && <p className="form-submit-error" role="alert">{errors.root.message}</p>}
    <div className="form-actions">
      {cancelRequested ? <div className="cancel-confirmation" role="alert"><strong>Descartar o preenchimento?</strong><button type="button" className="text-button" onClick={() => setCancelRequested(false)}>Continuar preenchendo</button><button type="button" className="secondary-button" onClick={() => navigate('/products')}>Descartar e sair</button></div> : <>
        <button type="button" className="text-button cancel-button" onClick={cancel} disabled={busy}>Cancelar</button>
        <span className="session-note">Demonstração · dados nesta sessão</span>
        <div className="form-action-buttons">{!editing && <button type="button" className="secondary-button" disabled={busy} onClick={() => void submit('another')()}>{savingAction === 'another' ? 'Salvando…' : 'Salvar e criar outro'}<ArrowRight size={16} aria-hidden="true" /></button>}<button type="submit" className="primary-button" disabled={busy}><Save size={16} aria-hidden="true" />{savingAction === 'save' ? 'Salvando…' : editing ? 'Salvar alterações' : 'Salvar produto'}</button></div>
      </>}
    </div>
  </form>;
}
