import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useBlocker, useSearchParams } from 'react-router-dom';
import { canImportProducts, type ImportPreview } from '@stock/shared';
import { apiClient, apiUrl } from './lib/api';
import { useAuth } from './auth/auth';
import { useInventoryMutation } from './inventory-api';
import { Field } from './form-controls';
import { DataState } from './data-controls';
import { unitCodes } from './inventory-model';
import { useFeedback, Alert, ConfirmDialog } from './feedback';
import { createImportErrorCsv, importIssueFieldLabel } from './import-report';
import { physicalQuantityLabel } from './physical-inventory-model';

const statusLabels = { PREVIEW: 'Aguardando importação', PROCESSING: 'Importando', COMPLETED: 'Concluída', FAILED: 'Não importada' };
const steps = ['Enviar planilha', 'Conferir dados', 'Importar produtos', 'Resultado'];
const errorsPerPage = 20;
type RecentImport = { id: string; fileName: string; status: ImportPreview['status']; totalRows: number; importedRows: number };
function downloadReport(job: ImportPreview) {
  const blob = new Blob([createImportErrorCsv(job.issues)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'erros-importacao.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ProductImportPage() {
  const { notify } = useFeedback();
  const { currentUser } = useAuth();
  const allowed = canImportProducts(currentUser?.role);
  const [params, setParams] = useSearchParams(), id = params.get('job');
  const client = useQueryClient();
  const recent = useQuery({ queryKey: ['imports'], queryFn: () => apiClient<RecentImport[]>('/imports'), enabled: allowed });
  const jobQuery = useQuery({ queryKey: ['import', id], queryFn: () => apiClient<ImportPreview>('/imports/' + id), enabled: allowed && Boolean(id), refetchOnWindowFocus: false });
  const job = jobQuery.data;
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false), [confirmation, setConfirmation] = useState(false);
  const [replacementOpen, setReplacementOpen] = useState(false), [errorPage, setErrorPage] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const running = useRef(false), allowNavigation = useRef(false);
  const reviewTitle = useRef<HTMLHeadingElement>(null), errorTitle = useRef<HTMLDivElement>(null);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !allowNavigation.current && (Boolean(file) || running.current) && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  useEffect(() => {
    if (!file && !busy) return;
    const prevent = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [file, busy]);
  useEffect(() => {
    allowNavigation.current = false;
    setConfirmation(false); setReplacementOpen(false); setErrorPage(0); setError('');
  }, [id]);
  const upload = useMutation({ mutationFn: (body: FormData) => apiClient<ImportPreview>('/imports', { method: 'POST', body }) });
  const confirm = useInventoryMutation((revision: number) => apiClient<ImportPreview>('/imports/' + id + '/confirm', { method: 'POST', body: JSON.stringify({ revision }) }));
  const accept = (updated: ImportPreview) => {
    client.setQueryData(['import', updated.id], updated);
    if (id !== updated.id) { allowNavigation.current = true; setParams({ job: updated.id }); }
    void recent.refetch();
    if (updated.status === 'COMPLETED' && updated.result) notify({ tone: 'success', title: `Importação concluída: ${updated.result.products} ${updated.result.products === 1 ? 'produto adicionado' : 'produtos adicionados'}.`, key: 'import-result' });
    else if (updated.status === 'PROCESSING') notify({ tone: 'info', title: 'Importação em andamento.', description: 'Aguarde o resultado antes de tentar novamente.', key: 'import-result' });
    setReplacementOpen(false); setErrorPage(0);
    requestAnimationFrame(() => reviewTitle.current?.focus());
  };
  const run = async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível concluir. Tente novamente.'); requestAnimationFrame(() => errorTitle.current?.focus()); if (id) void jobQuery.refetch(); }
    finally { running.current = false; setBusy(false); }
  };
  const uploadFile = async () => {
    await run(async () => {
      if (!file) throw new Error('Selecione um arquivo CSV ou XLSX.');
      if (!/\.(csv|xlsx)$/i.test(file.name)) throw new Error('Use um arquivo CSV ou XLSX. No Excel, escolha Salvar como → Pasta de Trabalho do Excel (.xlsx).');
      if (file.size === 0) throw new Error('O arquivo está vazio. Preencha a planilha e envie novamente.');
      if (file.size > 5 * 1024 * 1024) throw new Error('O arquivo excede 5 MB. Divida os produtos em planilhas menores.');
      const body = new FormData(); body.append('file', file);
      const updated = await upload.mutateAsync(body);
      setFile(null); if (fileInput.current) fileInput.current.value = '';
      accept(updated);
    });
  };
  const refresh = async () => {
    if (running.current) return;
    setRefreshing(true);
    try {
      await run(async () => {
        const result = await jobQuery.refetch({ throwOnError: true });
        setErrorPage(0);
        notify({ tone: 'info', title: 'Arquivo conferido novamente.', description: JSON.stringify(result.data) === JSON.stringify(job) ? 'Nenhuma alteração encontrada. Para corrigir os dados, edite o arquivo no computador e reenvie.' : 'A conferência foi atualizada com os dados atuais do catálogo.', key: 'import-refresh' });
      });
    } finally { setRefreshing(false); }
  };
  // Older jobs may contain manual category substitutions. Require a new upload
  // so the file remains the source of truth and no hidden choices are confirmed.
  const savedCategoryChoices = Boolean(job?.categoryMappings.length);
  const ready = Boolean(job && job.status === 'PREVIEW' && job.totalRows > 0 && job.issues.length === 0 && !savedCategoryChoices);
  const activeStep = !job ? 0 : job.status === 'COMPLETED' ? 3 : ready || job.status === 'PROCESSING' ? 2 : 1;
  const issues = [...(job?.issues ?? [])].sort((first, second) => first.row - second.row);
  const hasErrors = issues.length > 0;
  const invalidRowCount = new Set(issues.filter(issue => issue.row > 0).map(issue => issue.row)).size;
  const lastErrorPage = Math.max(0, Math.ceil(issues.length / errorsPerPage) - 1);
  const currentErrorPage = Math.min(errorPage, lastErrorPage), errorStart = currentErrorPage * errorsPerPage;
  const openReplacement = () => { setReplacementOpen(true); requestAnimationFrame(() => fileInput.current?.focus()); };
  const uploadForm = <>
    <p className="detail-meta">CSV UTF-8 ou XLSX · Até 2.000 produtos e 5 MB. Somente produtos novos.</p>
    <form onSubmit={event => { event.preventDefault(); void uploadFile(); }}>
      <fieldset disabled={busy || job?.status === 'PROCESSING'}><Field id="import-file" label="Planilha CSV ou Excel"><input ref={fileInput} id="import-file" type="file" accept=".csv,.xlsx" onChange={event => setFile(event.target.files?.[0] ?? null)} /></Field><button type="submit" className="primary-button" disabled={!file || busy} aria-busy={upload.isPending}>{upload.isPending ? 'Lendo planilha…' : 'Enviar e conferir planilha'}</button></fieldset>
    </form>
    <details className="import-help"><summary>Modelo e instruções de preenchimento</summary>
      <div className="inline-actions"><a className="secondary-button" href={apiUrl('/imports/template?format=xlsx')}>Baixar modelo XLSX</a><a className="text-button" href={apiUrl('/imports/template?format=csv')}>Modelo CSV</a></div>
      <p>Use os cabeçalhos do modelo: Nome, SKU (código interno), Categoria e Unidade são obrigatórios. Preencha um produto por linha.</p>
      <p>Informe o nome de uma categoria ativa já cadastrada. Para usar uma nova categoria, cadastre-a em Produtos → Categorias antes de enviar o arquivo.</p>
      <p>Formate SKU e código de barras como Texto antes de digitar no Excel. Use vírgula ou ponto decimal, sem separador de milhar. Preços vazios ficam sem valor; estoque mínimo e saldo inicial vazios equivalem a zero.</p>
      <p>Saldo inicial positivo registra uma entrada no histórico. Use até 30 colunas e uma aba preenchida. Fórmulas não são executadas; apenas resultados já calculados são lidos.</p>
    </details>
  </>;
  if (!allowed) return <div className="empty-state" role="alert"><strong>Você não tem permissão para importar produtos.</strong><Link to="/products" className="secondary-button">Voltar aos produtos</Link></div>;
  return <div className="page-stack import-page">
    <div className="catalog-actions"><Link to="/products" className="text-button">Voltar aos produtos</Link></div>
    <ol className="import-steps" aria-label="Etapas da importação">{steps.map((step, index) => <li key={step} aria-current={index === activeStep ? 'step' : undefined} className={index === activeStep ? 'is-active' : index < activeStep ? 'is-done' : ''}>{step}</li>)}</ol>
    {error && <div ref={errorTitle} tabIndex={-1}><Alert tone="error" title="Não foi possível concluir.">{error}</Alert></div>}
    {!id && <section className="list-section import-section" aria-labelledby="import-upload-title"><h2 id="import-upload-title">Enviar planilha de produtos</h2><p>Envie seu arquivo ou baixe um modelo nas instruções abaixo.</p>{uploadForm}</section>}
    {id && <DataState pending={jobQuery.isPending} error={jobQuery.error} retry={jobQuery.refetch} retainContentOnError>{job && <>
      <section className="list-section import-section" aria-labelledby="import-review-title">
        <div className="list-heading"><div><h2 id="import-review-title" ref={reviewTitle} tabIndex={-1}>{job.fileName}</h2><p className="detail-meta">{job.totalRows} {job.totalRows === 1 ? 'produto' : 'produtos'} · {statusLabels[job.status]}</p></div>{job.status !== 'COMPLETED' && <button type="button" className="text-button" disabled={busy} aria-busy={refreshing} onClick={() => { void refresh(); }}>{refreshing ? 'Conferindo…' : 'Conferir novamente'}</button>}</div>
        {job.status !== 'COMPLETED' && <>
          {job.error && <Alert tone="error" title="Nenhum produto foi importado.">{job.error}</Alert>}
          {hasErrors && <div className="import-errors">
            <h3 className="import-error-title" role="status">{issues.length} {issues.length === 1 ? 'erro encontrado' : 'erros encontrados'}{invalidRowCount > 0 && ` em ${invalidRowCount} ${invalidRowCount === 1 ? 'linha' : 'linhas'}`}</h3>
            <p>Abra <strong>{job.fileName}</strong> no seu computador, corrija os campos indicados e envie o arquivo corrigido. Nenhum produto deste arquivo foi importado.</p>
            <div className="inline-actions"><button type="button" className="primary-button" disabled={busy || job.status === 'PROCESSING'} onClick={openReplacement}>Enviar arquivo corrigido</button><button type="button" className="text-button" onClick={() => downloadReport(job)}>Baixar lista de erros (CSV)</button></div>
            <div className="table-frame"><table className="data-table import-error-table" aria-label="Erros encontrados na planilha"><thead><tr><th scope="col">Linha no arquivo</th><th scope="col">Campo</th><th scope="col">Erro / o que corrigir</th></tr></thead><tbody>{issues.slice(errorStart, errorStart + errorsPerPage).map((issue, index) => <tr key={errorStart + index}><th scope="row" data-label="Linha no arquivo">{issue.row ? `Linha ${issue.row}` : 'Cabeçalho'}</th><td data-label="Campo">{importIssueFieldLabel(issue.field)}</td><td data-label="Erro / o que corrigir">{issue.message}</td></tr>)}</tbody></table></div>
            {issues.length > errorsPerPage && <nav className="import-error-pagination" aria-label="Páginas dos erros"><p role="status">Erros {errorStart + 1}–{Math.min(errorStart + errorsPerPage, issues.length)} de {issues.length}</p><div className="inline-actions"><button type="button" className="secondary-button" disabled={currentErrorPage === 0} onClick={() => setErrorPage(currentErrorPage - 1)}>Erros anteriores</button><button type="button" className="secondary-button" disabled={currentErrorPage === lastErrorPage} onClick={() => setErrorPage(currentErrorPage + 1)}>Próximos erros</button></div></nav>}
          </div>}
          {savedCategoryChoices && <Alert tone="warning" title="Reenvie o arquivo para uma nova conferência.">Esta importação antiga contém escolhas de categorias feitas no sistema. Neste fluxo, os dados devem estar no arquivo original. Confira as categorias na planilha e envie novamente.<button type="button" className="secondary-button" disabled={busy || job.status === 'PROCESSING'} onClick={openReplacement}>Selecionar arquivo corrigido</button></Alert>}
          {!hasErrors && !savedCategoryChoices && job.rows.length > 0 && <div className="import-preview"><h3>Conferir produtos</h3><div className="table-frame"><table className="data-table import-table"><thead><tr><th>Linha</th><th>Produto / SKU</th><th>Categoria</th><th>Unidade</th><th>Saldo inicial</th></tr></thead><tbody>{job.rows.map(row => <tr key={row.row}><td data-label="Linha">{row.row}</td><td data-label="Produto / SKU"><span><strong>{row.name}</strong><br />{row.sku}</span></td><td data-label="Categoria">{row.category}</td><td data-label="Unidade">{unitCodes[row.unit as keyof typeof unitCodes] ?? row.unit}</td><td data-label="Saldo inicial">{/^\d+(?:\.\d{1,3})?$/.test(row.initialStock) ? physicalQuantityLabel(row.initialStock) : row.initialStock}</td></tr>)}</tbody></table></div>{job.totalRows > 50 && <p className="detail-meta">Prévia de até 50 produtos. Todas as {job.totalRows} linhas foram validadas.</p>}</div>}
          {!hasErrors && !savedCategoryChoices && <div className="import-confirm"><p role="status">{job.status === 'PROCESSING' ? 'Importação em andamento. Aguarde o resultado.' : ready ? 'Confira os produtos e confirme a importação. Saldos iniciais serão registrados no histórico.' : 'Para tentar novamente, envie uma nova cópia do arquivo.'}</p>{ready && <button type="button" className="primary-button" disabled={busy || Boolean(file)} aria-busy={confirm.isPending} onClick={() => setConfirmation(true)}>{confirm.isPending ? 'Importando… Aguarde' : `Importar ${job.totalRows} ${job.totalRows === 1 ? 'produto' : 'produtos'}`}</button>}</div>}
        </>}
        {job.status === 'COMPLETED' && job.result && <Alert tone="success" title="Importação concluída"><p>{job.result.products} {job.result.products === 1 ? 'produto criado' : 'produtos criados'} · {job.result.categories} {job.result.categories === 1 ? 'categoria criada' : 'categorias criadas'} · {job.result.movements} {job.result.movements === 1 ? 'entrada de estoque inicial' : 'entradas de estoque inicial'}.</p><Link to="/products" className="secondary-button">Consultar produtos</Link></Alert>}
      </section>
      <details className="list-section import-section import-disclosure" open={replacementOpen} onToggle={event => setReplacementOpen(event.currentTarget.open)}><summary><strong>{job.status === 'COMPLETED' ? 'Enviar outra planilha' : 'Enviar arquivo corrigido'}</strong><span>{job.status === 'COMPLETED' ? 'Adicionar mais produtos' : 'Selecione a versão que você corrigiu no computador'}</span></summary>{uploadForm}</details>
    </>}</DataState>}
    <details className="list-section import-section import-disclosure"><summary><strong>Suas importações recentes</strong><span>Consultar operações anteriores</span></summary><DataState pending={recent.isPending} error={recent.error} retry={recent.refetch}>{recent.data?.length ? <ul className="import-recent">{recent.data.map(item => <li key={item.id}><Link to={'/products/import?job=' + item.id}>{item.fileName}</Link><span>{statusLabels[item.status]} · {item.totalRows} {item.totalRows === 1 ? 'linha' : 'linhas'}</span></li>)}</ul> : <p>Nenhuma importação enviada ainda.</p>}</DataState></details>
    {blocker.state === 'blocked' && <ConfirmDialog title="Sair antes de enviar o arquivo?" description={busy ? 'Aguarde a operação terminar antes de sair.' : 'O arquivo selecionado ainda não foi enviado. Seu arquivo original no computador e as conferências anteriores serão preservados.'} confirmLabel="Sair sem enviar" cancelLabel="Continuar aqui" busy={busy} cancel={() => blocker.reset()} confirm={() => blocker.proceed()} />}
    {confirmation && job && <ConfirmDialog title={`Importar ${job.totalRows} ${job.totalRows === 1 ? 'produto' : 'produtos'}?`} description={`Todos os produtos de “${job.fileName}” serão criados juntos. Os saldos iniciais positivos serão registrados no histórico com seu usuário. Produtos existentes serão preservados. Se qualquer linha falhar, nenhum produto do lote será criado.`} confirmLabel="Confirmar importação" confirmVariant="primary" cancelLabel="Voltar e conferir" cancel={() => setConfirmation(false)} busy={busy} confirm={() => { setConfirmation(false); if (ready) void run(async () => accept(await confirm.mutateAsync(job.revision))); }} />}
  </div>;
}
