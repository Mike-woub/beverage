import type { NextRequest } from "next/server";
import { orderService } from "@/server/services/order.service";
import { requireRole, ok, handleError } from "@/server/http";

// GET /api/v1/dashboard/sales-by-waiter?day=YYYY-MM-DD&waiterId=XYZ — ADMIN control report.
// `day` scopes to one Addis-Ababa day; omit for all time.
// `waiterId` scopes to a specific waiter's item-level sales breakdown.
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["ADMIN"]);
    const day = req.nextUrl.searchParams.get("day") || undefined;
    const waiterId = req.nextUrl.searchParams.get("waiterId") || undefined;

    if (waiterId) {
      return ok(await orderService.waiterSalesDetail(waiterId, day));
    }
    return ok(await orderService.salesByWaiter(day));
  } catch (e) {
    return handleError(e);
  }
}
