"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { useItems } from "@/lib/hooks/useItems";
import { useCreateAdjustment, useMovements } from "@/lib/hooks/useInventory";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/toolbar";
import { Modal } from "@/components/ui/modal";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  TableSkeleton,
  Textarea,
} from "@/components/ui/primitives";
import { MovementBadge, movementSign } from "@/components/shared/status";
import { IconMovements, IconPlus } from "@/components/ui/icons";
import { cn, formatDateTime } from "@/lib/utils";
import type { MovementType } from "@/lib/types";

const PAGE_SIZE = 12;

const adjustSchema = z.object({
  itemId: z.string().min(1, "Select a beverage"),
  pool: z.enum(["WAREHOUSE", "COUNTER"]),
  direction: z.enum(["IN", "OUT"]),
  quantity: z.number().int("Whole number").positive("Must be greater than zero"),
  reason: z.string().min(1, "A reason is required"),
});

const MOVEMENT_TYPES: MovementType[] = [
  "ORDER_OUT",
  "RECEIPT_IN",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "VOID_IN",
];

export default function StockMovementsPage() {
  const { data: items } = useItems();
  const { data: movements, isLoading } = useMovements();
  const createAdjustment = useCreateAdjustment();

  const [itemFilter, setItemFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<MovementType | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [adjustOpen, setAdjustOpen] = useState(false);

  // adjustment form
  const [itemId, setItemId] = useState("");
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [pool, setPool] = useState<"WAREHOUSE" | "COUNTER">("WAREHOUSE");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const activeItems = useMemo(() => items?.filter((i) => i.isActive) ?? [], [items]);

  const filtered = useMemo(() => {
    if (!movements) return [];
    return movements.filter((m) => {
      if (itemFilter && m.itemId !== itemFilter) return false;
      if (typeFilter !== "ALL" && m.movementType !== typeFilter) return false;
      return true;
    });
  }, [movements, itemFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  async function submitAdjustment(e: React.FormEvent) {
    e.preventDefault();
    const values = { itemId, pool, direction, quantity: Number(quantity), reason: reason.trim() };
    const parsed = adjustSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      await createAdjustment.mutateAsync(values);
      setAdjustOpen(false);
      setItemId("");
      setQuantity("");
      setReason("");
      setDirection("IN");
      setPool("WAREHOUSE");
    } catch {
      /* toast handled */
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        description="Immutable enterprise audit trail tracking every beverage movement, sale, transfer, and manual adjustment."
        action={
          <Button onClick={() => setAdjustOpen(true)}>
            <IconPlus size={16} />
            New adjustment
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-slate-50/50 p-4 sm:flex-row sm:items-center">
          <div className="sm:w-56">
            <Select
              value={itemFilter}
              onChange={(e) => { setItemFilter(e.target.value); setPage(1); }}
              aria-label="Filter by beverage"
            >
              <option value="">All beverages</option>
              {items?.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </Select>
          </div>
          <div className="sm:w-56">
            <Select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as MovementType | "ALL"); setPage(1); }}
              aria-label="Filter by movement type"
            >
              <option value="ALL">All movement types</option>
              {MOVEMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </Select>
          </div>
          {(itemFilter || typeFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setItemFilter(""); setTypeFilter("ALL"); setPage(1); }}
            >
              Reset filters
            </Button>
          )}
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} rows={PAGE_SIZE} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No movements match the filters"
            description="Try clearing the filters to view all audit records."
            icon={<IconMovements size={24} />}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-3">Timestamp</th>
                    <th scope="col" className="px-4 py-3">Beverage</th>
                    <th scope="col" className="px-4 py-3">Movement Type</th>
                    <th scope="col" className="px-4 py-3 text-right">Units Change</th>
                    <th scope="col" className="px-4 py-3">Reference</th>
                    <th scope="col" className="px-4 py-3">Description</th>
                    <th scope="col" className="px-4 py-3">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pageItems.map((m) => {
                    const sign = movementSign(m.movementType);
                    const isPositive = sign === "+";
                    return (
                      <tr key={m.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-xs text-slate-500 font-medium">
                          {formatDateTime(m.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{m.itemName}</td>
                        <td className="px-4 py-3"><MovementBadge type={m.movementType} /></td>
                        <td
                          className={cn(
                            "px-4 py-3 text-right tabular-nums font-bold",
                            isPositive ? "text-[var(--success)]" : "text-[var(--danger)]",
                          )}
                        >
                          {sign}{m.quantity}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500" title={m.relatedOrderNumber ?? ""}>
                          {m.movementType === "ORDER_OUT"
                            ? "Order sale"
                            : m.relatedReceiptId
                              ? "Purchase"
                              : "—"}
                        </td>
                        <td className="max-w-[16rem] truncate px-4 py-3 text-xs text-slate-500" title={m.description ?? ""}>
                          {m.description || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-medium">{m.userName}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={current} totalPages={totalPages} total={filtered.length} onPage={setPage} />
          </>
        )}
      </Card>

      {/* Manual Stock Adjustment Modal */}
      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Manual Stock Adjustment"
        description="Records an audit-logged inventory change with mandatory reason."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button type="submit" form="adjustment-form" loading={createAdjustment.isPending}>
              Commit Adjustment
            </Button>
          </>
        }
      >
        <form id="adjustment-form" onSubmit={submitAdjustment} className="flex flex-col gap-4" noValidate>
          <Field label="Beverage Item" htmlFor="adj-item" error={errors.itemId}>
            <Select id="adj-item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Select beverage…</option>
              {activeItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (Warehouse: {i.stock}, Counter: {i.counterStock})
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock Location" htmlFor="adj-pool">
              <Select
                id="adj-pool"
                value={pool}
                onChange={(e) => setPool(e.target.value as "WAREHOUSE" | "COUNTER")}
              >
                <option value="WAREHOUSE">Warehouse Reserve</option>
                <option value="COUNTER">Counter Bar</option>
              </Select>
            </Field>

            <Field label="Direction" htmlFor="adj-dir">
              <Select
                id="adj-dir"
                value={direction}
                onChange={(e) => setDirection(e.target.value as "IN" | "OUT")}
              >
                <option value="IN">Add Stock (+ IN)</option>
                <option value="OUT">Deduct Stock (− OUT)</option>
              </Select>
            </Field>
          </div>

          <Field label="Quantity" htmlFor="adj-qty" error={errors.quantity}>
            <Input
              id="adj-qty"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 5"
            />
          </Field>

          <Field label="Reason / Explanation" htmlFor="adj-reason" error={errors.reason} hint="Mandatory explanation for audit compliance.">
            <Textarea
              id="adj-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Broken bottle during cleanup, physical recount variance"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
