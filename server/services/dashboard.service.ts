import { prisma } from "@/lib/prisma";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const dashboardService = {
  async summary() {
    const since = startOfToday();
    const setting = await prisma.inventorySetting.findUnique({ where: { id: "singleton" } });
    const threshold = setting?.lowStockThreshold ?? 10;

    const active = { isActive: true } as const;
    const [
      activeItems,
      stockAgg,
      todayOrders,
      whLow,
      whOut,
      cLow,
      cOut,
      pendingTransfers,
    ] = await Promise.all([
      prisma.item.count({ where: active }),
      prisma.item.aggregate({ _sum: { stock: true, counterStock: true } }),
      prisma.order.findMany({ where: { createdAt: { gte: since }, isVoided: false }, select: { totalAmount: true } }),
      prisma.item.count({ where: { ...active, stock: { gt: 0, lte: threshold } } }),
      prisma.item.count({ where: { ...active, stock: { lte: 0 } } }),
      prisma.item.count({ where: { ...active, counterStock: { gt: 0, lte: threshold } } }),
      prisma.item.count({ where: { ...active, counterStock: { lte: 0 } } }),
      prisma.transferRequest.count({ where: { status: "PENDING" } }),
    ]);

    // All orders are completed on submission, so today's value is the full sum.
    const orderValueToday = todayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    return {
      totalBeverages: activeItems,
      warehouseStock: stockAgg._sum.stock ?? 0,
      counterStock: stockAgg._sum.counterStock ?? 0,
      ordersToday: todayOrders.length,
      orderValueToday: Math.round((orderValueToday + Number.EPSILON) * 100) / 100,
      warehouseLowCount: whLow,
      warehouseOutCount: whOut,
      counterLowCount: cLow,
      counterOutCount: cOut,
      pendingTransfers,
    };
  },

  async recentOrders(limit = 6) {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { username: true } },
        orderItems: { include: { item: { select: { name: true } } } },
        _count: { select: { orderItems: true } },
      },
    });
    return orders.map((o) => {
      const itemsSummary = o.orderItems
        .map((oi) => `${oi.item?.name ?? "Beverage"} ×${oi.quantity}`)
        .join(", ");
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        userId: o.userId,
        waiterName: o.user.username,
        totalAmount: Number(o.totalAmount),
        itemCount: o.orderItems.reduce((acc, oi) => acc + oi.quantity, 0) || o._count.orderItems,
        itemsSummary: itemsSummary || "Order items",
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      };
    });
  },

  async topItems(limit = 5) {
    const grouped = await prisma.orderItem.groupBy({
      by: ["itemId"],
      where: { order: { isVoided: false } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });
    const items = await prisma.item.findMany({
      where: { id: { in: grouped.map((g) => g.itemId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(items.map((i) => [i.id, i.name]));
    return grouped.map((g) => ({
      itemId: g.itemId,
      itemName: nameById.get(g.itemId) ?? "Unknown",
      quantitySold: g._sum.quantity ?? 0,
    }));
  },

  /**
   * End of Shift Report (Z-Report) for daily closeout:
   * Aggregates active sales, waiter performance, beverage consumption,
   * voided orders tally, and average ticket size.
   */
  async shiftReport(day?: string) {
    const TZ = "Africa/Addis_Ababa";
    const dayKey =
      day ||
      new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

    const [y, m, d] = dayKey.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, d, -3, 0, 0, 0));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lt: end },
      },
      include: {
        user: { select: { id: true, username: true } },
        orderItems: {
          include: {
            item: { select: { id: true, name: true, category: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const activeOrders = orders.filter((o) => !o.isVoided);
    const voidedOrders = orders.filter((o) => o.isVoided);

    const totalSales = activeOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const roundedTotalSales = Math.round((totalSales + Number.EPSILON) * 100) / 100;
    const voidedOrdersTotal = Math.round(
      (voidedOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0) + Number.EPSILON) * 100,
    ) / 100;

    let totalUnitsSold = 0;
    const beverageMap = new Map<
      string,
      {
        itemId: string;
        itemName: string;
        category: string;
        quantity: number;
        unitPrice: number;
        totalRevenue: number;
      }
    >();

    const waiterMap = new Map<
      string,
      {
        waiterId: string;
        waiterName: string;
        orderCount: number;
        totalSales: number;
      }
    >();

    for (const order of activeOrders) {
      const w = waiterMap.get(order.userId) ?? {
        waiterId: order.userId,
        waiterName: order.user.username,
        orderCount: 0,
        totalSales: 0,
      };
      w.orderCount += 1;
      w.totalSales += Number(order.totalAmount);
      waiterMap.set(order.userId, w);

      for (const oi of order.orderItems) {
        totalUnitsSold += oi.quantity;
        const b = beverageMap.get(oi.itemId) ?? {
          itemId: oi.itemId,
          itemName: oi.item?.name ?? "Unknown",
          category: oi.item?.category ?? "Other",
          quantity: 0,
          unitPrice: Number(oi.unitPrice),
          totalRevenue: 0,
        };
        b.quantity += oi.quantity;
        b.totalRevenue += Number(oi.subtotal);
        beverageMap.set(oi.itemId, b);
      }
    }

    const waiters = [...waiterMap.values()]
      .map((w) => {
        const share = roundedTotalSales > 0 ? (w.totalSales / roundedTotalSales) * 100 : 0;
        const aov = w.orderCount > 0 ? w.totalSales / w.orderCount : 0;
        return {
          ...w,
          totalSales: Math.round((w.totalSales + Number.EPSILON) * 100) / 100,
          revenueShare: Math.round((share + Number.EPSILON) * 10) / 10,
          averageOrderValue: Math.round((aov + Number.EPSILON) * 100) / 100,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);

    const beverages = [...beverageMap.values()]
      .map((b) => {
        const share = roundedTotalSales > 0 ? (b.totalRevenue / roundedTotalSales) * 100 : 0;
        return {
          ...b,
          totalRevenue: Math.round((b.totalRevenue + Number.EPSILON) * 100) / 100,
          revenueShare: Math.round((share + Number.EPSILON) * 10) / 10,
        };
      })
      .sort((a, b) => b.quantity - a.quantity || b.totalRevenue - a.totalRevenue);

    const aov = activeOrders.length > 0 ? roundedTotalSales / activeOrders.length : 0;

    return {
      day: dayKey,
      totalSales: roundedTotalSales,
      orderCount: activeOrders.length,
      totalUnitsSold,
      averageOrderValue: Math.round((aov + Number.EPSILON) * 100) / 100,
      voidedOrdersCount: voidedOrders.length,
      voidedOrdersTotal,
      waiters,
      beverages,
    };
  },

  async distribution(limit = 8) {
    const items = await prisma.item.findMany({
      where: { isActive: true },
      orderBy: { stock: "desc" },
      take: limit,
      select: { id: true, name: true, stock: true },
    });
    return items.map((i) => ({ itemId: i.id, itemName: i.name, stock: i.stock }));
  },

  /** Low COUNTER stock — the pool that blocks sales, so it's the actionable alert. */
  async lowStock() {
    const setting = await prisma.inventorySetting.findUnique({ where: { id: "singleton" } });
    const threshold = setting?.lowStockThreshold ?? 10;
    const items = await prisma.item.findMany({
      where: { isActive: true, counterStock: { lte: threshold } },
      orderBy: { counterStock: "asc" },
    });
    return items.map((i) => ({
      id: i.id,
      name: i.name,
      price: Number(i.price),
      stock: i.stock,
      counterStock: i.counterStock,
      isActive: i.isActive,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }));
  },
};
