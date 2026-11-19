import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiException, type AuthedUser } from "@/server/http";

/**
 * Order service — the transactional heart of the system.
 *
 * Orders are taken by a BARMAN (or ADMIN) at the terminal and attributed to a
 * WAITER. They complete immediately on submission — there is no SUBMITTED /
 * cancel / complete workflow.
 *
 * Stock deduction uses a PostgreSQL interactive transaction with row-level
 * locking (SELECT ... FOR UPDATE) via parameterized raw SQL, because Prisma has
 * no high-level API for row locks. This prevents two concurrent orders from
 * both reading the same stock and overselling it (negative inventory). All
 * totals are computed on the server from DB prices; the client's numbers are
 * never trusted. Everything commits atomically or rolls back.
 */

interface OrderLineInput {
  itemId: string;
  quantity: number;
}

function round2(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2);
}

const TZ = "Africa/Addis_Ababa";

/** The Africa/Addis_Ababa calendar day (YYYY-MM-DD) for a given instant. */
function addisDayKey(d: Date): string {
  // en-CA formats as YYYY-MM-DD; fix the timezone so grouping is by local day.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * UTC instant range [start, end) covering the Addis-Ababa calendar day
 * `dayKey` (YYYY-MM-DD). Addis Ababa is UTC+3 with no DST, so the local day
 * starts at 21:00 UTC the previous day.
 */
function addisDayRangeUtc(dayKey: string): { start: Date; end: Date } {
  const [y, m, d] = dayKey.split("-").map(Number);
  // Local midnight in Addis (UTC+3) == 00:00 local == (00 - 3) UTC the same date.
  const start = new Date(Date.UTC(y, m - 1, d, -3, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Robust, collision-resistant order number: ORD-YYYYMMDD-<8 hex>. */
function generateOrderNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
  return `ORD-${ymd}-${rand}`;
}

type OrderRow = {
  id: string;
  orderNumber: string;
  userId: string;
  totalAmount: Prisma.Decimal;
  isVoided: boolean;
  voidReason: string | null;
  voidedAt: Date | null;
  voidedBy?: { username: string } | null;
  createdAt: Date;
  updatedAt: Date;
  user: { username: string };
  orderItems?: Array<{
    quantity: number;
    item?: { name: string };
  }>;
  _count: { orderItems: number };
};

function serializeOrder(o: OrderRow) {
  const itemsSummary = o.orderItems
    ?.map((oi) => `${oi.item?.name ?? "Beverage"} ×${oi.quantity}`)
    .join(", ");
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    waiterName: o.user.username,
    totalAmount: Number(o.totalAmount),
    itemCount: o.orderItems?.reduce((acc, oi) => acc + oi.quantity, 0) || o._count.orderItems,
    itemsSummary: itemsSummary || "Order items",
    isVoided: o.isVoided,
    voidReason: o.voidReason ?? null,
    voidedAt: o.voidedAt?.toISOString() ?? null,
    voidedByName: o.voidedBy?.username ?? null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export const orderService = {
  /** All orders (ADMIN, BARMAN). Waiters use myOrders() instead. */
  async list() {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true } },
        voidedBy: { select: { username: true } },
        orderItems: { include: { item: { select: { name: true } } } },
        _count: { select: { orderItems: true } },
      },
    });
    return orders.map(serializeOrder);
  },

  /** Orders attributed to the current user (WAITER view-only history). */
  async myOrders(user: AuthedUser) {
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true } },
        voidedBy: { select: { username: true } },
        orderItems: { include: { item: { select: { name: true } } } },
        _count: { select: { orderItems: true } },
      },
    });
    return orders.map(serializeOrder);
  },

  async get(user: AuthedUser, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { username: true } },
        voidedBy: { select: { username: true } },
        orderItems: { include: { item: { select: { name: true } } } },
      },
    });
    if (!order) throw new ApiException("Order not found", 404);
    // Waiters may only view their own orders.
    if (user.role === "WAITER" && order.userId !== user.id) {
      throw new ApiException("You can only view your own orders", 403);
    }
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      waiterName: order.user.username,
      totalAmount: Number(order.totalAmount),
      itemCount: order.orderItems.length,
      isVoided: order.isVoided,
      voidReason: order.voidReason ?? null,
      voidedAt: order.voidedAt?.toISOString() ?? null,
      voidedByName: order.voidedBy?.username ?? null,
      items: order.orderItems.map((oi) => ({
        id: oi.id,
        orderId: oi.orderId,
        itemId: oi.itemId,
        itemName: oi.item.name,
        quantity: oi.quantity,
        unitPrice: Number(oi.unitPrice),
        subtotal: Number(oi.subtotal),
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  },

  async create(user: AuthedUser, lines: OrderLineInput[], waiterId?: string) {
    // Resolve the WAITER the order is attributed to.
    //  - BARMAN must pick a waiter (they are not a waiter themselves).
    //  - ADMIN may pick a waiter or default to themselves.
    let attributedWaiterId: string;
    let attributedWaiterName: string;

    if (user.role === "BARMAN") {
      if (!waiterId) {
        throw new ApiException("Select the waiter this order is for", 422);
      }
    }

    if (waiterId && waiterId !== user.id) {
      if (user.role !== "ADMIN" && user.role !== "BARMAN") {
        throw new ApiException("You cannot place orders on behalf of a waiter", 403);
      }
      const waiter = await prisma.user.findUnique({ where: { id: waiterId } });
      if (!waiter) throw new ApiException("Selected waiter not found", 404);
      if (!waiter.isActive) throw new ApiException("Selected waiter is deactivated", 409);
      if (waiter.role !== "WAITER") {
        throw new ApiException("Orders can only be attributed to a waiter", 409);
      }
      attributedWaiterId = waiter.id;
      attributedWaiterName = waiter.username;
    } else {
      // No waiter chosen → attribute to the operator (ADMIN self-order).
      attributedWaiterId = user.id;
      attributedWaiterName = user.username;
    }

    // Collapse duplicate itemIds client-side-sent lines into one per item.
    const merged = new Map<string, number>();
    for (const line of lines) {
      merged.set(line.itemId, (merged.get(line.itemId) ?? 0) + line.quantity);
    }
    const itemIds = [...merged.keys()];

    return prisma.$transaction(async (tx) => {
      // Lock the rows we intend to deduct, in a deterministic order to avoid
      // deadlocks between concurrent orders. Raw SQL — Prisma has no FOR UPDATE.
      // Orders sell from the COUNTER pool (counterStock), not the warehouse.
      const locked = await tx.$queryRaw<
        Array<{
          id: string;
          name: string;
          price: Prisma.Decimal;
          shotsPerUnit: number;
          shotPrice: Prisma.Decimal | null;
          counterStock: number;
          isActive: boolean;
        }>
      >`
        SELECT "id", "name", "price", "shotsPerUnit", "shotPrice", "counterStock", "isActive"
        FROM "Item"
        WHERE "id" IN (${Prisma.join(itemIds)})
        ORDER BY "id"
        FOR UPDATE
      `;

      const byId = new Map(locked.map((r) => [r.id, r]));

      for (const [itemId, quantity] of merged) {
        const row = byId.get(itemId);
        if (!row) throw new ApiException("One of the beverages no longer exists", 404);
        if (!row.isActive) throw new ApiException(`"${row.name}" is not available for ordering`);
        if (row.counterStock < quantity) {
          throw new ApiException(
            `Insufficient counter stock for "${row.name}" (requested ${quantity}, at counter ${row.counterStock}). Transfer more from the warehouse first.`,
            409,
          );
        }
      }

      const orderNumber = generateOrderNumber();
      let total = new Prisma.Decimal(0);

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: attributedWaiterId, // the waiter the order belongs to
          placedById: user.id, // the operator (barman/admin) who submitted it
          totalAmount: new Prisma.Decimal(0),
        },
      });

      for (const [itemId, quantity] of merged) {
        const row = byId.get(itemId)!;
        // When selling per shot at counter, take shotPrice if configured, not the bulk bottle price!
        const isPortioned = (row.shotsPerUnit ?? 1) > 1;
        const unitPrice = isPortioned && row.shotPrice ? row.shotPrice : row.price;
        const subtotal = round2(unitPrice.mul(quantity));
        total = total.add(subtotal);

        const orderItem = await tx.orderItem.create({
          data: { orderId: order.id, itemId, quantity, unitPrice, subtotal },
        });

        const affected = await tx.$executeRaw`
          UPDATE "Item"
          SET "counterStock" = "counterStock" - ${quantity}, "updatedAt" = NOW()
          WHERE "id" = ${itemId} AND "counterStock" >= ${quantity}
        `;
        if (affected !== 1) {
          throw new ApiException(`Insufficient counter stock for "${row.name}"`, 409);
        }

        await tx.stockMovement.create({
          data: {
            itemId,
            orderItemId: orderItem.id,
            // Attribute the movement to the waiter the order belongs to.
            userId: attributedWaiterId,
            movementType: "ORDER_OUT",
            quantity,
            description: `Sold by ${attributedWaiterName}`,
          },
        });
      }

      const finalTotal = round2(total);
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { totalAmount: finalTotal },
      });

      return {
        id: updated.id,
        orderNumber: updated.orderNumber,
        userId: updated.userId,
        waiterName: attributedWaiterName,
        totalAmount: Number(updated.totalAmount),
        itemCount: merged.size,
        isVoided: false,
        voidReason: null,
        voidedAt: null,
        voidedByName: null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    });
  },

  /**
   * Admin-only order voiding: reverts counterStock atomically, generates
   * VOID_IN movements for each beverage, and marks the order as voided.
   */
  async voidOrder(user: AuthedUser, orderId: string, reason: string) {
    if (user.role !== "ADMIN") {
      throw new ApiException("Only administrators can void orders", 403);
    }
    const cleanReason = reason.trim();
    if (!cleanReason) {
      throw new ApiException("A reason is required to void this order", 422);
    }

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: { item: { select: { id: true, name: true } } },
          },
          user: { select: { username: true } },
        },
      });

      if (!order) throw new ApiException("Order not found", 404);
      if (order.isVoided) throw new ApiException("This order has already been voided", 409);

      // Return each item's stock back to counterStock under atomic increments
      for (const oi of order.orderItems) {
        await tx.$executeRaw`
          UPDATE "Item"
          SET "counterStock" = "counterStock" + ${oi.quantity}, "updatedAt" = NOW()
          WHERE "id" = ${oi.itemId}
        `;

        await tx.stockMovement.create({
          data: {
            itemId: oi.itemId,
            orderItemId: oi.id,
            userId: user.id,
            movementType: "VOID_IN",
            quantity: oi.quantity,
            description: `Voided order: ${cleanReason}`,
          },
        });
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          isVoided: true,
          voidReason: cleanReason,
          voidedAt: new Date(),
          voidedById: user.id,
        },
        include: {
          user: { select: { username: true } },
          voidedBy: { select: { username: true } },
          orderItems: { include: { item: { select: { name: true } } } },
          _count: { select: { orderItems: true } },
        },
      });

      return serializeOrder(updated);
    });
  },

  /**
   * Admin control report: sales grouped by the waiter each order is for.
   * Optional `day` (YYYY-MM-DD, Addis-Ababa) scopes it to a single day;
   * omitted = all time.
   */
  async salesByWaiter(day?: string) {
    const where: Prisma.OrderWhereInput = {
      isVoided: false,
      ...(day
        ? (() => {
          const { start, end } = addisDayRangeUtc(day);
          return { createdAt: { gte: start, lt: end } };
        })()
        : {}),
    };

    const grouped = await prisma.order.groupBy({
      by: ["userId"],
      where,
      _sum: { totalAmount: true },
      _count: { _all: true },
    });
    const users = await prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, username: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return grouped
      .map((g) => ({
        waiterId: g.userId,
        waiterName: byId.get(g.userId)?.username ?? "Unknown",
        orderCount: g._count._all,
        totalSales: Number(g._sum.totalAmount ?? 0),
      }))
      .sort((a, b) => b.totalSales - a.totalSales);
  },

  /**
   * Admin control report: full sales breakdown for a single waiter, including
   * itemized drinks sold (quantities and amounts) and order tickets.
   */
  async waiterSalesDetail(waiterId: string, day?: string) {
    const waiter = await prisma.user.findUnique({
      where: { id: waiterId },
      select: { id: true, username: true, role: true },
    });
    if (!waiter) {
      throw new ApiException("Waiter not found", 404);
    }

    const where: Prisma.OrderWhereInput = {
      userId: waiterId,
      isVoided: false,
      ...(day
        ? (() => {
          const { start, end } = addisDayRangeUtc(day);
          return { createdAt: { gte: start, lt: end } };
        })()
        : {}),
    };

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        orderItems: {
          include: {
            item: { select: { id: true, name: true } },
          },
        },
      },
    });

    const itemMap = new Map<
      string,
      {
        itemId: string;
        itemName: string;
        quantity: number;
        totalAmount: number;
        lastSoldDate: string;
      }
    >();

    let totalSales = 0;
    let totalUnitsSold = 0;

    for (const order of orders) {
      totalSales += Number(order.totalAmount);
      for (const oi of order.orderItems) {
        totalUnitsSold += oi.quantity;
        const subtotal = Number(oi.subtotal);
        const cur = itemMap.get(oi.itemId) ?? {
          itemId: oi.itemId,
          itemName: oi.item?.name ?? "Unknown",
          quantity: 0,
          totalAmount: 0,
          lastSoldDate: order.createdAt.toISOString(),
        };
        cur.quantity += oi.quantity;
        cur.totalAmount += subtotal;
        itemMap.set(oi.itemId, cur);
      }
    }

    const roundedTotalSales = Math.round((totalSales + Number.EPSILON) * 100) / 100;

    // Build the flat list of sold item events with date and revenue share, sorted newest first
    const sales: Array<{
      id: string;
      orderId: string;
      date: string;
      itemId: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
      revenueShare: number;
    }> = [];

    for (const order of orders) {
      for (const oi of order.orderItems) {
        const subtotal = Number(oi.subtotal);
        const share =
          roundedTotalSales > 0 ? (subtotal / roundedTotalSales) * 100 : 0;
        sales.push({
          id: oi.id,
          orderId: order.id,
          date: order.createdAt.toISOString(),
          itemId: oi.itemId,
          itemName: oi.item?.name ?? "Unknown",
          quantity: oi.quantity,
          unitPrice: Number(oi.unitPrice),
          totalAmount: Math.round((subtotal + Number.EPSILON) * 100) / 100,
          revenueShare: Math.round((share + Number.EPSILON) * 10) / 10,
        });
      }
    }

    // Sort sales by date descending (newest first)
    sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const items = [...itemMap.values()]
      .map((it) => {
        const share =
          roundedTotalSales > 0 ? (it.totalAmount / roundedTotalSales) * 100 : 0;
        return {
          ...it,
          totalAmount: Math.round((it.totalAmount + Number.EPSILON) * 100) / 100,
          revenueShare: Math.round((share + Number.EPSILON) * 10) / 10,
        };
      })
      .sort((a, b) => b.quantity - a.quantity || b.totalAmount - a.totalAmount);

    return {
      waiter: {
        id: waiter.id,
        username: waiter.username,
      },
      day: day ?? null,
      orderCount: orders.length,
      totalSales: roundedTotalSales,
      totalUnitsSold,
      sales,
      items,
      orders: orders.map((o) => {
        const itemsSummary = o.orderItems
          .map((oi) => `${oi.item?.name ?? "Beverage"} ×${oi.quantity}`)
          .join(", ");
        return {
          id: o.id,
          orderNumber: o.orderNumber,
          createdAt: o.createdAt.toISOString(),
          totalAmount: Number(o.totalAmount),
          itemCount: o.orderItems.reduce((acc, item) => acc + item.quantity, 0),
          itemsSummary: itemsSummary || "Order items",
          items: o.orderItems.map((oi) => ({
            id: oi.id,
            itemName: oi.item?.name ?? "Unknown",
            quantity: oi.quantity,
            unitPrice: Number(oi.unitPrice),
            subtotal: Number(oi.subtotal),
          })),
        };
      }),
    };
  },

  /** Admin revenue & profitability report: total sales, COGS, and gross profit per Addis-Ababa day. */
  async dailyRevenue(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [orders, allItems] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: since }, isVoided: false },
        include: {
          orderItems: {
            select: { itemId: true, quantity: true, subtotal: true },
          },
        },
      }),
      prisma.item.findMany({
        select: {
          id: true,
          price: true,
          shotsPerUnit: true,
          stockReceipts: {
            orderBy: { createdAt: "desc" },
            select: { unitCost: true, quantity: true },
          },
        },
      }),
    ]);

    // Build cost lookup per sold portion/unit
    const unitCostMap = new Map<string, number>();
    for (const item of allItems) {
      let bulkCost: number;
      if (item.stockReceipts.length > 0) {
        // Weighted average cost from actual purchase receipts
        const totalQty = item.stockReceipts.reduce((sum, r) => sum + r.quantity, 0);
        const totalExpenditure = item.stockReceipts.reduce(
          (sum, r) => sum + r.quantity * Number(r.unitCost),
          0,
        );
        bulkCost = totalQty > 0 ? totalExpenditure / totalQty : Number(item.stockReceipts[0].unitCost);
      } else {
        // Fallback for items before receipt registration: 60% of selling price
        bulkCost = Number(item.price) * 0.6;
      }
      const shots = Math.max(1, item.shotsPerUnit ?? 1);
      unitCostMap.set(item.id, bulkCost / shots);
    }

    const byDay = new Map<
      string,
      { revenue: number; cost: number; orderCount: number }
    >();

    for (const o of orders) {
      const key = addisDayKey(o.createdAt);
      const cur = byDay.get(key) ?? { revenue: 0, cost: 0, orderCount: 0 };
      cur.revenue += Number(o.totalAmount);
      cur.orderCount += 1;

      for (const oi of o.orderItems) {
        const itemPortionCost = unitCostMap.get(oi.itemId) ?? 0;
        cur.cost += oi.quantity * itemPortionCost;
      }

      byDay.set(key, cur);
    }

    return [...byDay.entries()]
      .map(([day, v]) => {
        const roundedRevenue = Math.round((v.revenue + Number.EPSILON) * 100) / 100;
        const roundedCost = Math.round((v.cost + Number.EPSILON) * 100) / 100;
        const profit = Math.round((roundedRevenue - roundedCost + Number.EPSILON) * 100) / 100;
        const profitMargin =
          roundedRevenue > 0
            ? Math.round(((profit / roundedRevenue) * 100 + Number.EPSILON) * 10) / 10
            : 0;

        return {
          day,
          revenue: roundedRevenue,
          cost: roundedCost,
          profit,
          profitMargin,
          orderCount: v.orderCount,
        };
      })
      .sort((a, b) => (a.day < b.day ? 1 : -1));
  },

  /** Current user's orders grouped by Addis-Ababa day (WAITER history). */
  async myOrdersByDay(user: AuthedUser) {
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { username: true } },
        voidedBy: { select: { username: true } },
        orderItems: { include: { item: { select: { name: true } } } },
        _count: { select: { orderItems: true } },
      },
    });
    const groups = new Map<
      string,
      { day: string; dayTotal: number; orders: ReturnType<typeof serializeOrder>[] }
    >();
    for (const o of orders) {
      const key = addisDayKey(o.createdAt);
      const g = groups.get(key) ?? { day: key, dayTotal: 0, orders: [] };
      g.orders.push(serializeOrder(o));
      if (!o.isVoided) {
        g.dayTotal += Number(o.totalAmount);
      }
      groups.set(key, g);
    }
    return [...groups.values()].map((g) => ({
      ...g,
      dayTotal: Math.round((g.dayTotal + Number.EPSILON) * 100) / 100,
    }));
  },
};
