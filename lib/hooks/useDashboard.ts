"use client";

import { useQuery } from "@/lib/query/query-client";
import { dashboardService } from "@/lib/services/dashboard.service";
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

export function useDashboardSummary() {
  return useQuery<DashboardSummary>("dashboard:summary", dashboardService.getSummary);
}
export function useRecentOrders() {
  return useQuery<Order[]>("dashboard:recent", dashboardService.getRecentOrders);
}
export function useTopItems() {
  return useQuery<TopItem[]>("dashboard:top", dashboardService.getTopItems);
}
export function useInventoryDistribution() {
  return useQuery<InventoryDistribution[]>(
    "dashboard:distribution",
    dashboardService.getDistribution,
  );
}
export function useLowStock() {
  return useQuery<Item[]>("dashboard:lowstock", dashboardService.getLowStock);
}
/** day = YYYY-MM-DD (Addis) to scope to one day, or "" / undefined for all time. */
export function useSalesByWaiter(day?: string) {
  const scope = day || "all";
  return useQuery<SalesByWaiter[]>(
    `dashboard:sales-by-waiter:${scope}`,
    () => dashboardService.getSalesByWaiter(day || undefined),
  );
}

export function useWaiterSalesDetail(waiterId: string | null, day?: string) {
  const scope = day || "all";
  return useQuery<WaiterSalesDetail>(
    waiterId ? `dashboard:waiter-detail:${waiterId}:${scope}` : null,
    () => dashboardService.getWaiterSalesDetail(waiterId!, day || undefined),
    { enabled: !!waiterId },
  );
}

export function useRevenue(days = 30) {
  return useQuery<DailyRevenue[]>(
    `dashboard:revenue:${days}`,
    () => dashboardService.getRevenue(days),
  );
}

export function useShiftReport(day?: string) {
  const scope = day || "today";
  return useQuery<ShiftReport>(
    `dashboard:shift-report:${scope}`,
    () => dashboardService.getShiftReport(day || undefined),
  );
}
