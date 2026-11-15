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
import { IconCart, IconCheck, IconMinus, IconPlus, IconTrash } from "@/components/ui/icons";
import { cn, formatMoney, isAvailable } from "@/lib/utils";
import type { Item, Order } from "@/lib/types";

interface Line {
  item: Item;
  quantity: number;
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
  const total = lines.reduce((s, l) => s + l.item.price * l.quantity, 0);
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
    <div>
      <PageHeader
        title="New Order"
        description="Select waiter, tap beverages, and place orders quickly."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Beverage catalogue */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search beverages…"
              />
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
                  selectedCategory === cat
                    ? "bg-[var(--brand)] text-[var(--brand-foreground)] font-semibold shadow-sm"
                    : "bg-[var(--surface-muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)] hover:text-[var(--foreground)]",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {isLoading ? (
            <GridSkeleton count={6} />
          ) : visible.length === 0 ? (
            <EmptyState
              title={search ? "No beverages found" : "No beverages in this category"}
              description={
                search
                  ? `No drinks match "${search}".`
                  : "Try selecting another category or clear search."
              }
              icon={<IconCart size={22} />}
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
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visible.map((item) => {
                const available = isAvailable(item);
                const inCart = cart[item.id]?.quantity ?? 0;
                const atMax = inCart >= item.counterStock;
                return (
                  <button
                    key={item.id}
                    disabled={!available || atMax}
                    onClick={() => addToCart(item)}
                    aria-label={`Add ${item.name} (${formatMoney(item.price)}, ${item.counterStock} available)`}
                    className={cn(
                      "group flex flex-col items-start gap-2 rounded-[var(--radius-lg)] border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] active:scale-[0.98]",
                      available
                        ? inCart > 0
                          ? "border-[var(--brand)] bg-[var(--surface)] ring-1 ring-[var(--brand)] shadow-[var(--shadow-sm)]"
                          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)] hover:shadow-[var(--shadow-md)]"
                        : "cursor-not-allowed border-[var(--border)] bg-[var(--surface-muted)] opacity-60",
                    )}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="font-medium text-balance text-[var(--foreground)] leading-tight">
                        {item.name}
                      </span>
                      {inCart > 0 && (
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-bold tabular-nums text-[var(--brand-foreground)]">
                          {inCart}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-[var(--brand-strong)]">
                      {formatMoney(item.price)}
                    </span>
                    <div className="flex w-full items-center justify-between text-xs text-[var(--muted-foreground)]">
                      {available ? (
                        <span className="tabular-nums">{item.counterStock} available</span>
                      ) : (
                        <span className="font-medium text-[var(--danger)]">
                          {item.isActive ? "Out of stock" : "Unavailable"}
                        </span>
                      )}
                      {item.category && item.category !== "Other" && (
                        <span className="text-[10px] text-[var(--muted-foreground)] opacity-70">
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

        {/* Order summary sidebar */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="flex flex-col">
            {/* Quick Waiter Selection Bar */}
            <div className="border-b border-[var(--border)] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                  Select Waiter
                </span>
                {needsWaiter && (
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    * Required
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
                      "rounded-full px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
                      !waiterId
                        ? "bg-[var(--brand)] text-[var(--brand-foreground)] font-semibold shadow-sm"
                        : "bg-[var(--surface-muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]",
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
                          "rounded-full px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
                          isSelected
                            ? "bg-[var(--brand)] text-[var(--brand-foreground)] font-semibold shadow-sm scale-105"
                            : "bg-[var(--surface-muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)] hover:text-[var(--foreground)]",
                        )}
                      >
                        {w.username}
                      </button>
                    );
                  })}
              </div>

              {/* Fallback dropdown if many waiters */}
              {waiters && waiters.length > 5 && (
                <div className="mt-2">
                  <Select
                    value={waiterId}
                    onChange={(e) => setWaiterId(e.target.value)}
                    className="h-8 text-xs"
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

            {/* Recent order flash alert */}
            {lastPlaced && lines.length === 0 && (
              <div className="flex items-center justify-between border-b border-[var(--border)] bg-green-50/60 p-3 text-xs text-green-800 dark:bg-green-950/30 dark:text-green-300">
                <div className="flex items-center gap-1.5">
                  <IconCheck size={16} className="text-green-600 shrink-0" />
                  <span>
                    Last order: <strong>{lastPlaced.waiterName}</strong> ·{" "}
                    <strong>{formatMoney(lastPlaced.totalAmount)}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="font-medium underline hover:text-green-900 ml-2 shrink-0"
                >
                  Print Chit
                </button>
              </div>
            )}

            {/* Cart Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <IconCart size={16} />
                <h2 className="font-semibold text-sm text-[var(--foreground)]">Current Order</h2>
              </div>
              {itemCount > 0 && (
                <span className="text-xs font-semibold tabular-nums text-[var(--brand)]">
                  {itemCount} unit{itemCount === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {/* Cart Items List */}
            {lines.length === 0 ? (
              <EmptyState
                title="Cart is empty"
                description="Tap drinks on the left to add."
                icon={<IconCart size={22} />}
              />
            ) : (
              <div className="max-h-[48vh] divide-y divide-[var(--border)] overflow-y-auto">
                {lines.map((l) => (
                  <div key={l.item.id} className="flex items-center gap-2 px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">
                        {l.item.name}
                      </p>
                      <p className="text-xs tabular-nums text-[var(--muted-foreground)]">
                        {formatMoney(l.item.price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setQty(l.item.id, l.quantity - 1)}
                        className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                        aria-label={`Decrease ${l.item.name} quantity`}
                      >
                        <IconMinus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-bold tabular-nums">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(l.item.id, l.quantity + 1)}
                        disabled={l.quantity >= l.item.counterStock}
                        className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                        aria-label={`Increase ${l.item.name} quantity`}
                      >
                        <IconPlus size={13} />
                      </button>
                    </div>
                    <span className="w-16 text-right text-sm font-semibold tabular-nums text-[var(--foreground)]">
                      {formatMoney(l.item.price * l.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(l.item.id)}
                      className="p-1 text-[var(--muted-foreground)] transition-colors hover:text-[var(--danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
                      aria-label={`Remove ${l.item.name}`}
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Total and 1-Click Submit Button */}
            <div className="border-t border-[var(--border)] p-4 bg-[var(--surface-muted)]/50">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <span className="text-xs text-[var(--muted-foreground)]">Order for</span>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {selectedWaiterName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[var(--muted-foreground)]">Total Amount</span>
                  <p className="text-xl font-bold tabular-nums text-[var(--brand-strong)]">
                    {formatMoney(total)}
                  </p>
                </div>
              </div>

              {/* 1-Tap Direct Submit */}
              <Button
                className="w-full text-base font-semibold shadow-md"
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
                  className="mt-2.5 w-full text-center text-xs text-[var(--muted-foreground)] hover:text-[var(--danger)] transition-colors"
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
