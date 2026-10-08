CREATE TYPE "ProductImageState" AS ENUM ('PENDING', 'READY', 'DELETING', 'DELETED');
CREATE TABLE "ProductImage" (
  "id" UUID NOT NULL,
  "ownerId" UUID NOT NULL,
  "publicId" VARCHAR(200) NOT NULL,
  "url" VARCHAR(2048),
  "state" "ProductImageState" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductImage_publicId_key" ON "ProductImage"("publicId");
CREATE UNIQUE INDEX "ProductImage_url_key" ON "ProductImage"("url");
CREATE INDEX "ProductImage_state_expiresAt_idx" ON "ProductImage"("state", "expiresAt");
