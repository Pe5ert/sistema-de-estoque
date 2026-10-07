import { useState } from 'react';
import { useCategories, useInventoryMutation } from './inventory-api';
import { apiClient } from './lib/api';
import { DataState } from './data-controls';
import { DetailDrawer } from './DetailDrawer';
import { Alert } from './feedback';
import { Field, fieldAccessibility } from './form-controls';

export function CategoryManager({ onOpen }: { onOpen?: () => void }) {
  const query = useCategories();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const mutation = useInventoryMutation(() => apiClient('/categories' + (id ? '/' + id : ''), { method: id ? 'PATCH' : 'POST', body: JSON.stringify({ name, description: description || null, active }) }));
  const nameError = mutation.error?.message === 'Este nome já está em uso.' ? mutation.error.message : undefined;
  return <><button className="secondary-button" type="button" onClick={() => { onOpen?.(); setOpen(true); }}>Categorias</button>{open && <DetailDrawer title="Categorias" close={() => setOpen(false)}><DataState pending={query.isPending} error={query.error} retry={query.refetch}>
    <div className="category-list">{query.data?.map(category => <button className="secondary-button" type="button" key={category.id} onClick={() => { setId(category.id); setName(category.name); setDescription(category.description ?? ''); setActive(category.active); mutation.reset(); }}>{category.name}{!category.active && ' · Inativa'}</button>)}</div>
    <h2>{id ? 'Editar categoria' : 'Nova categoria'}</h2><form className="category-form" onSubmit={event => { event.preventDefault(); void mutation.mutateAsync().then(() => { setId(null); setName(''); setDescription(''); setActive(true); }).catch(() => {}); }}>
      <Field id="category-name" label="Nome" error={nameError}><input id="category-name" disabled={mutation.isPending} required maxLength={120} value={name} {...fieldAccessibility('category-name', nameError)} onChange={event => { setName(event.target.value); mutation.reset(); }} /></Field><label>Descrição<textarea disabled={mutation.isPending} maxLength={500} value={description} onChange={event => { setDescription(event.target.value); mutation.reset(); }} /></label><label><input disabled={mutation.isPending} type="checkbox" checked={active} onChange={event => { setActive(event.target.checked); mutation.reset(); }} />Categoria ativa</label>
      {mutation.error && !nameError && <Alert tone="error" title="Não foi possível salvar a categoria.">{mutation.error.message}</Alert>}{mutation.isSuccess && <Alert tone="success" title="Categoria salva." />}<button className="primary-button" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando…' : 'Salvar categoria'}</button>{id && <button className="text-button" type="button" onClick={() => { setId(null); setName(''); setDescription(''); setActive(true); mutation.reset(); }}>Nova categoria</button>}
    </form>
  </DataState></DetailDrawer>}</>;
}
