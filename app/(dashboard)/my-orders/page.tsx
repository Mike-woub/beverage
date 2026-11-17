"use client";

import { useMemo, useState } from "react";
import { useMyOrdersByDay } from "@/lib/hooks/useOrders";
import { PageHeader } from "@/components/shared/page-header";
import { OrderDetailModal } from "@/components/orders/OrderDetailModal";
import {
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  Skeleton,
} from "@/components/ui/primitives";
import { IconReceipt } from "@/components/ui/icons";
import { formatDateTime, formatDayLabel, formatMoney } from "@/lib/utils";

/**
 * WAITER view-only page: own order history, grouped by day.
 */
export default function MyOrdersPage() {
  const { data: groups, isLoading, isError, error, refetch } = useMyOrdersByDay();

  const [dayFilter, setDayFilter] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (!groups) return [];
    return dayFilter ? groups.filter((g) => g.day === dayFilter) : groups;
  }, [groups, dayFilter]);

  const lifetimeTotal = (groups ?? []).reduce((s, g) => s + g.dayTotal, 0);
  const totalOrders = (groups ?? []).reduce((s, g) => s + g.orders.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Orders"
        description="Your personal beverage order history, grouped by shift day."
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Day:</span>
            <input
              type="date"
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              aria-label="Filter by day"
              className="h-9 rounded-lg border border-[var(--border-strong)] bg-white px-3 text-xs font-medium text-slate-900 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-border)] sm:w-44"
            />
            {dayFilter && (
              <Button variant="ghost" size="sm" onClick={() => setDayFilter("")}>
                Clear
              </Button>
            )}
          </div>
          <p className="text-xs font-medium text-slate-500">
            <span className="font-semibold text-slate-800">{totalOrders}</span> orders · Lifetime Total:{" "}
            <span className="font-bold text-slate-900">{formatMoney(lifetimeTotal)}</span>
          </p>
        </div>

        {isLoading ? (
          <div className="divide-y divide-slate-100 p-4 space-y-4" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3 py-3">
                <Skeleton className="h-5 w-36" />
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorBlock message={error?.message ?? "Failed to load orders"} onRetry={refetch} />
        ) : visible.length === 0 ? (
          <EmptyState
            title={dayFilter ? "No orders on this day" : "No orders yet"}
            description={
              dayFilter
                ? "Try picking another date or clear the filter."
                : "Your orders will appear here as they are entered at the counter."
            }
            icon={<IconReceipt size={24} />}
            action={
              dayFilter ? (
                <Button variant="outline" size="sm" onClick={() => setDayFilter("")}>
                  Show all days
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-slate-200">
            {visible.map((group) => (
              <div key={group.day} className="p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">
                    {formatDayLabel(group.day)}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {group.orders.length} order{group.orders.length === 1 ? "" : "s"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-slate-800 border border-slate-200">
                      {formatMoney(group.dayTotal)}
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="divide-y divide-slate-100">
                    {group.orders.map((o) => (
                      <div
                        key={o.id}
                        className="flex flex-col gap-2 p-3.5 transition-colors hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-sm text-slate-900">
                            {(o as { itemsSummary?: string }).itemsSummary || o.orderNumber}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDateTime(o.createdAt)} · {o.itemCount} unit{o.itemCount === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <span className="font-bold tabular-nums text-sm text-slate-900">
                            {formatMoney(o.totalAmount)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailId(o.id)}
                            aria-label={`View order details`}
                          >
                            View chit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <OrderDetailModal orderId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
