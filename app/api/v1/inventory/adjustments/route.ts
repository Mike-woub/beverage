import type { NextRequest } from "next/server";
import { inventoryService } from "@/server/services/inventory.service";
import { requireRole, created, handleError } from "@/server/http";
import { createAdjustmentSchema } from "@/lib/validations/schemas";

// POST /api/v1/inventory/adjustments — ADMIN only. Reason required (schema).
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["ADMIN"]);
    const body = createAdjustmentSchema.parse(await req.json());
    return created(await inventoryService.createAdjustment(user, body));
  } catch (e) {
    return handleError(e);
  }
}
