"use client";

import { useState } from "react";
import { useOrder, useVoidOrder } from "@/lib/hooks/useOrders";
import { useSession } from "@/lib/auth/session";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Skeleton, Textarea } from "@/components/ui/primitives";
import { formatDateTime, formatMoney } from "@/lib/utils";

/** Read-only order details with Admin Void Order action. */
export function OrderDetailModal({
  orderId,
  onClose,
}: {
  orderId: string | null;
  onClose: () => void;
}) {
  const { user } = useSession();
  const isAdmin = user?.role === "ADMIN";
  const { data: order, isLoading } = useOrder(orderId);
  const voidOrder = useVoidOrder();

  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");

  async function handleVoid(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    const clean = voidReason.trim();
    if (!clean) {
      setVoidError("A reason is required to void this order");
      return;
    }
    setVoidError("");
    try {
      await voidOrder.mutateAsync({ id: order.id, reason: clean });
      setVoidModalOpen(false);
      setVoidReason("");
    } catch {
      /* toast handled in hook */
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <Modal
        open={!!orderId && !voidModalOpen}
        onClose={onClose}
        title="Order Details"
        description={
          order
            ? `Waiter: ${order.waiterName} · ${formatDateTime(order.createdAt)}`
            : undefined
        }
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <div>
              {isAdmin && order && !order.isVoided && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setVoidModalOpen(true)}
                  disabled={voidOrder.isPending}
                >
                  Void order
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                Print Chit
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        {isLoading || !order ? (
          <div className="space-y-3 py-2" aria-busy="true">
            <Skeleton className="h-4 w-32" />
            <div className="space-y-2 rounded-[var(--radius)] border border-[var(--border)] p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {order.isVoided && (
              <div className="rounded-[var(--radius)] border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="rounded bg-red-200 px-1.5 py-0.5 text-xs text-red-900 dark:bg-red-900 dark:text-red-100">
                    VOIDED
                  </span>
                  {order.voidedAt && (
                    <span className="text-xs font-normal">
                      Voided on {formatDateTime(order.voidedAt)}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs">
                  Reason:{" "}
                  <span className="font-medium">
                    {order.voidReason || "No reason specified"}
                  </span>
                  {order.voidedByName && <span> · Voided by {order.voidedByName}</span>}
                </p>
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Stock was returned to the counter and this order is excluded from revenue totals.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-[var(--muted-foreground)]">
              <span className="tabular-nums">
                {order.items?.length ?? 0} line item
                {(order.items?.length ?? 0) === 1 ? "" : "s"}
              </span>
              {order.isVoided && (
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  Status: CANCELLED / VOIDED
                </span>
              )}
            </div>

            <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
                    <th scope="col" className="px-3 py-2">
                      Beverage
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Unit
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Qty
                    </th>
                    <th scope="col" className="px-3 py-2 text-right">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {order.items?.map((oi) => (
                    <tr
                      key={oi.id}
                      className={order.isVoided ? "opacity-60" : undefined}
                    >
                      <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                        {oi.itemName}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMoney(oi.unitPrice)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">
                        {oi.quantity}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {formatMoney(oi.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border)] bg-[var(--surface-muted)]">
                    <td
                      className="px-3 py-2.5 font-semibold text-[var(--foreground)]"
                      colSpan={3}
                    >
                      Total
                    </td>
                    <td className="px-3 py-2.5 text-right text-base font-semibold tabular-nums text-[var(--foreground)]">
                      <span className={order.isVoided ? "line-through text-[var(--muted-foreground)]" : undefined}>
                        {formatMoney(order.totalAmount)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="text-xs text-[var(--muted-foreground)]">
              Ref ID: {order.orderNumber}
            </p>
          </div>
        )}
      </Modal>

      {/* Void confirmation dialog */}
      <Modal
        open={voidModalOpen}
        onClose={() => setVoidModalOpen(false)}
        title="Void Order"
        description="Cancelling this order will return all beverages back to counter stock and exclude it from revenue."
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setVoidModalOpen(false)}
              disabled={voidOrder.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="submit"
              form="void-order-form"
              loading={voidOrder.isPending}
            >
              Confirm Void
            </Button>
          </>
        }
      >
        <form
          id="void-order-form"
          onSubmit={handleVoid}
          className="space-y-4"
          noValidate
        >
          <Field
            label="Reason for voiding"
            htmlFor="void-reason"
            error={voidError}
            hint="A clear explanation is recorded in the immutable audit trail."
          >
            <Textarea
              id="void-reason"
              rows={3}
              value={voidReason}
              onChange={(e) => {
                setVoidReason(e.target.value);
                if (voidError) setVoidError("");
              }}
              placeholder="e.g. Customer cancelled order, entered wrong drink or quantity"
              autoFocus
            />
          </Field>
        </form>
      </Modal>
    </>
  );
}
