import { http } from "@/lib/api/client";
import type { CreateOrderDTO, Order, OrderDayGroup } from "@/lib/types";

/** Order service — real API against /api/v1/orders. */
export const orderService = {
  getAll: (): Promise<Order[]> => http.get<Order[]>("/orders"),
  getMineByDay: (): Promise<OrderDayGroup[]> => http.get<OrderDayGroup[]>("/orders/my-orders"),
  get: (id: string): Promise<Order> => http.get<Order>(`/orders/${id}`),
  create: (dto: CreateOrderDTO): Promise<Order> => http.post<Order>("/orders", dto),
  void: (id: string, reason: string): Promise<Order> =>
    http.post<Order>(`/orders/${id}/void`, { reason }),
};
