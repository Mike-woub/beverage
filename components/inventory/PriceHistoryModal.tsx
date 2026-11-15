"use client";

import { Modal } from "@/components/ui/modal";
import { Button, EmptyState, Skeleton } from "@/components/ui/primitives";
import { useItemPriceHistory } from "@/lib/hooks/useItems";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { IconTrend } from "@/components/ui/icons";
import type { Item } from "@/lib/types";

/**
 * Selling-price change history for a beverage (ADMIN-only). Shows each change
 * with old → new price, who changed it, and when. Buying-cost history lives on
 * the stock purchases page (each purchase records its own unit cost).
 */
export function PriceHistoryModal({
  item,
  onClose,
}: {
  item: Item | null;
  onClose: () => void;
}) {
  const { data: history, isLoading } = useItemPriceHistory(item?.id ?? null);

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={item ? `Price history — ${item.name}` : "Price history"}
      description="Selling-price changes over time. Current price is shown at the top."
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      {isLoading ? (
        <div className="space-y-3 py-2" aria-busy="true">
          <Skeleton className="h-10 w-full rounded-[var(--radius)]" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
        </div>
      ) : !history || history.length === 0 ? (
        <EmptyState
          title="No price changes yet"
          description={item ? `Current selling price: ${formatMoney(item.price)}` : undefined}
          icon={<IconTrend size={22} />}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <div className="mb-1 flex items-center justify-between rounded-[var(--radius)] bg-[var(--brand-tint)] px-3 py-2 text-sm">
            <span className="text-[var(--brand-strong)]">Current price</span>
            <span className="font-semibold tabular-nums text-[var(--brand-strong)]">
              {item ? formatMoney(item.price) : ""}
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-[var(--border)]">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="text-[var(--foreground)]">
                    <span className="tabular-nums text-[var(--muted-foreground)] line-through">
                      {formatMoney(h.oldPrice)}
                    </span>
                    {"  →  "}
                    <span className="font-medium tabular-nums">{formatMoney(h.newPrice)}</span>
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">by {h.changedBy}</p>
                </div>
                <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                  {formatDateTime(h.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
