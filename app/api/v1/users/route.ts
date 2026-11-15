import type { NextRequest } from "next/server";
import { userService } from "@/server/services/user.service";
import { requireRole, ok, created, handleError } from "@/server/http";
import { createUserSchema } from "@/lib/validations/schemas";

// GET /api/v1/users — ADMIN only.
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["ADMIN"]);
    return ok(await userService.list());
  } catch (e) {
    return handleError(e);
  }
}

// POST /api/v1/users — ADMIN only.
export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ["ADMIN"]);
    const body = createUserSchema.parse(await req.json());
    return created(await userService.create(body));
  } catch (e) {
    return handleError(e);
  }
}
