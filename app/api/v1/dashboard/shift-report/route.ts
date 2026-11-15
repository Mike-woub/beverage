import type { NextRequest } from "next/server";
import { dashboardService } from "@/server/services/dashboard.service";
import { requireAuth, ok, handleError } from "@/server/http";

// GET /api/v1/dashboard/shift-report?day=YYYY-MM-DD — End of shift Z-report
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const day = req.nextUrl.searchParams.get("day") || undefined;
    return ok(await dashboardService.shiftReport(day));
  } catch (e) {
    return handleError(e);
  }
}
