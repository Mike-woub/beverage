"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSession, canAccess, homeRouteFor, type NavKey } from "@/lib/auth/session";
import { Spinner } from "@/components/ui/primitives";
import { IconMenu } from "@/components/ui/icons";

/**
 * Authenticated shell with Architectural Enterprise SaaS layout.
 * Role-gating preserved; responsive mobile topbar with accessible menu drawer.
 */

const SEGMENT_TO_KEY: Record<string, NavKey> = {
  dashboard: "dashboard",
  "new-order": "new-order",
  orders: "orders",
  "my-orders": "my-orders",
  "sales-by-waiter": "sales-by-waiter",
  revenue: "revenue",
  "shift-report": "shift-report",
  counter: "counter",
  transfers: "transfers",
  inventory: "inventory",
  "stock-receipts": "stock-receipts",
  "stock-movements": "stock-movements",
  users: "users",
  settings: "settings",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  // Role-gate: if the current user cannot access this segment, bounce to dashboard.
  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    const segment = pathname.split("/").filter(Boolean)[0];
    const key = segment ? SEGMENT_TO_KEY[segment] : undefined;
    if (key && !canAccess(user.role, key)) {
      router.replace(homeRouteFor(user.role));
    }
  }, [pathname, user, status, router]);

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--background)]">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-[var(--background)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Header Topbar */}
        <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-white px-4 lg:hidden shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              aria-label="Open navigation menu"
            >
              <IconMenu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-bold text-white">
                B
              </span>
              <span className="text-sm font-bold tracking-tight text-slate-900">
                Addis Beverage
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
