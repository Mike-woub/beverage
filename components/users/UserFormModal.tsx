"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { IconEye, IconEyeOff } from "@/components/ui/icons";
import { useCreateUser, useUpdateUser } from "@/lib/hooks/useUsers";
import type { Role, User } from "@/lib/types";

const ROLES: Role[] = ["ADMIN", "BARMAN", "WAITER"];

export function UserFormModal({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user?: User | null;
}) {
  const isEdit = !!user;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>("WAITER");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setUsername(user?.username ?? "");
      setRole(user?.role ?? "WAITER");
      setPassword("");
      setShow(false);
      setErrors({});
    }
  }, [open, user]);

  const pending = createUser.isPending || updateUser.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const base = { username: username.trim(), role };

    if (isEdit) {
      const schema = z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().optional(),
      });
      const parsed = schema.safeParse({ username: base.username, password });
      if (!parsed.success) return applyErrors(parsed.error);
      if (password && password.length < 6) {
        return setErrors({ password: "Password must be at least 6 characters" });
      }
      try {
        await updateUser.mutateAsync({
          id: user!.id,
          data: { username: base.username, role, password: password || undefined },
        });
        onClose();
      } catch {
        /* toast handled */
      }
      return;
    }

    const schema = z.object({
      username: z.string().min(1, "Username is required"),
      password: z.string().min(6, "Password must be at least 6 characters"),
    });
    const parsed = schema.safeParse({ username: base.username, password });
    if (!parsed.success) return applyErrors(parsed.error);
    try {
      await createUser.mutateAsync({ username: base.username, role, password });
      onClose();
    } catch {
      /* toast handled */
    }
  }

  function applyErrors(err: z.ZodError) {
    const next: Record<string, string> = {};
    for (const issue of err.issues) next[String(issue.path[0])] = issue.message;
    setErrors(next);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit user" : "Create user"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" loading={pending}>
            {isEdit ? "Save changes" : "Create user"}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Username" htmlFor="u-name" error={errors.username}>
          <Input id="u-name" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus placeholder="e.g. sara" />
        </Field>
        <Field label="Role" htmlFor="u-role">
          <Select id="u-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
            ))}
          </Select>
        </Field>
        <Field
          label={isEdit ? "Reset password (optional)" : "Password"}
          htmlFor="u-pass"
          error={errors.password}
          hint={isEdit ? "Leave blank to keep the current password." : "At least 6 characters."}
        >
          <div className="relative">
            <Input
              id="u-pass"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              placeholder={isEdit ? "••••••••" : "Set a password"}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </button>
          </div>
        </Field>
      </form>
    </Modal>
  );
}
