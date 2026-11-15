import { http } from "@/lib/api/client";
import type { CreateTransferDTO, TransferRequest } from "@/lib/types";

/** Transfer request service — warehouse → counter pulls. */
export const transferService = {
  getAll: (): Promise<TransferRequest[]> => http.get<TransferRequest[]>("/transfers"),
  create: (dto: CreateTransferDTO): Promise<TransferRequest> =>
    http.post<TransferRequest>("/transfers", dto),
  approve: (id: string): Promise<TransferRequest> =>
    http.post<TransferRequest>(`/transfers/${id}/approve`),
  reject: (id: string): Promise<TransferRequest> =>
    http.post<TransferRequest>(`/transfers/${id}/reject`),
};
