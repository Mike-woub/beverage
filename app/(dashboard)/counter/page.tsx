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
  Select,
  TableSkeleton,
} from "@/components/ui/primitives";
import { StockStatusBadge } from "@/components/shared/status";
import { IconBox, IconMovements } from "@/components/ui/icons";
import { formatMoney, stockStatus } from "@/lib/utils";

/**
 * Counter Storage — what the barman sells from. Shows counter levels (and the
 * warehouse level for context) and lets the barman request a pull from the
 * warehouse, which an admin approves.
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
    <div>
      <PageHeader
        title="Counter Storage"
        description="Stock available at the counter for ordering. Request a stock transfer when low."
        action={
          <Button onClick={() => requestFor(undefined)}>
            <IconMovements size={16} />
            Request stock transfer
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={setSearch} placeholder="Search beverages…" />
          <p className="text-xs text-[var(--muted-foreground)]">
            Counter stock status uses the low-stock threshold:{" "}
            <span className="font-medium text-[var(--foreground)]">{threshold}</span>
          </p>
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} rows={6} />
        ) : isError ? (
          <ErrorBlock message={error?.message ?? "Failed to load"} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No matching beverages" : "No beverages"}
            description={search ? `No drinks match "${search}".` : "No beverages found in inventory."}
            icon={<IconBox size={22} />}
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
                <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
                  <th scope="col" className="px-4 py-3">Beverage</th>
                  <th scope="col" className="px-4 py-3">Price</th>
                  <th scope="col" className="px-4 py-3">Counter</th>
                  <th scope="col" className="px-4 py-3">Warehouse</th>
                  <th scope="col" className="px-4 py-3">Counter status</th>
                  <th scope="col" className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-[var(--surface-muted)]">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{item.name}</td>
                    <td className="px-4 py-3 tabular-nums">{formatMoney(item.price)}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold">{item.counterStock}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">{item.stock}</td>
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
                        Request
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
        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
          Stock transfer requests are approved by an administrator before stock reaches the counter.
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
