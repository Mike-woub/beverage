import { http } from "@/lib/api/client";
import type {
  CreateItemDTO,
  Item,
  PriceHistoryEntry,
  UpdateItemDTO,
} from "@/lib/types";

/** Beverage (Item) service — real API against /api/v1/items. */
export const itemService = {
  getAll: (): Promise<Item[]> => http.get<Item[]>("/items"),
  create: (dto: CreateItemDTO): Promise<Item> => http.post<Item>("/items", dto),
  update: (id: string, dto: UpdateItemDTO): Promise<Item> =>
    http.put<Item>(`/items/${id}`, dto),
  setActive: (id: string, isActive: boolean): Promise<Item> =>
    http.patch<Item>(`/items/${id}/status`, { isActive }),
  updatePhysicalCheck: (id: string, physicalCount: number | null): Promise<Item> =>
    http.patch<Item>(`/items/${id}/physical-check`, { physicalCount }),
  getPriceHistory: (id: string): Promise<PriceHistoryEntry[]> =>
    http.get<PriceHistoryEntry[]>(`/items/${id}/price-history`),
};
