"use client";

import { useMutation, useQuery } from "@/lib/query/query-client";
import { userService } from "@/lib/services/user.service";
import { useToast } from "@/lib/ui/toast";
import type { CreateUserDTO, UpdateUserDTO, User, WaiterOption } from "@/lib/types";

const KEY = "users";

export function useUsers() {
  return useQuery<User[]>(KEY, userService.getAll);
}

/** Active waiters for the "order on behalf of" dropdown. ADMIN-only endpoint;
 *  pass enabled=false for non-admins so it isn't fetched (would 403). */
export function useWaiters(enabled = true) {
  return useQuery<WaiterOption[]>("waiters", userService.getWaiters, { enabled });
}

export function useCreateUser() {
  const toast = useToast();
  return useMutation<User, CreateUserDTO>({
    mutationFn: (dto) => userService.create(dto),
    invalidateKeys: [KEY],
    onSuccess: (u) => toast.success(`User "${u.username}" created`),
    onError: (e) => toast.error(e.message),
  });
}

export function useUpdateUser() {
  const toast = useToast();
  return useMutation<User, { id: string; data: UpdateUserDTO }>({
    mutationFn: ({ id, data }) => userService.update(id, data),
    invalidateKeys: [KEY],
    onSuccess: () => toast.success("User updated"),
    onError: (e) => toast.error(e.message),
  });
}

export function useSetUserActive() {
  const toast = useToast();
  return useMutation<User, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) => userService.setActive(id, isActive),
    invalidateKeys: [KEY],
    onSuccess: (u) =>
      toast.success(`"${u.username}" ${u.isActive ? "activated" : "deactivated"}`),
    onError: (e) => toast.error(e.message),
  });
}
