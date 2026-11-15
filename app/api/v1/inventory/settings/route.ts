import type { NextRequest } from "next/server";
import { inventoryService } from "@/server/services/inventory.service";
import { requireAuth, requireRole, ok, handleError } from "@/server/http";
import { updateSettingSchema } from "@/lib/validations/schemas";

// GET /api/v1/inventory/settings — any authenticated user may read the threshold.
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    return ok(await inventoryService.getSetting());
  } catch (e) {
    return handleError(e);
  }
}

// PUT /api/v1/inventory/settings — ADMIN only.
export async function PUT(req: NextRequest) {
  try {
    await requireRole(req, ["ADMIN"]);
    const { lowStockThreshold } = updateSettingSchema.parse(await req.json());
    return ok(await inventoryService.updateSetting(lowStockThreshold));
  } catch (e) {
    return handleError(e);
  }
}
