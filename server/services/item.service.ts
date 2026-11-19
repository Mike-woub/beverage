import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiException, type AuthedUser } from "@/server/http";

interface CreateItemInput {
  name: string;
  category?: string;
  price: number;
  stock: number;
  costPrice?: number;
  shotsPerUnit?: number;
  shotPrice?: number;
}
interface UpdateItemInput {
  name?: string;
  category?: string;
  price?: number;
  shotsPerUnit?: number;
  shotPrice?: number | null;
  physicalCount?: number | null;
}

function serialize(item: {
  id: string;
  name: string;
  category: string;
  price: Prisma.Decimal;
  stock: number;
  counterStock: number;
  shotsPerUnit: number;
  shotPrice?: Prisma.Decimal | null;
  physicalCount?: number | null;
  lastPhysicalCheckAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    price: Number(item.price),
    stock: item.stock, // warehouse
    counterStock: item.counterStock, // bar/counter
    shotsPerUnit: item.shotsPerUnit ?? 1,
    shotPrice: item.shotPrice ? Number(item.shotPrice) : null,
    physicalCount: item.physicalCount ?? null,
    lastPhysicalCheckAt: item.lastPhysicalCheckAt ? item.lastPhysicalCheckAt.toISOString() : null,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export const itemService = {
  async list() {
    const items = await prisma.item.findMany({ orderBy: { name: "asc" } });
    return items.map(serialize);
  },

  /** Beverages sellable at the counter (active + counterStock > 0). */
  async listAvailable() {
    const items = await prisma.item.findMany({
      where: { isActive: true, counterStock: { gt: 0 } },
      orderBy: { name: "asc" },
    });
    return items.map(serialize);
  },

  async create(user: AuthedUser, input: CreateItemInput) {
    return prisma.$transaction(async (tx) => {
      const shotsPerUnit = Math.max(1, input.shotsPerUnit ?? 1);
      const shotPrice =
        input.shotPrice !== undefined && input.shotPrice !== null
          ? new Prisma.Decimal(input.shotPrice).toDecimalPlaces(2)
          : null;

      const item = await tx.item.create({
        data: {
          name: input.name.trim(),
          category: input.category?.trim() || "Other",
          price: new Prisma.Decimal(input.price).toDecimalPlaces(2),
          stock: input.stock,
          shotsPerUnit,
          shotPrice,
        },
      });

      // Requirement 1: "when first registering opening stock incorporate too item price as stock purchase then we can calculate profit in the revenue tab"
      if (input.stock > 0) {
        const unitCost =
          input.costPrice !== undefined && input.costPrice !== null
            ? new Prisma.Decimal(input.costPrice).toDecimalPlaces(2)
            : new Prisma.Decimal(input.price).toDecimalPlaces(2);

        const receipt = await tx.stockReceipt.create({
          data: {
            itemId: item.id,
            userId: user.id,
            quantity: input.stock,
            unitCost,
          },
        });

        await tx.stockMovement.create({
          data: {
            itemId: item.id,
            stockReceiptId: receipt.id,
            userId: user.id,
            movementType: "RECEIPT_IN",
            quantity: input.stock,
            description: `Initial stock purchase (${input.stock} bulk units)`,
          },
        });
      }
      return serialize(item);
    });
  },

  async update(user: AuthedUser, itemId: string, input: UpdateItemInput) {
    const existing = await prisma.item.findUnique({ where: { id: itemId } });
    if (!existing) throw new ApiException("Beverage not found", 404);

    const newPrice =
      input.price !== undefined
        ? new Prisma.Decimal(input.price).toDecimalPlaces(2)
        : existing.price;
    const priceChanged = !newPrice.equals(existing.price);

    return prisma.$transaction(async (tx) => {
      const shotPrice =
        input.shotPrice !== undefined
          ? input.shotPrice !== null
            ? new Prisma.Decimal(input.shotPrice).toDecimalPlaces(2)
            : null
          : existing.shotPrice;

      const item = await tx.item.update({
        where: { id: itemId },
        data: {
          name: input.name?.trim() ?? existing.name,
          category: input.category?.trim() ?? existing.category,
          price: newPrice,
          shotsPerUnit: input.shotsPerUnit !== undefined ? Math.max(1, input.shotsPerUnit) : existing.shotsPerUnit,
          shotPrice,
          physicalCount: input.physicalCount !== undefined ? input.physicalCount : existing.physicalCount,
          lastPhysicalCheckAt: input.physicalCount !== undefined ? new Date() : existing.lastPhysicalCheckAt,
        },
      });
      // Document every selling-price change (ADMIN-only action) for the audit trail.
      if (priceChanged) {
        await tx.priceHistory.create({
          data: {
            itemId,
            oldPrice: existing.price,
            newPrice,
            changedBy: user.id,
          },
        });
      }
      return serialize(item);
    });
  },

  async setPhysicalCheck(itemId: string, physicalCount: number | null) {
    const existing = await prisma.item.findUnique({ where: { id: itemId } });
    if (!existing) throw new ApiException("Beverage not found", 404);
    const item = await prisma.item.update({
      where: { id: itemId },
      data: {
        physicalCount,
        lastPhysicalCheckAt: physicalCount !== null ? new Date() : null,
      },
    });
    return serialize(item);
  },

  async priceHistory(itemId: string) {
    const rows = await prisma.priceHistory.findMany({
      where: { itemId },
      orderBy: { createdAt: "desc" },
      include: { changedByUser: { select: { username: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      itemId: r.itemId,
      oldPrice: Number(r.oldPrice),
      newPrice: Number(r.newPrice),
      changedBy: r.changedByUser.username,
      createdAt: r.createdAt.toISOString(),
    }));
  },

  async setActive(itemId: string, isActive: boolean) {
    const existing = await prisma.item.findUnique({ where: { id: itemId } });
    if (!existing) throw new ApiException("Beverage not found", 404);
    const item = await prisma.item.update({ where: { id: itemId }, data: { isActive } });
    return serialize(item);
  },
};
