import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryStorage {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}
  get enabled() { return Boolean(this.config.get('CLOUDINARY_CLOUD_NAME') && this.config.get('CLOUDINARY_API_KEY') && this.config.get('CLOUDINARY_API_SECRET')); }
  private async request(action: 'upload' | 'destroy', body: FormData | URLSearchParams) {
    if (!this.enabled) throw new ServiceUnavailableException('O envio de imagens ainda não foi configurado.');
    const cloud = this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME');
    const authorization = Buffer.from(`${this.config.getOrThrow<string>('CLOUDINARY_API_KEY')}:${this.config.getOrThrow<string>('CLOUDINARY_API_SECRET')}`).toString('base64');
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/${action}`, { method: 'POST', headers: { Authorization: `Basic ${authorization}` }, body, signal: AbortSignal.timeout(30_000), redirect: 'error' });
      if (!response.ok) throw new Error('provider');
      return await response.json() as Record<string, unknown>;
    } catch {
      // Never expose credential-bearing requests or raw provider messages.
      throw new ServiceUnavailableException('Não foi possível enviar a imagem. Tente novamente.');
    }
  }
  async upload(publicId: string, buffer: Buffer) {
    const body = new FormData();
    body.set('file', new Blob([new Uint8Array(buffer)], { type: 'image/webp' }), 'product.webp');
    body.set('public_id', publicId); body.set('overwrite', 'false');
    const result = await this.request('upload', body);
    const cloud = this.config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME');
    if (result.public_id !== publicId || result.resource_type !== 'image' || result.format !== 'webp' || typeof result.secure_url !== 'string') throw new ServiceUnavailableException('Não foi possível enviar a imagem. Tente novamente.');
    const url = new URL(result.secure_url);
    const expected = `/${cloud}/image/upload/`;
    if (url.origin !== 'https://res.cloudinary.com' || url.username || url.password || url.search || url.hash || !url.pathname.startsWith(expected) || !/^v\d+$/.test(url.pathname.slice(expected.length).split('/')[0]) || !url.pathname.endsWith(`/${publicId}.webp`)) throw new ServiceUnavailableException('Não foi possível enviar a imagem. Tente novamente.');
    return url.href;
  }
  async destroy(publicId: string) {
    if (!/^gavyo\/products\/[0-9a-f-]{36}$/.test(publicId)) throw new Error('Invalid managed ID');
    const result = await this.request('destroy', new URLSearchParams({ public_id: publicId, invalidate: 'true' }));
    if (result.result !== 'ok' && result.result !== 'not found') throw new ServiceUnavailableException('Não foi possível limpar a imagem.');
  }
}
