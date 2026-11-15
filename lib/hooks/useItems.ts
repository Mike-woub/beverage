"use client";

import { useMutation, useQuery } from "@/lib/query/query-client";
import { itemService } from "@/lib/services/item.service";
import { useToast } from "@/lib/ui/toast";
import type { CreateItemDTO, Item, PriceHistoryEntry, UpdateItemDTO } from "@/lib/types";

const KEY = "items";

export function useItems() {
  return useQuery<Item[]>(KEY, itemService.getAll);
}

/** Selling-price change history for one beverage (ADMIN-only). */
export function useItemPriceHistory(itemId: string | null) {
  return useQuery<PriceHistoryEntry[]>(
    itemId ? `price-history:${itemId}` : null,
    () => itemService.getPriceHistory(itemId as string),
    { enabled: !!itemId },
  );
}

export function useCreateItem() {
  const toast = useToast();
  return useMutation<Item, CreateItemDTO>({
    mutationFn: (dto) => itemService.create(dto),
    invalidateKeys: [KEY, "dashboard", "movements"],
    onSuccess: (item) => toast.success(`Added "${item.name}"`),
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateItem() {
  const toast = useToast();
  return useMutation<Item, { id: string; data: UpdateItemDTO }>({
    mutationFn: ({ id, data }) => itemService.update(id, data),
    invalidateKeys: [KEY, "dashboard", "price-history"],
    onSuccess: () => toast.success("Beverage updated"),
    onError: (e) => toast.error(e.message),
  });
}

export function useSetItemActive() {
  const toast = useToast();
  return useMutation<Item, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) => itemService.setActive(id, isActive),
    invalidateKeys: [KEY, "dashboard"],
    onSuccess: (item) =>
      toast.success(`"${item.name}" ${item.isActive ? "activated" : "deactivated"}`),
    onError: (e) => toast.error(e.message),
  });
}
