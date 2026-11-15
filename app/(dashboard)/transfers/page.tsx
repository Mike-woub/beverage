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
    <div>
      <PageHeader
        title="Stock Transfers"
        description={
          isAdmin
            ? "Approve or reject requests to move stock from the warehouse to the counter."
            : "Your requests to move stock from the warehouse to the counter."
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TransferStatus | "ALL")}
            className="sm:w-48"
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
          {pendingCount > 0 && (
            <p className="text-xs font-medium tabular-nums text-[var(--warning)]">
              {pendingCount} pending transfer{pendingCount === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {isLoading ? (
          <TableSkeleton cols={isAdmin ? 7 : 6} rows={5} />
        ) : isError ? (
          <ErrorBlock message={error?.message ?? "Failed to load"} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No stock transfers"
            description={statusFilter !== "ALL" ? "Try selecting all statuses." : "Stock transfers will appear here once requested."}
            icon={<IconMovements size={22} />}
            action={
              statusFilter !== "ALL" ? (
                <Button variant="outline" size="sm" onClick={() => setStatusFilter("ALL")}>
                  Show all
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
                  <th scope="col" className="px-4 py-3">Requested</th>
                  <th scope="col" className="px-4 py-3">Beverage</th>
                  <th scope="col" className="px-4 py-3">Qty</th>
                  <th scope="col" className="px-4 py-3">By</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Note</th>
                  {isAdmin && <th scope="col" className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-[var(--surface-muted)]">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                      {formatDateTime(t.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{t.itemName}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">{t.quantity}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{t.requestedBy}</td>
                    <td className="px-4 py-3"><TransferStatusBadge status={t.status} /></td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-[var(--muted-foreground)]" title={t.note ?? ""}>
                      {t.note ?? "—"}
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
                                variant="danger"
                                size="sm"
                                loading={reject.isPending}
                                onClick={() => setRejectTarget(t)}
                              >
                                Reject
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {t.decidedBy ? `by ${t.decidedBy}` : "—"}
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
        title="Reject stock transfer"
        confirmLabel="Reject transfer"
        tone="danger"
        message={
          rejectTarget
            ? `Are you sure you want to reject the stock transfer of ${rejectTarget.quantity} units of "${rejectTarget.itemName}"? No stock will be moved.`
            : ""
        }
      />
    </div>
  );
}
