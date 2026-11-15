import type { NextRequest } from "next/server";
import { itemService } from "@/server/services/item.service";
import { requireAuth, requireRole, ok, created, handleError } from "@/server/http";
import { createItemSchema } from "@/lib/validations/schemas";

// GET /api/v1/items — any authenticated user may list beverages.
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    return ok(await itemService.list());
  } catch (e) {
    return handleError(e);
  }
}

// POST /api/v1/items — ADMIN only.
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["ADMIN"]);
    const body = createItemSchema.parse(await req.json());
    return created(await itemService.create(user, body));
  } catch (e) {
    return handleError(e);
  }
}
