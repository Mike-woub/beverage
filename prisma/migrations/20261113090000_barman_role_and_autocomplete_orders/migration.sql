-- Role: add BARMAN (the order-taker at the POS terminal).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'BARMAN';

-- Orders auto-complete on submission: drop the status workflow entirely.
DROP INDEX IF EXISTS "Order_status_idx";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "status";
DROP TYPE IF EXISTS "OrderStatus";

-- MovementType: remove ORDER_CANCEL_IN (no cancellation flow anymore).
-- Postgres cannot drop an enum value in place, so recreate the type. Safe here
-- because the database was reset and holds no rows.
ALTER TABLE "StockMovement" ALTER COLUMN "movementType" TYPE TEXT;
DROP TYPE "MovementType";
CREATE TYPE "MovementType" AS ENUM ('ORDER_OUT', 'RECEIPT_IN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT');
ALTER TABLE "StockMovement"
  ALTER COLUMN "movementType" TYPE "MovementType" USING ("movementType"::"MovementType");
