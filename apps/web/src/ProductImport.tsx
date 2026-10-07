import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { canImportProducts, importFields, type ImportField, type ImportMapping, type ImportCategoryMapping, type ImportPreview } from '@stock/shared';
import { apiClient, apiUrl } from './lib/api';
import { useAuth } from './auth/auth';
import { useCategories, useInventoryMutation } from './inventory-api';
import { Field } from './form-controls';
import { DataState } from './data-controls';
import { unitCodes } from './inventory-model';
import { useFeedback, Alert } from './feedback';

const labels: Record<ImportField, string> = { name: 'Nome', sku: 'SKU', barcode: 'Código de barras', category: 'Categoria', unit: 'Unidade', minimumStock: 'Estoque mínimo', costPrice: 'Custo', salePrice: 'Venda', initialStock: 'Saldo inicial', imageUrl: 'Imagem URL' };
const statusLabels = { PREVIEW: 'Em revisão', PROCESSING: 'Importando', COMPLETED: 'Concluída', FAILED: 'Falhou · lote revertido' };
type RecentImport = { id: string; fileName: string; status: ImportPreview['status']; totalRows: number; importedRows: number };
function downloadReport(job: ImportPreview) {
  const lines = [['Linha', 'Campo', 'Erro'], ...job.issues.map(issue => [issue.row ? String(issue.row) : 'Mapeamento', labels[issue.field as ImportField] ?? issue.field, issue.message])];
  // CSV exported diagnostics never become spreadsheet formulas.
  const escape = (value: string) => '"' + (/^[\s]*[=+\-@]/.test(value) ? "'" : '') + value.replace(/"/g, '""') + '"';
  const blob = new Blob(['\uFEFF' + lines.map(line => line.map(escape).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = 'erros-importacao.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ProductImportPage() {
  const { notify } = useFeedback();
  const { currentUser } = useAuth();
  const allowed = canImportProducts(currentUser?.role);
  const [params, setParams] = useSearchParams(), id = params.get('job');
  const client = useQueryClient(), categories = useCategories();
  const recent = useQuery({ queryKey: ['imports'], queryFn: () => apiClient<RecentImport[]>('/imports'), enabled: allowed });
  const jobQuery = useQuery({ queryKey: ['import', id], queryFn: () => apiClient<ImportPreview>('/imports/' + id), enabled: allowed && Boolean(id), refetchOnWindowFocus: false });
  const job = jobQuery.data;
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [choices, setChoices] = useState<ImportCategoryMapping[]>([]);
  const [authorizeNew, setAuthorizeNew] = useState(false);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const running = useRef(false);
  const hydratedRevision = useRef('');
  useEffect(() => {
    if (!job) return;
    const revisionKey = `${job.id}:${job.revision}`;
    if (hydratedRevision.current === revisionKey) return;
    hydratedRevision.current = revisionKey;
    setMapping(job.mapping); setChoices(job.categoryMappings); setAuthorizeNew(job.categoryMappings.some(choice => choice.action === 'create'));
  }, [job]);
  const upload = useMutation({ mutationFn: (body: FormData) => apiClient<ImportPreview>('/imports', { method: 'POST', body }) });
  const setup = useMutation({ mutationFn: (body: unknown) => apiClient<ImportPreview>('/imports/' + id, { method: 'PATCH', body: JSON.stringify(body) }) });
  const confirm = useInventoryMutation((revision: number) => apiClient<ImportPreview>('/imports/' + id + '/confirm', { method: 'POST', body: JSON.stringify({ revision }) }));
  const accept = (updated: ImportPreview) => {
    client.setQueryData(['import', updated.id], updated); setParams({ job: updated.id }); void recent.refetch();
    if (updated.status === 'COMPLETED' && updated.result) notify({ tone: 'success', title: `Importação concluída: ${updated.result.products} ${updated.result.products === 1 ? 'produto adicionado' : 'produtos adicionados'}.`, key: 'import-result' });
    else if (updated.status === 'FAILED') notify({ tone: 'error', title: 'Não foi possível importar o lote.', description: 'Revise os erros abaixo. Nenhum produto do lote foi adicionado.', key: 'import-result' });
    else if (updated.status === 'PROCESSING') notify({ tone: 'info', title: 'Importação em andamento.', description: 'Aguarde o resultado antes de tentar novamente.', key: 'import-result' });
    else notify({ tone: updated.issues.length ? 'warning' : 'info', title: updated.issues.length ? 'A planilha precisa de revisão.' : 'Planilha pronta para revisão.', description: updated.issues.length ? 'Confira os erros abaixo antes de confirmar.' : 'Confira o mapeamento e os produtos antes de importar.', key: 'import-preview' });
  };
  const run = async (action: () => Promise<void>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível concluir. Tente novamente.'); if (id) void jobQuery.refetch(); }
    finally { running.current = false; setBusy(false); }
  };
  const changed = job && (importFields.some(field => mapping[field] !== job.mapping[field]) || JSON.stringify(choices) !== JSON.stringify(job.categoryMappings));
  const categorySources = [...new Set([...(job?.unknownCategories ?? []), ...choices.map(choice => choice.source)])];
  const creates = choices.filter(choice => choice.action === 'create');
  const chooseCategory = (source: string, value: string) => {
    setAuthorizeNew(false);
    setChoices(current => [...current.filter(choice => choice.source !== source), ...(value ? [value === '__create' ? { source, action: 'create' as const, name: source } : { source, action: 'map' as const, categoryId: value }] : [])]);
  };
  if (!allowed) return <div className="empty-state" role="alert"><strong>Você não tem permissão para importar produtos.</strong><Link to="/products" className="secondary-button">Voltar aos produtos</Link></div>;
  return <div className="page-stack import-page">
    <div className="catalog-actions"><Link to="/products" className="text-button">Voltar aos produtos</Link><div className="inline-actions"><a className="secondary-button" href={apiUrl('/imports/template?format=xlsx')}>Baixar modelo XLSX</a><a className="text-button" href={apiUrl('/imports/template?format=csv')}>Modelo CSV</a></div></div>
    <ol className="import-steps" aria-label="Etapas da importação"><li>Enviar arquivo</li><li>Mapear e revisar</li><li>Confirmar</li><li>Resultado</li></ol>
    {error && <Alert tone="error" title="Não foi possível concluir a importação.">{error}</Alert>}
    <section className="list-section import-section" aria-labelledby="import-upload-title"><h2 id="import-upload-title">Trazer produtos da planilha</h2><p>CSV UTF-8 ou XLSX com uma aba preenchida. Até 2.000 produtos, 30 colunas e 5 MB.</p><p className="detail-meta">SKU e código de barras devem ser Texto no Excel. Números aceitam vírgula ou ponto decimal, sem separador de milhar. Fórmulas não são executadas; somente resultados já calculados são lidos.</p>
      <form onSubmit={event => { event.preventDefault(); void run(async () => { if (!file) throw new Error('Selecione um arquivo.'); if (file.size > 5 * 1024 * 1024) throw new Error('O arquivo excede 5 MB.'); const body = new FormData(); body.append('file', file); accept(await upload.mutateAsync(body)); }); }}><fieldset disabled={busy}><Field id="import-file" label="Planilha"><input id="import-file" type="file" accept=".csv,.xlsx" onChange={event => setFile(event.target.files?.[0] ?? null)} /></Field><button type="submit" className="primary-button" disabled={!file || busy} aria-busy={upload.isPending}>{upload.isPending ? 'Lendo arquivo…' : 'Enviar e analisar'}</button></fieldset></form>
    </section>
    {id && <DataState pending={jobQuery.isPending} error={jobQuery.error} retry={jobQuery.refetch}>{job && <>
      <section className="list-section import-section" aria-labelledby="import-review-title"><div className="list-heading"><h2 id="import-review-title">{job.fileName}</h2><span>{statusLabels[job.status]}</span></div><p>{job.totalRows} produtos · {job.ignoredRows} linhas vazias ignoradas{job.delimiter && ` · Separador: ${job.delimiter === '\t' ? 'tabulação' : job.delimiter}`}</p>
        {job.status !== 'COMPLETED' && <>
          <h3>Mapear colunas</h3><p className="detail-meta">Confira as sugestões. Os campos com * são obrigatórios.</p><fieldset disabled={busy || job.status === 'PROCESSING'} className="import-map-grid">{importFields.map(field => <Field key={field} id={'import-map-' + field} label={labels[field] + (['name', 'sku', 'category', 'unit'].includes(field) ? ' *' : '')}><select id={'import-map-' + field} value={mapping[field] ?? ''} onChange={event => setMapping(current => { const next = { ...current }; if (event.target.value === '') delete next[field]; else next[field] = Number(event.target.value); return next; })}><option value="">Não importar esta coluna</option>{job.headers.map((header, index) => <option value={index} key={index}>{header}</option>)}</select></Field>)}</fieldset>
          {categorySources.length > 0 && <><h3>Categorias da planilha</h3><p>Escolha uma categoria ativa ou autorize criar uma nova ao importar.</p><fieldset disabled={busy} className="import-categories">{categorySources.map(source => { const choice = choices.find(choice => choice.source === source); return <div key={source}><Field id={'import-category-' + categorySources.indexOf(source)} label={source}><select id={'import-category-' + categorySources.indexOf(source)} value={choice?.action === 'create' ? '__create' : choice?.categoryId ?? ''} onChange={event => chooseCategory(source, event.target.value)}><option value="">Escolha a ação</option>{(categories.data ?? []).filter(category => category.active).map(category => <option key={category.id} value={category.id}>Usar {category.name}</option>)}<option value="__create">Criar nova categoria</option></select></Field>{choice?.action === 'create' && <Field id={'import-category-name-' + categorySources.indexOf(source)} label="Nome da nova categoria"><input id={'import-category-name-' + categorySources.indexOf(source)} value={choice.name} maxLength={120} onChange={event => { setAuthorizeNew(false); setChoices(current => current.map(item => item.source === source && item.action === 'create' ? { ...item, name: event.target.value } : item)); }} /></Field>}</div>; })}</fieldset>{creates.length > 0 && <label className="import-authorization"><input type="checkbox" checked={authorizeNew} disabled={busy} onChange={event => setAuthorizeNew(event.target.checked)} />Autorizo criar as {creates.length} categorias selecionadas ao confirmar a importação.</label>}</>}
          {categories.error && <Alert tone="error" title="Categorias indisponíveis." action={{ label: 'Tentar novamente', run: () => { void categories.refetch(); } }} />}
          <div className="inline-actions"><button type="button" className="secondary-button" disabled={busy || Boolean(creates.length && !authorizeNew)} onClick={() => void run(async () => accept(await setup.mutateAsync({ mapping, categoryMappings: choices, revision: job.revision })))}>{setup.isPending ? 'Validando…' : 'Validar e revisar'}</button><button type="button" className="text-button" disabled={busy} onClick={() => void jobQuery.refetch()}>Atualizar preview</button></div>
          {changed && <Alert tone="warning" title="Mapeamento alterado.">Clique em Validar e revisar antes de confirmar.</Alert>}
          {job.unknownCategories.length > 0 && <Alert tone="warning" title="Há categorias para revisar.">Escolha uma categoria existente ou autorize criar as novas categorias abaixo.</Alert>}
          {job.error && <Alert tone="error" title="O lote não foi importado.">{job.error}</Alert>}
          <h3>Revisão do lote</h3><p role="status">{job.validRows} de {job.totalRows} linhas válidas · {job.issues.length} erros. Nenhum produto foi gravado nesta etapa.</p>
          {job.issues.length > 0 && <div className="import-errors"><p>Corrija a planilha e envie novamente ou ajuste o mapeamento. O lote só será importado quando todos os erros forem resolvidos.</p><button type="button" className="text-button" onClick={() => downloadReport(job)}>Baixar todos os erros</button><ul>{job.issues.slice(0, 50).map((issue, index) => <li key={index}><strong>{issue.row ? `Linha ${issue.row}` : 'Mapeamento'} · {labels[issue.field as ImportField] ?? issue.field}</strong>: {issue.message}</li>)}</ul>{job.issues.length > 50 && <p>Mostrando os primeiros 50 erros. Baixe o relatório completo.</p>}</div>}
          {job.rows.length > 0 && <div className="table-frame"><table className="data-table import-table"><thead><tr><th>Linha</th><th>Produto / SKU</th><th>Categoria</th><th>Unidade</th><th>Saldo inicial</th></tr></thead><tbody>{job.rows.map(row => <tr key={row.row}><td data-label="Linha">{row.row}</td><td data-label="Produto / SKU"><span><strong>{row.name}</strong><br />{row.sku}</span></td><td data-label="Categoria">{row.category}</td><td data-label="Unidade">{unitCodes[row.unit as keyof typeof unitCodes] ?? row.unit}</td><td data-label="Saldo inicial">{row.initialStock}</td></tr>)}</tbody></table></div>}
          {job.totalRows > 50 && <p className="detail-meta">Preview dos primeiros 50 produtos. A validação considera todas as {job.totalRows} linhas.</p>}
          <div className="import-confirm"><p><strong>O lote será importado por completo.</strong> Produtos existentes não serão alterados. Saldos positivos gerarão entradas de estoque inicial.</p><button type="button" className="primary-button" disabled={busy || Boolean(changed) || job.issues.length > 0 || job.status !== 'PREVIEW' || Boolean(creates.length && !authorizeNew)} aria-busy={confirm.isPending} onClick={() => void run(async () => accept(await confirm.mutateAsync(job.revision)))}>{confirm.isPending ? 'Importando lote… Aguarde' : `Confirmar importação de ${job.totalRows} ${job.totalRows === 1 ? 'produto' : 'produtos'}`}</button>{job.status === 'FAILED' && <p>Revise e valide novamente para preparar uma nova tentativa.</p>}</div>
        </>}
        {job.status === 'COMPLETED' && job.result && <Alert tone="success" title="Importação concluída"><p>{job.result.products} produtos criados · {job.result.categories} categorias criadas · {job.result.movements} entradas de estoque inicial · {job.result.ignoredRows} linhas vazias ignoradas.</p><Link to="/products" className="secondary-button">Consultar produtos</Link><p className="detail-meta">Operação {job.id}. O resultado permanece disponível ao atualizar a página.</p></Alert>}
      </section>
    </>}</DataState>}
    <section className="list-section import-section" aria-labelledby="import-recent-title"><h2 id="import-recent-title">Suas importações recentes</h2><DataState pending={recent.isPending} error={recent.error} retry={recent.refetch}>{recent.data?.length ? <ul className="import-recent">{recent.data.map(item => <li key={item.id}><Link to={'/products/import?job=' + item.id}>{item.fileName}</Link><span>{statusLabels[item.status]} · {item.totalRows} linhas</span></li>)}</ul> : <p>Nenhuma importação enviada ainda.</p>}</DataState></section>
  </div>;
}
