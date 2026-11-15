"use client";

import { useMutation, useQuery } from "@/lib/query/query-client";
import { inventoryService } from "@/lib/services/inventory.service";
import { useToast } from "@/lib/ui/toast";
import type {
  CreateAdjustmentDTO,
  CreateReceiptDTO,
  InventorySetting,
  StockMovement,
  StockReceipt,
} from "@/lib/types";

const RECEIPTS = "receipts";
const MOVEMENTS = "movements";
const SETTING = "setting";

export function useReceipts() {
  return useQuery<StockReceipt[]>(RECEIPTS, inventoryService.getReceipts);
}

export function useCreateReceipt() {
  const toast = useToast();
  return useMutation<StockReceipt, CreateReceiptDTO>({
    mutationFn: (dto) => inventoryService.createReceipt(dto),
    invalidateKeys: [RECEIPTS, MOVEMENTS, "items", "dashboard"],
    onSuccess: (r) => toast.success(`Received ${r.quantity} × ${r.itemName}`),
    onError: (e) => toast.error(e.message),
  });
}

export function useMovements() {
  return useQuery<StockMovement[]>(MOVEMENTS, inventoryService.getMovements);
}

export function useCreateAdjustment() {
  const toast = useToast();
  return useMutation<StockMovement, CreateAdjustmentDTO>({
    mutationFn: (dto) => inventoryService.createAdjustment(dto),
    invalidateKeys: [MOVEMENTS, "items", "dashboard"],
    onSuccess: () => toast.success("Stock adjustment recorded"),
    onError: (e) => toast.error(e.message),
  });
}

export function useSetting() {
  return useQuery<InventorySetting>(SETTING, inventoryService.getSetting);
}

export function useUpdateSetting() {
  const toast = useToast();
  return useMutation<InventorySetting, number>({
    mutationFn: (threshold) => inventoryService.updateSetting(threshold),
    invalidateKeys: [SETTING, "items", "dashboard"],
    onSuccess: () => toast.success("Settings saved"),
    onError: (e) => toast.error(e.message),
  });
}
