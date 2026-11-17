"use client";

import { useState } from "react";
import { useSalesByWaiter } from "@/lib/hooks/useDashboard";
import { PageHeader } from "@/components/shared/page-header";
import { Button, Card, EmptyState, ErrorBlock, Skeleton } from "@/components/ui/primitives";
import { StatCard } from "@/components/dashboard/StatCard";
import { HorizontalBars } from "@/components/dashboard/charts";
import { WaiterSalesModal } from "@/components/dashboard/WaiterSalesModal";
import { IconCart, IconMoney, IconTrend, IconUsers } from "@/components/ui/icons";
import { formatDayLabel, formatMoney, initials, todayAddisKey } from "@/lib/utils";

/**
 * ADMIN control report: sales by waiter, scoped to a day (default today) or all time.
 * Click any waiter or "View drinks" to see an itemized breakdown of beverages sold.
 */
export default function SalesByWaiterPage() {
  const [day, setDay] = useState<string>(todayAddisKey());
  const [selectedWaiter, setSelectedWaiter] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, isError, error, refetch } = useSalesByWaiter(day);

  const grandTotal = (data ?? []).reduce((s, r) => s + r.totalSales, 0);
  const totalOrders = (data ?? []).reduce((s, r) => s + r.orderCount, 0);
  const waiterCount = data?.length ?? 0;
  const scopeLabel = day ? formatDayLabel(day) : "All time";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Sales by Waiter"
          description="Total sales attributed to each waiter. Filter by day, or view all time."
        />

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-white p-1.5 shadow-xs">
          <input
            type="date"
            value={day}
            max={todayAddisKey()}
            onChange={(e) => setDay(e.target.value)}
            aria-label="Filter by day"
            className="h-9 rounded-lg border border-[var(--border)] bg-white px-3 text-xs font-medium text-slate-900 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-border)]"
          />
          <button
            type="button"
            onClick={() => setDay(todayAddisKey())}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              day === todayAddisKey()
                ? "bg-[var(--brand)] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDay("")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              !day
                ? "bg-[var(--brand)] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All time
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Sales"
          value={formatMoney(grandTotal)}
          icon={<IconMoney size={20} />}
          tone="success"
          hint={`Scope: ${scopeLabel}`}
        />
        <StatCard
          label="Orders Served"
          value={totalOrders}
          icon={<IconCart size={20} />}
          tone="info"
          hint="attributed tickets"
        />
        <StatCard
          label="Active Staff"
          value={waiterCount}
          icon={<IconUsers size={20} />}
          tone="brand"
          hint="servers recorded"
        />
      </div>

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
          {/* Waiter Breakdown Table */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-slate-50/50 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">Waitstaff Performance</h2>
                <p className="text-xs text-slate-500">Click a waiter or &apos;View drinks&apos; to view itemized sales</p>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                {scopeLabel}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-3">Waiter</th>
                    <th scope="col" className="px-4 py-3 text-right">Orders</th>
                    <th scope="col" className="px-4 py-3 text-right">Total sales</th>
                    <th scope="col" className="px-4 py-3 text-right">Avg / order</th>
                    <th scope="col" className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.map((r) => (
                    <tr key={r.waiterId} className="group transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                            {initials(r.waiterName)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedWaiter({ id: r.waiterId, name: r.waiterName })}
                            className="text-left font-semibold text-slate-900 hover:text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                            aria-label={`View beverages sold by ${r.waiterName}`}
                          >
                            {r.waiterName}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{r.orderCount}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatMoney(r.totalSales)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                        {formatMoney(r.orderCount ? r.totalSales / r.orderCount : 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedWaiter({ id: r.waiterId, name: r.waiterName })}
                          aria-label={`View beverages sold by ${r.waiterName}`}
                        >
                          View drinks
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border)] bg-slate-50/50 font-bold text-slate-900">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">{totalOrders}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(grandTotal)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-normal text-slate-500">
                      {formatMoney(totalOrders ? grandTotal / totalOrders : 0)}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Sales Share Chart */}
          <Card className="overflow-hidden p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="font-semibold text-slate-900">Sales Share by Server</h2>
              <span className="text-xs text-slate-400">Revenue Volume</span>
            </div>
            <HorizontalBars
              data={data.map((r) => ({ label: r.waiterName, value: Math.round(r.totalSales) }))}
              unit=" ETB"
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
