import type { NextRequest } from "next/server";
import { userService } from "@/server/services/user.service";
import { requireRole, ok, handleError } from "@/server/http";
import { userStatusSchema } from "@/lib/validations/schemas";

// PATCH /api/v1/users/[id]/status — ADMIN only (activate/deactivate).
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const actingUser = await requireRole(req, ["ADMIN"]);
    const { id } = await ctx.params;
    const { isActive } = userStatusSchema.parse(await req.json());
    return ok(await userService.setActive(actingUser, id, isActive));
  } catch (e) {
    return handleError(e);
  }
}
