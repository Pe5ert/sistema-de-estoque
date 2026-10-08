import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';

export function isManagedImage(url?: string | null) {
  return Boolean(url && /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/v\d+\/gavyo\/products\/[0-9a-f-]{36}\.webp$/.test(url));
}

// Same lock used by cleanup: a product can never claim an image being deleted.
export async function claimImage(tx: Prisma.TransactionClient, url: string | null | undefined, ownerId: string | undefined, previousUrl?: string | null) {
  if (!isManagedImage(url)) return;
  const rows = await tx.$queryRaw<{ id: string; ownerId: string; state: string; expiresAt: Date | null }[]>`SELECT "id", "ownerId", "state", "expiresAt" FROM "ProductImage" WHERE "url" = ${url} FOR UPDATE`;
  const asset = rows[0];
  if (!asset || asset.state !== 'READY' || (asset.expiresAt && asset.expiresAt <= new Date())) throw new BadRequestException('A imagem enviada expirou ou está indisponível. Selecione o arquivo novamente.');
  if (url !== previousUrl && asset.ownerId !== ownerId) throw new ForbiddenException('A imagem enviada pertence a outro usuário.');
  await tx.productImage.update({ where: { id: asset.id }, data: { expiresAt: null } });
}

export async function releaseImage(tx: Prisma.TransactionClient, previousUrl: string | null, nextUrl: string | null | undefined, retentionDays: number) {
  if (nextUrl === undefined || previousUrl === nextUrl || !isManagedImage(previousUrl)) return;
  await tx.$queryRaw`SELECT "id" FROM "ProductImage" WHERE "url" = ${previousUrl} FOR UPDATE`;
  if (await tx.product.count({ where: { imageUrl: previousUrl } })) return;
  await tx.productImage.updateMany({ where: { url: previousUrl, state: 'READY' }, data: { expiresAt: new Date(Date.now() + retentionDays * 86400_000) } });
}
