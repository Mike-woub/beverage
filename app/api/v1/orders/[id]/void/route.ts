import type { NextRequest } from "next/server";
import { orderService } from "@/server/services/order.service";
import { requireRole, ok, handleError } from "@/server/http";
import { voidOrderSchema } from "@/lib/validations/schemas";

// POST /api/v1/orders/[id]/void — ADMIN only voids an order, returning stock to counter
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(req, ["ADMIN"]);
    const { id } = await ctx.params;
    const body = voidOrderSchema.parse(await req.json());
    return ok(await orderService.voidOrder(user, id, body.reason));
  } catch (e) {
    return handleError(e);
  }
}
