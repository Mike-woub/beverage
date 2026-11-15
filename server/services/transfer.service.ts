import { prisma } from "@/lib/prisma";
import { ApiException, type AuthedUser } from "@/server/http";

/**
 * Transfer requests move stock from the WAREHOUSE (Item.stock) to the COUNTER
 * (Item.counterStock). A barman requests; an admin approves (performs the atomic
 * move + TRANSFER_OUT/TRANSFER_IN movements) or rejects. Only approval changes
 * stock, and it re-checks warehouse availability under a row lock.
 */

interface CreateTransferInput {
  itemId: string;
  quantity: number;
  note?: string;
}

function serialize(r: {
  id: string;
  itemId: string;
  quantity: number;
  status: string;
  note: string | null;
  createdAt: Date;
  decidedAt: Date | null;
  item: { name: string };
  requestedByUser: { username: string };
  decidedByUser: { username: string } | null;
}) {
  return {
    id: r.id,
    itemId: r.itemId,
    itemName: r.item.name,
    quantity: r.quantity,
    status: r.status as "PENDING" | "APPROVED" | "REJECTED",
    note: r.note,
    requestedBy: r.requestedByUser.username,
    decidedBy: r.decidedByUser?.username ?? null,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
  };
}

const INCLUDE = {
  item: { select: { name: true } },
  requestedByUser: { select: { username: true } },
  decidedByUser: { select: { username: true } },
} as const;

export const transferService = {
  /** List transfer requests, newest first (ADMIN sees all; BARMAN sees all too). */
  async list() {
    const rows = await prisma.transferRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: INCLUDE,
    });
    return rows.map(serialize);
  },

  /** Barman (or admin) requests a warehouse → counter transfer. */
  async create(user: AuthedUser, input: CreateTransferInput) {
    const item = await prisma.item.findUnique({ where: { id: input.itemId } });
    if (!item) throw new ApiException("Beverage not found", 404);
    if (input.quantity <= 0) throw new ApiException("Quantity must be greater than zero", 422);

    const created = await prisma.transferRequest.create({
      data: {
        itemId: input.itemId,
        quantity: Math.floor(input.quantity),
        requestedBy: user.id,
        note: input.note?.trim() || null,
      },
      include: INCLUDE,
    });
    return serialize(created);
  },

  /** Admin approves: atomic warehouse → counter move + TRANSFER movements. */
  async approve(user: AuthedUser, requestId: string) {
    return prisma.$transaction(async (tx) => {
      // Lock the request row to prevent double-approval.
      const reqRows = await tx.$queryRaw<
        Array<{ id: string; itemId: string; quantity: number; status: string }>
      >`
        SELECT "id", "itemId", "quantity", "status"
        FROM "TransferRequest"
        WHERE "id" = ${requestId}
        FOR UPDATE
      `;
      const reqRow = reqRows[0];
      if (!reqRow) throw new ApiException("Transfer request not found", 404);
      if (reqRow.status !== "PENDING") {
        throw new ApiException("This request has already been decided", 409);
      }

      // Lock the item and verify warehouse has enough.
      const itemRows = await tx.$queryRaw<Array<{ id: string; name: string; stock: number }>>`
        SELECT "id", "name", "stock" FROM "Item" WHERE "id" = ${reqRow.itemId} FOR UPDATE
      `;
      const item = itemRows[0];
      if (!item) throw new ApiException("Beverage not found", 404);
      if (item.stock < reqRow.quantity) {
        throw new ApiException(
          `Not enough warehouse stock for "${item.name}" (requested ${reqRow.quantity}, warehouse ${item.stock})`,
          409,
        );
      }

      // Move: warehouse down, counter up (atomic, guarded).
      const moved = await tx.$executeRaw`
        UPDATE "Item"
        SET "stock" = "stock" - ${reqRow.quantity},
            "counterStock" = "counterStock" + ${reqRow.quantity},
            "updatedAt" = NOW()
        WHERE "id" = ${reqRow.itemId} AND "stock" >= ${reqRow.quantity}
      `;
      if (moved !== 1) {
        throw new ApiException(`Not enough warehouse stock for "${item.name}"`, 409);
      }

      // Audit: one movement out of the warehouse, one into the counter.
      await tx.stockMovement.create({
        data: {
          itemId: reqRow.itemId,
          userId: user.id,
          movementType: "TRANSFER_OUT",
          quantity: reqRow.quantity,
          description: `Transfer to counter (request ${reqRow.id})`,
        },
      });
      await tx.stockMovement.create({
        data: {
          itemId: reqRow.itemId,
          userId: user.id,
          movementType: "TRANSFER_IN",
          quantity: reqRow.quantity,
          description: `Transfer from warehouse (request ${reqRow.id})`,
        },
      });

      const updated = await tx.transferRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", decidedBy: user.id, decidedAt: new Date() },
        include: INCLUDE,
      });
      return serialize(updated);
    });
  },

  /** Admin rejects: no stock change. */
  async reject(user: AuthedUser, requestId: string) {
    const existing = await prisma.transferRequest.findUnique({ where: { id: requestId } });
    if (!existing) throw new ApiException("Transfer request not found", 404);
    if (existing.status !== "PENDING") {
      throw new ApiException("This request has already been decided", 409);
    }
    const updated = await prisma.transferRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", decidedBy: user.id, decidedAt: new Date() },
      include: INCLUDE,
    });
    return serialize(updated);
  },
};
