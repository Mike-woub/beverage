"use client";

import { useMemo, useState } from "react";
import { useItems } from "@/lib/hooks/useItems";
import { useCreateOrder } from "@/lib/hooks/useOrders";
import { useWaiters } from "@/lib/hooks/useUsers";
import { useSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/toolbar";
import {
  Button,
  Card,
  EmptyState,
  GridSkeleton,
  Select,
} from "@/components/ui/primitives";
import { IconCart, IconCheck, IconMinus, IconPlus, IconReceipt, IconTrash } from "@/components/ui/icons";
import { cn, formatMoney, initials, isAvailable } from "@/lib/utils";
import type { Item, Order } from "@/lib/types";

interface Line {
  item: Item;
  quantity: number;
}

function getItemSellingPrice(item: Item): number {
  if ((item.shotsPerUnit ?? 1) > 1) {
    if (item.shotPrice !== null && item.shotPrice !== undefined && item.shotPrice > 0) {
      return item.shotPrice;
    }
    return Math.round((item.price / item.shotsPerUnit + Number.EPSILON) * 100) / 100;
  }
  return item.price;
}

export default function NewOrderPage() {
  const { user } = useSession();
  const isBarman = user?.role === "BARMAN";
  const isAdmin = user?.role === "ADMIN";

  const { data: items, isLoading } = useItems();
  const createOrder = useCreateOrder();
  const { data: waiters } = useWaiters(isBarman || isAdmin);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, Line>>({});
  const [lastPlaced, setLastPlaced] = useState<Order | null>(null);
  const [waiterId, setWaiterId] = useState("");

  // Extract unique categories dynamically from beverages
  const categories = useMemo(() => {
    if (!items) return ["All"];
    const set = new Set<string>();
    for (const it of items) {
      if (it.category) set.add(it.category);
    }
    return ["All", ...Array.from(set).sort()];
  }, [items]);

  const visible = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => {
        if (selectedCategory !== "All" && (i.category || "Other") !== selectedCategory) {
          return false;
        }
        if (q && !i.name.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => Number(isAvailable(b)) - Number(isAvailable(a)) || a.name.localeCompare(b.name));
  }, [items, search, selectedCategory]);

  const lines = Object.values(cart);
  const total = lines.reduce((s, l) => s + getItemSellingPrice(l.item) * l.quantity, 0);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  const selectedWaiterName = waiterId
    ? waiters?.find((w) => w.id === waiterId)?.username ?? "—"
    : isAdmin
      ? `${user?.username} (me)`
      : "—";

  const needsWaiter = isBarman && !waiterId;
  const canSubmit = lines.length > 0 && !needsWaiter;

  function addToCart(item: Item) {
    setCart((c) => {
      const existing = c[item.id];
      const nextQty = (existing?.quantity ?? 0) + 1;
      if (nextQty > item.counterStock) return c;
      return { ...c, [item.id]: { item, quantity: nextQty } };
    });
  }

  function setQty(itemId: string, qty: number) {
    setCart((c) => {
      const line = c[itemId];
      if (!line) return c;
      const clamped = Math.max(0, Math.min(qty, line.item.counterStock));
      if (clamped === 0) {
        const next = { ...c };
        delete next[itemId];
        return next;
      }
      return { ...c, [itemId]: { ...line, quantity: clamped } };
    });
  }

  function removeLine(itemId: string) {
    setCart((c) => {
      const next = { ...c };
      delete next[itemId];
      return next;
    });
  }

  // Fast 1-tap direct submission (no modal delays)
  async function handleSubmitOrder() {
    if (!canSubmit) return;
    try {
      const order = await createOrder.mutateAsync({
        items: lines.map((l) => ({ itemId: l.item.id, quantity: l.quantity })),
        waiterId: waiterId || undefined,
      });
      setCart({});
      setLastPlaced(order);
    } catch {
      /* toast handled in hook; cart is preserved for immediate retry */
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Point of Sale (POS)"
        description="Select server, tap beverages to assemble the ticket, and place orders with 1-click."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_390px] xl:grid-cols-[1fr_420px] items-start">
        {/* Left Column: Beverage Catalogue & Filters */}
        <div className="flex flex-col gap-3.5">
          {/* Search Bar */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search beverages by name…"
              className="sm:max-w-md w-full"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-3.5 py-2 font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] active:scale-95",
                    isSelected
                      ? "bg-[var(--brand)] text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs",
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Beverage Tiles Grid */}
          {isLoading ? (
            <GridSkeleton count={9} />
          ) : visible.length === 0 ? (
            <Card>
              <EmptyState
                title={search ? "No beverages found" : "No beverages in this category"}
                description={
                  search
                    ? `No drinks match "${search}".`
                    : "Try selecting another category or reset search."
                }
                icon={<IconCart size={24} />}
                action={
                  search || selectedCategory !== "All" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setSelectedCategory("All");
                      }}
                    >
                      Reset filters
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-3">
              {visible.map((item) => {
                const available = isAvailable(item);
                const inCart = cart[item.id]?.quantity ?? 0;
                const atMax = inCart >= item.counterStock;
                return (
                  <button
                    key={item.id}
                    disabled={!available || atMax}
                    onClick={() => addToCart(item)}
                    aria-label={`Add ${item.name} (${formatMoney(getItemSellingPrice(item))}, ${item.counterStock} available)`}
                    className={cn(
                      "group relative flex min-h-[110px] flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] active:scale-[0.98]",
                      available
                        ? inCart > 0
                          ? "border-[var(--brand)] bg-teal-50/20 ring-1 ring-[var(--brand)] shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                        : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-55",
                    )}
                  >
                    {/* Top Row: Name & In-Cart Badge */}
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="font-bold text-slate-900 leading-snug line-clamp-2 text-sm sm:text-base">
                        {item.name}
                      </span>
                      {inCart > 0 && (
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-bold tabular-nums text-white shadow-xs">
                          {inCart}
                        </span>
                      )}
                    </div>

                    {/* Middle Row: Price */}
                    <div className="mt-1">
                      <span className="text-base font-bold tabular-nums text-slate-900">
                        {formatMoney(getItemSellingPrice(item))}
                        {(item.shotsPerUnit ?? 1) > 1 && (
                          <span className="text-[11px] font-normal text-slate-500 ml-0.5">/shot</span>
                        )}
                      </span>
                    </div>

                    {/* Bottom Row: Stock Status & Category */}
                    <div className="mt-2 flex w-full items-center justify-between gap-1 text-xs">
                      {available ? (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                            item.counterStock <= 5
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200",
                          )}
                        >
                          {item.counterStock} {(item.shotsPerUnit ?? 1) > 1 ? "shots" : "at bar"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 border border-rose-200">
                          {item.isActive ? "Out of stock" : "Unavailable"}
                        </span>
                      )}

                      {item.category && item.category !== "Other" && (
                        <span className="text-[11px] font-medium text-slate-400 truncate max-w-[80px]">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Persistent Order Ticket */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden shadow-md">
            {/* Waiter Selection Section */}
            <div className="border-b border-[var(--border)] bg-slate-50/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Assign Waiter
                </span>
                {needsWaiter && (
                  <span className="text-xs font-semibold text-amber-700">
                    * Required to order
                  </span>
                )}
              </div>

              {/* 1-Tap Waiter Chips */}
              <div className="flex flex-wrap gap-1.5">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setWaiterId("")}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] active:scale-95",
                      !waiterId
                        ? "bg-[var(--brand)] text-white shadow-xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    Me ({user?.username})
                  </button>
                )}
                {waiters
                  ?.filter((w) => w.id !== user?.id)
                  .map((w) => {
                    const isSelected = waiterId === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setWaiterId(w.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] active:scale-95",
                          isSelected
                            ? "bg-[var(--brand)] text-white shadow-xs"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-4 items-center justify-center rounded-full text-[9px] font-bold",
                            isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700",
                          )}
                        >
                          {initials(w.username)}
                        </span>
                        {w.username}
                      </button>
                    );
                  })}
              </div>

              {/* Fallback dropdown if > 6 waiters */}
              {waiters && waiters.length > 6 && (
                <div className="mt-2.5">
                  <Select
                    value={waiterId}
                    onChange={(e) => setWaiterId(e.target.value)}
                    aria-label="Select waiter from dropdown"
                  >
                    {isBarman ? (
                      <option value="">Choose waiter…</option>
                    ) : (
                      <option value="">{user?.username} (me)</option>
                    )}
                    {waiters
                      ?.filter((w) => w.id !== user?.id)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.username}
                        </option>
                      ))}
                  </Select>
                </div>
              )}
            </div>

            {/* Recent Order Chit Alert */}
            {lastPlaced && lines.length === 0 && (
              <div className="flex items-center justify-between border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <IconCheck size={14} />
                  </span>
                  <span>
                    Order placed for <strong>{lastPlaced.waiterName}</strong> ·{" "}
                    <strong>{formatMoney(lastPlaced.totalAmount)}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="font-bold underline hover:text-emerald-950 ml-2 shrink-0"
                >
                  Print Chit
                </button>
              </div>
            )}

            {/* Ticket Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 bg-white">
              <div className="flex items-center gap-2">
                <IconReceipt size={17} className="text-slate-500" />
                <h2 className="font-bold text-sm text-slate-900">Active Ticket</h2>
              </div>
              {itemCount > 0 && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-700 border border-slate-200">
                  {itemCount} item{itemCount === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {/* Ticket Line Items */}
            {lines.length === 0 ? (
              <EmptyState
                title="Ticket is empty"
                description="Tap any beverage tile on the left to add it to this order."
                icon={<IconCart size={22} />}
              />
            ) : (
              <div className="max-h-[46vh] divide-y divide-slate-100 overflow-y-auto px-1">
                {lines.map((l) => (
                  <div key={l.item.id} className="flex items-center gap-2 px-3 py-3 hover:bg-slate-50/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {l.item.name}
                        {(l.item.shotsPerUnit ?? 1) > 1 && (
                          <span className="text-[10px] text-teal-800 font-bold ml-1 bg-teal-50 px-1 py-0.5 rounded border border-teal-200">
                            shot
                          </span>
                        )}
                      </p>
                      <p className="text-xs tabular-nums text-slate-500">
                        {formatMoney(getItemSellingPrice(l.item))} {(l.item.shotsPerUnit ?? 1) > 1 ? "/shot" : "each"}
                      </p>
                    </div>

                    {/* Stepper Buttons (Tablet touch friendly) */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQty(l.item.id, l.quantity - 1)}
                        className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                        aria-label={`Decrease ${l.item.name} quantity`}
                      >
                        <IconMinus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-bold tabular-nums text-slate-900">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(l.item.id, l.quantity + 1)}
                        disabled={l.quantity >= l.item.counterStock}
                        className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                        aria-label={`Increase ${l.item.name} quantity`}
                      >
                        <IconPlus size={13} />
                      </button>
                    </div>

                    <span className="w-16 text-right text-sm font-bold tabular-nums text-slate-900">
                      {formatMoney(getItemSellingPrice(l.item) * l.quantity)}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeLine(l.item.id)}
                      className="p-1 text-slate-400 transition-colors hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      aria-label={`Remove ${l.item.name}`}
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Total and 1-Click Submit Button */}
            <div className="border-t border-[var(--border)] p-4 bg-slate-50/70">
              <div className="mb-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Waiter</span>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedWaiterName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Total Amount</span>
                  <p className="text-2xl font-bold tabular-nums text-slate-900">
                    {formatMoney(total)}
                  </p>
                </div>
              </div>

              {/* 1-Tap Direct Submit */}
              <Button
                className="w-full text-base font-bold shadow-sm h-12 rounded-xl"
                size="lg"
                disabled={!canSubmit}
                loading={createOrder.isPending}
                onClick={handleSubmitOrder}
              >
                {canSubmit
                  ? `Place Order · ${formatMoney(total)}`
                  : needsWaiter
                    ? "Select a waiter first"
                    : "Add beverages to cart"}
              </Button>

              {lines.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart({})}
                  className="mt-2.5 w-full text-center text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors"
                >
                  Clear cart
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
