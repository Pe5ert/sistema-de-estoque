import { StatefulButton, type ActionState } from './StatefulButton';
import { hasPermission } from '@stock/shared';
import { useAuth } from './auth/auth';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Barcode } from 'lucide-react';
import { useFeedback, Alert, ConfirmDialog } from './feedback';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { useCategories, useProduct, useInventoryMutation } from './inventory-api';
import { apiUnit, type ProductPresentation } from './inventory-model';
import { apiClient, ApiError } from './lib/api';
import { DataState } from './data-controls';
import { Field, fieldAccessibility, QuantityInput } from './form-controls';
import { ProductImageField, type ProductImageHandle } from './ProductImageField';
import { formatQuantity, normalizeDecimal, productFormDefaults, productUnits, validateProductForm, type ProductFormValues } from './product-form-model';

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
  const query = useProduct(id);
  const categories = useCategories();
  return <DataState retainContentOnError={Boolean(categories.data && (!id || query.data))} pending={categories.isPending || Boolean(id && query.isPending)} error={categories.error || (id ? query.error : null)} retry={() => { void categories.refetch(); void query.refetch(); }}><ProductForm key={id ?? 'new'} product={query.data} /></DataState>;
}

function ProductForm({ product }: { product?: ProductPresentation }) {
  const { notify } = useFeedback();
  const { currentUser } = useAuth();
  const imageRef = useRef<ProductImageHandle>(null);
  const [imageDraftDirty, setImageDraftDirty] = useState(false);
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const mutation = useInventoryMutation((body: Record<string, unknown>) => apiClient('/products' + (product ? '/' + product.id : ''), { method: product ? 'PATCH' : 'POST', body: JSON.stringify(body) }));
  const editing = Boolean(product);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const uploadedImage = useRef<{ file: File; url: string } | null>(null);
  const [imageProgress, setImageProgress] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(Boolean(product?.description));
  const [cancelRequested, setCancelRequested] = useState(false);
  const [savingAction, setSavingAction] = useState<'save' | 'another' | null>(null);
  const [confirmInactive, setConfirmInactive] = useState(false);
  const inactivationApproved = useRef(false);
  const [focusNextProduct, setFocusNextProduct] = useState(false);
  const nextFocus = useRef<'name' | 'barcode'>('name');
  const saving = useRef(false);
  const [actionState, setActionState] = useState<ActionState>('idle');
  const lastAction = useRef<'save' | 'another'>('save');
  const allowNavigation = useRef(false);
  const pointerFocusing = useRef(false);
  const { register, control, watch, handleSubmit, setError, clearErrors, reset, setFocus, formState: { errors, isSubmitting, isDirty } } = useForm<ProductFormValues>({ defaultValues: productFormDefaults(product) });
  const unit = watch('unit');
  const initialMode = watch('initialMode');
  const dirty = imageDraftDirty || isDirty || Boolean(imageFile) || imageUrl !== (product?.imageUrl ?? '');
  const busy = isSubmitting || savingAction !== null;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !allowNavigation.current && (dirty || saving.current) && currentLocation.pathname !== nextLocation.pathname);
  const confirmingLeave = cancelRequested || blocker.state === 'blocked';

  useEffect(() => { setFocus('name'); window.scrollTo({ top: 0, left: 0 }); }, [editing, setFocus]);
  useEffect(() => {
    if (focusNextProduct) { setFocus(nextFocus.current); window.scrollTo({ top: 0, left: 0 }); setFocusNextProduct(false); }
  }, [focusNextProduct, setFocus]);
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
    clearErrors(); setCancelRequested(false);
    const validated = validateProductForm(values, editing);
    if (!validated.success) {
      for (const issue of validated.error.issues) setError(issue.path[0] as keyof ProductFormValues, { message: issue.message });
      const firstError = fieldOrder.find((field) => validated.error.issues.some((issue) => issue.path[0] === field));
      if (firstError) setFocus(firstError);
      return;
    }
    if (product?.active && !validated.data.active && !inactivationApproved.current) { setConfirmInactive(true); return; }
    const resolvedImage = imageRef.current?.resolve();
    if (resolvedImage && !resolvedImage.valid) return;
    inactivationApproved.current = false;
    saving.current = true; lastAction.current = action; setActionState('loading'); setSavingAction(action);
    try {
      const data = validated.data;
      let savedImage = resolvedImage?.url ?? imageUrl;
      if (imageFile && !resolvedImage?.replaceFile) {
        if (uploadedImage.current?.file === imageFile) savedImage = uploadedImage.current.url;
        else {
          setImageProgress('Enviando foto…');
          const body = new FormData(); body.append('file', imageFile);
          const uploaded = await apiClient<{ imageUrl: string }>('/product-images' + (product ? '/' + product.id : ''), { method: 'POST', body });
          uploadedImage.current = { file: imageFile, url: uploaded.imageUrl }; savedImage = uploaded.imageUrl;
        }
      }
      setImageProgress('Salvando produto…');
      await mutation.mutateAsync({
        sku: data.sku, barcode: data.barcode || null, name: data.name, categoryId: data.category, unit: apiUnit(data.unit),
        costPrice: data.cost.trim() ? normalizeDecimal(data.cost, 2) : null, salePrice: data.sale.trim() ? normalizeDecimal(data.sale, 2) : null,
        minimumStock: normalizeDecimal(data.minimum, 3), description: data.description || null, imageUrl: savedImage || null, active: data.active,
        ...(!editing && data.initialMode === 'entry' ? { initialEntry: { quantity: normalizeDecimal(data.initialQuantity, 3) } } : {}),
      });
      setActionState('success');
      notify({ tone: 'success', title: editing ? (data.active ? 'Produto atualizado com sucesso.' : 'Produto inativado.') : 'Produto criado com sucesso.', description: action === 'another' ? 'Pronto para cadastrar outro produto.' : data.name, key: 'product-save' });
      if (action === 'another') {
        nextFocus.current = data.barcode ? 'barcode' : 'name';
        reset({ ...productFormDefaults(), category: data.category, unit: data.unit });
        setImageUrl(''); setImageFile(null); setImageDraftDirty(false); uploadedImage.current = null;
        setDetailsOpen(false);
        setFocusNextProduct(true);
      } else { allowNavigation.current = true; navigate('/products'); }
    } catch (error) {
      setActionState('error');
      if (error instanceof ApiError && error.message.includes('A imagem enviada expirou')) uploadedImage.current = null;
      const field = error instanceof ApiError && error.status === 409 ? (error.message.includes('SKU') ? 'sku' : error.message.includes('barras') ? 'barcode' : null) : null;
      if (field) { setError(field, { message: (error as Error).message }); setFocus(field); }
      else notify({ tone: 'error', title: 'Não foi possível salvar o produto.', description: (error instanceof Error ? error.message : 'Tente novamente.') + ' Seus dados continuam no formulário.', key: 'product-save' });
    } finally { saving.current = false; setSavingAction(null); setImageProgress(''); }
  });

  const cancel = () => { if (dirty) setCancelRequested(true); else navigate('/products'); };
  const stay = () => { setCancelRequested(false); if (blocker.state === 'blocked') blocker.reset(); setFocus(editing ? 'name' : 'barcode'); };
  const discard = () => { allowNavigation.current = true; if (blocker.state === 'blocked') blocker.proceed(); else navigate('/products'); };
  return <form onChangeCapture={() => { if (!busy) setActionState('idle'); }} className="product-form" aria-busy={busy} noValidate onSubmit={submit('save')} onPointerDownCapture={() => { pointerFocusing.current = true; }} onPointerCancelCapture={() => { pointerFocusing.current = false; }} onPointerUpCapture={(event) => {
    pointerFocusing.current = false;
    const form = event.currentTarget;
    requestAnimationFrame(() => keepControlVisible(form, document.activeElement));
  }} onKeyDownCapture={() => { pointerFocusing.current = false; }} onKeyDown={(event) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault();
  }} onFocusCapture={(event) => {
    if (!pointerFocusing.current) keepControlVisible(event.currentTarget, event.target);
  }} onChange={() => { setCancelRequested(false); }}>
    {confirmInactive && <ConfirmDialog title="Inativar este produto?" description="O produto deixará de aparecer no catálogo ativo e não poderá receber movimentações. O histórico será preservado." cancelLabel="Continuar editando" confirmLabel="Inativar e salvar" cancel={() => setConfirmInactive(false)} confirm={() => { setConfirmInactive(false); inactivationApproved.current = true; void submit('save')(); }} />}
    <p className="product-form-intro">{editing ? 'Atualize os dados do produto. Para alterar a quantidade, use Movimentações.' : 'Comece pelo nome, código interno e categoria. Depois informe o que já existe no estoque.'}</p>
    <div className="form-context"><span>{editing ? `Editando ${product?.sku}` : 'Cadastro de produto'}</span><span><b>*</b> Obrigatório · demais campos opcionais</span></div>
    <fieldset className="product-form-surface" disabled={busy} style={{ margin: 0, padding: 0, minWidth: 0 }}><legend className="sr-only">Dados do produto</legend>
      <div className="product-form-top">
        <section className="identification-section" aria-labelledby="identification-title">
          <div className="form-section-heading"><h2 id="identification-title">1. Identificação do produto</h2></div>
          <div className="identification-grid">
            <div className="product-name-field"><Field id="product-name" label="Nome do produto" required error={errors.name?.message}><input id="product-name" {...register('name')} maxLength={200} placeholder="Ex.: Caneta esferográfica azul" aria-required="true" {...fieldAccessibility('product-name', errors.name?.message)} /></Field></div>
            <Field id="product-sku" label="Código interno (SKU)" required hint="Um código único criado pela equipe. Ex.: CANETA-AZUL." error={errors.sku?.message}>
              <input id="product-sku" {...register('sku')} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); setFocus('category'); } }} maxLength={80} autoComplete="off" placeholder="Ex.: CANETA-AZUL" {...fieldAccessibility('product-sku', errors.sku?.message, true)} aria-required="true" />
            </Field>
            <Field id="product-category" label="Categoria" required error={errors.category?.message}><select id="product-category" {...register('category')} aria-required="true" {...fieldAccessibility('product-category', errors.category?.message)}><option value="">Selecione a categoria</option>{categories.filter(category => category.active || category.id === product?.categoryId).map(category => <option key={category.id} value={category.id}>{category.name}{!category.active ? ' (inativa)' : ''}</option>)}</select>{categories.filter(category => category.active).length === 0 && <span className="field-hint">{hasPermission(currentUser?.role, 'category.manage') ? 'Cadastre uma categoria em Produtos → Categorias antes de salvar.' : 'Peça a um administrador ou gerente para cadastrar uma categoria antes de continuar.'}</span>}</Field>
            <Field id="product-unit" label="Unidade de medida" required hint="Como este produto é contado no estoque." error={errors.unit?.message}><select id="product-unit" {...register('unit')} aria-required="true" {...fieldAccessibility('product-unit', errors.unit?.message)}>{productUnits.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <div className="barcode-field"><Field id="product-barcode" label="Código de barras" hint="Opcional. Use o código da embalagem, com leitor ou teclado." error={errors.barcode?.message}>
              <div className="code-input"><Barcode size={19} aria-hidden="true" /><input id="product-barcode" {...register('barcode')} onKeyDown={scannerEnter} maxLength={80} autoComplete="off" placeholder="Digite ou leia o código da embalagem" {...fieldAccessibility('product-barcode', errors.barcode?.message, true)} /><span className="scanner-input-hint" aria-hidden="true">LEITURA POR TECLADO</span></div>
            </Field></div>
            <ProductImageField key={focusNextProduct ? 'next' : 'current'} imageRef={imageRef} onDraftChange={setImageDraftDirty} imageUrl={imageUrl} disabled={busy} file={imageFile} onFileChange={file => { setImageFile(file); uploadedImage.current = null; }} onChange={setImageUrl} />
          </div>
        </section>
      </div>
      <div className="product-form-bottom">
        <section className="stock-control-section" aria-labelledby="inventory-title">
          <div className="form-section-heading"><h2 id="inventory-title">2. Estoque</h2><span>{editing ? 'Saldo preservado' : 'Quantidade e reposição'}</span></div>
          <div className="inventory-control-grid">
            {editing ? <div className="readonly-balance"><span>Saldo atual · consulta</span><strong>{formatQuantity(product!.stock)} <small>{unit}</small></strong><p>Entradas e saídas são feitas em Movimentações.</p></div> : <fieldset className="initial-operation"><legend>Já tem este produto no estoque?</legend>
              <label><input type="radio" value="none" {...register('initialMode')} />Não, começar com estoque zerado</label>
              <label><input type="radio" value="entry" {...register('initialMode')} />Sim, informar a quantidade disponível</label>
              <p className="field-hint">Ao salvar, a quantidade informada também será registrada no Histórico.</p>
              {initialMode === 'entry' && <div className="initial-entry-fields">
                <Field id="product-initialQuantity" label="Quantidade inicial" required error={errors.initialQuantity?.message}><Controller name="initialQuantity" control={control} render={({ field }) => <QuantityInput id="product-initialQuantity" value={field.value} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} unit={unit} error={errors.initialQuantity?.message} />} /></Field>
                <div className="fixed-reason"><span>Motivo</span><strong>Estoque inicial</strong></div>
              </div>}
              {initialMode === 'entry' && <p className="initial-entry-note">O produto e a entrada inicial serão registrados juntos ao salvar.</p>}
            </fieldset>}
            <Field id="product-minimum" label="Estoque mínimo" hint={'Avisa quando o saldo chegar a esta quantidade. Com 0, o aviso aparece apenas quando o estoque estiver zerado. Unidade: ' + unit + '.'} error={errors.minimum?.message}><div className="unit-input"><input id="product-minimum" type="text" inputMode="decimal" {...register('minimum')} {...fieldAccessibility('product-minimum', errors.minimum?.message, true)} /><span aria-hidden="true">{unit}</span></div></Field>
          </div>
        </section>
        <section className="commercial-section" aria-labelledby="commercial-title">
          <div className="form-section-heading"><h2 id="commercial-title">3. Preços</h2><span>Preços por {unit}</span></div>
          <div className="money-grid">{(['cost', 'sale'] as const).map((field) => <Field key={field} id={'product-' + field} label={field === 'cost' ? 'Preço de custo' : 'Preço de venda'} error={errors[field]?.message}>
            <div className="money-input"><span aria-hidden="true">R$</span><input id={'product-' + field} type="text" inputMode="decimal" {...register(field)} placeholder="0,00" {...fieldAccessibility('product-' + field, errors[field]?.message)} /></div>
          </Field>)}</div>
          <p className="field-hint">Preços opcionais. Deixe em branco se ainda não souber.</p>
        </section>
      </div>
      <details className="product-extra-details" open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)}><summary>Detalhes opcionais <span>Descrição e situação</span></summary><Field id="product-description" label="Descrição" error={errors.description?.message}><textarea id="product-description" rows={2} maxLength={10000} {...register('description')} placeholder="Detalhes úteis para identificar ou manusear o produto" /></Field><label className="product-active-field"><input type="checkbox" {...register('active')} />Produto ativo no catálogo</label></details>
    </fieldset>
    {errors.root && <Alert tone="error" title="Não foi possível salvar o produto.">{errors.root.message} Seus dados continuam no formulário.</Alert>}
    <div className="form-actions">
      {confirmingLeave ? <ConfirmDialog title="Descartar o preenchimento?" description={busy ? 'Aguarde o produto ser salvo.' : 'As alterações não salvas serão perdidas.'} confirmLabel="Descartar e sair" cancel={stay} confirm={discard} busy={busy} /> : <>
        <button type="button" className="text-button cancel-button" onClick={cancel} disabled={busy}>Cancelar</button>
        <span className="session-note">Alterações gravadas ao salvar</span>
        <div className="form-action-buttons">{!editing && <StatefulButton type="button" className="secondary-button" state={lastAction.current === 'another' ? actionState : 'idle'} disabled={busy} loadingLabel={imageProgress || 'Salvando…'} successLabel="Produto salvo · Criar outro" errorLabel="Tentar salvar e criar outro" onClick={() => void submit('another')()}>Salvar e criar outro</StatefulButton>}<StatefulButton type="submit" state={lastAction.current === 'save' ? actionState : 'idle'} disabled={busy} loadingLabel={imageProgress || 'Salvando…'} errorLabel="Tentar salvar produto">{editing ? 'Salvar alterações' : 'Salvar produto'}</StatefulButton></div>
      </>}
    </div>
  </form>;
}
