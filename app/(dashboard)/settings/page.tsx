"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useSetting, useUpdateSetting } from "@/lib/hooks/useInventory";
import { PageHeader } from "@/components/shared/page-header";
import {
  Button,
  Card,
  Field,
  Input,
  Skeleton,
} from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";

const schema = z.object({
  lowStockThreshold: z.number().int("Whole number").nonnegative("Cannot be negative"),
});

export default function SettingsPage() {
  const { data: setting, isLoading } = useSetting();
  const updateSetting = useUpdateSetting();

  const [threshold, setThreshold] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (setting) setThreshold(String(setting.lowStockThreshold));
  }, [setting]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ lowStockThreshold: Number(threshold) });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    try {
      await updateSetting.mutateAsync(parsed.data.lowStockThreshold);
    } catch {
      /* toast handled */
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        description="Configure system-wide inventory parameters, stock alert thresholds, and operational rules."
      />

      {isLoading || !setting ? (
        <Card className="max-w-xl p-6 space-y-4" aria-busy="true">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-3/4" />
          <div className="pt-2 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </Card>
      ) : (
        <Card className="max-w-xl p-6 shadow-xs">
          <div className="border-b border-[var(--border)] pb-4 mb-5">
            <h2 className="font-bold text-base text-slate-900">Inventory Threshold Parameters</h2>
            <p className="mt-1 text-xs text-slate-500 leading-normal">
              A beverage item in either the warehouse reserve or the counter bar is flagged as low-stock when its unit balance falls at or below this threshold value.
            </p>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field
              label="Global Low-Stock Warning Threshold (Units)"
              htmlFor="threshold"
              error={error}
              hint="Units remaining that trigger Amber warning badges across the POS and inventory dashboards."
            >
              <Input
                id="threshold"
                type="number"
                min="0"
                step="1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="max-w-[12rem] tabular-nums"
              />
            </Field>
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={updateSetting.isPending}>
                Save Settings
              </Button>
              <span className="text-xs tabular-nums text-slate-400">
                Last updated {formatDateTime(setting.updatedAt)}
              </span>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
