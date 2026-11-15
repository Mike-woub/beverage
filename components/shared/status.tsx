import type { MovementType, StockStatus, Role } from "@/lib/types";
import { Badge } from "@/components/ui/primitives";
import { STOCK_STATUS_LABEL } from "@/lib/utils";

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const tone =
    status === "IN_STOCK" ? "success" : status === "LOW_STOCK" ? "warning" : "danger";
  return <Badge tone={tone}>{STOCK_STATUS_LABEL[status]}</Badge>;
}

export function RoleBadge({ role }: { role: Role }) {
  const map = {
    ADMIN: { tone: "brand" as const, label: "Admin" },
    BARMAN: { tone: "info" as const, label: "Barman" },
    WAITER: { tone: "neutral" as const, label: "Waiter" },
  };
  const { tone, label } = map[role];
  return <Badge tone={tone}>{label}</Badge>;
}

const MOVEMENT_META: Record<
  MovementType,
  { tone: "success" | "danger" | "info" | "warning" | "neutral" | "brand"; label: string; sign: string }
> = {
  ORDER_OUT: { tone: "danger", label: "Order out", sign: "−" },
  RECEIPT_IN: { tone: "success", label: "Purchase in", sign: "+" },
  ADJUSTMENT_IN: { tone: "info", label: "Adjust in", sign: "+" },
  ADJUSTMENT_OUT: { tone: "warning", label: "Adjust out", sign: "−" },
  TRANSFER_OUT: { tone: "warning", label: "Stock transfer out (warehouse)", sign: "−" },
  TRANSFER_IN: { tone: "brand", label: "Stock transfer in (counter)", sign: "+" },
  VOID_IN: { tone: "info", label: "Void order return", sign: "+" },
};

export function TransferStatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  const map = {
    PENDING: { tone: "warning" as const, label: "Pending" },
    APPROVED: { tone: "success" as const, label: "Approved" },
    REJECTED: { tone: "danger" as const, label: "Rejected" },
  };
  const { tone, label } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function MovementBadge({ type }: { type: MovementType }) {
  const meta = MOVEMENT_META[type];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function movementSign(type: MovementType): string {
  return MOVEMENT_META[type].sign;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "success" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>;
}
