CREATE TYPE "PhysicalInventoryStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');
CREATE TABLE "PhysicalInventory" (
  "id" UUID NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "status" "PhysicalInventoryStatus" NOT NULL DEFAULT 'DRAFT',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "categoryId" UUID,
  "categoryName" VARCHAR(120),
  "createdById" UUID NOT NULL,
  "completedById" UUID,
  "cancelledById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancellationNotes" VARCHAR(1000),
  "adjustmentCount" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PhysicalInventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PhysicalInventory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PhysicalInventory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PhysicalInventory_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PhysicalInventory_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PhysicalInventory_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "PhysicalInventory_adjustments_check" CHECK ("adjustmentCount" BETWEEN 0 AND 500),
  CONSTRAINT "PhysicalInventory_title_check" CHECK (length(trim("title")) > 0),
  CONSTRAINT "PhysicalInventory_status_check" CHECK (
    ("status" = 'DRAFT' AND "completedAt" IS NULL AND "completedById" IS NULL AND "cancelledAt" IS NULL AND "cancelledById" IS NULL AND "adjustmentCount" = 0)
    OR ("status" = 'COMPLETED' AND "completedAt" IS NOT NULL AND "completedById" IS NOT NULL AND "cancelledAt" IS NULL AND "cancelledById" IS NULL)
    OR ("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL AND "cancelledById" IS NOT NULL AND "completedAt" IS NULL AND "completedById" IS NULL AND "adjustmentCount" = 0)
  )
);
CREATE INDEX "PhysicalInventory_status_createdAt_idx" ON "PhysicalInventory"("status", "createdAt");
CREATE INDEX "PhysicalInventory_createdById_createdAt_idx" ON "PhysicalInventory"("createdById", "createdAt");
CREATE TABLE "PhysicalInventoryItem" (
  "inventoryId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "sku" VARCHAR(80) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "unit" "ProductUnit" NOT NULL,
  "snapshotStock" DECIMAL(18,3) NOT NULL,
  "snapshotUpdatedAt" TIMESTAMP(3) NOT NULL,
  "snapshotMovementCount" INTEGER NOT NULL,
  "countedQuantity" DECIMAL(18,3),
  "notes" VARCHAR(1000),
  "countedById" UUID,
  "countedAt" TIMESTAMP(3),
  CONSTRAINT "PhysicalInventoryItem_pkey" PRIMARY KEY ("inventoryId", "productId"),
  CONSTRAINT "PhysicalInventoryItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "PhysicalInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PhysicalInventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PhysicalInventoryItem_countedById_fkey" FOREIGN KEY ("countedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PhysicalInventoryItem_quantity_check" CHECK ("snapshotStock" >= 0 AND ("countedQuantity" IS NULL OR "countedQuantity" >= 0) AND "snapshotMovementCount" >= 0),
  CONSTRAINT "PhysicalInventoryItem_count_author_check" CHECK (
    ("countedQuantity" IS NULL AND "countedById" IS NULL AND "countedAt" IS NULL)
    OR ("countedQuantity" IS NOT NULL AND "countedById" IS NOT NULL AND "countedAt" IS NOT NULL)
  )
);
CREATE INDEX "PhysicalInventoryItem_productId_idx" ON "PhysicalInventoryItem"("productId");
