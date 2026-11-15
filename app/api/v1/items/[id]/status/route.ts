import type { NextRequest } from "next/server";
import { itemService } from "@/server/services/item.service";
import { requireRole, ok, handleError } from "@/server/http";
import { itemStatusSchema } from "@/lib/validations/schemas";

// PATCH /api/v1/items/[id]/status — ADMIN only (activate/deactivate).
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(req, ["ADMIN"]);
    const { id } = await ctx.params;
    const { isActive } = itemStatusSchema.parse(await req.json());
    return ok(await itemService.setActive(id, isActive));
  } catch (e) {
    return handleError(e);
  }
}
