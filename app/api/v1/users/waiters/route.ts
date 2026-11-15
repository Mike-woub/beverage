import type { NextRequest } from "next/server";
import { userService } from "@/server/services/user.service";
import { requireRole, ok, handleError } from "@/server/http";

// GET /api/v1/users/waiters — ADMIN and BARMAN. Powers the waiter dropdown on
// the New Order screen (the barman/admin picks which waiter the order is for).
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["ADMIN", "BARMAN"]);
    return ok(await userService.listWaiters());
  } catch (e) {
    return handleError(e);
  }
}
