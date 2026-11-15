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
    <div>
      <PageHeader
        title="Stock Purchases"
        description="Register incoming beverage stock purchases and review purchase history."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit p-5">
          <h2 className="mb-4 font-semibold text-[var(--foreground)]">Register purchase</h2>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Field label="Beverage" htmlFor="itemId" error={errors.itemId}>
              <Select id="itemId" value={itemId} onChange={(e) => setItemId(e.target.value)}>
                <option value="">Select a beverage…</option>
                {activeItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} (stock {i.stock})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantity received" htmlFor="quantity" error={errors.quantity}>
              <Input id="quantity" type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Unit cost (ETB)" htmlFor="unitCost" error={errors.unitCost}>
              <Input id="unitCost" type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Description (optional)" htmlFor="description">
              <Textarea id="description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Supplier, invoice no., etc." />
            </Field>
            <Button type="submit" loading={createReceipt.isPending}>
              Register purchase
            </Button>
          </form>
        </Card>

        <Card>
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold text-[var(--foreground)]">Purchase history</h2>
          </div>
          {isLoading ? (
            <TableSkeleton cols={5} rows={PAGE_SIZE} />
          ) : !receipts || receipts.length === 0 ? (
            <EmptyState
              title="No purchases yet"
              description="Registered stock purchases appear here."
              icon={<IconReceipt size={22} />}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
                      <th scope="col" className="px-4 py-3">Date</th>
                      <th scope="col" className="px-4 py-3">Beverage</th>
                      <th scope="col" className="px-4 py-3">Qty</th>
                      <th scope="col" className="px-4 py-3">Unit cost</th>
                      <th scope="col" className="px-4 py-3">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {pageItems.map((r) => (
                      <tr key={r.id} className="transition-colors hover:bg-[var(--surface-muted)]">
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[var(--muted-foreground)]">{formatDateTime(r.createdAt)}</td>
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">{r.itemName}</td>
                        <td className="px-4 py-3 tabular-nums font-semibold text-[var(--success)]">+{r.quantity}</td>
                        <td className="px-4 py-3 tabular-nums">{formatMoney(r.unitCost)}</td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">{r.userName}</td>
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
