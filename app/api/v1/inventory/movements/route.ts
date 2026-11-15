import type { NextRequest } from "next/server";
import { inventoryService } from "@/server/services/inventory.service";
import { requireRole, ok, handleError } from "@/server/http";

// GET /api/v1/inventory/movements — ADMIN only.
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["ADMIN"]);
    return ok(await inventoryService.listMovements());
  } catch (e) {
    return handleError(e);
  }
}
