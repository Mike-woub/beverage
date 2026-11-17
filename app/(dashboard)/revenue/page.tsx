"use client";

import { useState } from "react";
import { useRevenue } from "@/lib/hooks/useDashboard";
import { PageHeader } from "@/components/shared/page-header";
import { Button, Card, EmptyState, ErrorBlock, Skeleton } from "@/components/ui/primitives";
import { StatCard } from "@/components/dashboard/StatCard";
import { HorizontalBars } from "@/components/dashboard/charts";
import { IconCart, IconMoney, IconTrend } from "@/components/ui/icons";
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Revenue Analytics"
          description="Daily revenue performance and business velocity."
        />

        {/* Window Selector Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-slate-100/80 p-1">
          {windows.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setDays(w)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                days === w
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {w} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Revenue"
          value={formatMoney(total)}
          icon={<IconMoney size={20} />}
          tone="success"
          hint={`Window: past ${days} days`}
        />
        <StatCard
          label="Completed Orders"
          value={totalOrders}
          icon={<IconCart size={20} />}
          tone="info"
          hint="total sales tickets"
        />
        <StatCard
          label="Avg / Active Day"
          value={formatMoney(avgPerDay)}
          icon={<IconTrend size={20} />}
          tone="brand"
          hint="daily revenue velocity"
        />
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
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-slate-50/50 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Daily Breakdown</h2>
              <span className="text-xs text-slate-500">{data.length} active days</span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-3">Day</th>
                    <th scope="col" className="px-4 py-3 text-right">Orders</th>
                    <th scope="col" className="px-4 py-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.map((r) => (
                    <tr key={r.day} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-900">{formatDayLabel(r.day)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{r.orderCount}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatMoney(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="font-semibold text-slate-900">Revenue by Day</h2>
              <span className="text-xs text-slate-400">ETB Trend</span>
            </div>
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
