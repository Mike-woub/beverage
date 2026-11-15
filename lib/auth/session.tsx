"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Role, SessionUser } from "@/lib/types";
import { authService } from "@/lib/services/auth.service";

/**
 * Session context. The skill uses NextAuth's <SessionProvider> + useSession().
 * next-auth is not installable here, so this provides the same mental model: a
 * provider that holds the current user, a useSession() hook returning
 * { user, status }, and login/logout helpers. Role-gating helpers mirror the
 * permission checks the skill performs in segment layouts.
 *
 * SWAP SEAM: replace the authService calls with NextAuth's signIn/signOut and
 * read the session from useSession(); keep this hook's return shape so guards
 * and the sidebar keep working.
 */

type Status = "loading" | "authenticated" | "unauthenticated";

interface SessionContextValue {
  user: SessionUser | null;
  status: Status;
  login: (username: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((u) => {
        if (!active) return;
        setUser(u);
        setStatus(u ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (!active) return;
        setStatus("unauthenticated");
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const u = await authService.login({ username, password });
    setUser(u);
    setStatus("authenticated");
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

/* ---------------------------- role permissions ---------------------------- */

export type NavKey =
  | "dashboard"
  | "orders"
  | "new-order"
  | "my-orders"
  | "sales-by-waiter"
  | "revenue"
  | "shift-report"
  | "counter"
  | "transfers"
  | "inventory"
  | "stock-receipts"
  | "stock-movements"
  | "users"
  | "settings";

/** Which roles may access each area. */
export const ROLE_ACCESS: Record<NavKey, Role[]> = {
  dashboard: ["ADMIN", "BARMAN"],
  "new-order": ["ADMIN", "BARMAN"],
  orders: ["ADMIN", "BARMAN"],
  "my-orders": ["WAITER"],
  "sales-by-waiter": ["ADMIN"],
  revenue: ["ADMIN"],
  "shift-report": ["ADMIN"],
  // Counter storage view + request a pull: barman (and admin).
  counter: ["ADMIN", "BARMAN"],
  // Transfer requests queue (approve/reject): admin; barman can view.
  transfers: ["ADMIN", "BARMAN"],
  // Warehouse inventory + receipts + movements: ADMIN only now.
  inventory: ["ADMIN"],
  "stock-receipts": ["ADMIN"],
  "stock-movements": ["ADMIN"],
  users: ["ADMIN"],
  settings: ["ADMIN"],
};

/** Landing route per role after login. */
export function homeRouteFor(role: Role | undefined): string {
  if (role === "WAITER") return "/my-orders";
  return "/dashboard";
}

export function canAccess(role: Role | undefined, key: NavKey): boolean {
  if (!role) return false;
  return ROLE_ACCESS[key].includes(role);
}
