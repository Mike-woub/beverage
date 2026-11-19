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
                {filtered.map((item) => {
                  const isPortioned = (item.shotsPerUnit ?? 1) > 1;
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{item.name}</span>
                          {isPortioned && (
                            <span className="inline-flex items-center rounded-md border border-teal-200/80 bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
                              1 btl = {item.shotsPerUnit} shots
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">
                        {isPortioned ? (
                          <div>
                            <span className="font-bold text-slate-900">
                              {formatMoney(item.shotPrice ?? (item.price / item.shotsPerUnit))}
                            </span>
                            <span className="text-[10px] text-teal-700 font-semibold ml-0.5">/shot</span>
                            <div className="text-[11px] text-slate-400 font-normal">
                              {formatMoney(item.price)} /btl
                            </div>
                          </div>
                        ) : (
                          <span className="font-medium text-slate-700">{formatMoney(item.price)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900 font-bold">
                        {item.counterStock}
                        {isPortioned && <span className="text-xs text-teal-700 font-semibold ml-1">shots</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500 font-medium">
                        {item.stock}
                        {isPortioned && <span className="text-xs text-slate-400 font-normal ml-1">btl</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StockStatusBadge
                          status={stockStatus({ ...item, stock: item.counterStock }, threshold)}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant={item.stock <= 0 ? "ghost" : "outline"}
                          size="sm"
                          disabled={item.stock <= 0}
                          onClick={() => requestFor(item.id)}
                          aria-label={`Request stock transfer for ${item.name}`}
                          className={item.stock <= 0 ? "text-slate-400 cursor-not-allowed" : ""}
                        >
                          {item.stock <= 0 ? "Warehouse empty" : "Request pull"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
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
