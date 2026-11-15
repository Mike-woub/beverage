-- Order voiding + Item category

-- 1. Add VOID_IN to MovementType enum
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'VOID_IN';

-- 2. Add void columns to Order
ALTER TABLE "Order" ADD COLUMN "isVoided" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "voidReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "voidedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "voidedById" TEXT;

CREATE INDEX "Order_isVoided_idx" ON "Order"("isVoided");

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_voidedById_fkey"
  FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Add category to Item
ALTER TABLE "Item" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Other';

CREATE INDEX "Item_category_idx" ON "Item"("category");

-- Backfill initial categories based on known items
UPDATE "Item" SET "category" = 'Soft Drinks' WHERE "name" IN ('Coca-Cola', 'Sprite', 'Fanta Orange');
UPDATE "Item" SET "category" = 'Water & Juice' WHERE "name" IN ('Bottled Water', 'Fresh Orange Juice');
UPDATE "Item" SET "category" = 'Hot Drinks' WHERE "name" IN ('Espresso', 'Macchiato');
UPDATE "Item" SET "category" = 'Beer' WHERE "name" ILIKE '%Beer%';
