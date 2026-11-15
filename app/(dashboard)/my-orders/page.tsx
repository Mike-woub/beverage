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
import { formatDayLabel, formatMoney } from "@/lib/utils";

/**
 * WAITER view-only page: own order history, grouped by day. Order numbers are
 * intentionally not the headline (no real use case) — shown only in the detail
 * view. A date filter narrows to a single day.
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
    <div>
      <PageHeader
        title="My Orders"
        description="Your order history, grouped by day."
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="date"
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            aria-label="Filter by day"
            className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-tint)] sm:w-48"
          />
          <p className="text-xs text-[var(--muted-foreground)]">
            {totalOrders} orders · lifetime total{" "}
            <span className="font-medium text-[var(--foreground)]">{formatMoney(lifetimeTotal)}</span>
          </p>
        </div>

        {isLoading ? (
          <div className="divide-y divide-[var(--border)] p-4 space-y-4" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorBlock message={error?.message ?? "Failed to load"} onRetry={refetch} />
        ) : visible.length === 0 ? (
          <EmptyState
            title={dayFilter ? "No orders that day" : "No orders yet"}
            description={dayFilter ? "Try selecting another date." : "Orders placed under your name will appear here."}
            icon={<IconReceipt size={22} />}
            action={
              dayFilter ? (
                <Button variant="outline" size="sm" onClick={() => setDayFilter("")}>
                  Show all dates
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {visible.map((g) => (
              <div key={g.day}>
                <div className="flex items-center justify-between bg-[var(--surface-muted)] px-4 py-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {formatDayLabel(g.day)}
                  </span>
                  <span className="text-sm tabular-nums text-[var(--muted-foreground)]">
                    {g.orders.length} order{g.orders.length === 1 ? "" : "s"} ·{" "}
                    <span className="font-semibold text-[var(--foreground)]">{formatMoney(g.dayTotal)}</span>
                  </span>
                </div>
                <ul className="divide-y divide-[var(--border)]">
                  {g.orders.map((o) => {
                    const timeStr = new Date(o.createdAt).toLocaleTimeString("en-GB", {
                      timeZone: "Africa/Addis_Ababa",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });
                    return (
                      <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-muted)]">
                        <div className="min-w-0">
                          <p className="text-sm font-medium tabular-nums text-[var(--foreground)]">
                            {o.itemCount} item{o.itemCount === 1 ? "" : "s"} · {formatMoney(o.totalAmount)}
                          </p>
                          <p className="text-xs tabular-nums text-[var(--muted-foreground)]">
                            {timeStr}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailId(o.id)}
                          aria-label={`View order placed at ${timeStr} (${formatMoney(o.totalAmount)})`}
                        >
                          View
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <OrderDetailModal orderId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
