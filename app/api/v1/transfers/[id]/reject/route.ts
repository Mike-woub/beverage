import type { NextRequest } from "next/server";
import { transferService } from "@/server/services/transfer.service";
import { requireRole, ok, handleError } from "@/server/http";

// POST /api/v1/transfers/[id]/reject — ADMIN only. No stock change.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(req, ["ADMIN"]);
    const { id } = await ctx.params;
    return ok(await transferService.reject(user, id));
  } catch (e) {
    return handleError(e);
  }
}
