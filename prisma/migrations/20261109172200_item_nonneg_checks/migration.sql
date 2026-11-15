-- Non-negative guards for Item.price and Item.stock.
-- Prisma's schema cannot express CHECK constraints, so they are added here as a
-- dedicated migration. This makes the database the final owner of the invariant
-- (in addition to Zod validation and atomic conditional stock updates in the
-- application/service layer), per the Phase 1 design contract.
ALTER TABLE "Item" ADD CONSTRAINT "Item_price_nonneg" CHECK ("price" >= 0);
ALTER TABLE "Item" ADD CONSTRAINT "Item_stock_nonneg" CHECK ("stock" >= 0);
