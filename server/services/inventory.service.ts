import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiException, type AuthedUser } from "@/server/http";

interface ReceiptInput {
  itemId: string;
  quantity: number;
  unitCost: number;
  description?: string;
}
interface AdjustmentInput {
  itemId: string;
  pool: "WAREHOUSE" | "COUNTER";
  direction: "IN" | "OUT";
  quantity: number;
  reason: string;
}

export const inventoryService = {
  async listReceipts() {
    const receipts = await prisma.stockReceipt.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        item: { select: { name: true } },
        user: { select: { username: true } },
        // The description lives on the RECEIPT_IN movement, not the receipt row.
        stockMovements: {
          where: { movementType: "RECEIPT_IN" },
          select: { description: true },
          take: 1,
        },
      },
    });
    return receipts.map((r) => ({
      id: r.id,
      itemId: r.itemId,
      itemName: r.item.name,
      userId: r.userId,
      userName: r.user.username,
      quantity: r.quantity,
      unitCost: Number(r.unitCost),
      description: r.stockMovements[0]?.description ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  },

  async createReceipt(user: AuthedUser, input: ReceiptInput) {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; name: string }>>`
        SELECT "id", "name" FROM "Item" WHERE "id" = ${input.itemId} FOR UPDATE
      `;
      if (!rows[0]) throw new ApiException("Beverage not found", 404);

      await tx.$executeRaw`
        UPDATE "Item"
        SET "stock" = "stock" + ${input.quantity}, "updatedAt" = NOW()
        WHERE "id" = ${input.itemId}
      `;

      const receipt = await tx.stockReceipt.create({
        data: {
          itemId: input.itemId,
          userId: user.id,
          quantity: input.quantity,
          unitCost: new Prisma.Decimal(input.unitCost).toDecimalPlaces(2),
        },
      });

      // @@unique([stockReceiptId, movementType]) prevents a duplicate RECEIPT_IN.
      await tx.stockMovement.create({
        data: {
          itemId: input.itemId,
          stockReceiptId: receipt.id,
          userId: user.id,
          movementType: "RECEIPT_IN",
          quantity: input.quantity,
          description: input.description?.trim() || null,
        },
      });

      return {
        id: receipt.id,
        itemId: receipt.itemId,
        itemName: rows[0].name,
        userId: receipt.userId,
        userName: user.username,
        quantity: receipt.quantity,
        unitCost: Number(receipt.unitCost),
        description: input.description?.trim() || null,
        createdAt: receipt.createdAt.toISOString(),
      };
    });
  },

  async createAdjustment(user: AuthedUser, input: AdjustmentInput) {
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ id: string; name: string; stock: number; counterStock: number }>
      >`
        SELECT "id", "name", "stock", "counterStock" FROM "Item" WHERE "id" = ${input.itemId} FOR UPDATE
      `;
      const row = rows[0];
      if (!row) throw new ApiException("Beverage not found", 404);

      const col = input.pool === "COUNTER" ? "counterStock" : "stock";
      const current = input.pool === "COUNTER" ? row.counterStock : row.stock;
      const poolLabel = input.pool === "COUNTER" ? "counter" : "warehouse";

      if (input.direction === "OUT") {
        if (current < input.quantity) {
          throw new ApiException(`Cannot reduce ${poolLabel} stock below zero`, 409);
        }
        await tx.$executeRawUnsafe(
          `UPDATE "Item" SET "${col}" = "${col}" - $1, "updatedAt" = NOW() WHERE "id" = $2 AND "${col}" >= $1`,
          input.quantity,
          input.itemId,
        );
      } else {
        await tx.$executeRawUnsafe(
          `UPDATE "Item" SET "${col}" = "${col}" + $1, "updatedAt" = NOW() WHERE "id" = $2`,
          input.quantity,
          input.itemId,
        );
      }

      const movement = await tx.stockMovement.create({
        data: {
          itemId: input.itemId,
          userId: user.id,
          movementType: input.direction === "OUT" ? "ADJUSTMENT_OUT" : "ADJUSTMENT_IN",
          quantity: input.quantity,
          description: `[${poolLabel}] ${input.reason.trim()}`,
        },
      });

      return {
        id: movement.id,
        itemId: movement.itemId,
        itemName: row.name,
        userId: movement.userId,
        userName: user.username,
        movementType: movement.movementType,
        quantity: movement.quantity,
        description: movement.description,
        relatedOrderNumber: null,
        relatedReceiptId: null,
        createdAt: movement.createdAt.toISOString(),
      };
    });
  },

  async listMovements() {
    const movements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        item: { select: { name: true } },
        user: { select: { username: true } },
        orderItem: { include: { order: { select: { orderNumber: true } } } },
      },
    });
    return movements.map((m) => ({
      id: m.id,
      itemId: m.itemId,
      itemName: m.item.name,
      userId: m.userId,
      userName: m.user.username,
      movementType: m.movementType,
      quantity: m.quantity,
      description:
        m.description ??
        (m.movementType === "ORDER_OUT" ? `Sold by ${m.user.username}` : null),
      relatedOrderNumber: m.orderItem?.order.orderNumber ?? null,
      relatedReceiptId: m.stockReceiptId,
      createdAt: m.createdAt.toISOString(),
    }));
  },

  async getSetting() {
    const setting = await prisma.inventorySetting.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton", lowStockThreshold: 10 },
    });
    return {
      id: setting.id,
      lowStockThreshold: setting.lowStockThreshold,
      updatedAt: setting.updatedAt.toISOString(),
    };
  },

  async updateSetting(lowStockThreshold: number) {
    const setting = await prisma.inventorySetting.upsert({
      where: { id: "singleton" },
      update: { lowStockThreshold },
      create: { id: "singleton", lowStockThreshold },
    });
    return {
      id: setting.id,
      lowStockThreshold: setting.lowStockThreshold,
      updatedAt: setting.updatedAt.toISOString(),
    };
  },
};
