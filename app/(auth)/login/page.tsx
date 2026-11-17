"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useSession, homeRouteFor } from "@/lib/auth/session";
import { useToast } from "@/lib/ui/toast";
import { Button, Card, Field, Input } from "@/components/ui/primitives";
import { IconEye, IconEyeOff } from "@/components/ui/icons";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const { login, status, user } = useSession();
  const router = useRouter();
  const toast = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace(homeRouteFor(user?.role));
  }, [status, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ username, password });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as "username" | "password"] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const loggedIn = await login(username.trim(), password);
      toast.success(`Welcome back, ${loggedIn.username}`);
      router.replace(homeRouteFor(loggedIn.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3.5 flex size-12 items-center justify-center rounded-xl bg-[var(--brand)] text-white shadow-md ring-4 ring-teal-50">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 2h8l-1 9a3 3 0 0 1-3 3 3 3 0 0 1-3-3L8 2Z" />
              <path d="M12 14v6M9 22h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Addis Beverage
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Enterprise Inventory &amp; Order Management
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-7 shadow-lg border-slate-200/90 rounded-2xl">
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Field label="Username" htmlFor="username" error={errors.username}>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                aria-invalid={!!errors.username}
                aria-describedby={errors.username ? "username-error" : undefined}
                placeholder="e.g. admin"
              />
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password}>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className="pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  aria-pressed={show}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                >
                  {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </Field>

            <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full h-11 text-sm font-bold shadow-sm">
              Sign in to Workspace
            </Button>
          </form>

          {/* Demo Accounts Pill */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-600">
            <p className="mb-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-500">
              Demo Credentials
            </p>
            <div className="space-y-1 font-mono text-[11px] text-slate-700">
              <p>Roles: <span className="font-semibold text-slate-900">admin</span> / <span className="font-semibold text-slate-900">waiter</span> / <span className="font-semibold text-slate-900">store</span></p>
              <p>Password: <span className="font-semibold text-slate-900">ChangeMe123!</span></p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
