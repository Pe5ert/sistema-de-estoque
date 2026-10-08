import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import sharp from 'sharp';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 20_000_000;
const formats: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export async function prepareImage(file?: { buffer: Buffer; mimetype: string }) {
  if (!file?.buffer?.length) throw new BadRequestException('Selecione uma imagem.');
  if (file.buffer.length > MAX_IMAGE_BYTES) throw new PayloadTooLargeException('A imagem deve ter até 5 MB.');
  try {
    const image = sharp(file.buffer, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!metadata.format || formats[metadata.format] !== file.mimetype || (metadata.pages ?? 1) > 1 || !metadata.width || !metadata.height || metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
      throw new Error('format');
    }
    // Decode fully, correct phone orientation and discard EXIF/GPS metadata.
    return await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).timeout({ seconds: 10 }).toBuffer();
  } catch {
    throw new BadRequestException('Use uma imagem JPG, PNG ou WebP válida, sem animação e com até 20 megapixels.');
  }
}
