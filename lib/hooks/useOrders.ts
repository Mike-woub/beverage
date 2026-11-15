"use client";

import { useMutation, useQuery } from "@/lib/query/query-client";
import { orderService } from "@/lib/services/order.service";
import { useToast } from "@/lib/ui/toast";
import type { CreateOrderDTO, Order, OrderDayGroup } from "@/lib/types";

const KEY = "orders";

export function useOrders() {
  return useQuery<Order[]>(KEY, orderService.getAll);
}

/** Current user's own orders grouped by day (WAITER history page). */
export function useMyOrdersByDay() {
  return useQuery<OrderDayGroup[]>("my-orders", orderService.getMineByDay);
}

export function useOrder(id: string | null) {
  return useQuery<Order>(id ? `order:${id}` : null, () => orderService.get(id as string), {
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const toast = useToast();
  return useMutation<Order, CreateOrderDTO>({
    mutationFn: (dto) => orderService.create(dto),
    // Refresh every view that reflects a new order so the UI shows latest data.
    invalidateKeys: [KEY, "my-orders", "items", "dashboard", "movements"],
    onSuccess: () => toast.success("Order completed successfully"),
    onError: (e) => toast.error(e.message),
  });
}

export function useVoidOrder() {
  const toast = useToast();
  return useMutation<Order, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => orderService.void(id, reason),
    invalidateKeys: [
      KEY,
      "my-orders",
      "items",
      "dashboard",
      "movements",
      "revenue",
      "sales-by-waiter",
      "shift-report",
    ],
    onSuccess: () => toast.success("Order voided and stock returned to counter"),
    onError: (e) => toast.error(e.message),
  });
}
