import { http } from "@/lib/api/client";
import type { CreateUserDTO, UpdateUserDTO, User, WaiterOption } from "@/lib/types";

/** User management service — real API against /api/v1/users. */
export const userService = {
  getAll: (): Promise<User[]> => http.get<User[]>("/users"),
  getWaiters: (): Promise<WaiterOption[]> => http.get<WaiterOption[]>("/users/waiters"),
  create: (dto: CreateUserDTO): Promise<User> => http.post<User>("/users", dto),
  update: (id: string, dto: UpdateUserDTO): Promise<User> =>
    http.put<User>(`/users/${id}`, dto),
  setActive: (id: string, isActive: boolean): Promise<User> =>
    http.patch<User>(`/users/${id}/status`, { isActive }),
};
