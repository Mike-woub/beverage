"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button, EmptyState, ErrorBlock, Skeleton } from "@/components/ui/primitives";
import { IconBox, IconCart, IconMoney, IconReceipt } from "@/components/ui/icons";
import { useWaiterSalesDetail } from "@/lib/hooks/useDashboard";
import { formatDateTime, formatDayLabel, formatMoney } from "@/lib/utils";
import type { WaiterSaleEvent, WaiterSoldItem } from "@/lib/types";

interface WaiterSalesModalProps {
  waiter: { id: string; name: string } | null;
  day?: string;
  onClose: () => void;
}

type SortField = "date" | "itemName" | "quantity" | "totalAmount" | "revenueShare";

function formatSaleTime(dateStr: string, hasSingleDay: boolean) {
  if (hasSingleDay) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-GB", {
      timeZone: "Africa/Addis_Ababa",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  return formatDateTime(dateStr);
}

export function WaiterSalesModal({ waiter, day, onClose }: WaiterSalesModalProps) {
  const [viewMode, setViewMode] = useState<"sales" | "summary">("sales");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortAsc, setSortAsc] = useState(false); // default: newest first

  const { data, isLoading, isError, error, refetch } = useWaiterSalesDetail(
    waiter?.id ?? null,
    day,
  );

  const scopeLabel = day ? formatDayLabel(day) : "All time";

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "itemName");
    }
  }

  // Sorted itemized sales list (by Date descending by default)
  const sortedSales = useMemo(() => {
    if (!data?.sales) return [];
    const list = [...data.sales];
    list.sort((a: WaiterSaleEvent, b: WaiterSaleEvent) => {
      let cmp = 0;
      if (sortField === "date") {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === "itemName") {
        cmp = a.itemName.localeCompare(b.itemName);
      } else if (sortField === "quantity") {
        cmp = a.quantity - b.quantity;
      } else if (sortField === "totalAmount") {
        cmp = a.totalAmount - b.totalAmount;
      } else if (sortField === "revenueShare") {
        cmp = a.revenueShare - b.revenueShare;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [data?.sales, sortField, sortAsc]);

  // Sorted aggregated summary list
  const sortedItems = useMemo(() => {
    if (!data?.items) return [];
    const list = [...data.items];
    list.sort((a: WaiterSoldItem, b: WaiterSoldItem) => {
      let cmp = 0;
      if (sortField === "itemName") {
        cmp = a.itemName.localeCompare(b.itemName);
      } else if (sortField === "quantity") {
        cmp = a.quantity - b.quantity;
      } else if (sortField === "totalAmount" || sortField === "date") {
        cmp = a.totalAmount - b.totalAmount;
      } else if (sortField === "revenueShare") {
        cmp = a.revenueShare - b.revenueShare;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [data?.items, sortField, sortAsc]);

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortAsc ? " ▲" : " ▼";
  };

  return (
    <Modal
      open={!!waiter}
      onClose={onClose}
      title={waiter ? `${waiter.name} — Itemized Beverage Sales` : "Waiter Sales"}
      description={`Itemized sales breakdown for ${scopeLabel}.`}
      size="lg"
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-4 py-2" aria-busy="true">
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ) : isError ? (
        <ErrorBlock message={error?.message ?? "Failed to load sales details"} onRetry={refetch} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title={`No sales on ${scopeLabel}`}
          description={`No orders were recorded for ${waiter?.name} on this date.`}
          icon={<IconCart size={24} />}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Top summary metric cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-slate-50/70 p-3.5 shadow-xs">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <IconMoney size={14} className="text-[var(--brand)]" />
                Total Sales
              </span>
              <p className="mt-1.5 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
                {formatMoney(data.totalSales)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-slate-50/70 p-3.5 shadow-xs">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <IconReceipt size={14} className="text-[var(--info)]" />
                Tickets
              </span>
              <p className="mt-1.5 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
                {data.orderCount}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-slate-50/70 p-3.5 shadow-xs">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <IconBox size={14} className="text-[var(--success)]" />
                Units Sold
              </span>
              <p className="mt-1.5 text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
                {data.totalUnitsSold}
              </p>
            </div>
          </div>

          {/* View selector segmented control */}
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-slate-100/70 p-1">
              <button
                type="button"
                onClick={() => {
                  setViewMode("sales");
                  setSortField("date");
                  setSortAsc(false);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "sales"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sales by Date ({data.sales?.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("summary");
                  setSortField("totalAmount");
                  setSortAsc(false);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "summary"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Beverage Summary ({data.items.length})
              </button>
            </div>
            <span className="hidden sm:inline text-xs text-slate-400">
              Sorted by {sortField === "date" ? "date (newest)" : sortField}
            </span>
          </div>

          {/* View 1: Itemized sales by date */}
          {viewMode === "sales" ? (
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-[var(--border)] bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-xs">
                      <th
                        scope="col"
                        className="cursor-pointer select-none px-3.5 py-2.5 transition-colors hover:text-slate-900"
                        onClick={() => toggleSort("date")}
                      >
                        Date {sortIndicator("date")}
                      </th>
                      <th
                        scope="col"
                        className="cursor-pointer select-none px-3.5 py-2.5 transition-colors hover:text-slate-900"
                        onClick={() => toggleSort("itemName")}
                      >
                        Beverage {sortIndicator("itemName")}
                      </th>
                      <th
                        scope="col"
                        className="cursor-pointer select-none px-3.5 py-2.5 text-right transition-colors hover:text-slate-900"
                        onClick={() => toggleSort("quantity")}
                      >
                        Quantity {sortIndicator("quantity")}
                      </th>
                      <th
                        scope="col"
                        className="cursor-pointer select-none px-3.5 py-2.5 text-right transition-colors hover:text-slate-900"
                        onClick={() => toggleSort("totalAmount")}
                      >
                        Total Revenue {sortIndicator("totalAmount")}
                      </th>
                      <th
                        scope="col"
                        className="cursor-pointer select-none px-3.5 py-2.5 text-right transition-colors hover:text-slate-900"
                        onClick={() => toggleSort("revenueShare")}
                      >
                        Revenue Share {sortIndicator("revenueShare")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {sortedSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="whitespace-nowrap px-3.5 py-2.5 tabular-nums text-xs text-slate-500 font-medium">
                          {formatSaleTime(sale.date, !!day)}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                          {sale.itemName}
                        </td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums font-bold text-slate-900">
                          {sale.quantity}
                        </td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums font-semibold text-slate-900">
                          {formatMoney(sale.totalAmount)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums text-xs font-medium text-slate-600">
                          {sale.revenueShare}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-slate-50 font-bold text-slate-900">
                    <tr>
                      <td className="px-3.5 py-2.5" colSpan={2}>
                        Total ({data.sales?.length ?? 0} sales)
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums">
                        {data.totalUnitsSold}
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums">
                        {formatMoney(data.totalSales)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums text-xs font-normal text-slate-500">
                        100%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            /* View 2: Beverage summary (aggregated) */
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-[var(--border)] bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-xs">
                      <th
                        scope="col"
                        className="cursor-pointer select-none px-3.5 py-2.5 transition-colors hover:text-slate-900"
                        onClick={() => toggleSort("itemName")}
                      >
                        Beverage {sortIndicator("itemName")}
                      </th>
                      <th
                        scope="col"
                        className="cursor-pointer select-none px-3.5 py-2.5 text-right transition-colors hover:text-slate-900"
                        onClick={() => toggleSort("quantity")}
                      >
                        Quantity {sortIndicator("quantity")}
                      </th>
                      <th
                        scope="col"
                        className="cursor-pointer select-none px-3.5 py-2.5 text-right transition-colors hover:text-slate-900"
                        onClick={() => toggleSort("totalAmount")}
                      >
                        Total Revenue {sortIndicator("totalAmount")}
                      </th>
                      <th
                        scope="col"
                        className="cursor-pointer select-none px-3.5 py-2.5 text-right transition-colors hover:text-slate-900"
                        onClick={() => toggleSort("revenueShare")}
                      >
                        Revenue Share {sortIndicator("revenueShare")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {sortedItems.map((item) => (
                      <tr key={item.itemId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                          {item.itemName}
                        </td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums font-bold text-slate-900">
                          {item.quantity}
                        </td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums font-semibold text-slate-900">
                          {formatMoney(item.totalAmount)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums text-xs font-medium text-slate-600">
                          {item.revenueShare}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-slate-50 font-bold text-slate-900">
                    <tr>
                      <td className="px-3.5 py-2.5">Total</td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums">
                        {data.totalUnitsSold}
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums">
                        {formatMoney(data.totalSales)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right tabular-nums text-xs font-normal text-slate-500">
                        100%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
