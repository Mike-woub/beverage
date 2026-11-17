"use client";

import { useMemo, useState } from "react";
import { useOrders } from "@/lib/hooks/useOrders";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput, Pagination } from "@/components/shared/toolbar";
import { OrderDetailModal } from "@/components/orders/OrderDetailModal";
import {
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  TableSkeleton,
} from "@/components/ui/primitives";
import { IconReceipt } from "@/components/ui/icons";
import { cn, formatDateTime, formatMoney, initials } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const { data: orders, isLoading, isError, error, refetch } = useOrders();

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!orders) return [];
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (
        q &&
        !o.orderNumber.toLowerCase().includes(q) &&
        !o.waiterName.toLowerCase().includes(q) &&
        !(o.itemsSummary?.toLowerCase().includes(q) ?? false)
      ) {
        return false;
      }
      if (dateFilter) {
        const d = new Date(o.createdAt);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate(),
        ).padStart(2, "0")}`;
        if (iso !== dateFilter) return false;
      }
      return true;
    });
  }, [orders, search, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Comprehensive audit of all orders placed across the team."
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-slate-50/50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by beverage, waiter…"
            className="sm:max-w-xs"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              aria-label="Filter by date"
              className="h-9 rounded-lg border border-[var(--border-strong)] bg-white px-3 text-xs font-medium text-slate-900 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-border)] sm:w-44"
            />
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} rows={PAGE_SIZE} />
        ) : isError ? (
          <ErrorBlock message={error?.message ?? "Failed to load"} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No orders found"
            description={search || dateFilter ? "Try adjusting the filters." : "Orders will appear here once placed."}
            icon={<IconReceipt size={24} />}
            action={
              search || dateFilter ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setDateFilter("");
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
                  <tr className="border-b border-[var(--border)] bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-3">Beverages Ordered</th>
                    <th scope="col" className="px-4 py-3">Waiter</th>
                    <th scope="col" className="px-4 py-3">Date</th>
                    <th scope="col" className="px-4 py-3 text-right">Items</th>
                    <th scope="col" className="px-4 py-3 text-right">Total</th>
                    <th scope="col" className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pageItems.map((o) => (
                    <tr
                      key={o.id}
                      className={cn(
                        "transition-colors hover:bg-slate-50/60",
                        o.isVoided && "bg-rose-50/40 opacity-75",
                      )}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-xs sm:max-w-md">
                            {(o as { itemsSummary?: string }).itemsSummary || o.orderNumber}
                          </span>
                          {o.isVoided && (
                            <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              VOIDED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                            {initials(o.waiterName)}
                          </span>
                          <span className="font-medium text-xs text-slate-900">{o.waiterName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs text-slate-500">
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs font-semibold text-slate-600">
                        {o.itemCount} unit{o.itemCount === 1 ? "" : "s"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                        <span className={cn(o.isVoided && "line-through text-slate-400 font-normal")}>
                          {formatMoney(o.totalAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailId(o.id)}
                          aria-label={`View order ${o.orderNumber}`}
                        >
                          View chit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={current}
              totalPages={totalPages}
              total={filtered.length}
              onPage={setPage}
            />
          </>
        )}
      </Card>

      <OrderDetailModal orderId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
