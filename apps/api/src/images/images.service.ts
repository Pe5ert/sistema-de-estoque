import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryStorage } from './cloudinary-storage';
import { prepareImage } from './image-file';

@Injectable()
export class ImagesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImagesService.name);
  private timer?: ReturnType<typeof setInterval>;
  private cleaning = false;
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(CloudinaryStorage) private readonly storage: CloudinaryStorage) {}
  onModuleInit() {
    if (this.storage.enabled) {
      this.timer = setInterval(() => { void this.cleanup().catch(() => this.logger.warn('Limpeza de imagens pendente; será tentada novamente.')); }, 15 * 60_000);
      this.timer.unref();
    }
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async upload(file: Express.Multer.File | undefined, ownerId: string) {
    if (!this.storage.enabled) throw new ServiceUnavailableException('O envio de imagens ainda não foi configurado.');
    const buffer = await prepareImage(file);
    const id = randomUUID(), publicId = `gavyo/products/${id}`;
    // Register first so a timeout / process crash cannot leave an untracked upload.
    await this.db.productImage.create({ data: { id, ownerId, publicId, expiresAt: new Date(Date.now() + 24 * 3600_000) } });
    const url = await this.storage.upload(publicId, buffer);
    await this.db.productImage.update({ where: { id }, data: { url, state: 'READY' } });
    return { imageUrl: url };
  }
  async cleanup() {
    if (this.cleaning || !this.storage.enabled) return;
    this.cleaning = true;
    try {
      const candidates = await this.db.productImage.findMany({ where: { state: { in: ['PENDING','READY','DELETING'] }, expiresAt: { lte: new Date() } }, orderBy: { expiresAt: 'asc' }, take: 50 });
      for (const candidate of candidates) {
        const claimed = await this.db.$transaction(async tx => {
          const rows = await tx.$queryRaw<{ state: string; url: string | null; expiresAt: Date | null }[]>`SELECT "state", "url", "expiresAt" FROM "ProductImage" WHERE "id" = ${candidate.id}::uuid FOR UPDATE`;
          const asset = rows[0];
          if (!asset || asset.state === 'DELETED' || !asset.expiresAt || asset.expiresAt > new Date()) return false;
          if (asset.url && await tx.product.count({ where: { imageUrl: asset.url } })) {
            await tx.productImage.update({ where: { id: candidate.id }, data: { state: 'READY', expiresAt: null } });
            return false;
          }
          await tx.productImage.update({ where: { id: candidate.id }, data: { state: 'DELETING' } });
          return true;
        });
        if (claimed) {
          try {
            await this.storage.destroy(candidate.publicId);
            await this.db.productImage.update({ where: { id: candidate.id }, data: { state: 'DELETED' } });
          } catch { this.logger.warn('Um arquivo não foi limpo; será tentado novamente.'); }
        }
      }
    } finally { this.cleaning = false; }
  }
}
