import { http } from "@/lib/api/client";
import type {
  DailyRevenue,
  DashboardSummary,
  InventoryDistribution,
  Item,
  Order,
  SalesByWaiter,
  ShiftReport,
  TopItem,
  WaiterSalesDetail,
} from "@/lib/types";

/** Dashboard service — real API against /api/v1/dashboard/*. */
export const dashboardService = {
  getSummary: (): Promise<DashboardSummary> => http.get<DashboardSummary>("/dashboard/summary"),
  getRecentOrders: (): Promise<Order[]> => http.get<Order[]>("/dashboard/recent-orders"),
  getTopItems: (): Promise<TopItem[]> => http.get<TopItem[]>("/dashboard/top-items"),
  getDistribution: (): Promise<InventoryDistribution[]> =>
    http.get<InventoryDistribution[]>("/dashboard/distribution"),
  getLowStock: (): Promise<Item[]> => http.get<Item[]>("/dashboard/low-stock"),
  getSalesByWaiter: (day?: string): Promise<SalesByWaiter[]> =>
    http.get<SalesByWaiter[]>("/dashboard/sales-by-waiter", day ? { day } : undefined),
  getWaiterSalesDetail: (waiterId: string, day?: string): Promise<WaiterSalesDetail> =>
    http.get<WaiterSalesDetail>("/dashboard/sales-by-waiter", {
      waiterId,
      ...(day ? { day } : {}),
    }),
  getRevenue: (days = 30): Promise<DailyRevenue[]> =>
    http.get<DailyRevenue[]>("/dashboard/revenue", { days }),
  getShiftReport: (day?: string): Promise<ShiftReport> =>
    http.get<ShiftReport>("/dashboard/shift-report", day ? { day } : undefined),
};
