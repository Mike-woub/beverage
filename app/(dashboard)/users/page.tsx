"use client";

import { useMemo, useState } from "react";
import { useSetUserActive, useUsers } from "@/lib/hooks/useUsers";
import { useSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/toolbar";
import { UserFormModal } from "@/components/users/UserFormModal";
import { ConfirmDialog } from "@/components/ui/modal";
import {
  Button,
  Card,
  EmptyState,
  Select,
  TableSkeleton,
} from "@/components/ui/primitives";
import { ActiveBadge, RoleBadge } from "@/components/shared/status";
import { IconEdit, IconPlus, IconUsers } from "@/components/ui/icons";
import { formatDate, initials } from "@/lib/utils";
import type { Role, User } from "@/lib/types";

export default function UsersPage() {
  const { user: me } = useSession();
  const { data: users, isLoading } = useUsers();
  const setActive = useSetUserActive();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q && !u.username.toLowerCase().includes(q)) return false;
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      return true;
    });
  }, [users, search, roleFilter]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(u: User) {
    setEditing(u);
    setFormOpen(true);
  }

  async function confirmToggle() {
    if (!toggleTarget) return;
    try {
      await setActive.mutateAsync({ id: toggleTarget.id, isActive: !toggleTarget.isActive });
      setToggleTarget(null);
    } catch {
      /* toast handled */
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Administer staff accounts, role-based access control, and credentials."
        action={
          <Button onClick={openAdd}>
            <IconPlus size={16} />
            Create user
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by username…"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Role:</span>
            <div className="w-40">
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as Role | "ALL")}
                aria-label="Filter by role"
              >
                <option value="ALL">All roles</option>
                <option value="ADMIN">Admin</option>
                <option value="BARMAN">Barman</option>
                <option value="WAITER">Waiter</option>
              </Select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton cols={5} rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No staff users found"
            description={search || roleFilter !== "ALL" ? "Try adjusting the filters." : "Users will appear here once added."}
            icon={<IconUsers size={24} />}
            action={
              search || roleFilter !== "ALL" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("ALL");
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-4 py-3">Staff Member</th>
                  <th scope="col" className="px-4 py-3">Role &amp; Permissions</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Created Date</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id} className="transition-colors hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                            {initials(u.username)}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-900">{u.username}</span>
                            {isSelf && (
                              <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-3"><ActiveBadge active={u.isActive} /></td>
                      <td className="px-4 py-3 tabular-nums text-xs text-slate-500 font-medium">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                            <IconEdit size={14} />
                            Edit
                          </Button>
                          <Button
                            variant={u.isActive ? "ghost" : "secondary"}
                            size="sm"
                            disabled={isSelf}
                            title={isSelf ? "You cannot deactivate your own account" : undefined}
                            onClick={() => setToggleTarget(u)}
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} user={editing} />
      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
        loading={setActive.isPending}
        tone={toggleTarget?.isActive ? "danger" : "primary"}
        title={toggleTarget?.isActive ? "Deactivate User" : "Activate User"}
        confirmLabel={toggleTarget?.isActive ? "Deactivate" : "Activate"}
        message={
          toggleTarget?.isActive
            ? `"${toggleTarget?.username}" will no longer be able to sign in or be attributed orders.`
            : `"${toggleTarget?.username}" will be restored and able to sign in again.`
        }
      />
    </div>
  );
}
