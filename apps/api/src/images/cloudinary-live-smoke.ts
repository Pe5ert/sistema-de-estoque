import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { ConfigService } from '@nestjs/config';
import { CloudinaryStorage } from './cloudinary-storage';

async function main() {
  const path = process.env.IMAGE_CREDENTIALS_FILE;
  if (!path) throw new Error('Informe o arquivo local de configuração.');
  const source = dotenv.parse(readFileSync(path));
  const config = new ConfigService(Object.fromEntries(['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].map(key => [key, source[key]])));
  const storage = new CloudinaryStorage(config);
  const publicId = `gavyo/products/${randomUUID()}`;
  let created = false;
  try {
    const buffer = await sharp({ create: { width: 24, height: 24, channels: 3, background: '#465ee4' } }).webp().toBuffer();
    const url = await storage.upload(publicId, buffer); created = true;
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error('Não foi possível recuperar a imagem de teste.');
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    if (metadata.format !== 'webp' || metadata.width !== 24 || metadata.height !== 24) throw new Error('Imagem de teste inesperada.');
    console.log('CLOUDINARY_UPLOAD_AND_DOWNLOAD_OK');
  } finally {
    if (created) { await storage.destroy(publicId); console.log('CLOUDINARY_TEST_ASSET_REMOVED'); }
  }
}
void main().catch(() => { console.error('CLOUDINARY_LIVE_TEST_FAILED: confira as chaves e a conexão. Nenhum segredo foi registrado.'); process.exitCode = 1; });
