"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { useCreateTransfer } from "@/lib/hooks/useTransfers";
import type { Item } from "@/lib/types";

const schema = z.object({
  itemId: z.string().min(1, "Select a beverage"),
  quantity: z.number().int("Whole number").positive("Must be greater than zero"),
});

/** Barman requests a warehouse → counter pull for admin approval. */
export function RequestTransferModal({
  open,
  onClose,
  items,
  presetItemId,
}: {
  open: boolean;
  onClose: () => void;
  items: Item[];
  presetItemId?: string;
}) {
  const createTransfer = useCreateTransfer();
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setItemId(presetItemId ?? "");
      setQuantity("");
      setNote("");
      setErrors({});
    }
  }, [open, presetItemId]);

  const selected = items.find((i) => i.id === itemId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qtyNum = Number(quantity);
    const parsed = schema.safeParse({ itemId, quantity: qtyNum });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }

    if (!selected) {
      setErrors({ itemId: "Select a beverage" });
      return;
    }

    if (selected.stock <= 0) {
      setErrors({
        quantity: `No warehouse stock available for "${selected.name}" (0 in warehouse). Stock must be received first.`,
      });
      return;
    }

    if (qtyNum > selected.stock) {
      setErrors({
        quantity: `Cannot request ${qtyNum} unit(s). Only ${selected.stock} available in warehouse.`,
      });
      return;
    }

    setErrors({});
    try {
      await createTransfer.mutateAsync({
        itemId,
        quantity: qtyNum,
        note: note.trim() || undefined,
      });
      onClose();
    } catch {
      /* toast handled in hook */
    }
  }

  const isWarehouseEmpty = selected ? selected.stock <= 0 : false;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request stock transfer"
      description="Ask an admin to move stock from the warehouse to the counter."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={createTransfer.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="transfer-form"
            loading={createTransfer.isPending}
            disabled={isWarehouseEmpty}
          >
            Send transfer request
          </Button>
        </>
      }
    >
      <form id="transfer-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {isWarehouseEmpty && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs font-semibold text-rose-800">
            ⚠️ Warehouse has 0 units of {selected?.name}. You cannot request a transfer until new stock is received into the warehouse.
          </div>
        )}

        <Field label="Beverage" htmlFor="t-item" error={errors.itemId}>
          <Select id="t-item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Select a beverage…</option>
            {items
              .filter((i) => i.isActive)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — warehouse {i.stock}{i.shotsPerUnit > 1 ? " btl" : ""}{i.stock <= 0 ? " (Empty)" : ""}, counter {i.counterStock}{i.shotsPerUnit > 1 ? ` shots (${i.shotsPerUnit} shots/btl)` : ""}
                </option>
              ))}
          </Select>
        </Field>
        <Field
          label={selected && selected.shotsPerUnit > 1 ? "Bottles to pull from warehouse" : "Quantity to move"}
          htmlFor="t-qty"
          error={errors.quantity}
          hint={
            selected
              ? selected.stock <= 0
                ? "Warehouse is completely empty (0 units)."
                : selected.shotsPerUnit > 1
                ? `Warehouse has ${selected.stock} bottle(s) available. Moving ${quantity || 1} bottle(s) will replenish counter with ${(Number(quantity) || 1) * selected.shotsPerUnit} shots.`
                : `Warehouse has ${selected.stock} available (max: ${selected.stock}).`
              : undefined
          }
        >
          <Input
            id="t-qty"
            type="number"
            min="1"
            max={selected ? Math.max(1, selected.stock) : undefined}
            step="1"
            disabled={isWarehouseEmpty}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={isWarehouseEmpty ? "0 available" : "1"}
          />
        </Field>
        <Field label="Note (optional)" htmlFor="t-note">
          <Textarea id="t-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. running low for the evening rush" />
        </Field>
      </form>
    </Modal>
  );
}
