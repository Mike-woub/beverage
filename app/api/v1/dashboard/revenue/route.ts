import type { NextRequest } from "next/server";
import { orderService } from "@/server/services/order.service";
import { requireRole, ok, handleError } from "@/server/http";

// GET /api/v1/dashboard/revenue?days=30 — ADMIN daily revenue breakdown.
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["ADMIN"]);
    const daysParam = Number(req.nextUrl.searchParams.get("days"));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 365) : 30;
    return ok(await orderService.dailyRevenue(days));
  } catch (e) {
    return handleError(e);
  }
}
