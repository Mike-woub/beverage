import type { NextRequest } from "next/server";
import { userService } from "@/server/services/user.service";
import { requireRole, ok, handleError } from "@/server/http";
import { updateUserSchema } from "@/lib/validations/schemas";

// PUT /api/v1/users/[id] — ADMIN only.
export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(req, ["ADMIN"]);
    const { id } = await ctx.params;
    const body = updateUserSchema.parse(await req.json());
    return ok(await userService.update(id, body));
  } catch (e) {
    return handleError(e);
  }
}
