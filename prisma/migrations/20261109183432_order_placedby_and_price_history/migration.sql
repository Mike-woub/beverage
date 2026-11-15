-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "placedById" TEXT;

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "oldPrice" DECIMAL(12,2) NOT NULL,
    "newPrice" DECIMAL(12,2) NOT NULL,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceHistory_itemId_idx" ON "PriceHistory"("itemId");

-- CreateIndex
CREATE INDEX "PriceHistory_createdAt_idx" ON "PriceHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Order_placedById_idx" ON "Order"("placedById");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_placedById_fkey" FOREIGN KEY ("placedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
