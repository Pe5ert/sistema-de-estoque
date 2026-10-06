CREATE TYPE "ImportStatus" AS ENUM ('PREVIEW', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TABLE "ImportJob" (
  "id" UUID NOT NULL,
  "status" "ImportStatus" NOT NULL DEFAULT 'PREVIEW',
  "createdBy" UUID NOT NULL,
  "fileName" VARCHAR(255) NOT NULL,
  "format" VARCHAR(4) NOT NULL,
  "delimiter" VARCHAR(1),
  "headers" JSONB NOT NULL,
  "rows" JSONB NOT NULL,
  "mapping" JSONB NOT NULL,
  "categoryMappings" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "totalRows" INTEGER NOT NULL,
  "ignoredRows" INTEGER NOT NULL DEFAULT 0,
  "importedRows" INTEGER NOT NULL DEFAULT 0,
  "result" JSONB,
  "error" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ImportJob_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ImportJob_counts_check" CHECK ("totalRows" BETWEEN 1 AND 2000 AND "importedRows" BETWEEN 0 AND "totalRows" AND "ignoredRows" >= 0 AND "revision" > 0)
);
CREATE INDEX "ImportJob_createdBy_createdAt_idx" ON "ImportJob"("createdBy", "createdAt");
