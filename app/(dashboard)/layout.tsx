"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSession, canAccess, homeRouteFor, type NavKey } from "@/lib/auth/session";
import { Spinner } from "@/components/ui/primitives";
import { IconMenu } from "@/components/ui/icons";

/**
 * Authenticated shell. Per the skill, the segment layout guards the session:
 * redirect to /login when unauthenticated, and redirect away from areas the
 * current role may not access. Renders the sidebar + a mobile topbar.
 */

// Map the first path segment to its NavKey for role-gating.
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
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-[var(--background)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            aria-label="Open navigation menu"
          >
            <IconMenu size={22} />
          </button>
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Beverage Manager
          </span>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
