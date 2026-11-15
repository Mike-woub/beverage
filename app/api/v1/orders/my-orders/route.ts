import type { NextRequest } from "next/server";
import { orderService } from "@/server/services/order.service";
import { requireAuth, ok, handleError } from "@/server/http";

// GET /api/v1/orders/my-orders — the current user's orders grouped by day
// (Addis-Ababa). Powers the WAITER view-only history page.
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    return ok(await orderService.myOrdersByDay(user));
  } catch (e) {
    return handleError(e);
  }
}
