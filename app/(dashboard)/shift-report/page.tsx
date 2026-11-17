"use client";

import { useState } from "react";
import { useShiftReport } from "@/lib/hooks/useDashboard";
import { PageHeader } from "@/components/shared/page-header";
import {
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  StatCardSkeleton,
  TableSkeleton,
} from "@/components/ui/primitives";
import { StatCard } from "@/components/dashboard/StatCard";
import { WaiterSalesModal } from "@/components/dashboard/WaiterSalesModal";
import {
  IconBox,
  IconMoney,
  IconReceipt,
  IconTrend,
} from "@/components/ui/icons";
import { formatDayLabel, formatMoney, initials, todayAddisKey } from "@/lib/utils";

export default function ShiftReportPage() {
  const [day, setDay] = useState(todayAddisKey());
  const [selectedWaiter, setSelectedWaiter] = useState<{ id: string; name: string } | null>(null);
  const { data: report, isLoading, isError, error, refetch } = useShiftReport(day);

  const scopeLabel = formatDayLabel(day);

  function exportCSV() {
    if (!report) return;

    let csv = `END OF SHIFT REPORT - ${scopeLabel}\n`;
    csv += `Generated at: ${new Date().toLocaleString("en-GB", { timeZone: "Africa/Addis_Ababa" })}\n\n`;

    csv += `KEY METRICS\n`;
    csv += `Total Revenue,${report.totalSales}\n`;
    csv += `Completed Orders,${report.orderCount}\n`;
    csv += `Units Sold,${report.totalUnitsSold}\n`;
    csv += `Average Ticket,${report.averageOrderValue}\n`;
    csv += `Voided Orders Count,${report.voidedOrdersCount}\n`;
    csv += `Voided Orders Total,${report.voidedOrdersTotal}\n\n`;

    csv += `WAITER SETTLEMENT\n`;
    csv += `Waiter,Orders,Total Revenue (ETB),Revenue Share,Average Ticket\n`;
    for (const w of report.waiters) {
      csv += `"${w.waiterName}",${w.orderCount},${w.totalSales},${w.revenueShare}%,${w.averageOrderValue}\n`;
    }
    csv += `\nBEVERAGE CONSUMPTION\n`;
    csv += `Beverage,Category,Quantity Sold,Unit Price (ETB),Total Revenue (ETB),Revenue Share\n`;
    for (const b of report.beverages) {
      csv += `"${b.itemName}","${b.category}",${b.quantity},${b.unitPrice},${b.totalRevenue},${b.revenueShare}%\n`;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shift-report-${day}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <PageHeader
          title="End of Shift Report"
          description={`Daily settlement, reconciliation, and beverage consumption for ${scopeLabel}.`}
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="h-10 rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm font-medium text-slate-900 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-border)]"
            aria-label="Select report date"
          />
          <Button variant="outline" onClick={exportCSV} disabled={!report || report.orderCount === 0}>
            Export CSV
          </Button>
          <Button onClick={handlePrint} disabled={!report || report.orderCount === 0}>
            Print Report
          </Button>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold uppercase tracking-wider">Addis Beverage Management</h1>
        <p className="text-sm font-semibold">End of Shift Settlement (Z-Report)</p>
        <p className="text-xs text-gray-500 mt-1">Date: {scopeLabel}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <TableSkeleton cols={5} rows={6} />
        </div>
      ) : isError ? (
        <ErrorBlock message={error?.message ?? "Failed to load shift report"} onRetry={refetch} />
      ) : !report || (report.orderCount === 0 && report.voidedOrdersCount === 0) ? (
        <Card>
          <EmptyState
            title={`No shift activity on ${scopeLabel}`}
            description="No orders or sales were recorded for this date."
            icon={<IconReceipt size={24} />}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Total Revenue"
              value={formatMoney(report.totalSales)}
              icon={<IconMoney size={20} />}
              tone="success"
              hint={`${report.orderCount} completed order${report.orderCount === 1 ? "" : "s"}`}
            />

            <StatCard
              label="Units Dispensed"
              value={report.totalUnitsSold}
              icon={<IconBox size={20} />}
              tone="brand"
              hint="total drinks sold"
            />

            <StatCard
              label="Average Ticket"
              value={formatMoney(report.averageOrderValue)}
              icon={<IconTrend size={20} />}
              tone="info"
              hint="average ticket amount"
            />

            <StatCard
              label="Voided Orders"
              value={report.voidedOrdersCount}
              icon={<IconReceipt size={20} />}
              tone={report.voidedOrdersCount > 0 ? "danger" : "neutral"}
              hint={
                report.voidedOrdersTotal > 0
                  ? `Returned ${formatMoney(report.voidedOrdersTotal)}`
                  : "0 cancellations"
              }
            />
          </div>

          {/* Section 1: Waiter Settlement Table */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-slate-50/50 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Waiter Shift Settlement ({report.waiters.length} staff)
                </h2>
                <p className="text-xs text-slate-500">Click any waiter or &apos;View drinks&apos; to view itemized breakdown</p>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                Shift Reconciliation
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-3">Waiter</th>
                    <th scope="col" className="px-4 py-3 text-right">Orders Served</th>
                    <th scope="col" className="px-4 py-3 text-right">Avg Ticket</th>
                    <th scope="col" className="px-4 py-3 text-right">Total Revenue</th>
                    <th scope="col" className="px-4 py-3 text-right">Revenue Share</th>
                    <th scope="col" className="px-4 py-3 text-right print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {report.waiters.map((w) => (
                    <tr key={w.waiterId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                            {initials(w.waiterName)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedWaiter({ id: w.waiterId, name: w.waiterName })}
                            className="text-left font-semibold text-slate-900 hover:text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                            aria-label={`View beverages sold by ${w.waiterName}`}
                          >
                            {w.waiterName}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                        {w.orderCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                        {formatMoney(w.averageOrderValue)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {formatMoney(w.totalSales)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-xs text-slate-600">
                        {w.revenueShare}%
                      </td>
                      <td className="px-4 py-3 text-right print:hidden">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedWaiter({ id: w.waiterId, name: w.waiterName })}
                          aria-label={`View beverages sold by ${w.waiterName}`}
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
                    <td className="px-4 py-3 text-right tabular-nums">{report.orderCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(report.averageOrderValue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(report.totalSales)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs font-normal text-slate-500">100%</td>
                    <td className="px-4 py-3 print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Section 2: Beverage Consumption Breakdown */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-slate-50/50 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Beverage Consumption Breakdown ({report.beverages.length} drinks)
                </h2>
                <p className="text-xs text-slate-500">Itemized stock dispensed during this shift</p>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                Stock Dispensed
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-3">Beverage</th>
                    <th scope="col" className="px-4 py-3">Category</th>
                    <th scope="col" className="px-4 py-3 text-right">Qty Sold</th>
                    <th scope="col" className="px-4 py-3 text-right">Unit Price</th>
                    <th scope="col" className="px-4 py-3 text-right">Total Revenue</th>
                    <th scope="col" className="px-4 py-3 text-right">Revenue Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {report.beverages.map((b) => (
                    <tr key={b.itemId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {b.itemName}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200/60">
                          {b.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                        {b.quantity}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                        {formatMoney(b.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {formatMoney(b.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs font-semibold text-slate-600">
                        {b.revenueShare}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border)] bg-slate-50/50 font-bold text-slate-900">
                    <td className="px-4 py-3" colSpan={2}>Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">{report.totalUnitsSold}</td>
                    <td className="px-4 py-3 text-right tabular-nums">—</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(report.totalSales)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs font-normal text-slate-500">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Waiter Itemized Sales Modal */}
      <WaiterSalesModal
        waiter={selectedWaiter}
        day={day}
        onClose={() => setSelectedWaiter(null)}
      />
    </div>
  );
}
