"use client";

import { useMutation, useQuery } from "@/lib/query/query-client";
import { transferService } from "@/lib/services/transfer.service";
import { useToast } from "@/lib/ui/toast";
import type { CreateTransferDTO, TransferRequest } from "@/lib/types";

const KEY = "transfers";

export function useTransfers() {
  return useQuery<TransferRequest[]>(KEY, transferService.getAll);
}

export function useCreateTransfer() {
  const toast = useToast();
  return useMutation<TransferRequest, CreateTransferDTO>({
    mutationFn: (dto) => transferService.create(dto),
    invalidateKeys: [KEY, "dashboard"],
    onSuccess: (t) => toast.success(`Transfer request sent for ${t.quantity} × ${t.itemName}`),
    onError: (e) => toast.error(e.message),
  });
}

export function useApproveTransfer() {
  const toast = useToast();
  return useMutation<TransferRequest, string>({
    mutationFn: (id) => transferService.approve(id),
    // Approval moves stock, so refresh items, movements, dashboard too.
    invalidateKeys: [KEY, "items", "movements", "dashboard"],
    onSuccess: (t) => toast.success(`Approved — ${t.quantity} × ${t.itemName} moved to counter`),
    onError: (e) => toast.error(e.message),
  });
}

export function useRejectTransfer() {
  const toast = useToast();
  return useMutation<TransferRequest, string>({
    mutationFn: (id) => transferService.reject(id),
    invalidateKeys: [KEY, "dashboard"],
    onSuccess: () => toast.success("Transfer request rejected"),
    onError: (e) => toast.error(e.message),
  });
}
