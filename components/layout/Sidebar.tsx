"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { canAccess, useSession, type NavKey } from "@/lib/auth/session";
import { useTransfers } from "@/lib/hooks/useTransfers";
import { cn, initials } from "@/lib/utils";
import { RoleBadge } from "@/components/shared/status";
import { Button } from "@/components/ui/primitives";
import {
  IconBox,
  IconCart,
  IconClose,
  IconDashboard,
  IconLogout,
  IconMoney,
  IconMovements,
  IconReceipt,
  IconSettings,
  IconTrend,
  IconUsers,
} from "@/components/ui/icons";

interface NavItem {
  key: NavKey;
  label: string;
  href: string;
  icon: React.ReactNode;
  group?: string;
}

const NAV: NavItem[] = [
  // Overview
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: <IconDashboard size={18} /> },

  // Sales & Orders
  { key: "new-order", label: "New Order (POS)", href: "/new-order", icon: <IconCart size={18} />, group: "Sales & Orders" },
  { key: "orders", label: "Orders", href: "/orders", icon: <IconReceipt size={18} />, group: "Sales & Orders" },
  { key: "my-orders", label: "My Orders", href: "/my-orders", icon: <IconReceipt size={18} />, group: "Sales & Orders" },

  // Stock Management
  { key: "inventory", label: "Warehouse Inventory", href: "/inventory", icon: <IconBox size={18} />, group: "Stock Management" },
  { key: "counter", label: "Counter Storage", href: "/counter", icon: <IconBox size={18} />, group: "Stock Management" },
  { key: "transfers", label: "Stock Transfers", href: "/transfers", icon: <IconMovements size={18} />, group: "Stock Management" },
  { key: "stock-receipts", label: "Stock Purchases", href: "/stock-receipts", icon: <IconCart size={18} />, group: "Stock Management" },
  { key: "stock-movements", label: "Stock Movements", href: "/stock-movements", icon: <IconMovements size={18} />, group: "Stock Management" },

  // Reports & Analytics
  { key: "revenue", label: "Revenue Analytics", href: "/revenue", icon: <IconMoney size={18} />, group: "Reports" },
  { key: "sales-by-waiter", label: "Sales by Waiter", href: "/sales-by-waiter", icon: <IconTrend size={18} />, group: "Reports" },
  { key: "shift-report", label: "End of Shift Report", href: "/shift-report", icon: <IconReceipt size={18} />, group: "Reports" },

  // Administration
  { key: "users", label: "User Management", href: "/users", icon: <IconUsers size={18} />, group: "Administration" },
  { key: "settings", label: "System Settings", href: "/settings", icon: <IconSettings size={18} />, group: "Administration" },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useSession();
  const { data: transfers } = useTransfers();

  const pendingTransfers = transfers?.filter((t) => t.status === "PENDING").length ?? 0;

  const items = NAV.filter((n) => canAccess(user?.role, n.key));
  const hasMultipleGroups = new Set(items.map((i) => i.group).filter(Boolean)).size > 1;

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-dvh w-64 flex-col border-r border-[var(--border)] bg-white transition-transform duration-200 lg:static lg:translate-x-0 shadow-[var(--shadow-sm)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--brand)] text-white shadow-xs">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 2h8l-1 9a3 3 0 0 1-3 3 3 3 0 0 1-3-3L8 2Z" />
                <path d="M12 14v6M9 22h6" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight text-slate-900">Addis Beverage</p>
              <p className="text-[11px] font-medium text-slate-500">Enterprise Operations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] lg:hidden"
            aria-label="Close navigation menu"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {items.map((item, index) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const showGroupHeader =
              hasMultipleGroups &&
              item.group &&
              (index === 0 || items[index - 1].group !== item.group);

            return (
              <div key={item.key}>
                {showGroupHeader && (
                  <p
                    className={cn(
                      "px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400",
                      index > 0 ? "pt-4" : "pt-1",
                    )}
                  >
                    {item.group}
                  </p>
                )}
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    active
                      ? "border-l-2 border-[var(--brand)] bg-[var(--brand-tint)] font-semibold text-[var(--brand-strong)] shadow-xs"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={cn("shrink-0", active ? "text-[var(--brand)]" : "text-slate-400")}>
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.key === "transfers" && pendingTransfers > 0 && (
                    <span className="ml-auto inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-amber-800 shadow-xs">
                      {pendingTransfers}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* User Profile Card Footer */}
        <div className="shrink-0 border-t border-[var(--border)] p-3 bg-slate-50/50">
          <div className="mb-2.5 flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-bold text-white shadow-xs">
              {user ? initials(user.username) : "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user?.username}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                {user && <RoleBadge role={user.role} />}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={onLogout}>
            <IconLogout size={14} />
            Sign out
          </Button>
        </div>
      </aside>
    </>
  );
}
