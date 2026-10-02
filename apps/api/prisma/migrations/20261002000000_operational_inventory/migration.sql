ALTER TYPE "MovementReason" ADD VALUE 'INITIAL_STOCK';
ALTER TABLE "Product" ADD COLUMN "imageUrl" VARCHAR(2048);
ALTER TABLE "Product" ALTER COLUMN "costPrice" DROP NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "salePrice" DROP NOT NULL;
-- Reject ambiguous legacy SKUs rather than silently rewriting existing data.
CREATE UNIQUE INDEX "Product_sku_lower_key" ON "Product" (lower("sku"));
ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_nonnegative" CHECK ("stock" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_minimum_nonnegative" CHECK ("minimumStock" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_cost_nonnegative" CHECK ("costPrice" IS NULL OR "costPrice" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_sale_nonnegative" CHECK ("salePrice" IS NULL OR "salePrice" >= 0);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_balances_nonnegative" CHECK ("previousStock" >= 0 AND "resultingStock" >= 0);
