ALTER TYPE "MovementReason" ADD VALUE 'INITIAL_STOCK';
ALTER TABLE "Product" ADD COLUMN "imageUrl" VARCHAR(2048);
ALTER TABLE "Product" ALTER COLUMN "costPrice" DROP NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "salePrice" DROP NOT NULL;
-- Reject ambiguous legacy SKUs rather than silently rewriting existing data.
CREATE UNIQUE INDEX "Product_sku_lower_key" ON "Product" (lower("sku"));
