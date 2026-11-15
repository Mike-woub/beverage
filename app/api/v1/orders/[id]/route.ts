import type { NextRequest } from "next/server";
import { orderService } from "@/server/services/order.service";
import { requireAuth, ok, handleError } from "@/server/http";

// GET /api/v1/orders/[id] — ownership enforced in the service for waiters.
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(req);
    const { id } = await ctx.params;
    return ok(await orderService.get(user, id));
  } catch (e) {
    return handleError(e);
  }
}
