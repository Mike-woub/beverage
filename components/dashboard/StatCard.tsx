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

const TONE_COLOR: Record<string, string> = {
  brand: "text-[var(--brand)]",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--danger)]",
  info: "text-[var(--info)]",
  neutral: "text-[var(--muted-foreground)]",
  purple: "text-purple-600",
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
  const color = TONE_COLOR[tone] ?? TONE_COLOR.brand;

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-[var(--foreground)]">
            {value}
          </p>
        </div>
        <span className={cn("shrink-0", color)} aria-hidden="true">
          {icon}
        </span>
      </div>
      {(hint || subValue) && (
        <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
          {hint && <span>{hint}</span>}
          {subValue && <span className="tabular-nums">{subValue}</span>}
        </div>
      )}
    </Card>
  );
}
