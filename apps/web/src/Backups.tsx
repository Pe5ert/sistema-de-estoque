import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, HardDrive, Plus } from 'lucide-react';
import { useAuth } from './auth/auth';
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

function BackupsContent() {
  const client = useQueryClient();
  const [notice, setNotice] = useState('');
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => apiClient<BackupList>('/backups', { signal }),
    refetchInterval: query => query.state.data?.inProgress ? 2000 : 30_000, retry: false });
  const create = useMutation({ mutationFn: () => apiClient<Backup>('/backups', { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: key }) });
  const running = query.data?.inProgress;
  const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: query.data?.timeZone }).format(new Date(value));
  const size = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return <div className="page-stack">
    <section className="backup-intro" aria-labelledby="backup-create-title">
      <div><h2 id="backup-create-title"><HardDrive size={20} aria-hidden="true" />Cópia completa do estoque</h2>
        <p>Inclui produtos, categorias, saldos, usuários e todo o histórico registrado até o momento da cópia.</p>
        <span>Baixe as cópias para guardá-las também em outro local.</span></div>
      <button className="primary-button" type="button" disabled={query.isPending || Boolean(query.error) || create.isPending || running} onClick={() => create.mutate()}>
        <Plus size={16} aria-hidden="true" />{create.isPending || running ? 'Gerando backup…' : 'Criar backup'}</button>
    </section>
    <details className="backup-restore-guide">
      <summary>Como restaurar um backup</summary>
      <div>
        <p>A restauração é feita pelo responsável técnico pela instalação do sistema. Para solicitar:</p>
        <ol>
          <li><strong>Escolha a cópia.</strong> Em Cópias salvas, confira a data e escolha um backup com situação Disponível.</li>
          <li><strong>Baixe o arquivo.</strong> Clique em Baixar e guarde o arquivo <code>.dump</code>, sem alterar o nome.</li>
          <li><strong>Solicite a restauração.</strong> Entregue o arquivo ao responsável técnico e informe a data para a qual deseja voltar.</li>
          <li><strong>Confira os dados.</strong> Após a restauração, verifique produtos, saldos e histórico antes de retomar os lançamentos.</li>
        </ol>
        <p className="backup-restore-note">Uma cópia antiga não inclui os lançamentos feitos depois da data dela. O responsável deve guardar uma cópia atual antes de substituir os dados.</p>
      </div>
    </details>
    {create.error && <p className="field-error" role="alert">{create.error.message}</p>}
    {running && <p className="form-notice" role="status">O backup está em andamento. Você pode continuar usando o sistema; a cópia aparecerá abaixo quando estiver pronta.</p>}
    <DataState pending={query.isPending} error={query.error} retry={query.refetch}>
      {query.data && <>
        <ScheduleForm schedule={query.data.schedule} timeZone={query.data.timeZone} onSaved={() => setNotice('Agendamento salvo.')} onEdit={() => setNotice('')} />
        {notice && <p className="form-notice" role="status">{notice}</p>}
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

function ScheduleForm({ schedule, timeZone, onSaved, onEdit }: { schedule: Schedule; timeZone: string; onSaved: () => void; onEdit: () => void }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState(schedule);
  const { enabled, frequency, weekday, hour } = schedule;
  // Refresh only when saved values change; polling must preserve an unsaved draft.
  useEffect(() => setDraft({ enabled, frequency, weekday, hour }), [enabled, frequency, weekday, hour]);
  const mutation = useMutation({ mutationFn: () => apiClient<Schedule>('/backups/schedule', { method: 'PATCH', body: JSON.stringify(draft) }),
    onSuccess: saved => { client.setQueryData<BackupList>(key, previous => previous ? { ...previous, schedule: saved } : previous); onSaved(); } });
  const changed = JSON.stringify(draft) !== JSON.stringify(schedule);
  const change = (values: Partial<Schedule>) => { setDraft(previous => ({ ...previous, ...values })); mutation.reset(); onEdit(); };
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
      {changed && <p className="backup-schedule-note" role="status">Alterações ainda não salvas.</p>}
      {mutation.error && <p className="field-error" role="alert">{mutation.error.message}</p>}
    </form>
  </section>;
}
