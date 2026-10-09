import { useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { canCompletePhysicalInventory, type PhysicalInventoryRecord, type PhysicalInventoryItemRecord } from '@stock/shared';
import { useAuth } from './auth/auth';
import { apiClient, ApiError } from './lib/api';
import { DataState, Pagination } from './data-controls';
import { Alert, ConfirmDialog, FieldError, useFeedback } from './feedback';
import { dateLabel, unitCodes } from './inventory-model';
import { useAcceptPhysicalInventory, usePhysicalInventory } from './physical-inventory-api';
import { normalizePhysicalQuantity, physicalCountBatches, physicalDifference, physicalQuantityLabel, physicalStatusLabels } from './physical-inventory-model';

type Draft = { quantity: string; notes: string };
type Confirmation = 'complete' | 'cancel' | 'refresh' | 'revision' | 'discard' | null;

export function PhysicalInventoryDetailPage() {
  const { id = '' } = useParams();
  const query = usePhysicalInventory(id);
  return <DataState pending={query.isPending} error={query.error} retry={query.refetch} retainContentOnError>{query.data && <PhysicalInventoryEditor key={id} inventory={query.data} reload={async () => (await query.refetch({ throwOnError: true })).data} />}</DataState>;
}

function PhysicalInventoryEditor({ inventory, reload }: { inventory: PhysicalInventoryRecord; reload: () => Promise<PhysicalInventoryRecord | undefined> }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [progress, setProgress] = useState('');
  const [query, setQuery] = useState(''), [filter, setFilter] = useState(''), [page, setPage] = useState(1);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [refreshing, setRefreshing] = useState(false);
  const running = useRef(false), baseRevision = useRef<number | null>(null), allowNavigation = useRef(false);
  const accept = useAcceptPhysicalInventory(), { notify } = useFeedback(), { currentUser } = useAuth();
  const active = inventory.status === 'DRAFT', allowed = canCompletePhysicalInventory(currentUser?.role);
  const dirty = Object.keys(drafts).length > 0;
  const revisionChanged = dirty && baseRevision.current !== inventory.revision;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !allowNavigation.current && (dirty || running.current) && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty && !busy) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty, busy]);

  const countOf = (item: PhysicalInventoryItemRecord) => active && item.productId in drafts ? normalizePhysicalQuantity(drafts[item.productId].quantity) : item.countedQuantity;
  const differenceOf = (item: PhysicalInventoryItemRecord) => {
    const count = countOf(item);
    return count == null ? null : physicalDifference(count, item.snapshotStock);
  };
  const pending = inventory.items.filter(item => countOf(item) == null).length;
  const divergent = inventory.items.filter(item => { const delta = differenceOf(item); return delta !== null && delta !== '0'; }).length;
  const readyToComplete = !dirty && pending === 0 && inventory.conflictedItems === 0;
  const nextStep = revisionChanged ? 'Escolha no aviso acima se quer manter seu preenchimento ou usar os valores salvos.'
    : dirty ? 'Clique em Salvar contagem para guardar o preenchimento. O estoque ainda não será alterado.'
    : inventory.conflictedItems > 0 ? 'Atualize os saldos e conte novamente os produtos sinalizados.'
    : pending ? `${pending} ${pending === 1 ? 'produto ainda precisa ser contado.' : 'produtos ainda precisam ser contados.'}`
    : !allowed ? 'Contagem completa. Um administrador ou gerente precisa concluir o inventário.'
    : inventory.divergentItems > 0 ? 'Contagem completa. Concluir inventário aplica as diferenças ao estoque e registra os ajustes no histórico.'
    : 'Todos os produtos conferem com o estoque. Clique em Concluir inventário para encerrar a contagem.';
  // Membership changes only after saving, so typing in a filtered row never removes its focused input.
  const visible = inventory.items.filter(item => `${item.name} ${item.sku}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')) && (!filter || filter === 'pending' && item.countedQuantity === null || filter === 'divergent' && item.countedQuantity !== null && physicalDifference(item.countedQuantity, item.snapshotStock) !== '0' || filter === 'conflict' && item.conflict));
  const shownPage = Math.min(page, Math.max(1, Math.ceil(visible.length / 25)));
  const rows = visible.slice((shownPage - 1) * 25, shownPage * 25);
  const edit = (item: PhysicalInventoryItemRecord, field: keyof Draft, value: string) => {
    if (running.current) return;
    if (baseRevision.current === null) baseRevision.current = inventory.revision;
    setDrafts(current => {
      const next = { ...current };
      const original = current[item.productId] ?? { quantity: item.countedQuantity?.replace('.', ',') ?? '', notes: item.notes ?? '' };
      const draft = { ...original, [field]: value };
      if (normalizePhysicalQuantity(draft.quantity) === normalizePhysicalQuantity(item.countedQuantity ?? '') && draft.notes.trim() === (item.notes ?? '')) delete next[item.productId];
      else next[item.productId] = draft;
      if (Object.keys(next).length === 0) baseRevision.current = null;
      return next;
    });
    setErrors(current => { const next = { ...current }; delete next[item.productId]; return next; });
  };
  const run = async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try { await action(); }
    catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível concluir. Tente novamente.');
      if (failure instanceof ApiError && failure.status === 409) await reload().catch(() => undefined);
    } finally { running.current = false; setBusy(false); setProgress(''); }
  };
  const refreshData = async () => {
    if (running.current) return;
    setRefreshing(true);
    try {
      await run(async () => {
        const result = await reload();
        if (!result) throw new Error('Não foi possível atualizar os dados. Tente novamente.');
        const unchanged = JSON.stringify(result) === JSON.stringify(inventory);
        notify({ tone: 'info', title: 'Dados atualizados.', description: (unchanged ? 'Nenhuma alteração encontrada.' : 'As informações mais recentes foram carregadas.') + (dirty ? ' Seu preenchimento não salvo foi preservado.' : ''), key: 'physical-reload' });
      });
    } finally { setRefreshing(false); }
  };
  const save = async () => {
    if (!active || !dirty || revisionChanged || running.current) return;
    const invalid: Record<string, string> = {};
    for (const [id, draft] of Object.entries(drafts)) if (normalizePhysicalQuantity(draft.quantity) === undefined) invalid[id] = 'Informe zero ou uma quantidade positiva, com até 3 casas decimais e 15 dígitos inteiros.';
    setErrors(invalid);
    const first = Object.keys(invalid)[0];
    if (first) {
      const itemIndex = visible.findIndex(item => item.productId === first);
      if (itemIndex >= 0) setPage(Math.floor(itemIndex / 25) + 1);
      else { setQuery(''); setFilter(''); setPage(Math.floor(inventory.items.findIndex(item => item.productId === first) / 25) + 1); }
      requestAnimationFrame(() => document.getElementById('count-' + first)?.focus());
      return;
    }
    const edits = Object.entries(drafts).map(([productId, draft]) => ({ productId, countedQuantity: normalizePhysicalQuantity(draft.quantity) ?? null, notes: draft.notes.trim() || null }));
    await run(async () => {
      let revision = baseRevision.current ?? inventory.revision;
      let saved = 0;
      for (const batch of physicalCountBatches(edits)) {
        setProgress(`Salvando ${saved + batch.length} de ${edits.length} produtos…`);
        const result = await apiClient<PhysicalInventoryRecord>('/physical-inventories/' + inventory.id + '/counts', { method: 'PATCH', body: JSON.stringify({ revision, items: batch }) });
        saved += batch.length;
        revision = result.revision; baseRevision.current = revision; accept(result);
        setDrafts(current => { const next = { ...current }; batch.forEach(item => delete next[item.productId]); return next; });
      }
      baseRevision.current = null;
      notify({ tone: 'success', title: 'Contagem salva.', description: 'Os saldos ainda não foram alterados. Conclua o inventário após contar todos os produtos.', key: 'physical-save' });
    });
  };
  const action = (kind: 'complete' | 'refresh' | 'cancel') => {
    setConfirmation(null);
    void run(async () => {
      const result = await apiClient<PhysicalInventoryRecord>('/physical-inventories/' + inventory.id + '/' + kind, { method: 'POST', body: JSON.stringify({ revision: inventory.revision }) });
      accept(result);
      notify({ tone: kind === 'cancel' ? 'info' : 'success', title: kind === 'complete' ? 'Inventário concluído.' : kind === 'refresh' ? 'Saldos atualizados. Reconte os produtos sinalizados.' : 'Inventário cancelado.', description: kind === 'complete' ? `${result.adjustmentCount} ajustes registrados no histórico.` : undefined, key: 'physical-result' });
    });
  };
  const discard = () => {
    setDrafts({}); baseRevision.current = null; setConfirmation(null); setErrors({});
    if (blocker.state === 'blocked') { allowNavigation.current = true; blocker.proceed(); }
  };
  const stay = () => { setConfirmation(null); if (blocker.state === 'blocked') blocker.reset(); };
  const leaveDialog = blocker.state === 'blocked' || confirmation === 'discard';

  return <div className="page-stack physical-page" aria-busy={busy}>
    <div className="catalog-actions"><Link className="text-button" to="/physical-inventories">Voltar aos inventários</Link><button type="button" className="text-button" disabled={busy} aria-busy={refreshing} onClick={() => { void refreshData(); }}>{refreshing ? 'Atualizando…' : 'Atualizar dados'}</button></div>
    <section className="list-section physical-overview" aria-labelledby="physical-session-title"><div className="list-heading"><h2 id="physical-session-title">{inventory.title}</h2><span className={'physical-status physical-status-' + inventory.status.toLowerCase()}>{physicalStatusLabels[inventory.status]}</span></div><p className="detail-meta">{inventory.categoryName ?? 'Todos os produtos ativos'} · Iniciado por {inventory.createdBy.name} em {dateLabel(inventory.createdAt)}</p>
      <div className="physical-summary" role="status"><span><strong>{inventory.totalItems}</strong> produtos</span><span><strong>{inventory.totalItems - pending}</strong> contados</span><span><strong>{pending}</strong> pendentes</span><span><strong>{divergent}</strong> com divergência</span></div>
      {active && <p className="physical-instruction">Preencha a contagem real de cada produto e clique em <strong>Salvar contagem</strong>. Depois, <strong>Concluir inventário</strong> confirma as quantidades e aplica as diferenças ao estoque. <strong>0 significa sem estoque; vazio significa não contado.</strong></p>}
      {!active && <p>{inventory.status === 'COMPLETED' ? `Concluído por ${inventory.completedBy?.name ?? 'responsável'} em ${dateLabel(inventory.completedAt!)}. ${inventory.adjustmentCount} ajustes registrados.` : `Cancelado por ${inventory.cancelledBy?.name ?? 'responsável'} em ${dateLabel(inventory.cancelledAt!)}. Os saldos não foram alterados.`}{inventory.cancellationNotes && ` Motivo: ${inventory.cancellationNotes}`}</p>}
      {inventory.status === 'COMPLETED' && <Link className="secondary-button" to="/history">Consultar histórico de ajustes</Link>}
    </section>
    {error && <Alert tone="error" title="Não foi possível concluir a ação.">{error}{dirty && ' O preenchimento não salvo continua nesta página.'}</Alert>}
    {revisionChanged && <Alert tone="warning" title="Outra pessoa atualizou este inventário.">Escolha se quer manter o que você digitou ou usar os valores já salvos. Manter seu preenchimento permite continuar editando; você ainda precisará salvar a contagem.<div className="inline-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => setConfirmation('revision')}>Manter meu preenchimento</button><button type="button" className="text-button" disabled={busy} onClick={() => setConfirmation('discard')}>Usar valores salvos</button></div></Alert>}
    {active && inventory.conflictedItems > 0 && <Alert tone="warning" title={`${inventory.conflictedItems} ${inventory.conflictedItems === 1 ? 'produto mudou' : 'produtos mudaram'} durante a contagem.`}>Confira os produtos sinalizados. Atualizar os saldos limpa apenas as contagens desses produtos, que precisam ser contados novamente. Produtos inativos precisam ser reativados ou o inventário cancelado.<button type="button" className="secondary-button" disabled={busy || dirty} onClick={() => setConfirmation('refresh')}>Atualizar saldos e recontar</button>{dirty && <p>Salve ou descarte o preenchimento antes de atualizar os saldos.</p>}</Alert>}
    {dirty && !active && <Alert tone="warning" title="Este inventário foi encerrado por outra pessoa.">A tabela mostra o resultado registrado. Seu preenchimento abaixo não poderá ser salvo.<ul>{Object.entries(drafts).map(([id, draft]) => <li key={id}>{inventory.items.find(item => item.productId === id)?.name}: contagem não salva “{draft.quantity || 'Pendente'}”{draft.notes && ` · ${draft.notes}`}</li>)}</ul><button type="button" className="text-button" onClick={() => setConfirmation('discard')}>Descartar meu preenchimento</button></Alert>}
    <section className="list-section" aria-labelledby="physical-count-title"><div className="list-heading"><h2 id="physical-count-title">{active ? 'Contagem dos produtos' : 'Resultado da contagem'}</h2><span className="detail-meta">{visible.length} produtos na consulta</span></div>
      <div className="filter-bar physical-filters"><label className="physical-search"><span className="sr-only">Buscar produto ou SKU</span><input type="search" placeholder="Buscar produto ou SKU" value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label><label className="select-control"><span className="sr-only">Filtrar contagem</span><select value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="">Todos os produtos</option><option value="pending">Pendentes</option><option value="divergent">Com divergência</option>{active && <option value="conflict">Precisam de reconferência</option>}</select></label></div>
      {(filter === 'pending' || filter === 'divergent') && active && <p className="physical-filter-hint">Este filtro usa as contagens salvas e será atualizado ao salvar. A divergência na linha acompanha seu preenchimento.</p>}
      {rows.length ? <div className="table-frame"><table className="data-table physical-count-table"><thead><tr><th>Produto / SKU</th><th>Saldo de referência</th><th>Contagem real</th><th>Divergência</th><th>Observação</th></tr></thead><tbody>{rows.map(item => {
        const draft = drafts[item.productId], delta = differenceOf(item), invalid = errors[item.productId];
        return <tr key={item.productId} className={item.conflict ? 'physical-conflict-row' : undefined}><td data-label="Produto / SKU"><strong>{item.name}</strong><small className="physical-cell-meta">{item.sku} · {unitCodes[item.unit]}</small>{item.conflict && <span className="physical-recount">Reconferência necessária</span>}</td><td data-label="Saldo de referência"><span>{physicalQuantityLabel(item.snapshotStock)} {unitCodes[item.unit]}</span>{item.conflict && <small className="physical-cell-meta">Atual: {physicalQuantityLabel(item.currentStock)} {unitCodes[item.currentUnit]}{!item.currentActive && ' · Inativo'}</small>}</td><td data-label="Contagem real">{active ? <div className="physical-count-control"><label className="sr-only" htmlFor={'count-' + item.productId}>Contagem de {item.name} ({unitCodes[item.unit]})</label><input id={'count-' + item.productId} type="text" inputMode="decimal" autoComplete="off" maxLength={19} placeholder="Pendente" value={draft?.quantity ?? item.countedQuantity?.replace('.', ',') ?? ''} disabled={busy} aria-invalid={Boolean(invalid)} aria-describedby={invalid ? 'count-error-' + item.productId : undefined} onChange={event => edit(item, 'quantity', event.target.value)} />{invalid && <FieldError id={'count-error-' + item.productId}>{invalid}</FieldError>}{draft && revisionChanged && <small className="physical-cell-meta">Salvo por outro usuário: {item.countedQuantity === null ? 'Pendente' : physicalQuantityLabel(item.countedQuantity)}</small>}</div> : <span>{item.countedQuantity === null ? 'Não contado' : physicalQuantityLabel(item.countedQuantity) + ' ' + unitCodes[item.unit]}</span>}</td><td data-label="Divergência"><span className={delta === null ? 'detail-meta' : delta.startsWith('-') ? 'physical-difference-out' : delta === '0' ? 'physical-difference-equal' : 'physical-difference-in'}>{delta === null ? 'Pendente' : delta === '0' ? 'Sem diferença' : physicalQuantityLabel(delta, true) + ' ' + unitCodes[item.unit]}</span></td><td data-label="Observação">{active ? <><label className="sr-only" htmlFor={'count-notes-' + item.productId}>Observação de {item.name}</label><input id={'count-notes-' + item.productId} type="text" maxLength={1000} value={draft?.notes ?? item.notes ?? ''} disabled={busy} placeholder="Opcional" onChange={event => edit(item, 'notes', event.target.value)} />{draft && revisionChanged && <small className="physical-cell-meta">Observação salva: {item.notes || 'Sem observação'}</small>}</> : <span>{item.notes || '—'}</span>}</td></tr>;
      })}</tbody></table></div> : <div className="empty-state"><strong>Nenhum produto neste filtro.</strong><button type="button" className="text-button" onClick={() => { setFilter(''); setQuery(''); setPage(1); }}>Limpar filtros</button></div>}
      <Pagination data={{ page: shownPage, limit: 25, total: visible.length }} change={setPage} />
    </section>
    {active && <div className="physical-actions"><div><strong>{dirty ? `${Object.keys(drafts).length} ${Object.keys(drafts).length === 1 ? 'produto com alterações não salvas' : 'produtos com alterações não salvas'}` : inventory.countedItems === 0 ? 'Nenhum produto contado' : 'Contagem salva'}</strong><p id="physical-next-step">{busy ? progress || 'Aguarde a operação terminar…' : nextStep}</p></div><div className="inline-actions"><button type="button" className={readyToComplete && allowed ? 'secondary-button' : 'primary-button'} disabled={busy || !dirty || revisionChanged} onClick={() => { void save(); }}>{busy && progress ? 'Salvando…' : 'Salvar contagem'}</button>{dirty && <button className="text-button" type="button" disabled={busy} onClick={() => setConfirmation('discard')}>Descartar preenchimento</button>}{allowed && <><button type="button" className={readyToComplete ? 'primary-button' : 'secondary-button'} disabled={busy || !readyToComplete} aria-describedby="physical-next-step" onClick={() => setConfirmation('complete')}>Concluir inventário</button><button type="button" className="text-button" disabled={busy || dirty} onClick={() => setConfirmation('cancel')}>Cancelar inventário</button></>}</div>{!allowed && <p className="detail-meta">Um administrador ou gerente precisa confirmar os ajustes após a contagem.</p>}</div>}
    {leaveDialog && <ConfirmDialog title="Descartar o preenchimento?" description={busy ? 'Aguarde a operação terminar antes de sair.' : 'As alterações ainda não salvas serão perdidas. As contagens já salvas serão preservadas.'} confirmLabel="Descartar preenchimento" cancel={stay} confirm={discard} busy={busy} />}
    {confirmation === 'complete' && <ConfirmDialog title="Concluir este inventário?" description={inventory.divergentItems > 0 ? `Todos os ${inventory.totalItems} produtos foram contados. ${inventory.divergentItems} produtos têm diferenças. Ao confirmar, o estoque será ajustado para as quantidades contadas e cada alteração ficará registrada no histórico com seu nome. Após a conclusão, a contagem não poderá ser editada.` : `Todos os ${inventory.totalItems} produtos foram contados e conferem com o estoque. A confirmação encerra o inventário sem gerar ajustes. Após a conclusão, a contagem não poderá ser editada.`} confirmLabel={inventory.divergentItems > 0 ? 'Aplicar ajustes e concluir' : 'Concluir sem ajustes'} cancelLabel="Voltar à contagem" cancel={() => setConfirmation(null)} confirm={() => action('complete')} busy={busy} />}
    {confirmation === 'cancel' && <ConfirmDialog title="Cancelar este inventário?" description="A contagem ficará arquivada como cancelada. Nenhum saldo será alterado e não será possível continuar esta contagem." confirmLabel="Cancelar inventário" cancelLabel="Continuar contagem" cancel={() => setConfirmation(null)} confirm={() => action('cancel')} busy={busy} />}
    {confirmation === 'refresh' && <ConfirmDialog title="Atualizar saldos e recontar?" description={`${inventory.conflictedItems} ${inventory.conflictedItems === 1 ? 'produto mudou' : 'produtos mudaram'}. Apenas as contagens desses produtos serão apagadas para uma nova conferência. As demais contagens e as observações serão preservadas.`} confirmLabel="Atualizar saldos" cancelLabel="Voltar à contagem" cancel={() => setConfirmation(null)} confirm={() => action('refresh')} busy={busy} />}
    {confirmation === 'revision' && <ConfirmDialog title="Manter seu preenchimento?" description="Os campos que você editou serão mantidos sobre a versão mais recente. Ao salvar, eles substituirão os valores registrados por outra pessoa. Compare a indicação “Salvo por outro usuário” nas linhas antes de continuar." confirmLabel="Manter meu preenchimento" cancelLabel="Voltar e comparar" cancel={() => setConfirmation(null)} confirm={() => { baseRevision.current = inventory.revision; setConfirmation(null); setError(''); }} />}
  </div>;
}
