import type { Item, StockStatus } from "@/lib/types";

/**
 * Lightweight className combiner. The skill's stack would use clsx + tailwind-
 * merge; neither is installable in this environment, so this covers the needed
 * conditional-class joining without a dependency.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const BIRR = new Intl.NumberFormat("en-ET", {
  style: "currency",
  currency: "ETB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format money. Server is authoritative; this is display-only. */
export function formatMoney(value: number): string {
  if (Number.isNaN(value)) return BIRR.format(0);
  return BIRR.format(value);
}

/** Per the spec, timestamps are stored UTC and displayed in Africa/Addis_Ababa. */
const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Addis_Ababa",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const DATE_ONLY = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Addis_Ababa",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_TIME.format(d);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_ONLY.format(d);
}

/** The Addis-Ababa calendar day (YYYY-MM-DD) for "now" — used as a filter default. */
export function todayAddisKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Human label for a YYYY-MM-DD day key: "Today", "Yesterday", or a formatted
 * date. Compares against the Addis-Ababa current day.
 */
export function formatDayLabel(dayKey: string): string {
  const today = todayAddisKey();
  if (dayKey === today) return "Today";
  const y = new Date(`${today}T00:00:00`);
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(
    y.getDate(),
  ).padStart(2, "0")}`;
  if (dayKey === yesterday) return "Yesterday";
  const [yy, mm, dd] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(yy, mm - 1, dd));
}

/** Classify an item's stock relative to the low-stock threshold. */
export function stockStatus(item: Item, lowStockThreshold: number): StockStatus {
  if (item.stock <= 0) return "OUT_OF_STOCK";
  if (item.stock <= lowStockThreshold) return "LOW_STOCK";
  return "IN_STOCK";
}

/** Whether a beverage can be ordered right now — sold from the COUNTER pool. */
export function isAvailable(item: Item): boolean {
  return item.isActive && item.counterStock > 0;
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  IN_STOCK: "In Stock",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}
