import { http } from "@/lib/api/client";
import type {
  CreateAdjustmentDTO,
  CreateReceiptDTO,
  InventorySetting,
  StockMovement,
  StockReceipt,
} from "@/lib/types";

/** Inventory service — real API against /api/v1/inventory/*. */
export const inventoryService = {
  getReceipts: (): Promise<StockReceipt[]> => http.get<StockReceipt[]>("/inventory/receipts"),
  createReceipt: (dto: CreateReceiptDTO): Promise<StockReceipt> =>
    http.post<StockReceipt>("/inventory/receipts", dto),
  getMovements: (): Promise<StockMovement[]> => http.get<StockMovement[]>("/inventory/movements"),
  createAdjustment: (dto: CreateAdjustmentDTO): Promise<StockMovement> =>
    http.post<StockMovement>("/inventory/adjustments", dto),
  getSetting: (): Promise<InventorySetting> => http.get<InventorySetting>("/inventory/settings"),
  updateSetting: (lowStockThreshold: number): Promise<InventorySetting> =>
    http.put<InventorySetting>("/inventory/settings", { lowStockThreshold }),
};
