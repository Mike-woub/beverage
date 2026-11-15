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
import { formatDateTime } from "@/lib/utils";
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
    <div>
      <PageHeader
        title="Stock Movements"
        description="Immutable audit trail of every stock change."
        action={
          <Button onClick={() => setAdjustOpen(true)}>
            <IconPlus size={16} />
            New adjustment
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row">
          <Select
            value={itemFilter}
            onChange={(e) => { setItemFilter(e.target.value); setPage(1); }}
            className="sm:w-56"
            aria-label="Filter by beverage"
          >
            <option value="">All beverages</option>
            {items?.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </Select>
          <Select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as MovementType | "ALL"); setPage(1); }}
            className="sm:w-48"
            aria-label="Filter by movement type"
          >
            <option value="ALL">All types</option>
            {MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <TableSkeleton cols={7} rows={PAGE_SIZE} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No movements found"
            description={itemFilter || typeFilter !== "ALL" ? "Try adjusting the filters." : "Stock movements will appear here once inventory changes occur."}
            icon={<IconMovements size={22} />}
            action={
              itemFilter || typeFilter !== "ALL" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setItemFilter("");
                    setTypeFilter("ALL");
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
                    <th scope="col" className="px-4 py-3">Date</th>
                    <th scope="col" className="px-4 py-3">Beverage</th>
                    <th scope="col" className="px-4 py-3">Type</th>
                    <th scope="col" className="px-4 py-3">Qty</th>
                    <th scope="col" className="px-4 py-3">User</th>
                    <th scope="col" className="px-4 py-3">Reference</th>
                    <th scope="col" className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pageItems.map((m) => {
                    const sign = movementSign(m.movementType);
                    return (
                      <tr key={m.id} className="transition-colors hover:bg-[var(--surface-muted)]">
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[var(--muted-foreground)]">{formatDateTime(m.createdAt)}</td>
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">{m.itemName}</td>
                        <td className="px-4 py-3"><MovementBadge type={m.movementType} /></td>
                        <td
                          className="px-4 py-3 tabular-nums font-semibold"
                          style={{ color: sign === "+" ? "var(--success)" : "var(--danger)" }}
                        >
                          {sign}{m.quantity}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">{m.userName}</td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]" title={m.relatedOrderNumber ?? ""}>
                          {m.movementType === "ORDER_OUT"
                            ? "Order sale"
                            : m.relatedReceiptId
                              ? "Purchase"
                              : "—"}
                        </td>
                        <td className="max-w-[16rem] truncate px-4 py-3 text-[var(--muted-foreground)]" title={m.description ?? ""}>
                          {m.description ?? "—"}
                        </td>
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

      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Stock adjustment"
        description="Increase or decrease stock. A reason is required and recorded in the audit trail."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdjustOpen(false)} disabled={createAdjustment.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="adjust-form" loading={createAdjustment.isPending}>
              Record adjustment
            </Button>
          </>
        }
      >
        <form id="adjust-form" onSubmit={submitAdjustment} className="flex flex-col gap-4" noValidate>
          <Field label="Beverage" htmlFor="adj-item" error={errors.itemId}>
            <Select id="adj-item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Select a beverage…</option>
              {activeItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (warehouse {i.stock}, counter {i.counterStock})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stock pool" htmlFor="adj-pool">
            <Select id="adj-pool" value={pool} onChange={(e) => setPool(e.target.value as "WAREHOUSE" | "COUNTER")}>
              <option value="WAREHOUSE">Warehouse</option>
              <option value="COUNTER">Counter</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Direction" htmlFor="adj-dir">
              <Select id="adj-dir" value={direction} onChange={(e) => setDirection(e.target.value as "IN" | "OUT")}>
                <option value="IN">Increase (+)</option>
                <option value="OUT">Decrease (−)</option>
              </Select>
            </Field>
            <Field label="Quantity" htmlFor="adj-qty" error={errors.quantity}>
              <Input id="adj-qty" type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </Field>
          </div>
          <Field label="Reason" htmlFor="adj-reason" error={errors.reason}>
            <Textarea id="adj-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Breakage, stock count correction" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
