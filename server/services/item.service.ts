import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiException, type AuthedUser } from "@/server/http";

interface CreateItemInput {
  name: string;
  category?: string;
  price: number;
  stock: number;
}
interface UpdateItemInput {
  name?: string;
  category?: string;
  price?: number;
}

function serialize(item: {
  id: string;
  name: string;
  category: string;
  price: Prisma.Decimal;
  stock: number;
  counterStock: number;
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
      const item = await tx.item.create({
        data: {
          name: input.name.trim(),
          category: input.category?.trim() || "Other",
          price: new Prisma.Decimal(input.price).toDecimalPlaces(2),
          stock: input.stock,
        },
      });
      // Record initial stock as an adjustment-in movement for the audit trail.
      if (input.stock > 0) {
        await tx.stockMovement.create({
          data: {
            itemId: item.id,
            userId: user.id,
            movementType: "ADJUSTMENT_IN",
            quantity: input.stock,
            description: "Initial stock on beverage creation",
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
      const item = await tx.item.update({
        where: { id: itemId },
        data: {
          name: input.name?.trim() ?? existing.name,
          category: input.category?.trim() ?? existing.category,
          price: newPrice,
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
