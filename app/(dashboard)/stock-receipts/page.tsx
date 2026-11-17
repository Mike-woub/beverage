"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { useItems } from "@/lib/hooks/useItems";
import { useCreateReceipt, useReceipts } from "@/lib/hooks/useInventory";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/toolbar";
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
import { IconReceipt } from "@/components/ui/icons";
import { formatDateTime, formatMoney } from "@/lib/utils";

const schema = z.object({
  itemId: z.string().min(1, "Select a beverage"),
  quantity: z.number().int("Whole number").positive("Must be greater than zero"),
  unitCost: z.number().nonnegative("Cannot be negative"),
});

const PAGE_SIZE = 8;

export default function StockReceiptsPage() {
  const { data: items } = useItems();
  const { data: receipts, isLoading } = useReceipts();
  const createReceipt = useCreateReceipt();

  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const activeItems = useMemo(() => items?.filter((i) => i.isActive) ?? [], [items]);

  const totalPages = Math.max(1, Math.ceil((receipts?.length ?? 0) / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = (receipts ?? []).slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values = { itemId, quantity: Number(quantity), unitCost: Number(unitCost) };
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      await createReceipt.mutateAsync({ ...values, description: description.trim() || undefined });
      setQuantity("");
      setUnitCost("");
      setDescription("");
    } catch {
      /* toast handled */
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Purchases"
        description="Register incoming beverage supply purchases and track supplier delivery logs."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr] items-start">
        {/* Register purchase form card */}
        <Card className="p-5 shadow-xs">
          <div className="mb-4 border-b border-[var(--border)] pb-3">
            <h2 className="font-bold text-slate-900 text-base">Register Purchase</h2>
            <p className="text-xs text-slate-500">Adds units directly to warehouse reserve stock.</p>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Field label="Beverage Item" htmlFor="itemId" error={errors.itemId}>
              <Select id="itemId" value={itemId} onChange={(e) => setItemId(e.target.value)}>
                <option value="">Select a beverage…</option>
                {activeItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} (Warehouse: {i.stock})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantity Received" htmlFor="quantity" error={errors.quantity}>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 50"
              />
            </Field>
            <Field label="Unit Purchase Cost (ETB)" htmlFor="unitCost" error={errors.unitCost}>
              <Input
                id="unitCost"
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="e.g. 45.00"
              />
            </Field>
            <Field label="Supplier / Note (Optional)" htmlFor="description">
              <Textarea
                id="description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Supplier name, delivery invoice number, etc."
              />
            </Field>
            <Button type="submit" loading={createReceipt.isPending} className="mt-1">
              Confirm Purchase
            </Button>
          </form>
        </Card>

        {/* Purchase history card */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-slate-50/50 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Purchase History</h2>
            <span className="text-xs text-slate-500">{receipts?.length ?? 0} total purchase records</span>
          </div>
          {isLoading ? (
            <TableSkeleton cols={5} rows={PAGE_SIZE} />
          ) : !receipts || receipts.length === 0 ? (
            <EmptyState
              title="No purchases recorded yet"
              description="Incoming warehouse supply purchases will appear here."
              icon={<IconReceipt size={24} />}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th scope="col" className="px-4 py-3">Date</th>
                      <th scope="col" className="px-4 py-3">Beverage</th>
                      <th scope="col" className="px-4 py-3 text-right">Qty Added</th>
                      <th scope="col" className="px-4 py-3 text-right">Unit Cost</th>
                      <th scope="col" className="px-4 py-3">Registered By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {pageItems.map((r) => (
                      <tr key={r.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-xs text-slate-500 font-medium">
                          {formatDateTime(r.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{r.itemName}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-[var(--success)]">
                          +{r.quantity}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900">
                          {formatMoney(r.unitCost)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-medium">{r.userName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={current} totalPages={totalPages} total={receipts.length} onPage={setPage} />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
