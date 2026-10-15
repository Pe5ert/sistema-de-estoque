export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
export function imageFileError(file: { size: number; type: string }) {
  if (!file.size) return 'O arquivo está vazio.';
  if (file.size > MAX_PRODUCT_IMAGE_BYTES) return 'A imagem deve ter até 5 MB.';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Use uma imagem JPG, PNG ou WebP.';
  return '';
}
