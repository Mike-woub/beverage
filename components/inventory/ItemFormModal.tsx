"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { useCreateItem, useUpdateItem } from "@/lib/hooks/useItems";
import type { Item } from "@/lib/types";

const CATEGORIES = [
  "Beer",
  "Soft Drinks",
  "Hot Drinks",
  "Water & Juice",
  "Spirits",
  "Wine",
  "Other",
];

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  category: z.string().min(1).max(50).default("Other"),
  price: z.number().nonnegative("Price cannot be negative"),
  stock: z.number().int("Must be a whole number").nonnegative("Stock cannot be negative"),
});

export function ItemFormModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item?: Item | null;
}) {
  const isEdit = !!item;
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "");
      setCategory(item?.category ?? "Other");
      setPrice(item ? String(item.price) : "");
      setStock(item ? String(item.stock) : "");
      setErrors({});
    }
  }, [open, item]);

  const pending = createItem.isPending || updateItem.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const values = {
      name: name.trim(),
      category: category.trim() || "Other",
      price: Number(price),
      stock: Number(stock),
    };

    if (isEdit) {
      const parsed = createSchema.pick({ name: true, category: true, price: true }).safeParse(values);
      if (!parsed.success) return setFieldErrors(parsed.error);
      try {
        await updateItem.mutateAsync({
          id: item!.id,
          data: { name: values.name, category: values.category, price: values.price },
        });
        onClose();
      } catch {
        /* toast handled in hook */
      }
      return;
    }

    const parsed = createSchema.safeParse(values);
    if (!parsed.success) return setFieldErrors(parsed.error);
    try {
      await createItem.mutateAsync(values);
      onClose();
    } catch {
      /* toast handled in hook */
    }
  }

  function setFieldErrors(err: z.ZodError) {
    const next: Record<string, string> = {};
    for (const issue of err.issues) next[String(issue.path[0])] = issue.message;
    setErrors(next);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit beverage" : "Add beverage"}
      description={
        isEdit
          ? "Update the name, category, or selling price. Stock changes go through receipts and adjustments."
          : "Create a new beverage with its category, selling price, and opening warehouse stock."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="item-form" loading={pending}>
            {isEdit ? "Save changes" : "Add beverage"}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Beverage name" htmlFor="name" error={errors.name}>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Coca-Cola" />
        </Field>
        <Field label="Category" htmlFor="category" error={errors.category}>
          <Select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Selling price (ETB)" htmlFor="price" error={errors.price}>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        {!isEdit && (
          <Field label="Opening stock" htmlFor="stock" error={errors.stock} hint="Recorded as an initial stock-in movement.">
            <Input
              id="stock"
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}
