import { ConflictException, Inject, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit, ServiceUnavailableException, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { constants } from 'node:fs';
import { chmod, mkdir, open, readdir, readFile, rename, rm } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { resolve, join } from 'node:path';
import { backupIdPattern, databaseEnvironment, recordSchema, runTool, scheduleSchema, scheduleWindow, type BackupRecord, type BackupSchedule } from './backup-model';

@Injectable()
export class BackupsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupsService.name);
  private readonly directory: string;
  private readonly dumpTool: string;
  private readonly restoreTool: string;
  private readonly connection: string;
  private readonly timeout: number;
  private readonly retention: number;
  private readonly timeZone: string;
  private schedule: BackupSchedule;
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  private ticking = false;
  private stopping = false;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.directory = resolve(config.get<string>('BACKUP_DIRECTORY', '../../var/backups'));
    this.dumpTool = config.get<string>('BACKUP_PG_DUMP_PATH', 'pg_dump');
    this.restoreTool = config.get<string>('BACKUP_PG_RESTORE_PATH', 'pg_restore');
    this.connection = config.get<string>('BACKUP_DATABASE_URL') || config.get<string>('DIRECT_URL') || config.getOrThrow<string>('DATABASE_URL');
    this.timeout = config.get<number>('BACKUP_TIMEOUT_SECONDS', 1800) * 1000;
    this.retention = config.get<number>('BACKUP_RETENTION_DAYS', 365);
    this.timeZone = config.get<string>('BACKUP_TIME_ZONE', 'America/Fortaleza');
    this.schedule = { enabled: config.get<boolean>('BACKUP_AUTO_ENABLED', true), frequency: 'MONTHLY', weekday: 1, hour: config.get<string>('BACKUP_HOUR', '02:00') };
  }

  async onModuleInit() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    await chmod(this.directory, 0o700);
    try { this.schedule = scheduleSchema.parse(JSON.parse(await readFile(join(this.directory, 'schedule.json'), 'utf8'))); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Configuração de backup ilegível. Revise schedule.json antes de iniciar.');
    }
    // A surviving lock belongs to a live worker or a crashed process. Never interrupt a live dump.
    if (await this.recoverLock()) {
      for (const record of await this.records()) {
        if (record.status === 'RUNNING') {
          await rm(this.path(record.id, 'partial'), { force: true });
          await rm(this.path(record.id, 'dump'), { force: true });
          await this.save({ ...record, status: 'FAILED', finishedAt: new Date().toISOString(), error: 'O servidor foi interrompido durante o backup. Crie uma nova cópia.' });
        }
      }
    }
    this.timer = setInterval(() => { void this.tick().catch(() => this.logger.error('Não foi possível executar a agenda de backup.')); }, 60_000);
    this.timer.unref();
    void this.tick().catch(() => this.logger.error('Não foi possível executar a agenda de backup.'));
  }

  async onModuleDestroy() { this.stopping = true; clearInterval(this.timer); await this.running; }

  private path(id: string, extension: string) {
    if (!backupIdPattern.test(id)) throw new NotFoundException();
    return join(this.directory, `${id}.${extension}`);
  }

  private async atomicJson(path: string, value: unknown) {
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
      const file = await open(temporary, 'wx', 0o600);
      try { await file.writeFile(JSON.stringify(value)); await file.sync(); }
      finally { await file.close(); }
      await rename(temporary, path);
    } finally { await rm(temporary, { force: true }); }
  }

  private save(record: BackupRecord) { return this.atomicJson(this.path(record.id, 'json'), record); }
  private async records(): Promise<BackupRecord[]> {
    const records: BackupRecord[] = [];
    for (const file of await readdir(this.directory)) {
      if (!file.endsWith('.json') || !backupIdPattern.test(file.slice(0, -5))) continue;
      try {
        const record = recordSchema.parse(JSON.parse(await readFile(join(this.directory, file), 'utf8')));
        if (`${record.id}.json` === file) records.push(record);
      } catch { this.logger.warn('Um manifesto de backup inválido foi ignorado.'); }
    }
    return records.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  async list() {
    const records = await this.records();
    return { items: records.slice(0, 100), total: records.length, inProgress: Boolean(this.running) || records.some(item => item.status === 'RUNNING'), schedule: this.schedule, timeZone: this.timeZone, retentionDays: this.retention };
  }

  async updateSchedule(schedule: BackupSchedule) {
    const validated = scheduleSchema.parse(schedule);
    await this.atomicJson(join(this.directory, 'schedule.json'), validated);
    this.schedule = validated;
    return validated;
  }

  private async recoverLock(): Promise<boolean> {
    const lock = join(this.directory, '.lock');
    try {
      const owner = JSON.parse(await readFile(join(lock, 'owner.json'), 'utf8')) as { pid: number; host: string };
      if (owner.host !== hostname()) return false;
      try { process.kill(owner.pid, 0); return false; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') return false; }
      await rm(lock, { recursive: true });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // An empty lock can be a different worker acquiring it. Do not steal it.
        try { await readdir(lock); return false; } catch { return true; }
      }
      return false;
    }
  }

  async create(author: string, source: 'MANUAL' | 'AUTOMATIC' = 'MANUAL', period: string | null = null) {
    if (this.stopping || this.running) throw new ConflictException('Já existe um backup em andamento.');
    const lock = join(this.directory, '.lock');
    try { await mkdir(lock, { mode: 0o700 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new ConflictException('Já existe um backup em andamento.');
      throw new ServiceUnavailableException('O armazenamento de backup não está disponível.');
    }
    const record: BackupRecord = { id: randomUUID(), status: 'RUNNING', source, author, period, startedAt: new Date().toISOString(), finishedAt: null, bytes: 0, sha256: '', error: null };
    try {
      await this.atomicJson(join(lock, 'owner.json'), { host: hostname(), pid: process.pid });
      // Recheck under the filesystem lock: two API instances cannot both schedule the same period.
      if (period && (await this.records()).some(item => item.source === 'AUTOMATIC' && item.period === period && item.status === 'READY')) {
        throw new ConflictException('O backup deste período já foi concluído.');
      }
      await this.save(record);
    } catch (error) { await rm(lock, { recursive: true, force: true }); throw error; }
    this.running = this.generate(record).catch(() => this.logger.error('Não foi possível finalizar o registro do backup.')).finally(async () => {
      try { await rm(lock, { recursive: true, force: true }); }
      catch { this.logger.error('A trava de backup não pôde ser removida. Revise o armazenamento antes de gerar outra cópia.'); }
      finally { this.running = undefined; }
    });
    return record;
  }

  private async checksum(id: string, extension: string) {
    const file = await open(this.path(id, extension), constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const info = await file.stat();
      if (!info.isFile() || info.size === 0) throw new Error('INVALID_ARCHIVE');
      const hash = createHash('sha256');
      for await (const chunk of file.createReadStream({ autoClose: false })) hash.update(chunk);
      return { bytes: info.size, sha256: hash.digest('hex') };
    } finally { await file.close(); }
  }

  private async generate(record: BackupRecord) {
    const partial = this.path(record.id, 'partial');
    try {
      const handle = await open(partial, 'wx', 0o600); await handle.close();
      await runTool(this.dumpTool, ['--format=custom', '--no-password', '--lock-wait-timeout=15000', '--file', partial], databaseEnvironment(this.connection), this.timeout);
      await runTool(this.restoreTool, ['--list', partial], { PATH: process.env.PATH }, this.timeout);
      const integrity = await this.checksum(record.id, 'partial');
      const file = await open(partial, constants.O_RDONLY | constants.O_NOFOLLOW);
      try { await file.sync(); } finally { await file.close(); }
      await rename(partial, this.path(record.id, 'dump'));
      await this.save({ ...record, ...integrity, status: 'READY', finishedAt: new Date().toISOString() });
      // Retention runs only after publishing a successful archive, preserving the last good copy.
      await this.prune(record.id);
    } catch (error) {
      await rm(partial, { force: true });
      const code = error instanceof Error ? error.message : '';
      const message = code === 'TOOL_UNAVAILABLE' ? 'Ferramentas de backup indisponíveis no servidor. Solicite a configuração ao responsável.'
        : code === 'TIMEOUT' ? 'O backup excedeu o tempo permitido. Tente novamente ou contate o responsável.'
        : 'Não foi possível gerar uma cópia válida. Confira a conexão e o armazenamento do servidor.';
      // If retention fails after publication, the archive is still valid; do not downgrade it.
      const stored = (await this.records()).find(item => item.id === record.id);
      if (stored?.status === 'READY') this.logger.warn('Backup concluído; limpeza das cópias antigas pendente.');
      else {
        await rm(this.path(record.id, 'dump'), { force: true });
        await this.save({ ...record, status: 'FAILED', finishedAt: new Date().toISOString(), error: message });
      }
    }
  }

  private async prune(preserveId: string) {
    const cutoff = Date.now() - this.retention * 86_400_000;
    for (const record of await this.records()) {
      if (record.id === preserveId || record.status === 'RUNNING' || Date.parse(record.startedAt) >= cutoff) continue;
      await rm(this.path(record.id, 'dump'), { force: true });
      await rm(this.path(record.id, 'json'), { force: true });
    }
  }

  async download(id: string) {
    const record = (await this.records()).find(item => item.id === id);
    if (!record) throw new NotFoundException('Backup não encontrado.');
    if (record.status !== 'READY') throw new ConflictException('Este backup ainda não está disponível.');
    try {
      const integrity = await this.checksum(id, 'dump');
      if (integrity.sha256 !== record.sha256 || integrity.bytes !== record.bytes) throw new Error('INTEGRITY');
      return new StreamableFile((await open(this.path(id, 'dump'), constants.O_RDONLY | constants.O_NOFOLLOW)).createReadStream(), {
        type: 'application/octet-stream', length: record.bytes,
        disposition: `attachment; filename="estoque-${record.startedAt.slice(0, 10)}-${id}.dump"`,
      });
    } catch { throw new ServiceUnavailableException('O arquivo de backup está indisponível ou falhou na verificação de integridade.'); }
  }

  async tick(now = new Date()) {
    if (this.stopping || this.ticking || this.running || !this.schedule.enabled) return;
    this.ticking = true;
    try {
      const window = scheduleWindow(now, this.timeZone, this.schedule);
      if (!window.due) return;
      const records = await this.records();
      if (records.some(item => item.source === 'AUTOMATIC' && item.period === window.period && item.status === 'READY')) return;
      // A failed period is retried after one hour, avoiding a tight loop on unavailable storage/database.
      if (records.some(item => item.source === 'AUTOMATIC' && item.period === window.period && now.getTime() - Date.parse(item.startedAt) < 3_600_000)) return;
      try { await this.create('Agendamento automático', 'AUTOMATIC', window.period); }
      catch (error) { if (!(error instanceof ConflictException)) throw error; }
    } finally { this.ticking = false; }
  }
}
