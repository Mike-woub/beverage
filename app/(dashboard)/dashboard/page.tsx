"use client";

import Link from "next/link";
import {
  useDashboardSummary,
  useInventoryDistribution,
  useLowStock,
  useRecentOrders,
  useTopItems,
} from "@/lib/hooks/useDashboard";
import { useSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/StatCard";
import { HorizontalBars, RankedList } from "@/components/dashboard/charts";
import { Card, EmptyState, Skeleton, StatCardSkeleton } from "@/components/ui/primitives";
import { formatDateTime, formatMoney } from "@/lib/utils";
import {
  IconAlert,
  IconBox,
  IconCart,
  IconCheck,
  IconMoney,
  IconMovements,
  IconReceipt,
  IconTrend,
} from "@/components/ui/icons";

export default function DashboardPage() {
  const { user } = useSession();
  const summary = useDashboardSummary();
  const recent = useRecentOrders();
  const top = useTopItems();
  const distribution = useInventoryDistribution();
  const lowStock = useLowStock();

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.username ?? ""}`}
        description="A live overview of inventory and today's order activity."
      />

      {summary.isLoading || !summary.data ? (
        <StatCardSkeleton count={8} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Beverages" value={summary.data.totalBeverages} icon={<IconBox size={20} />} tone="brand" />
          <StatCard label="Orders Today" value={summary.data.ordersToday} icon={<IconCart size={20} />} tone="info" />
          <StatCard label="Today's Value" value={formatMoney(summary.data.orderValueToday)} icon={<IconMoney size={20} />} tone="success" />
          <StatCard label="Stock Transfers" value={summary.data.pendingTransfers} icon={<IconMovements size={20} />} tone="warning" hint="pending approval" />
          <StatCard label="Warehouse Stock" value={summary.data.warehouseStock} icon={<IconBox size={20} />} tone="info" hint="units in warehouse" />
          <StatCard label="Counter Stock" value={summary.data.counterStock} icon={<IconBox size={20} />} tone="brand" hint="units at the counter" />
          <StatCard label="Counter Low" value={summary.data.counterLowCount} icon={<IconAlert size={20} />} tone="warning" hint={`out: ${summary.data.counterOutCount}`} />
          <StatCard label="Warehouse Low" value={summary.data.warehouseLowCount} icon={<IconAlert size={20} />} tone="danger" hint={`out: ${summary.data.warehouseOutCount}`} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="font-semibold text-[var(--foreground)]">Recent Orders</h2>
            <Link href="/orders" className="text-sm font-medium text-[var(--brand)] hover:underline">
              View all
            </Link>
          </div>
          {recent.isLoading ? (
            <div className="divide-y divide-[var(--border)] p-4 space-y-3" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : !recent.data || recent.data.length === 0 ? (
            <EmptyState title="No orders yet" icon={<IconReceipt size={22} />} />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {recent.data.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--foreground)]">
                      {(o as { itemsSummary?: string }).itemsSummary || o.orderNumber}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Waiter: {o.waiterName} · {formatDateTime(o.createdAt)} · {o.itemCount} unit{o.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="tabular-nums text-sm font-medium text-[var(--foreground)]">
                    {formatMoney(o.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top items */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <IconTrend size={18} />
            <h2 className="font-semibold text-[var(--foreground)]">Top Beverages</h2>
          </div>
          {top.isLoading ? (
            <div className="space-y-3 py-2" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-7 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !top.data || top.data.length === 0 ? (
            <EmptyState title="No sales data" />
          ) : (
            <RankedList data={top.data.map((t) => ({ label: t.itemName, value: t.quantitySold }))} />
          )}
        </Card>

        {/* Inventory distribution */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-[var(--foreground)]">Inventory Distribution</h2>
          {distribution.isLoading ? (
            <div className="space-y-3 py-4" aria-busy="true">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          ) : !distribution.data || distribution.data.length === 0 ? (
            <EmptyState title="No inventory" />
          ) : (
            <HorizontalBars
              data={distribution.data.map((d) => ({ label: d.itemName, value: d.stock }))}
              unit=" units"
            />
          )}
        </Card>

        {/* Low stock alerts */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[var(--warning)]"><IconAlert size={18} /></span>
            <h2 className="font-semibold text-[var(--foreground)]">Low-stock Alerts</h2>
          </div>
          {lowStock.isLoading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-9 w-full rounded-[var(--radius)]" />
              <Skeleton className="h-9 w-full rounded-[var(--radius)]" />
            </div>
          ) : !lowStock.data || lowStock.data.length === 0 ? (
            <EmptyState title="All stock healthy" icon={<IconCheck size={22} />} />
          ) : (
            <ul className="flex flex-col gap-2">
              {lowStock.data.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-[var(--radius)] bg-[var(--surface-muted)] px-3 py-2"
                >
                  <span className="truncate text-sm text-[var(--foreground)]">{item.name}</span>
                  <span
                    className="tabular-nums text-sm font-semibold"
                    style={{ color: item.counterStock === 0 ? "var(--danger)" : "var(--warning)" }}
                  >
                    {item.counterStock} at counter
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

