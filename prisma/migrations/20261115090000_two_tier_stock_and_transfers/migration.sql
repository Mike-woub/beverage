-- Two-tier stock + transfer requests; remove STOREKEEPER role.
-- Safe to run destructively: the database was reset and holds no rows.

-- 1. Counter (bar) stock on Item, with non-negative guard.
ALTER TABLE "Item" ADD COLUMN "counterStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Item" ADD CONSTRAINT "Item_counterStock_nonneg" CHECK ("counterStock" >= 0);

-- 2. Remove STOREKEEPER from the Role enum (recreate the type).
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT;
DROP TYPE "Role";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BARMAN', 'WAITER');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::"Role");

-- 3. Add TRANSFER movement types.
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'TRANSFER_OUT';
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'TRANSFER_IN';

-- 4. Transfer request status enum.
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- 5. TransferRequest table.
CREATE TABLE "TransferRequest" (
  "id"          TEXT NOT NULL,
  "itemId"      TEXT NOT NULL,
  "quantity"    INTEGER NOT NULL,
  "status"      "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "requestedBy" TEXT NOT NULL,
  "decidedBy"   TEXT,
  "note"        TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt"   TIMESTAMP(3),
  CONSTRAINT "TransferRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TransferRequest_quantity_pos" CHECK ("quantity" > 0)
);

CREATE INDEX "TransferRequest_status_idx" ON "TransferRequest"("status");
CREATE INDEX "TransferRequest_itemId_idx" ON "TransferRequest"("itemId");
CREATE INDEX "TransferRequest_createdAt_idx" ON "TransferRequest"("createdAt");

ALTER TABLE "TransferRequest"
  ADD CONSTRAINT "TransferRequest_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferRequest"
  ADD CONSTRAINT "TransferRequest_requestedBy_fkey"
  FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferRequest"
  ADD CONSTRAINT "TransferRequest_decidedBy_fkey"
  FOREIGN KEY ("decidedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
