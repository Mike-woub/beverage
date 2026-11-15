"use client";

import { useState } from "react";
import { useRevenue } from "@/lib/hooks/useDashboard";
import { PageHeader } from "@/components/shared/page-header";
import { Button, Card, EmptyState, ErrorBlock, Skeleton } from "@/components/ui/primitives";
import { HorizontalBars } from "@/components/dashboard/charts";
import { IconMoney } from "@/components/ui/icons";
import { formatDayLabel, formatMoney } from "@/lib/utils";

/** ADMIN revenue report: total sales per day, with a selectable window. */
export default function RevenuePage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, error, refetch } = useRevenue(days);

  const total = (data ?? []).reduce((s, r) => s + r.revenue, 0);
  const totalOrders = (data ?? []).reduce((s, r) => s + r.orderCount, 0);
  const avgPerDay = data && data.length ? total / data.length : 0;

  const windows = [7, 30, 90];

  return (
    <div>
      <PageHeader
        title="Revenue"
        description="Daily revenue across the business."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Total revenue</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            {formatMoney(total)}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">last {days} days</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Orders</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{totalOrders}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Avg / active day</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
            {formatMoney(avgPerDay)}
          </p>
        </Card>
      </div>

      <div className="mb-4 flex items-center gap-2">
        {windows.map((w) => (
          <Button
            key={w}
            variant={days === w ? "primary" : "outline"}
            size="sm"
            onClick={() => setDays(w)}
          >
            {w} days
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-busy="true">
          <Card className="p-5 space-y-3">
            <Skeleton className="h-5 w-28" />
            <div className="space-y-2 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex justify-between py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-6 w-3/5" />
            </div>
          </Card>
        </div>
      ) : isError ? (
        <ErrorBlock message={error?.message ?? "Failed to load"} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState title="No revenue in this window" icon={<IconMoney size={22} />} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-[var(--foreground)]">Daily totals</h2>
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
                    <th scope="col" className="px-3 py-2">Day</th>
                    <th scope="col" className="px-3 py-2 text-right">Orders</th>
                    <th scope="col" className="px-3 py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.map((r) => (
                    <tr key={r.day} className="transition-colors hover:bg-[var(--surface-muted)]">
                      <td className="px-3 py-2 font-medium text-[var(--foreground)]">{formatDayLabel(r.day)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[var(--muted-foreground)]">{r.orderCount}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{formatMoney(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-[var(--foreground)]">Revenue by day</h2>
            <HorizontalBars
              data={[...data]
                .reverse()
                .map((r) => ({ label: formatDayLabel(r.day), value: Math.round(r.revenue) }))}
              unit=" ETB"
            />
          </Card>
        </div>
      )}
    </div>
  );
}
