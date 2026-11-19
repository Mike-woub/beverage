import type { NextRequest } from "next/server";
import { itemService } from "@/server/services/item.service";
import { requireRole, ok, handleError } from "@/server/http";
import { physicalCheckSchema } from "@/lib/validations/schemas";

// PATCH /api/v1/items/[id]/physical-check — ADMIN only: record physically checked count
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(req, ["ADMIN"]);
    const { id } = await params;
    const body = physicalCheckSchema.parse(await req.json());
    return ok(await itemService.setPhysicalCheck(id, body.physicalCount));
  } catch (e) {
    return handleError(e);
  }
}
