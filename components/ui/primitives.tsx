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
 * Architectural Enterprise SaaS UI Primitives
 * Built on the Deep Midnight Teal & Slate design tokens.
 * Complies with strict accessibility, keyboard navigation, and focus management standards.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand-strong)] active:bg-[var(--brand-dark)] shadow-[var(--shadow-xs)] border border-teal-800/20 active:scale-[0.98]",
  secondary:
    "bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-slate-200/70 border border-slate-200/80 active:scale-[0.98]",
  ghost:
    "text-[var(--foreground-body)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] active:scale-[0.98]",
  danger:
    "bg-[var(--danger)] text-white hover:brightness-95 active:brightness-90 shadow-[var(--shadow-xs)] border border-rose-800/20 active:scale-[0.98]",
  outline:
    "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] hover:border-[var(--border-hover)] shadow-[var(--shadow-xs)] active:scale-[0.98]",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs font-medium gap-1.5 rounded-[var(--radius)]",
  md: "h-10 px-3.5 text-sm font-medium gap-2 rounded-[var(--radius-md)]",
  lg: "h-11 px-5 text-sm font-semibold gap-2.5 rounded-[var(--radius-md)]",
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
        "inline-flex select-none items-center justify-center transition-all duration-150 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          className="size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin"
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
          "h-10 w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] shadow-[var(--shadow-xs)]",
          "placeholder:text-[var(--muted-foreground)] transition-all duration-150",
          "focus:border-[var(--brand)] focus:outline-none focus:ring-3 focus:ring-[var(--brand-border)]",
          "hover:border-[var(--border-hover)]",
          "disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:opacity-60",
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
        "w-full rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-[var(--shadow-xs)]",
        "placeholder:text-[var(--muted-foreground)] transition-all duration-150",
        "focus:border-[var(--brand)] focus:outline-none focus:ring-3 focus:ring-[var(--brand-border)]",
        "hover:border-[var(--border-hover)]",
        "disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative inline-block w-full">
        <select
          ref={ref}
          className={cn(
            "h-10 w-full appearance-none rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 pr-8 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-xs)]",
            "transition-all duration-150",
            "focus:border-[var(--brand)] focus:outline-none focus:ring-3 focus:ring-[var(--brand-border)]",
            "hover:border-[var(--border-hover)]",
            "disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:opacity-60",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M2.5 4.5L6 8L9.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
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
      <label htmlFor={htmlFor} className="text-xs font-semibold tracking-wide text-slate-700">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-[var(--muted-foreground)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-[var(--danger)]">
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
        "rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-shadow duration-150",
        className,
      )}
    >
      {children}
    </div>
  );
}

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const TONE_STYLES: Record<Tone, { container: string; dot: string }> = {
  neutral: {
    container: "bg-slate-100 text-slate-700 border-slate-200/80",
    dot: "bg-slate-400",
  },
  success: {
    container: "bg-[var(--success-tint)] text-[var(--success)] border-[var(--success-border)]",
    dot: "bg-[var(--success-dot)]",
  },
  warning: {
    container: "bg-[var(--warning-tint)] text-[var(--warning)] border-[var(--warning-border)]",
    dot: "bg-[var(--warning-dot)]",
  },
  danger: {
    container: "bg-[var(--danger-tint)] text-[var(--danger)] border-[var(--danger-border)]",
    dot: "bg-[var(--danger-dot)]",
  },
  info: {
    container: "bg-[var(--info-tint)] text-[var(--info)] border-[var(--info-border)]",
    dot: "bg-[var(--info-dot)]",
  },
  brand: {
    container: "bg-[var(--brand-tint)] text-[var(--brand)] border-[var(--brand-border)]",
    dot: "bg-[var(--brand)]",
  },
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums leading-none tracking-tight",
        styles.container,
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", styles.dot)} aria-hidden />}
      {children}
    </span>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full border-2 border-slate-200 border-r-transparent text-[var(--brand)] animate-spin"
      style={{
        width: size,
        height: size,
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
        "animate-bev-pulse rounded-[var(--radius)] bg-slate-200/70",
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
        <Card key={i} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="size-10 rounded-[var(--radius-lg)]" />
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
          className="flex flex-col gap-2.5 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-6 rounded-full" />
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
        <div className="flex size-12 items-center justify-center rounded-full border border-slate-200/80 bg-slate-50 text-slate-500 shadow-[var(--shadow-xs)]">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-slate-500 max-w-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2.5 py-14 text-sm font-medium text-slate-500"
      role="status"
      aria-live="polite"
    >
      <Spinner size={18} />
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
      <div className="flex size-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-900">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
