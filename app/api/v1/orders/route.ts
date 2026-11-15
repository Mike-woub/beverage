import type { NextRequest } from "next/server";
import { orderService } from "@/server/services/order.service";
import { requireRole, ok, created, handleError } from "@/server/http";
import { createOrderSchema } from "@/lib/validations/schemas";

// GET /api/v1/orders — all orders. ADMIN and BARMAN only (waiters use /my-orders).
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ["ADMIN", "BARMAN"]);
    return ok(await orderService.list());
  } catch (e) {
    return handleError(e);
  }
}

// POST /api/v1/orders — ADMIN or BARMAN places an order (attributed to a waiter).
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["ADMIN", "BARMAN"]);
    const body = createOrderSchema.parse(await req.json());
    return created(await orderService.create(user, body.items, body.waiterId));
  } catch (e) {
    return handleError(e);
  }
}
