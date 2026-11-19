"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Modal } from "@/components/ui/modal";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { useCreateItem, useUpdateItem } from "@/lib/hooks/useItems";
import { formatMoney } from "@/lib/utils";
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
  costPrice: z.number().nonnegative("Cost price cannot be negative").optional(),
  shotsPerUnit: z.number().int("Must be a whole number").positive("Must be at least 1").default(1),
  shotPrice: z.number().nonnegative("Shot price cannot be negative").optional(),
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
  const [costPrice, setCostPrice] = useState("");
  const [shotsPerUnit, setShotsPerUnit] = useState("1");
  const [shotPrice, setShotPrice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "");
      setCategory(item?.category ?? "Other");
      setPrice(item ? String(item.price) : "");
      setStock(item ? String(item.stock) : "");
      setCostPrice("");
      setShotsPerUnit(item?.shotsPerUnit ? String(item.shotsPerUnit) : "1");
      setShotPrice(item?.shotPrice ? String(item.shotPrice) : "");
      setErrors({});
    }
  }, [open, item]);

  const pending = createItem.isPending || updateItem.isPending;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numShots = Math.max(1, Number(shotsPerUnit) || 1);
    const parsedShotPrice = shotPrice
      ? Number(shotPrice)
      : numShots > 1 && price
      ? Math.round((Number(price) / numShots + Number.EPSILON) * 100) / 100
      : undefined;

    const values = {
      name: name.trim(),
      category: category.trim() || "Other",
      price: Number(price),
      stock: Number(stock),
      costPrice: costPrice ? Number(costPrice) : undefined,
      shotsPerUnit: numShots,
      shotPrice: parsedShotPrice,
    };

    if (isEdit) {
      const parsed = createSchema
        .pick({ name: true, category: true, price: true, shotsPerUnit: true, shotPrice: true })
        .safeParse(values);
      if (!parsed.success) return setFieldErrors(parsed.error);
      try {
        await updateItem.mutateAsync({
          id: item!.id,
          data: {
            name: values.name,
            category: values.category,
            price: values.price,
            shotsPerUnit: values.shotsPerUnit,
            shotPrice: values.shotPrice,
          },
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label={Number(shotsPerUnit) > 1 ? "Bottle / Bulk Selling Price (ETB)" : "Selling price (ETB)"}
            htmlFor="price"
            error={errors.price}
            hint={Number(shotsPerUnit) > 1 ? "Price for a full whole bottle." : "Price charged at POS."}
          >
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

          <Field
            label="Shots / Portions per Unit"
            htmlFor="shots"
            error={errors.shotsPerUnit}
            hint="1 for beers/sodas; 78 for whisky bottle."
          >
            <Input
              id="shots"
              type="number"
              min="1"
              step="1"
              value={shotsPerUnit}
              onChange={(e) => setShotsPerUnit(e.target.value)}
              placeholder="1"
            />
          </Field>
        </div>

        {Number(shotsPerUnit) > 1 && (
          <div className="rounded-xl border border-teal-200/90 bg-teal-50/70 p-3.5 space-y-2">
            <Field
              label="Selling Price per Shot (ETB)"
              htmlFor="shotPrice"
              error={errors.shotPrice}
              hint="Crucial: The exact price charged to customers when selling 1 shot at the counter."
            >
              <Input
                id="shotPrice"
                type="number"
                min="0"
                step="0.01"
                value={shotPrice}
                onChange={(e) => setShotPrice(e.target.value)}
                placeholder={
                  price && Number(shotsPerUnit) > 0
                    ? `Default: ${(Number(price) / Number(shotsPerUnit)).toFixed(2)}`
                    : "e.g. 100.00"
                }
              />
            </Field>
            {price && Number(shotsPerUnit) > 0 && (
              <p className="text-[11px] text-teal-800">
                💡 Formula: {formatMoney(Number(price))} bottle ÷ {shotsPerUnit} shots ={" "}
                <span className="font-bold">
                  {((Number(price) / Number(shotsPerUnit))).toFixed(2)} ETB
                </span>{" "}
                base per shot. You can override with a custom shot price above.
              </p>
            )}
          </div>
        )}

        {!isEdit && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 border-t border-slate-100 pt-3">
            <Field
              label="Opening warehouse stock"
              htmlFor="stock"
              error={errors.stock}
              hint="Initial bulk count in warehouse."
            >
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

            <Field
              label="Unit purchase cost (ETB)"
              htmlFor="costPrice"
              error={errors.costPrice}
              hint="Recorded as purchase receipt to track profit."
            >
              <Input
                id="costPrice"
                type="number"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder={price || "0.00"}
              />
            </Field>
          </div>
        )}
      </form>
    </Modal>
  );
}
