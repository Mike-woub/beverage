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
        title="Order Chit Details"
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
            <div className="space-y-2 rounded-xl border border-slate-200 p-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {order.isVoided && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-900 shadow-xs">
                <div className="flex items-center gap-2 font-bold">
                  <span className="rounded-md bg-rose-200 px-2 py-0.5 text-xs text-rose-950 font-bold">
                    VOIDED / CANCELLED
                  </span>
                  {order.voidedAt && (
                    <span className="text-xs font-medium text-rose-800">
                      on {formatDateTime(order.voidedAt)}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-rose-900 font-medium">
                  Reason: {order.voidReason || "No reason specified"}
                  {order.voidedByName && <span> · Voided by {order.voidedByName}</span>}
                </p>
                <p className="mt-1 text-xs text-rose-700">
                  Stock was restored to the counter and revenue is excluded.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>
                {order.items?.length ?? 0} line item
                {(order.items?.length ?? 0) === 1 ? "" : "s"}
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {order.orderNumber}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-3">
                      Beverage
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Unit Price
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Qty
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {order.items?.map((oi) => (
                    <tr
                      key={oi.id}
                      className={order.isVoided ? "opacity-60" : "hover:bg-slate-50/50 transition-colors"}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {oi.itemName}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                        {formatMoney(oi.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900">
                        {oi.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                        {formatMoney(oi.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border)] bg-slate-50/60 font-bold text-slate-900">
                    <td
                      className="px-4 py-3"
                      colSpan={3}
                    >
                      Total Amount
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-slate-900">
                      <span className={order.isVoided ? "line-through text-slate-400 font-normal" : undefined}>
                        {formatMoney(order.totalAmount)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Void confirmation dialog */}
      <Modal
        open={voidModalOpen}
        onClose={() => setVoidModalOpen(false)}
        title="Void Order Confirmation"
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
