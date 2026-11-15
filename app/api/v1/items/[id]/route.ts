import type { NextRequest } from "next/server";
import { itemService } from "@/server/services/item.service";
import { requireRole, ok, handleError } from "@/server/http";
import { updateItemSchema } from "@/lib/validations/schemas";

// PUT /api/v1/items/[id] — ADMIN only. Note: Next 16 params are a Promise.
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(req, ["ADMIN"]);
    const { id } = await ctx.params;
    const body = updateItemSchema.parse(await req.json());
    return ok(await itemService.update(user, id, body));
  } catch (e) {
    return handleError(e);
  }
}
