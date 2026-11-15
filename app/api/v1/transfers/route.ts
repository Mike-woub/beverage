import type { NextRequest } from "next/server";
import { transferService } from "@/server/services/transfer.service";
import { requireRole, ok, created, handleError } from "@/server/http";
import { createTransferSchema } from "@/lib/validations/schemas";

// GET /api/v1/transfers — ADMIN and BARMAN may view transfer requests.
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["ADMIN", "BARMAN"]);
    return ok(await transferService.list());
  } catch (e) {
    return handleError(e);
  }
}

// POST /api/v1/transfers — BARMAN or ADMIN requests a warehouse → counter pull.
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["ADMIN", "BARMAN"]);
    const body = createTransferSchema.parse(await req.json());
    return created(await transferService.create(user, body));
  } catch (e) {
    return handleError(e);
  }
}
