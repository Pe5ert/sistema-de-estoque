import { useState } from 'react';
import { useCategories, useInventoryMutation } from './inventory-api';
import { apiClient } from './lib/api';
import { DataState } from './data-controls';
import { DetailDrawer } from './DetailDrawer';

export function CategoryManager({ onOpen }: { onOpen?: () => void }) {
  const query = useCategories();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const mutation = useInventoryMutation(() => apiClient('/categories' + (id ? '/' + id : ''), { method: id ? 'PATCH' : 'POST', body: JSON.stringify({ name, description: description || null, active }) }));
  return <><button className="secondary-button" type="button" onClick={() => { onOpen?.(); setOpen(true); }}>Categorias</button>{open && <DetailDrawer modal title="Categorias" close={() => setOpen(false)}><DataState pending={query.isPending} error={query.error} retry={query.refetch}>
    <div className="category-list">{query.data?.map(category => <button className="secondary-button" type="button" key={category.id} onClick={() => { setId(category.id); setName(category.name); setDescription(category.description ?? ''); setActive(category.active); mutation.reset(); }}>{category.name}{!category.active && ' · Inativa'}</button>)}</div>
    <h2>{id ? 'Editar categoria' : 'Nova categoria'}</h2><form className="category-form" onSubmit={event => { event.preventDefault(); void mutation.mutateAsync().then(() => { setId(null); setName(''); setDescription(''); setActive(true); }).catch(() => {}); }}>
      <label>Nome<input disabled={mutation.isPending} required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label><label>Descrição<textarea disabled={mutation.isPending} maxLength={500} value={description} onChange={event => setDescription(event.target.value)} /></label><label><input disabled={mutation.isPending} type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />Categoria ativa</label>
      {mutation.error && <p className="field-error" role="alert">{mutation.error.message}</p>}{mutation.isSuccess && <p role="status">Categoria salva.</p>}<button className="primary-button" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando…' : 'Salvar categoria'}</button>{id && <button className="text-button" type="button" onClick={() => { setId(null); setName(''); setDescription(''); setActive(true); mutation.reset(); }}>Nova categoria</button>}
    </form>
  </DataState></DetailDrawer>}</>;
}
