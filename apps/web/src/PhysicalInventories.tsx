import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardCheck, Plus } from 'lucide-react';
import type { PhysicalInventoryRecord } from '@stock/shared';
import { useCategories } from './inventory-api';
import { apiClient } from './lib/api';
import { DataState, Pagination } from './data-controls';
import { Field, fieldAccessibility } from './form-controls';
import { Alert, useFeedback } from './feedback';
import { dateLabel } from './inventory-model';
import { useAcceptPhysicalInventory, usePhysicalInventories } from './physical-inventory-api';
import { physicalStatusLabels } from './physical-inventory-model';

export function PhysicalInventoriesPage() {
  const [page, setPage] = useState(1), [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false), [title, setTitle] = useState(''), [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState(''), [titleError, setTitleError] = useState(''), [busy, setBusy] = useState(false);
  const running = useRef(false), titleInput = useRef<HTMLInputElement>(null);
  const query = usePhysicalInventories(page, status), categories = useCategories();
  const accept = useAcceptPhysicalInventory(), navigate = useNavigate(), { notify } = useFeedback();
  const start = async () => {
    if (running.current) return;
    setTitleError(''); setError('');
    if (!title.trim()) { setTitleError('Dê um nome à contagem.'); titleInput.current?.focus(); return; }
    running.current = true; setBusy(true);
    try {
      const result = await apiClient<PhysicalInventoryRecord>('/physical-inventories', { method: 'POST', body: JSON.stringify({ title: title.trim(), ...(categoryId ? { categoryId } : {}) }) });
      accept(result); notify({ tone: 'success', title: 'Inventário iniciado.', description: `${result.totalItems} produtos preparados para contagem.` }); navigate('/physical-inventories/' + result.id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível iniciar a contagem.');
    } finally { running.current = false; setBusy(false); }
  };
  return <div className="page-stack physical-page">
    <div className="catalog-actions"><button type="button" className="primary-button" onClick={() => setCreating(true)} disabled={creating}><Plus size={17} aria-hidden="true" /> Novo inventário</button></div>
    {creating && <section className="list-section physical-create" aria-labelledby="physical-create-title"><h2 id="physical-create-title">Iniciar contagem física</h2><p>O saldo atual será registrado como referência. Cada inventário inclui até 500 produtos ativos.</p>
      {error && <Alert tone="error" title="Inventário não iniciado.">{error}</Alert>}
      <form onSubmit={event => { event.preventDefault(); void start(); }} noValidate><fieldset disabled={busy}><div className="physical-create-fields"><Field id="physical-title" label="Nome do inventário" required error={titleError}><input id="physical-title" ref={titleInput} value={title} autoFocus maxLength={160} placeholder="Ex.: Conferência de outubro" onChange={event => setTitle(event.target.value)} {...fieldAccessibility('physical-title', titleError)} /></Field><Field id="physical-category" label="Produtos a contar"><select id="physical-category" value={categoryId} disabled={categories.isPending || Boolean(categories.error)} onChange={event => setCategoryId(event.target.value)}><option value="">Todos os produtos ativos</option>{categories.data?.filter(category => category.active).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field></div>
        {categories.error && <Alert tone="error" title="Categorias indisponíveis." action={{ label: 'Tentar novamente', run: () => { void categories.refetch(); } }}>Você ainda pode iniciar com todos os produtos ativos.</Alert>}
        <div className="inline-actions"><button className="primary-button" type="submit" aria-busy={busy}>{busy ? 'Preparando…' : 'Iniciar inventário'}</button><button className="text-button" type="button" onClick={() => setCreating(false)}>Cancelar</button></div></fieldset></form>
    </section>}
    <section className="list-section" aria-labelledby="physical-list-title"><div className="list-heading"><h2 id="physical-list-title" className="sr-only">Inventários</h2><label className="select-control"><span className="sr-only">Situação do inventário</span><select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Todas as situações</option>{Object.entries(physicalStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
      <DataState pending={query.isPending} error={query.error} retry={query.refetch}>{query.data?.items.length ? <><div className="table-frame"><table className="data-table physical-list-table"><thead><tr><th>Inventário</th><th>Situação</th><th>Contados</th><th>Divergências</th><th>Responsável / início</th><th><span className="sr-only">Abrir</span></th></tr></thead><tbody>{query.data.items.map(item => <tr key={item.id}><td data-label="Inventário"><Link className="physical-title-link" to={'/physical-inventories/' + item.id}><strong>{item.title}</strong></Link><small className="physical-cell-meta">{item.categoryName ?? 'Todos os produtos ativos'}</small></td><td data-label="Situação"><span className={'physical-status physical-status-' + item.status.toLowerCase()}>{physicalStatusLabels[item.status]}</span></td><td data-label="Contados">{item.countedItems} / {item.totalItems}</td><td data-label="Divergências">{item.divergentItems}</td><td data-label="Responsável / início"><span>{item.createdBy.name}</span><small className="physical-cell-meta">{dateLabel(item.createdAt)}</small></td><td><Link className="text-button" to={'/physical-inventories/' + item.id}>Abrir<span className="sr-only"> {item.title}</span></Link></td></tr>)}</tbody></table></div><Pagination data={query.data} change={setPage} /></> : <div className="empty-state"><ClipboardCheck size={25} aria-hidden="true" /><strong>Nenhum inventário encontrado.</strong><p>{status ? 'Altere a situação para consultar outras contagens.' : 'Inicie uma contagem para comparar o estoque real com o sistema.'}</p></div>}</DataState>
    </section>
    <details className="physical-help"><summary>Como fazer um inventário</summary><ol><li>Escolha os produtos e organize a contagem. Evite movimentá-los durante a conferência.</li><li>Informe a quantidade real de cada produto. Use 0 quando não houver nenhuma unidade; vazio significa pendente.</li><li>Salve a contagem e confira as divergências. Se um produto mudar no sistema, atualize os saldos e conte-o novamente.</li><li>Um administrador ou gerente confirma o inventário. As diferenças geram ajustes registrados no histórico.</li></ol></details>
  </div>;
}
