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
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-[var(--radius)] bg-[var(--brand)] text-[var(--brand-foreground)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 2h8l-1 9a3 3 0 0 1-3 3 3 3 0 0 1-3-3L8 2Z" />
              <path d="M12 14v6M9 22h6" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-balance text-[var(--foreground)]">
            Beverage Manager
          </h1>
          <p className="mt-1 text-sm text-pretty text-[var(--muted-foreground)]">
            Sign in to manage inventory and orders
          </p>
        </div>

        <Card className="p-6">
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[var(--radius-sm)] p-1 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                >
                  {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </Field>

            <Button type="submit" size="lg" loading={submitting} className="mt-1">
              Sign in
            </Button>
          </form>

          <div className="mt-5 rounded-[var(--radius)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--muted-foreground)]">
            <p className="mb-1 font-medium text-[var(--foreground)]">Demo accounts</p>
            <p>admin / waiter / store — password: ChangeMe123!</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
