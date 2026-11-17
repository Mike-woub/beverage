"use client";

import { useMemo, useState } from "react";
import { useItems } from "@/lib/hooks/useItems";
import { useSetting } from "@/lib/hooks/useInventory";
import { useSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/toolbar";
import { RequestTransferModal } from "@/components/counter/RequestTransferModal";
import {
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  TableSkeleton,
} from "@/components/ui/primitives";
import { StockStatusBadge } from "@/components/shared/status";
import { IconBox, IconMovements } from "@/components/ui/icons";
import { formatMoney, stockStatus } from "@/lib/utils";

/**
 * Counter Storage — what the barman sells from.
 * Shows counter stock levels vs warehouse reserve and lets staff request stock transfers.
 */
export default function CounterPage() {
  const { user } = useSession();
  const isAdmin = user?.role === "ADMIN";
  const { data: items, isLoading, isError, error, refetch } = useItems();
  const { data: setting } = useSetting();

  const [search, setSearch] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [presetItemId, setPresetItemId] = useState<string | undefined>(undefined);

  const threshold = setting?.lowStockThreshold ?? 10;

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => (q ? i.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.counterStock - b.counterStock);
  }, [items, search]);

  function requestFor(itemId?: string) {
    setPresetItemId(itemId);
    setRequestOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Counter Storage"
        description="Active inventory ready at the counter bar for immediate ordering. Request a transfer from the back warehouse when low."
        action={
          <Button onClick={() => requestFor(undefined)}>
            <IconMovements size={16} />
            Request stock transfer
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search counter beverages…"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Counter low-stock threshold:</span>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 tabular-nums">
              {threshold} units
            </span>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} rows={6} />
        ) : isError ? (
          <ErrorBlock message={error?.message ?? "Failed to load"} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No matching beverages" : "No beverages in counter stock"}
            description={search ? `No drinks match "${search}".` : "No beverages found in inventory."}
            icon={<IconBox size={24} />}
            action={
              search ? (
                <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-4 py-3">Beverage</th>
                  <th scope="col" className="px-4 py-3">Price</th>
                  <th scope="col" className="px-4 py-3 text-right">Counter Stock</th>
                  <th scope="col" className="px-4 py-3 text-right">Warehouse Reserve</th>
                  <th scope="col" className="px-4 py-3">Counter Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 tabular-nums font-medium text-slate-700">{formatMoney(item.price)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900">{item.counterStock}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500 font-medium">{item.stock}</td>
                    <td className="px-4 py-3">
                      <StockStatusBadge
                        status={stockStatus({ ...item, stock: item.counterStock }, threshold)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestFor(item.id)}
                        aria-label={`Request stock transfer for ${item.name}`}
                      >
                        Request pull
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!isAdmin && (
        <p className="text-xs text-slate-500">
          Stock transfer requests must be approved by an administrator before stock is moved to the counter.
        </p>
      )}

      <RequestTransferModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        items={items ?? []}
        presetItemId={presetItemId}
      />
    </div>
  );
}
