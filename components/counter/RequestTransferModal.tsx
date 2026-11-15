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
    const parsed = schema.safeParse({ itemId, quantity: Number(quantity) });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      await createTransfer.mutateAsync({
        itemId,
        quantity: Number(quantity),
        note: note.trim() || undefined,
      });
      onClose();
    } catch {
      /* toast handled in hook */
    }
  }

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
          <Button type="submit" form="transfer-form" loading={createTransfer.isPending}>
            Send transfer request
          </Button>
        </>
      }
    >
      <form id="transfer-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Beverage" htmlFor="t-item" error={errors.itemId}>
          <Select id="t-item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">Select a beverage…</option>
            {items
              .filter((i) => i.isActive)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — warehouse {i.stock}, counter {i.counterStock}
                </option>
              ))}
          </Select>
        </Field>
        <Field
          label="Quantity to move"
          htmlFor="t-qty"
          error={errors.quantity}
          hint={selected ? `Warehouse has ${selected.stock} available.` : undefined}
        >
          <Input id="t-qty" type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
        </Field>
        <Field label="Note (optional)" htmlFor="t-note">
          <Textarea id="t-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. running low for the evening rush" />
        </Field>
      </form>
    </Modal>
  );
}
