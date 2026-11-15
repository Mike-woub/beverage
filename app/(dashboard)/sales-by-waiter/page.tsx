"use client";

import { useState } from "react";
import { useSalesByWaiter } from "@/lib/hooks/useDashboard";
import { PageHeader } from "@/components/shared/page-header";
import { Button, Card, EmptyState, ErrorBlock, Skeleton } from "@/components/ui/primitives";
import { HorizontalBars } from "@/components/dashboard/charts";
import { WaiterSalesModal } from "@/components/dashboard/WaiterSalesModal";
import { IconTrend } from "@/components/ui/icons";
import { formatDayLabel, formatMoney, todayAddisKey } from "@/lib/utils";

/**
 * ADMIN control report: sales by waiter, scoped to a day (default today) or all
 * time. Pick a date to see each waiter's total for that day.
 * Click any waiter to see an itemized breakdown of beverages sold.
 */
export default function SalesByWaiterPage() {
  // "" = all time; otherwise a YYYY-MM-DD day.
  const [day, setDay] = useState<string>(todayAddisKey());
  const [selectedWaiter, setSelectedWaiter] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, isError, error, refetch } = useSalesByWaiter(day);

  const grandTotal = (data ?? []).reduce((s, r) => s + r.totalSales, 0);
  const totalOrders = (data ?? []).reduce((s, r) => s + r.orderCount, 0);
  const scopeLabel = day ? formatDayLabel(day) : "All time";

  return (
    <div>
      <PageHeader
        title="Sales by Waiter"
        description="Total sales attributed to each waiter. Pick a day, or view all time."
      />

      <Card className="mb-6">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={day}
              max={todayAddisKey()}
              onChange={(e) => setDay(e.target.value)}
              aria-label="Filter by day"
              className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-tint)]"
            />
            <Button
              variant={day ? "outline" : "primary"}
              size="sm"
              onClick={() => setDay("")}
            >
              All time
            </Button>
            {day && (
              <Button variant="ghost" size="sm" onClick={() => setDay(todayAddisKey())}>
                Today
              </Button>
            )}
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            <span className="font-medium text-[var(--foreground)]">{scopeLabel}</span> · {totalOrders} orders ·{" "}
            <span className="font-medium text-[var(--foreground)]">{formatMoney(grandTotal)}</span>
          </p>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" aria-busy="true">
          <Card className="p-5 space-y-3">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between py-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5 space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-4/5" />
            </div>
          </Card>
        </div>
      ) : isError ? (
        <ErrorBlock message={error?.message ?? "Failed to load"} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState
            title={day ? `No sales on ${scopeLabel}` : "No sales yet"}
            description={day ? "Try another day or view all time." : "Orders will show up here once placed."}
            icon={<IconTrend size={22} />}
            action={
              day ? (
                <Button variant="outline" size="sm" onClick={() => setDay("")}>
                  View all time
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-semibold text-[var(--foreground)]">Breakdown — {scopeLabel}</h2>
              <span className="text-xs text-[var(--muted-foreground)]">Click a waiter to see drinks sold</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
                    <th scope="col" className="px-3 py-2">Waiter</th>
                    <th scope="col" className="px-3 py-2 text-right">Orders</th>
                    <th scope="col" className="px-3 py-2 text-right">Total sales</th>
                    <th scope="col" className="px-3 py-2 text-right">Avg / order</th>
                    <th scope="col" className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.map((r) => (
                    <tr key={r.waiterId} className="transition-colors hover:bg-[var(--surface-muted)]">
                      <td className="px-3 py-2 font-medium">
                        <button
                          type="button"
                          onClick={() => setSelectedWaiter({ id: r.waiterId, name: r.waiterName })}
                          className="rounded-[var(--radius-sm)] text-left font-semibold text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                          aria-label={`View beverages sold by ${r.waiterName}`}
                        >
                          {r.waiterName}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.orderCount}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{formatMoney(r.totalSales)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-[var(--muted-foreground)]">
                        {formatMoney(r.orderCount ? r.totalSales / r.orderCount : 0)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedWaiter({ id: r.waiterId, name: r.waiterName })}
                          aria-label={`View beverages sold by ${r.waiterName}`}
                        >
                          View items
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border)]">
                    <td className="px-3 py-2.5 font-semibold text-[var(--foreground)]">Total</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{totalOrders}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatMoney(grandTotal)}</td>
                    <td className="px-3 py-2.5"></td>
                    <td className="px-3 py-2.5"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-[var(--foreground)]">Sales share</h2>
            <HorizontalBars
              data={data.map((r) => ({ label: r.waiterName, value: Math.round(r.totalSales) }))}
            />
          </Card>
        </div>
      )}

      <WaiterSalesModal
        waiter={selectedWaiter}
        day={day || undefined}
        onClose={() => setSelectedWaiter(null)}
      />
    </div>
  );
}

