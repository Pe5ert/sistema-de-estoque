CREATE TYPE "BuyerIdentification" AS ENUM ('IDENTIFIED', 'ANONYMOUS');
CREATE TABLE "Customer" (
  "id" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Customer_name_nonempty" CHECK (length(trim("name")) > 0)
);
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");
CREATE INDEX "Customer_name_active_idx" ON "Customer"("name", "active");
ALTER TABLE "StockMovement"
  ADD COLUMN "customerId" UUID,
  ADD COLUMN "buyerIdentification" "BuyerIdentification",
  ADD COLUMN "customerNameSnapshot" VARCHAR(120),
  ADD COLUMN "customerCodeSnapshot" VARCHAR(40),
  ADD COLUMN "requestId" UUID,
  ADD COLUMN "requestHash" VARCHAR(64);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_buyer_consistency" CHECK (
  ("buyerIdentification" IS NULL AND "customerId" IS NULL AND "customerNameSnapshot" IS NULL AND "customerCodeSnapshot" IS NULL)
  OR ("buyerIdentification" IS NOT NULL AND "type" = 'EXIT' AND "reason" = 'SALE' AND (
    ("buyerIdentification" = 'ANONYMOUS' AND "customerId" IS NULL AND "customerNameSnapshot" IS NULL AND "customerCodeSnapshot" IS NULL)
    OR ("buyerIdentification" = 'IDENTIFIED' AND "customerId" IS NOT NULL AND "customerNameSnapshot" IS NOT NULL AND "customerCodeSnapshot" IS NOT NULL)
  ))
);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_request_consistency" CHECK (("requestId" IS NULL) = ("requestHash" IS NULL));
CREATE UNIQUE INDEX "StockMovement_userId_requestId_key" ON "StockMovement"("userId", "requestId");
CREATE INDEX "StockMovement_customerId_createdAt_idx" ON "StockMovement"("customerId", "createdAt");
