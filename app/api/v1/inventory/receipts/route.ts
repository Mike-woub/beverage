import type { NextRequest } from "next/server";
import { inventoryService } from "@/server/services/inventory.service";
import { requireRole, ok, created, handleError } from "@/server/http";
import { createReceiptSchema } from "@/lib/validations/schemas";

// GET /api/v1/inventory/receipts — ADMIN only.
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["ADMIN"]);
    return ok(await inventoryService.listReceipts());
  } catch (e) {
    return handleError(e);
  }
}

// POST /api/v1/inventory/receipts — ADMIN only (warehouse stock in).
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["ADMIN"]);
    const body = createReceiptSchema.parse(await req.json());
    return created(await inventoryService.createReceipt(user, body));
  } catch (e) {
    return handleError(e);
  }
}
