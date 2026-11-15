import type { NextRequest } from "next/server";
import { dashboardService } from "@/server/services/dashboard.service";
import { requireAuth, ok, handleError } from "@/server/http";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    return ok(await dashboardService.summary());
  } catch (e) {
    return handleError(e);
  }
}
