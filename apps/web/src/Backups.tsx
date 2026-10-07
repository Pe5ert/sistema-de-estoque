import { useEffect, useRef, useState } from 'react';
import { Alert, useFeedback } from './feedback';
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, HardDrive, Plus } from 'lucide-react';
import { useAuth } from './auth/auth';
import { useNavigate } from 'react-router-dom';
import { DataState } from './data-controls';
import { apiClient, apiUrl } from './lib/api';

type Schedule = { enabled: boolean; frequency: 'WEEKLY' | 'MONTHLY'; weekday: number; hour: string };
type Backup = { id: string; status: 'RUNNING' | 'READY' | 'FAILED'; source: 'MANUAL' | 'AUTOMATIC'; startedAt: string; finishedAt: string | null; author: string; bytes: number; sha256: string; error: string | null };
type BackupList = { items: Backup[]; total: number; inProgress: boolean; schedule: Schedule; timeZone: string; retentionDays: number };
const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const key = ['backups'] as const;
const statuses = { READY: 'Disponível', RUNNING: 'Gerando cópia…', FAILED: 'Falhou' };

export function BackupsPage() {
  const { currentUser } = useAuth();
  if (currentUser?.role !== 'ADMIN') return <p role="alert">A área de backups é exclusiva do administrador.</p>;
  return <BackupsContent />;
}

// Remains mounted in the shell: a running copy can finish after page navigation.
export function BackupsFeedbackMonitor() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { notify } = useFeedback();
  const observed = useRef(new Map<string, Backup['status']>());
  const announced = useRef(new Set<string>());
  const created = useMutationState<Backup>({ filters: { mutationKey: ['backup-create'], status: 'success' }, select: mutation => mutation.state.data as Backup });
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => apiClient<BackupList>('/backups', { signal }), enabled: currentUser?.role === 'ADMIN', refetchInterval: query => query.state.data?.inProgress ? 2000 : false, retry: false });
  useEffect(() => {
    for (const item of query.data?.items ?? []) {
      if ((observed.current.get(item.id) === 'RUNNING' || created.some(backup => backup.id === item.id)) && item.status !== 'RUNNING' && !announced.current.has(item.id)) {
        announced.current.add(item.id);
        notify({ tone: item.status === 'READY' ? 'success' : 'error', title: item.status === 'READY' ? 'Backup concluído.' : 'Não foi possível gerar o backup.', description: item.status === 'READY' ? 'A cópia está disponível em Backups.' : 'A última cópia válida foi preservada. Confira o detalhe em Backups.', action: { label: 'Ver backups', run: () => navigate('/backups') }, key: 'backup-result' });
      }
      observed.current.set(item.id, item.status);
    }
  }, [query.data, notify, navigate, created]);
  return null;
}

function BackupsContent() {
  const { notify } = useFeedback();
  const client = useQueryClient();
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => apiClient<BackupList>('/backups', { signal }),
    refetchInterval: query => query.state.data?.inProgress ? 2000 : 30_000, retry: false });
  const create = useMutation({ mutationKey: ['backup-create'], mutationFn: () => apiClient<Backup>('/backups', { method: 'POST' }),
    onSuccess: backup => {
      client.setQueryData<BackupList>(key, previous => previous ? { ...previous, inProgress: backup.status === 'RUNNING', items: [backup, ...previous.items.filter(item => item.id !== backup.id)], total: previous.total + 1 } : previous);
      notify({ tone: 'info', title: 'Backup iniciado.', description: 'Você pode continuar usando o sistema.', key: 'backup-start' });
      return client.invalidateQueries({ queryKey: key });
    } });
  const running = query.data?.inProgress;
  const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: query.data?.timeZone }).format(new Date(value));
  const size = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return <div className="page-stack">
    <section className="backup-intro" aria-labelledby="backup-create-title">
      <div><h2 id="backup-create-title"><HardDrive size={20} aria-hidden="true" />Cópia completa do estoque</h2>
        <p>Inclui produtos, categorias, saldos, usuários e todo o histórico registrado até o momento da cópia.</p>
        <span>O administrador da sua empresa cria, baixa e guarda as cópias do banco de dados da empresa.</span></div>
      <button className="primary-button" type="button" disabled={query.isPending || Boolean(query.error) || create.isPending || running} onClick={() => create.mutate()}>
        <Plus size={16} aria-hidden="true" />{create.isPending || running ? 'Gerando backup…' : 'Criar backup'}</button>
    </section>
    <details className="backup-restore-guide">
      <summary>Como restaurar um backup</summary>
      <div>
        <p>A própria empresa é responsável pelas cópias e pela recuperação do seu banco de dados. Siga estes passos:</p>
        <ol>
          <li><strong>Escolha a cópia.</strong> Em Cópias salvas, confira a data e escolha um backup com situação Disponível.</li>
          <li><strong>Baixe o arquivo.</strong> Clique em Baixar e guarde o arquivo <code>.dump</code>, sem alterar o nome.</li>
          <li><strong>Solicite a restauração.</strong> Encaminhe o arquivo ao administrador do banco de dados da sua empresa e informe a data que deseja recuperar.</li>
          <li><strong>Confira os dados.</strong> Após a restauração, verifique produtos, saldos e histórico antes de retomar os lançamentos.</li>
        </ol>
        <p className="backup-restore-note">Uma cópia antiga não inclui os lançamentos feitos depois da data dela. O administrador da empresa deve guardar uma cópia atual antes de substituir os dados e conservar as cópias também em outro local.</p>
      </div>
    </details>
    {create.error && <Alert tone="error" title="Não foi possível iniciar o backup." action={{ label: 'Tentar novamente', run: () => create.mutate() }}>{create.error.message}</Alert>}
    {running && <Alert title="Backup em andamento.">Você pode continuar usando o sistema; a cópia aparecerá abaixo quando estiver pronta.</Alert>}
    {query.data?.items[0]?.status === 'FAILED' && <Alert tone="warning" title="O último backup falhou.">Confira o motivo em Cópias salvas e crie uma nova cópia.</Alert>}
    <DataState pending={query.isPending} error={query.error} retry={query.refetch}>
      {query.data && <>
        <ScheduleForm schedule={query.data.schedule} timeZone={query.data.timeZone} onSaved={() => notify({ tone: 'success', title: 'Agendamento salvo.' })} />
        <section className="list-section" aria-labelledby="backup-list-title">
          <div className="list-heading"><h2 id="backup-list-title">Cópias salvas</h2><span>{query.data.total} {query.data.total === 1 ? 'registro' : 'registros'}</span></div>
          {query.data.items.length === 0 ? <div className="empty-state"><HardDrive size={24} aria-hidden="true" /><strong>Nenhum backup criado ainda.</strong><p>Crie a primeira cópia ou aguarde o agendamento automático.</p></div> :
            <div className="table-frame"><table className="data-table backup-table"><thead><tr>
              <th scope="col">INICIADO EM</th><th scope="col">ORIGEM / RESPONSÁVEL</th><th scope="col">SITUAÇÃO</th><th scope="col">TAMANHO</th><th scope="col">ARQUIVO</th>
            </tr></thead><tbody>{query.data.items.map(item => <tr key={item.id}>
              <td data-label="Iniciado em"><strong>{date(item.startedAt)}</strong>{item.finishedAt && <small className="backup-meta">Finalizado: {date(item.finishedAt)}</small>}</td>
              <td data-label="Origem / responsável">{item.source === 'MANUAL' ? 'Manual' : 'Automático'}<small className="backup-meta">{item.author}</small></td>
              <td data-label="Situação"><span className={'backup-status backup-status-' + item.status.toLowerCase()}>{statuses[item.status]}</span>{item.error && <small className="backup-meta backup-error">{item.error}</small>}</td>
              <td data-label="Tamanho">{item.status === 'READY' ? size(item.bytes) : '—'}</td>
              <td data-label="Arquivo">{item.status === 'READY' ? <a className="secondary-button" href={apiUrl(`/backups/${item.id}/download`)} aria-label={'Baixar backup de ' + date(item.startedAt)}><Download size={15} aria-hidden="true" />Baixar</a> : <span className="backup-meta">Indisponível</span>}</td>
            </tr>)}</tbody></table></div>}
          <div className="table-note"><span>Retenção: {query.data.retentionDays} dias. A última cópia válida é preservada.</span><span>{query.data.total > 100 ? 'Mostrando os 100 registros mais recentes. ' : ''}Horários: {query.data.timeZone}.</span></div>
        </section>
      </>}
    </DataState>
  </div>;
}

function ScheduleForm({ schedule, timeZone, onSaved }: { schedule: Schedule; timeZone: string; onSaved: () => void }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState(schedule);
  const { enabled, frequency, weekday, hour } = schedule;
  // Refresh only when saved values change; polling must preserve an unsaved draft.
  useEffect(() => setDraft({ enabled, frequency, weekday, hour }), [enabled, frequency, weekday, hour]);
  const mutation = useMutation({ mutationFn: () => apiClient<Schedule>('/backups/schedule', { method: 'PATCH', body: JSON.stringify(draft) }),
    onSuccess: saved => { client.setQueryData<BackupList>(key, previous => previous ? { ...previous, schedule: saved } : previous); onSaved(); } });
  const changed = JSON.stringify(draft) !== JSON.stringify(schedule);
  const change = (values: Partial<Schedule>) => { setDraft(previous => ({ ...previous, ...values })); mutation.reset(); };
  return <section className="list-section backup-schedule" aria-labelledby="backup-schedule-title">
    <div className="list-heading"><h2 id="backup-schedule-title">Backup automático</h2><span>{schedule.enabled ? 'Ativo' : 'Desativado'}</span></div>
    <form onSubmit={event => { event.preventDefault(); mutation.mutate(); }}>
      <div className="backup-schedule-fields">
        <label className="backup-toggle"><input type="checkbox" checked={draft.enabled} disabled={mutation.isPending} onChange={event => change({ enabled: event.target.checked })} />Ativar backup automático</label>
        <label className="form-field">Frequência<select value={draft.frequency} disabled={mutation.isPending} onChange={event => change({ frequency: event.target.value as Schedule['frequency'] })}><option value="MONTHLY">Mensal</option><option value="WEEKLY">Semanal</option></select></label>
        {draft.frequency === 'WEEKLY' ? <label className="form-field">Dia da semana<select value={draft.weekday} disabled={mutation.isPending} onChange={event => change({ weekday: Number(event.target.value) })}>{weekdays.map((label, day) => <option key={day} value={day}>{label}</option>)}</select></label> : <div className="backup-day"><span>Dia do mês</span><strong>Primeiro dia</strong></div>}
        <label className="form-field">Horário<input type="time" required value={draft.hour} disabled={mutation.isPending} onChange={event => change({ hour: event.target.value })} /></label>
        <button type="submit" className="secondary-button" disabled={!changed || mutation.isPending}>{mutation.isPending ? 'Salvando…' : 'Salvar agendamento'}</button>
      </div>
      <p className="backup-schedule-note">{schedule.enabled ? (schedule.frequency === 'MONTHLY' ? 'Todo primeiro dia do mês' : `Toda semana: ${weekdays[schedule.weekday]}`) + `, às ${schedule.hour} (${timeZone}).` : 'A geração manual continua disponível.'} O servidor precisa estar em execução. Se ficar desligado, a cópia pendente será gerada ao reiniciar.</p>
      {changed && <Alert tone="warning" title="Alterações ainda não salvas." />}
      {mutation.error && <Alert tone="error" title="Não foi possível salvar o agendamento.">{mutation.error.message}</Alert>}
    </form>
  </section>;
}
