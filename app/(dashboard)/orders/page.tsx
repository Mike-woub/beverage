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
import { cn, formatDate, formatDateTime, formatMoney } from "@/lib/utils";

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
    <div>
      <PageHeader title="Orders" description="All completed orders across the team." />

      <Card>
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by beverage, waiter…"
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            aria-label="Filter by date"
            className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-tint)] sm:w-44"
          />
        </div>

        {isLoading ? (
          <TableSkeleton cols={6} rows={PAGE_SIZE} />
        ) : isError ? (
          <ErrorBlock message={error?.message ?? "Failed to load"} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No orders found"
            description={search || dateFilter ? "Try adjusting the filters." : "Orders will appear here once placed."}
            icon={<IconReceipt size={22} />}
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
                  <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
                    <th scope="col" className="px-4 py-3">Beverages Ordered</th>
                    <th scope="col" className="px-4 py-3">Waiter</th>
                    <th scope="col" className="px-4 py-3">Date</th>
                    <th scope="col" className="px-4 py-3">Items</th>
                    <th scope="col" className="px-4 py-3">Total</th>
                    <th scope="col" className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pageItems.map((o) => (
                    <tr
                      key={o.id}
                      className={cn(
                        "transition-colors hover:bg-[var(--surface-muted)]",
                        o.isVoided && "bg-red-50/40 dark:bg-red-950/20 opacity-75",
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        <div className="flex items-center gap-2">
                          <span>{o.itemsSummary || o.orderNumber}</span>
                          {o.isVoided && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
                              VOIDED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{o.waiterName}</td>
                      <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]" title={formatDateTime(o.createdAt)}>
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{o.itemCount}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-[var(--foreground)]">
                        <span className={o.isVoided ? "line-through text-[var(--muted-foreground)]" : undefined}>
                          {formatMoney(o.totalAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailId(o.id)}
                          aria-label={`View order for ${o.waiterName}`}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={current} totalPages={totalPages} total={filtered.length} onPage={setPage} />
          </>
        )}
      </Card>

      <OrderDetailModal orderId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
