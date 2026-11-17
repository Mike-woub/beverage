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
import { Button, Card, EmptyState, Skeleton, StatCardSkeleton } from "@/components/ui/primitives";
import { formatDateTime, formatMoney, initials } from "@/lib/utils";
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
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user?.username ?? "Manager"}`}
        description="A real-time operational overview of inventory distribution and today's bar activity."
        action={
          <div className="flex items-center gap-2">
            <Link href="/new-order">
              <Button size="sm">
                <IconCart size={15} />
                New Order (POS)
              </Button>
            </Link>
            <Link href="/shift-report">
              <Button variant="outline" size="sm">
                <IconReceipt size={15} />
                Shift Report
              </Button>
            </Link>
          </div>
        }
      />

      {/* Section 1: Sales & Shift Velocity */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Today&apos;s Sales &amp; Shift Velocity
          </h2>
          <span className="text-xs text-slate-400">Africa/Addis_Ababa</span>
        </div>

        {summary.isLoading || !summary.data ? (
          <StatCardSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Today's Revenue"
              value={formatMoney(summary.data.orderValueToday)}
              icon={<IconMoney size={20} />}
              tone="success"
              hint={`${summary.data.ordersToday} completed order${summary.data.ordersToday === 1 ? "" : "s"}`}
            />
            <StatCard
              label="Orders Placed"
              value={summary.data.ordersToday}
              icon={<IconCart size={20} />}
              tone="info"
              hint="today's tickets"
            />
            <StatCard
              label="Stock Transfers"
              value={summary.data.pendingTransfers}
              icon={<IconMovements size={20} />}
              tone="warning"
              hint={summary.data.pendingTransfers > 0 ? "pending approval" : "all settled"}
            />
            <StatCard
              label="Total Beverages"
              value={summary.data.totalBeverages}
              icon={<IconBox size={20} />}
              tone="brand"
              hint="catalog items"
            />
          </div>
        )}
      </section>

      {/* Section 2: Inventory & Stock Health */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Inventory &amp; Asset Health
          </h2>
          <span className="text-xs text-slate-400">Counter vs Warehouse</span>
        </div>

        {summary.isLoading || !summary.data ? (
          <StatCardSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Counter Stock"
              value={summary.data.counterStock}
              icon={<IconBox size={20} />}
              tone="brand"
              hint="units at service bar"
            />
            <StatCard
              label="Warehouse Stock"
              value={summary.data.warehouseStock}
              icon={<IconBox size={20} />}
              tone="info"
              hint="units in back store"
            />
            <StatCard
              label="Counter Alerts"
              value={summary.data.counterLowCount}
              icon={<IconAlert size={20} />}
              tone="warning"
              hint={`out of stock: ${summary.data.counterOutCount}`}
            />
            <StatCard
              label="Warehouse Alerts"
              value={summary.data.warehouseLowCount}
              icon={<IconAlert size={20} />}
              tone="danger"
              hint={`out of stock: ${summary.data.warehouseOutCount}`}
            />
          </div>
        )}
      </section>

      {/* Main Grid: Orders, Top Items, Inventory Distribution, Stock Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-slate-50/50 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Recent Orders</h2>
              <p className="text-xs text-slate-500">Live feed of drinks ordered at the counter</p>
            </div>
            <Link href="/orders" className="text-xs font-semibold text-[var(--brand)] hover:underline">
              View all orders &rarr;
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
            <EmptyState title="No orders placed yet" icon={<IconReceipt size={22} />} />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {recent.data.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">
                      {(o as { itemsSummary?: string }).itemsSummary || o.orderNumber}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                        Waiter: {o.waiterName}
                      </span>
                      <span>·</span>
                      <span>{formatDateTime(o.createdAt)}</span>
                      <span>·</span>
                      <span className="font-medium text-slate-700">
                        {o.itemCount} unit{o.itemCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <span className="tabular-nums font-semibold text-slate-900">
                    {formatMoney(o.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top items */}
        <Card className="overflow-hidden p-5">
          <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[var(--brand)]"><IconTrend size={18} /></span>
              <h2 className="font-semibold text-slate-900">Top Beverages</h2>
            </div>
            <span className="text-xs text-slate-400">Volume</span>
          </div>
          {top.isLoading ? (
            <div className="space-y-3 py-2" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-6 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !top.data || top.data.length === 0 ? (
            <EmptyState title="No sales data recorded yet" />
          ) : (
            <RankedList data={top.data.map((t) => ({ label: t.itemName, value: t.quantitySold }))} />
          )}
        </Card>

        {/* Inventory distribution */}
        <Card className="overflow-hidden p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <h2 className="font-semibold text-slate-900">Inventory Distribution</h2>
              <p className="text-xs text-slate-500">Total units currently in stock across catalog items</p>
            </div>
            <Link href="/inventory" className="text-xs font-semibold text-[var(--brand)] hover:underline">
              Manage inventory &rarr;
            </Link>
          </div>
          {distribution.isLoading ? (
            <div className="space-y-3 py-4" aria-busy="true">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          ) : !distribution.data || distribution.data.length === 0 ? (
            <EmptyState title="No inventory items" />
          ) : (
            <HorizontalBars
              data={distribution.data.map((d) => ({ label: d.itemName, value: d.stock }))}
              unit=" units"
            />
          )}
        </Card>

        {/* Low stock alerts */}
        <Card className="overflow-hidden p-5">
          <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[var(--warning)]"><IconAlert size={18} /></span>
              <h2 className="font-semibold text-slate-900">Low-stock Alerts</h2>
            </div>
            <Link href="/transfers" className="text-xs font-semibold text-[var(--brand)] hover:underline">
              Restock &rarr;
            </Link>
          </div>
          {lowStock.isLoading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-9 w-full rounded-[var(--radius-md)]" />
              <Skeleton className="h-9 w-full rounded-[var(--radius-md)]" />
            </div>
          ) : !lowStock.data || lowStock.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 p-6 text-center border border-slate-200/80">
              <span className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-[var(--success)] border border-emerald-200">
                <IconCheck size={18} />
              </span>
              <p className="mt-2 text-sm font-semibold text-slate-900">All Stock Healthy</p>
              <p className="mt-0.5 text-xs text-slate-500">Counter storage has sufficient units for all active beverages.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {lowStock.data.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2 text-xs font-medium"
                >
                  <span className="truncate text-slate-900 font-semibold">{item.name}</span>
                  <span
                    className="tabular-nums font-bold"
                    style={{ color: item.counterStock === 0 ? "var(--danger)" : "var(--warning)" }}
                  >
                    {item.counterStock === 0 ? "0 at counter" : `${item.counterStock} left`}
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
