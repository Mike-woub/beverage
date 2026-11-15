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
    <div>
      <PageHeader title="Settings" description="System-wide configuration." />

      {isLoading || !setting ? (
        <Card className="max-w-xl p-6 space-y-4" aria-busy="true">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-3/4" />
          <div className="pt-2 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </Card>
      ) : (
        <Card className="max-w-xl p-6">
          <h2 className="font-semibold text-[var(--foreground)]">Inventory</h2>
          <p className="mt-1 text-sm text-pretty text-[var(--muted-foreground)]">
            A beverage is flagged as low-stock when its stock is at or below this threshold.
          </p>
          <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
            <Field label="Global low-stock threshold" htmlFor="threshold" error={error}>
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
            <div className="flex items-center gap-3">
              <Button type="submit" loading={updateSetting.isPending}>
                Save settings
              </Button>
              <span className="text-xs tabular-nums text-[var(--muted-foreground)]">
                Last updated {formatDateTime(setting.updatedAt)}
              </span>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
