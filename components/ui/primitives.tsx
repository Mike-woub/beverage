"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Hand-built UI primitives replacing shadcn/ui (not installable here). Styling
 * uses the design tokens in app/globals.css. All are accessible: labels tie to
 * controls, focus rings are visible, disabled states are conveyed.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand-strong)] shadow-[var(--shadow-sm)]",
  secondary:
    "bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--border)]",
  ghost: "text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
  danger: "bg-[var(--danger)] text-white hover:brightness-95 shadow-[var(--shadow-sm)]",
  outline:
    "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius)] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          className="size-4 rounded-full border-2 border-current border-r-transparent"
          style={{ animation: "bev-spin 0.6s linear infinite" }}
          aria-hidden
        />
      )}
      {children}
    </button>
  );
});

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]",
          "placeholder:text-[var(--muted-foreground)] transition-colors",
          "focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-tint)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]",
        "placeholder:text-[var(--muted-foreground)] transition-colors",
        "focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-tint)]",
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "h-10 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]",
          "focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-tint)]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

export function Field({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-[var(--muted-foreground)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";
const TONE: Record<Tone, string> = {
  neutral: "bg-[var(--surface-muted)] text-[var(--muted-foreground)]",
  success: "bg-[var(--success-tint)] text-[var(--success)]",
  warning: "bg-[var(--warning-tint)] text-[var(--warning)]",
  danger: "bg-[var(--danger-tint)] text-[var(--danger)]",
  info: "bg-[var(--info-tint)] text-[var(--info)]",
  brand: "bg-[var(--brand-tint)] text-[var(--brand-strong)]",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full border-2 border-[var(--border-strong)] border-r-transparent text-[var(--brand)]"
      style={{
        width: size,
        height: size,
        animation: "bev-spin 0.6s linear infinite",
      }}
      aria-label="Loading"
      role="status"
    />
  );
}

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-bev-pulse rounded-[var(--radius)] bg-[var(--surface-muted)]",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="w-full overflow-x-auto p-4" aria-busy="true" aria-label="Loading table data">
      <div className="space-y-3">
        <div className="flex gap-4 border-b border-[var(--border)] pb-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 py-2">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-4 flex-1", c === 0 ? "max-w-[140px]" : "")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true" aria-label="Loading statistics">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="size-10 rounded-[var(--radius)]" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      aria-busy="true"
      aria-label="Loading items"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-5 rounded-full" />
          </div>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted-foreground)]">
          {icon}
        </div>
      )}
      <div>
        <p className="font-medium text-balance text-[var(--foreground)]">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-pretty text-[var(--muted-foreground)]">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 py-14 text-sm text-[var(--muted-foreground)]"
      role="status"
      aria-live="polite"
    >
      <Spinner size={20} />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-14 text-center"
      role="alert"
    >
      <p className="text-sm font-medium text-balance text-[var(--danger)]">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
