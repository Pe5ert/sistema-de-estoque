import { BadRequestException, ConflictException, ForbiddenException, HttpException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { canImportProducts, type ImportPreview, type ImportMapping, type ImportCategoryMapping, type ImportResult } from '@stock/shared';
import { Prisma, type ImportJob } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { parseImportFile, type FileRow } from './import-file';
import { categoryKey, confirmSchema, setupSchema, suggestedMapping, validateImportRows } from './import-validation';

const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
@Injectable()
export class ImportsService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(InventoryService) private readonly inventory: InventoryService) {}
  async upload(file: { originalname: string; buffer: Buffer } | undefined, userId: string) {
    if (!file) throw new BadRequestException('Selecione o arquivo CSV ou XLSX.');
    const fileName = [...file.originalname.split(/[\\/]/).at(-1)!].filter(character => character.charCodeAt(0) >= 32).join('').slice(0, 255);
    const parsed = await parseImportFile(fileName, file.buffer);
    const job = await this.db.importJob.create({ data: { createdBy: userId, fileName, format: parsed.format, delimiter: parsed.delimiter, headers: json(parsed.headers), rows: json(parsed.rows), mapping: json(suggestedMapping(parsed.headers)), categoryMappings: [], totalRows: parsed.rows.length, ignoredRows: parsed.ignoredRows } });
    return this.view(job);
  }
  async list(userId: string) {
    return this.db.importJob.findMany({ where: { createdBy: userId }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, fileName: true, status: true, totalRows: true, importedRows: true, createdAt: true } });
  }
  private async owned(id: string, userId: string, tx: Prisma.TransactionClient = this.db) {
    const job = await tx.importJob.findUnique({ where: { id } });
    if (!job || job.createdBy !== userId) throw new NotFoundException('Importação não encontrada.');
    return job;
  }
  private async validate(job: ImportJob, tx: Prisma.TransactionClient = this.db) {
    const rows = job.rows as unknown as FileRow[], headers = job.headers as string[], mapping = job.mapping as ImportMapping;
    const codes = rows.map(row => ({ sku: row.cells[mapping.sku ?? -1]?.text.trim() ?? '', barcode: row.cells[mapping.barcode ?? -1]?.text.trim() ?? '' }));
    const categories = await tx.category.findMany({ select: { id: true, name: true, active: true } });
    const existing = await tx.product.findMany({ where: { OR: [{ sku: { in: codes.map(c => c.sku), mode: 'insensitive' } }, { barcode: { in: codes.flatMap(c => c.barcode ? [c.barcode] : []) } }] }, select: { sku: true, barcode: true } });
    return validateImportRows(rows, headers, mapping, job.categoryMappings as unknown as ImportCategoryMapping[], categories, existing);
  }
  private async view(job: ImportJob): Promise<ImportPreview> {
    const validation = job.status === 'COMPLETED' ? { issues: [], rows: [], unknownCategories: [] } : await this.validate(job);
    const invalidRows = new Set(validation.issues.filter(issue => issue.row > 0).map(issue => issue.row));
    return { id: job.id, status: job.status, revision: job.revision, fileName: job.fileName, format: job.format, delimiter: job.delimiter, createdAt: job.createdAt.toISOString(), headers: job.headers as string[], mapping: job.mapping as ImportMapping, categoryMappings: job.categoryMappings as unknown as ImportCategoryMapping[], totalRows: job.totalRows, ignoredRows: job.ignoredRows, validRows: validation.issues.some(issue => issue.row === 0) ? 0 : job.totalRows - invalidRows.size, issues: validation.issues, unknownCategories: validation.unknownCategories, rows: validation.rows.slice(0, 50).map(item => ({ row: item.row, sku: item.product.sku, name: item.product.name, category: item.category, unit: item.product.unit, initialStock: item.initialStock })), result: job.result as unknown as ImportResult | null, error: job.error };
  }
  async get(id: string, userId: string) { return this.view(await this.owned(id, userId)); }
  async setup(id: string, userId: string, body: unknown) {
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Revise o mapeamento de colunas e categorias.');
    const data = parsed.data;
    const job = await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "ImportJob" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const current = await this.owned(id, userId, tx);
      if (current.status === 'COMPLETED' || current.status === 'PROCESSING') throw new ConflictException('Esta importação não pode mais ser alterada.');
      if (current.revision !== data.revision) throw new ConflictException('A revisão mudou. Atualize a importação antes de continuar.');
      return tx.importJob.update({ where: { id }, data: { mapping: json(data.mapping), categoryMappings: json(data.categoryMappings), revision: { increment: 1 }, status: 'PREVIEW', error: null } });
    });
    return this.view(job);
  }
  async confirm(id: string, userId: string, body: unknown) {
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Atualize o preview antes de confirmar.');
    let started = false;
    try {
      const completed = await this.db.$transaction(async tx => {
        // This lock is the idempotency boundary. Concurrent confirmations wait
        // and observe the committed result; no independent per-product requests.
        await tx.$queryRaw`SELECT "id" FROM "ImportJob" WHERE "id" = ${id}::uuid FOR UPDATE`;
        const job = await this.owned(id, userId, tx);
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user?.active || !canImportProducts(user.role)) throw new ForbiddenException('Você não tem permissão para importar produtos.');
        if (job.status === 'COMPLETED' || job.status === 'FAILED') return job;
        if (job.revision !== parsed.data.revision) throw new ConflictException('A revisão mudou. Atualize a importação antes de continuar.');
        const validated = await this.validate(job, tx);
        if (validated.issues.length) throw new ConflictException('Há erros no arquivo ou mudanças no catálogo. Revise o preview antes de confirmar.');
        started = true;
        await tx.importJob.update({ where: { id }, data: { status: 'PROCESSING' } });
        const createdCategories = new Map<string, string>();
        for (const category of validated.newCategories) {
          const created = await tx.category.create({ data: { name: category.name, active: true } });
          createdCategories.set(categoryKey(category.source), created.id);
        }
        const inputs = validated.rows.map(row => ({ ...row.product, categoryId: createdCategories.get(categoryKey(row.category)) ?? row.product.categoryId }));
        const counts = await this.inventory.createImportProducts(tx, inputs, userId, id);
        const result: ImportResult = { ...counts, categories: createdCategories.size, ignoredRows: job.ignoredRows };
        return tx.importJob.update({ where: { id }, data: { status: 'COMPLETED', importedRows: counts.products, result: json(result), error: null } });
      }, { maxWait: 10000, timeout: 120000 });
      return this.view(completed);
    } catch (error) {
      if (!started) throw error;
      const message = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
        ? 'Outro cadastro usou um código ou categoria deste lote. Nenhum produto foi importado. Revise o arquivo.'
        : error instanceof HttpException ? 'A validação mudou durante a gravação. Nenhum produto foi importado. Revise o preview.'
        : 'A importação falhou e o lote inteiro foi revertido. Nenhum produto foi importado. Revise antes de tentar novamente.';
      // Failure is recorded only after rollback. Never replace a successful
      // result committed by another confirmation while this request was waiting.
      const job = await this.db.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "ImportJob" WHERE "id" = ${id}::uuid FOR UPDATE`;
        const current = await this.owned(id, userId, tx);
        if (current.status === 'COMPLETED' || current.revision !== parsed.data.revision) return current;
        return tx.importJob.update({ where: { id }, data: { status: 'FAILED', error: message, importedRows: 0 } });
      });
      return this.view(job);
    }
  }
  async template(format: string) {
    const headers = ['Nome', 'SKU', 'Código de barras', 'Categoria', 'Unidade', 'Estoque mínimo', 'Custo', 'Venda', 'Saldo inicial', 'Imagem URL'];
    if (format === 'csv') return Buffer.from('\uFEFF' + headers.join(';') + '\r\n', 'utf8');
    if (format !== 'xlsx') throw new BadRequestException('Escolha o modelo CSV ou XLSX.');
    const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet('Produtos');
    sheet.addRow(headers); sheet.getRow(1).font = { bold: true };
    headers.forEach((_, index) => { sheet.getColumn(index + 1).width = 22; sheet.getColumn(index + 1).numFmt = '@'; });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
