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
          <Skeleton className="h-10 w-full rounded-xl" />
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
          <div className="mb-2 flex items-center justify-between rounded-xl border border-teal-200/80 bg-teal-50/70 px-3.5 py-2.5 text-sm">
            <span className="font-medium text-teal-900">Current selling price</span>
            <span className="font-bold tabular-nums text-teal-800">
              {item ? formatMoney(item.price) : ""}
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-slate-100">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="text-slate-900">
                    <span className="tabular-nums text-slate-400 line-through">
                      {formatMoney(h.oldPrice)}
                    </span>
                    <span className="text-slate-300 mx-1.5">→</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{formatMoney(h.newPrice)}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    by <span className="font-medium text-slate-700">{h.changedBy}</span>
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400 tabular-nums">
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
