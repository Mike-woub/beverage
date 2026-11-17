import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: "brand" | "success" | "warning" | "danger" | "info" | "neutral" | "purple";
  hint?: string;
  subValue?: string;
  className?: string;
}

const ICON_CONTAINER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  brand: {
    bg: "bg-teal-50",
    text: "text-[var(--brand)]",
    border: "border-teal-200/70",
  },
  success: {
    bg: "bg-emerald-50",
    text: "text-[var(--success)]",
    border: "border-emerald-200/70",
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-[var(--warning)]",
    border: "border-amber-200/70",
  },
  danger: {
    bg: "bg-rose-50",
    text: "text-[var(--danger)]",
    border: "border-rose-200/70",
  },
  info: {
    bg: "bg-sky-50",
    text: "text-[var(--info)]",
    border: "border-sky-200/70",
  },
  neutral: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200/70",
  },
};

export function StatCard({
  label,
  value,
  icon,
  tone = "brand",
  hint,
  subValue,
  className,
}: StatCardProps) {
  const iconStyle = ICON_CONTAINER_STYLES[tone] ?? ICON_CONTAINER_STYLES.brand;

  return (
    <Card className={cn("p-5 flex flex-col justify-between hover:border-slate-300 transition-colors", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-slate-900 sm:text-3xl">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-xs",
            iconStyle.bg,
            iconStyle.text,
            iconStyle.border,
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>

      {(hint || subValue) && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
          {hint && (
            <span className="font-medium text-slate-500">
              {hint}
            </span>
          )}
          {subValue && (
            <span className="ml-auto font-semibold tabular-nums text-slate-700">
              {subValue}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
