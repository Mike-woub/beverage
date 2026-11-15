import type { NextRequest } from "next/server";
import { itemService } from "@/server/services/item.service";
import { requireRole, ok, handleError } from "@/server/http";

// GET /api/v1/items/[id]/price-history — ADMIN only (selling-price audit trail).
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(req, ["ADMIN"]);
    const { id } = await ctx.params;
    return ok(await itemService.priceHistory(id));
  } catch (e) {
    return handleError(e);
  }
}
