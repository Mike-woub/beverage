"use client";

import { useMemo, useState } from "react";
import {
  useApproveTransfer,
  useRejectTransfer,
  useTransfers,
} from "@/lib/hooks/useTransfers";
import { useSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/ui/modal";
import {
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  Select,
  TableSkeleton,
} from "@/components/ui/primitives";
import { TransferStatusBadge } from "@/components/shared/status";
import { IconMovements } from "@/components/ui/icons";
import { formatDateTime } from "@/lib/utils";
import type { TransferRequest, TransferStatus } from "@/lib/types";

/**
 * Transfer requests queue. ADMIN approves/rejects pending requests (approval
 * performs the warehouse → counter move). BARMAN sees the queue read-only.
 */
export default function TransfersPage() {
  const { user } = useSession();
  const isAdmin = user?.role === "ADMIN";
  const { data: transfers, isLoading, isError, error, refetch } = useTransfers();
  const approve = useApproveTransfer();
  const reject = useRejectTransfer();

  const [statusFilter, setStatusFilter] = useState<TransferStatus | "ALL">("ALL");
  const [rejectTarget, setRejectTarget] = useState<TransferRequest | null>(null);

  const filtered = useMemo(() => {
    if (!transfers) return [];
    return statusFilter === "ALL"
      ? transfers
      : transfers.filter((t) => t.status === statusFilter);
  }, [transfers, statusFilter]);

  const pendingCount = (transfers ?? []).filter((t) => t.status === "PENDING").length;

  async function handleConfirmReject() {
    if (!rejectTarget) return;
    try {
      await reject.mutateAsync(rejectTarget.id);
      setRejectTarget(null);
    } catch {
      /* toast handled in hook */
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Transfers"
        description={
          isAdmin
            ? "Review and approve stock movements from the warehouse reserve to the counter bar."
            : "Your requests to move stock from the warehouse reserve to the counter bar."
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
            <div className="w-44">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TransferStatus | "ALL")}
                aria-label="Filter by status"
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </Select>
            </div>
          </div>

          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 shadow-xs">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              {pendingCount} pending transfer{pendingCount === 1 ? "" : "s"} await review
            </span>
          )}
        </div>

        {isLoading ? (
          <TableSkeleton cols={isAdmin ? 7 : 6} rows={5} />
        ) : isError ? (
          <ErrorBlock message={error?.message ?? "Failed to load"} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No stock transfers found"
            description={statusFilter !== "ALL" ? "Try selecting all statuses to see historical requests." : "Stock transfers will appear here once requested."}
            icon={<IconMovements size={24} />}
            action={
              statusFilter !== "ALL" ? (
                <Button variant="outline" size="sm" onClick={() => setStatusFilter("ALL")}>
                  Show all statuses
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-4 py-3">Requested</th>
                  <th scope="col" className="px-4 py-3">Beverage</th>
                  <th scope="col" className="px-4 py-3 text-right">Units</th>
                  <th scope="col" className="px-4 py-3">Requested By</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Note / Details</th>
                  {isAdmin && <th scope="col" className="px-4 py-3 text-right">Review Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-xs text-slate-500">
                      {formatDateTime(t.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{t.itemName}</span>
                        {t.shotsPerUnit && t.shotsPerUnit > 1 ? (
                          <span className="inline-flex items-center rounded-md border border-teal-200/80 bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">
                            1 btl = {t.shotsPerUnit} shots
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900">
                      <div>
                        {t.quantity}
                        {t.shotsPerUnit && t.shotsPerUnit > 1 ? (
                          <span className="text-xs font-normal text-slate-500 ml-1">btl</span>
                        ) : null}
                      </div>
                      {t.shotsPerUnit && t.shotsPerUnit > 1 ? (
                        <div className="text-[11px] font-semibold text-teal-700">
                          +{t.quantity * t.shotsPerUnit} shots to bar
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{t.requestedBy}</td>
                    <td className="px-4 py-3"><TransferStatusBadge status={t.status} /></td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-xs text-slate-500" title={t.note ?? ""}>
                      {t.note || "—"}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {t.status === "PENDING" ? (
                            <>
                              <Button
                                size="sm"
                                loading={approve.isPending}
                                onClick={() => approve.mutate(t.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                loading={reject.isPending}
                                onClick={() => setRejectTarget(t)}
                              >
                                Reject
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">
                              {t.decidedBy ? `Reviewed by ${t.decidedBy}` : "—"}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
        loading={reject.isPending}
        title="Reject Stock Transfer"
        confirmLabel="Reject Transfer"
        tone="danger"
        message={
          rejectTarget
            ? `Are you sure you want to reject the stock transfer of ${rejectTarget.quantity} units of "${rejectTarget.itemName}"? No stock will be moved from warehouse reserve.`
            : ""
        }
      />
    </div>
  );
}
