import { BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { parse } from 'csv-parse/sync';
import { fromBuffer } from 'yauzl';

export const MAX_IMPORT_ROWS = 2000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_COLUMNS = 30;
const MAX_EXPANDED = 20 * 1024 * 1024;
export type ImportCell = { text: string; numeric?: boolean; error?: string };
export type FileRow = { row: number; cells: ImportCell[] };
export type ParsedImport = { headers: string[]; rows: FileRow[]; format: 'csv' | 'xlsx'; delimiter: string | null; ignoredRows: number };

// Drain ZIP entries under a cumulative expansion limit before workbook parsing.
// Check real inflated bytes too, not only untrusted central-directory metadata.
async function boundedArchive(buffer: Buffer) {
  await new Promise<void>((resolve, reject) => {
    fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true }, (error, zip) => {
      if (error || !zip) return reject(new BadRequestException('XLSX inválido. Salve uma nova cópia do arquivo.'));
      let size = 0, entries = 0;
      const fail = () => { zip.close(); reject(new BadRequestException('XLSX inválido ou muito grande após descompactar (limite 20 MB).')); };
      zip.on('error', fail); zip.on('end', resolve);
      zip.on('entry', entry => {
        if (++entries > 1000 || entry.uncompressedSize > MAX_EXPANDED || entry.generalPurposeBitFlag & 1) return fail();
        if (entry.fileName.endsWith('/')) return zip.readEntry();
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) return fail();
          stream.on('error', fail);
          stream.on('data', chunk => { size += chunk.length; if (size > MAX_EXPANDED) { stream.destroy(); fail(); } });
          stream.on('end', () => zip.readEntry());
        });
      });
      zip.readEntry();
    });
  });
}
function spreadsheetCell(value: ExcelJS.CellValue): ImportCell {
  if (value == null) return { text: '' };
  if (typeof value === 'string') return { text: value };
  if (typeof value === 'number') return { text: String(value), numeric: true };
  if (typeof value === 'object' && !(value instanceof Date)) {
    if ('richText' in value) return { text: value.richText.map(part => part.text).join('') };
    if ('formula' in value || 'sharedFormula' in value) {
      if ('formula' in value && /\[|https?:|\|/i.test(value.formula ?? '')) return { text: '', error: 'Fórmula externa não aceita. Cole o valor como texto.' };
      if (typeof value.result === 'string') return { text: value.result };
      if (typeof value.result === 'number' && Number.isFinite(value.result)) return { text: String(value.result), numeric: true };
      return { text: '', error: 'Fórmula sem resultado válido. Recalcule no Excel e cole os valores.' };
    }
  }
  return { text: '', error: 'Tipo de célula não aceito. Use texto ou número.' };
}
export async function parseImportFile(name: string, buffer: Buffer): Promise<ParsedImport> {
  if (!buffer.length || buffer.length > MAX_IMPORT_BYTES) throw new BadRequestException('Envie um arquivo com até 5 MB.');
  const format = name.toLowerCase().endsWith('.xlsx') ? 'xlsx' : name.toLowerCase().endsWith('.csv') ? 'csv' : null;
  if (!format) throw new BadRequestException('Use um arquivo CSV ou XLSX.');
  let records: FileRow[], delimiter: string | null = null, emptyCsvLines = 0;
  if (format === 'csv') {
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
    catch { throw new BadRequestException('CSV deve estar em UTF-8. Salve como CSV UTF-8 no Excel.'); }
    if ((text.match(/\n/g)?.length ?? 0) > 10000) throw new BadRequestException('CSV excede 10.000 linhas físicas. Remova linhas excedentes.');
    const candidates = [',', ';', '\t'].flatMap(separator => {
      try {
        const rows = parse(text, { bom: true, delimiter: separator, cast: false, skip_empty_lines: true, info: true, max_record_size: 65536 }) as unknown as { record: string[]; info: { lines: number; empty_lines: number } }[];
        return rows[0]?.record.length > 1 ? [{ separator, rows }] : [];
      } catch { return []; }
    }).sort((a, b) => b.rows[0].record.length - a.rows[0].record.length);
    if (!candidates.length) throw new BadRequestException('CSV inválido. Use cabeçalho e colunas separadas por vírgula, ponto e vírgula ou tabulação.');
    if (candidates[1]?.rows[0].record.length === candidates[0].rows[0].record.length) throw new BadRequestException('Separador ambíguo. Salve o CSV com um único separador.');
    delimiter = candidates[0].separator;
    emptyCsvLines = candidates[0].rows.at(-1)!.info.empty_lines - candidates[0].rows[0].info.empty_lines;
    records = candidates[0].rows.map(({ record, info }) => ({ row: info.lines, cells: record.map(text => ({ text })) }));
  } else {
    await boundedArchive(buffer);
    const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]); }
    catch { throw new BadRequestException('Não foi possível ler o XLSX. Salve uma cópia válida, sem senha.'); }
    const sheets = workbook.worksheets.filter(sheet => sheet.actualRowCount > 0);
    if (sheets.length !== 1) throw new BadRequestException('Use exatamente uma aba preenchida no XLSX.');
    const sheet = sheets[0];
    if (sheet.columnCount > MAX_COLUMNS || sheet.rowCount > 10000) throw new BadRequestException('Arquivo excede 30 colunas ou 10.000 linhas físicas. Remova linhas/colunas excedentes.');
    records = [];
    sheet.eachRow({ includeEmpty: true }, (row, index) => {
      const cells = Array.from({ length: sheet.columnCount }, (_, i) => spreadsheetCell(row.getCell(i + 1).value));
      records.push({ row: index, cells });
    });
  }
  const headerIndex = records.findIndex(record => record.cells.some(cell => cell.text.trim() || cell.error));
  if (headerIndex < 0) throw new BadRequestException('O arquivo está vazio.');
  const header = records[headerIndex];
  const headers = header.cells.map(cell => cell.text.trim());
  if (headers.length > MAX_COLUMNS || headers.some((name, i) => !name || name.length > 120 || header.cells[i].error) || new Set(headers.map(name => name.toLowerCase())).size !== headers.length) throw new BadRequestException('Use até 30 colunas, com cabeçalhos preenchidos e diferentes.');
  const data = records.slice(headerIndex + 1);
  const rows = data.filter(record => record.cells.some(cell => cell.text.trim() || cell.error));
  if (!rows.length) throw new BadRequestException('Inclua pelo menos um produto abaixo do cabeçalho.');
  if (rows.length > MAX_IMPORT_ROWS) throw new BadRequestException('Limite de 2.000 produtos por importação. Divida a planilha em lotes menores.');
  if (rows.some(row => row.cells.some(cell => cell.text.length > 2048))) throw new BadRequestException('Uma célula excede 2.048 caracteres. Revise o arquivo.');
  return { headers, rows, format, delimiter, ignoredRows: data.length - rows.length + emptyCsvLines };
}
