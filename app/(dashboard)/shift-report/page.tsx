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
import { WaiterSalesModal } from "@/components/dashboard/WaiterSalesModal";
import {
  IconBox,
  IconMoney,
  IconReceipt,
  IconTrend,
} from "@/components/ui/icons";
import { formatDayLabel, formatMoney, todayAddisKey } from "@/lib/utils";

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
          description={`Daily settlement and reconciliation for ${scopeLabel}.`}
        />
        <div className="flex items-center gap-2.5">
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-tint)]"
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
        <EmptyState
          title={`No shift activity on ${scopeLabel}`}
          description="No orders or sales were recorded for this date."
          icon={<IconReceipt size={24} />}
        />
      ) : (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>Total Revenue</span>
                <IconMoney size={16} className="text-[var(--brand)]" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">
                {formatMoney(report.totalSales)}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {report.orderCount} completed order{report.orderCount === 1 ? "" : "s"}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>Units Sold</span>
                <IconBox size={16} className="text-[var(--success)]" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">
                {report.totalUnitsSold}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Total beverages dispensed
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>Average Ticket</span>
                <IconTrend size={16} className="text-[var(--info)]" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--foreground)]">
                {formatMoney(report.averageOrderValue)}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Average revenue per order
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>Voided Orders</span>
                <span className="flex size-2 rounded-full bg-red-500" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
                {report.voidedOrdersCount}
              </p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {report.voidedOrdersTotal > 0
                  ? `Returned ${formatMoney(report.voidedOrdersTotal)}`
                  : "0 cancellations"}
              </p>
            </Card>
          </div>

          {/* Section 1: Waiter Settlement Table */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Waiter Shift Settlement ({report.waiters.length} staff)
              </h2>
              <span className="text-xs text-[var(--muted-foreground)]">
                Click any waiter to view drinks sold
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
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
                    <tr key={w.waiterId} className="hover:bg-[var(--surface-muted)] transition-colors">
                      <td className="px-4 py-3 font-semibold text-[var(--foreground)]">
                        <button
                          type="button"
                          onClick={() => setSelectedWaiter({ id: w.waiterId, name: w.waiterName })}
                          className="rounded-[var(--radius-sm)] text-left font-semibold text-[var(--brand)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                          aria-label={`View beverages sold by ${w.waiterName}`}
                        >
                          {w.waiterName}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--foreground)]">
                        {w.orderCount}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--muted-foreground)]">
                        {formatMoney(w.averageOrderValue)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--brand-strong)]">
                        {formatMoney(w.totalSales)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-xs text-[var(--muted-foreground)]">
                        {w.revenueShare}%
                      </td>
                      <td className="px-4 py-3 text-right print:hidden">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedWaiter({ id: w.waiterId, name: w.waiterName })}
                          aria-label={`View beverages sold by ${w.waiterName}`}
                        >
                          View items
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border)] bg-[var(--surface-muted)] font-bold text-[var(--foreground)]">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">{report.orderCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(report.averageOrderValue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--brand-strong)]">{formatMoney(report.totalSales)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs">100%</td>
                    <td className="px-4 py-3 print:hidden"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Section 2: Beverage Consumption Breakdown */}
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                Beverage Consumption Breakdown ({report.beverages.length} drinks)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
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
                    <tr key={b.itemId} className="hover:bg-[var(--surface-muted)] transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        {b.itemName}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                        {b.category}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-[var(--foreground)]">
                        {b.quantity}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--muted-foreground)]">
                        {formatMoney(b.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--brand-strong)]">
                        {formatMoney(b.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs text-[var(--muted-foreground)]">
                        {b.revenueShare}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border)] bg-[var(--surface-muted)] font-bold text-[var(--foreground)]">
                    <td className="px-4 py-3" colSpan={2}>Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">{report.totalUnitsSold}</td>
                    <td className="px-4 py-3 text-right tabular-nums">—</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--brand-strong)]">{formatMoney(report.totalSales)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs">100%</td>
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
