import { useEffect, useRef, useState } from 'react';
import { useBlocker, useSearchParams } from 'react-router-dom';
import type { CategoryRecord } from '@stock/shared';
import { useCategories, useInventoryMutation } from './inventory-api';
import { apiClient } from './lib/api';
import { DataState } from './data-controls';
import { DetailDrawer } from './DetailDrawer';
import { Alert } from './feedback';
import { Field, fieldAccessibility } from './form-controls';

type Draft = { id: string | null; name: string; description: string; active: boolean };
const empty = (): Draft => ({ id: null, name: '', description: '', active: true });
export function CategoryManager({ onOpen }: { onOpen?: () => void }) {
  const query = useCategories();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false), [draft, setDraft] = useState<Draft>(empty);
  const baseline = useRef<Draft>(empty()), saving = useRef(false);
  const [next, setNext] = useState<{ draft: Draft } | { close: true } | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline.current);
  const requested = params.get('categories') === '1';
  useEffect(() => { if (requested) setOpen(true); }, [requested]);
  const mutation = useInventoryMutation((value: Draft) => apiClient('/categories' + (value.id ? '/' + value.id : ''), { method: value.id ? 'PATCH' : 'POST', body: JSON.stringify({ name: value.name, description: value.description || null, active: value.active }) }));
  const blocker = useBlocker(({ currentLocation, nextLocation }) => open && (dirty || saving.current) && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => { if (!open || !dirty) return; const prevent = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent); }, [open, dirty]);
  const load = (value: Draft) => { baseline.current = value; setDraft(value); mutation.reset(); setNext(null); };
  const close = () => { setOpen(false); setNext(null); if (requested) setParams(previous => { const value = new URLSearchParams(previous); value.delete('categories'); return value; }, { replace: true }); };
  const request = (value: typeof next) => { if (saving.current) return; if (dirty) setNext(value); else if (value && 'close' in value) close(); else if (value && 'draft' in value) load(value.draft); };
  const choose = (category: CategoryRecord) => request({ draft: { id: category.id, name: category.name, description: category.description ?? '', active: category.active } });
  const update = (value: Partial<Draft>) => { setDraft(current => ({ ...current, ...value })); mutation.reset(); };
  const confirming = next !== null || blocker.state === 'blocked';
  useEffect(() => { if (confirming) document.getElementById('category-keep-draft')?.focus(); else if (open) document.getElementById('category-name')?.focus(); }, [confirming, open]);
  const nameError = mutation.error?.message === 'Este nome já está em uso.' ? mutation.error.message : undefined;
  return <><button className="secondary-button" type="button" onClick={() => { onOpen?.(); setOpen(true); }}>Categorias</button>{open && <DetailDrawer busy={mutation.isPending} title="Categorias" close={() => request({ close: true })} guardClose={dirty}><DataState retainContentOnError={Boolean(query.data)} pending={query.isPending} error={query.error} retry={query.refetch}>
    {confirming && <Alert tone="warning" title="Descartar o preenchimento?">As alterações desta categoria ainda não foram salvas.<div className="inline-actions"><button id="category-keep-draft" type="button" className="secondary-button" disabled={mutation.isPending} onClick={() => { setNext(null); if (blocker.state === 'blocked') blocker.reset(); }}>Continuar preenchendo</button><button type="button" className="text-button" disabled={mutation.isPending} onClick={() => { if (blocker.state === 'blocked') { setOpen(false); blocker.proceed(); } else if (next && 'close' in next) { load(empty()); close(); } else if (next && 'draft' in next) load(next.draft); }}>Descartar alterações</button></div></Alert>}
    <div inert={confirming || undefined}><div className="category-list">{query.data?.map(category => <button disabled={mutation.isPending} className="secondary-button" type="button" key={category.id} onClick={() => choose(category)}>{category.name}{!category.active && ' · Inativa'}</button>)}</div>
    <h2>{draft.id ? 'Editar categoria' : 'Nova categoria'}</h2><form className="category-form" onSubmit={event => { event.preventDefault(); if (saving.current) return; saving.current = true; void mutation.mutateAsync(draft).then(() => { baseline.current = empty(); setDraft(empty()); }).catch(() => {}).finally(() => { saving.current = false; }); }}>
      <Field id="category-name" label="Nome" error={nameError}><input id="category-name" disabled={mutation.isPending} required maxLength={120} value={draft.name} {...fieldAccessibility('category-name', nameError)} onChange={event => update({ name: event.target.value })} /></Field><label>Descrição<textarea disabled={mutation.isPending} maxLength={500} value={draft.description} onChange={event => update({ description: event.target.value })} /></label><label><input disabled={mutation.isPending} type="checkbox" checked={draft.active} onChange={event => update({ active: event.target.checked })} />Categoria ativa</label>
      {mutation.error && !nameError && <Alert tone="error" title="Não foi possível salvar a categoria.">{mutation.error.message}</Alert>}{mutation.isSuccess && <Alert tone="success" title="Categoria salva." />}<button className="primary-button" disabled={mutation.isPending} aria-busy={mutation.isPending}>{mutation.isPending ? 'Salvando…' : 'Salvar categoria'}</button>{draft.id && <button disabled={mutation.isPending} className="text-button" type="button" onClick={() => request({ draft: empty() })}>Nova categoria</button>}
    </form></div>
  </DataState></DetailDrawer>}</>;
}
