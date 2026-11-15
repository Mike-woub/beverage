import { z } from "zod";

/**
 * Zod request schemas. Route Handlers validate every incoming body against these
 * before touching the service layer. Money/quantities are coerced from JSON
 * numbers; the server remains authoritative for all totals.
 */

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  category: z.string().min(1).max(50).optional(),
  price: z.number().nonnegative("Price cannot be negative"),
  stock: z.number().int("Stock must be a whole number").nonnegative("Stock cannot be negative"),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  category: z.string().min(1).max(50).optional(),
  price: z.number().nonnegative("Price cannot be negative").optional(),
});

export const voidOrderSchema = z.object({
  reason: z.string().min(1, "A reason is required to void this order").max(500),
});

export const itemStatusSchema = z.object({
  isActive: z.boolean(),
});

export const createOrderSchema = z.object({
  // Optional "order on behalf of" — the waiter the order is attributed to.
  // When omitted, the order is attributed to the logged-in user.
  waiterId: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        quantity: z.number().int().positive("Quantity must be greater than zero"),
      }),
    )
    .min(1, "An order must contain at least one beverage"),
});

export const createReceiptSchema = z.object({
  itemId: z.string().min(1, "Select a beverage"),
  quantity: z.number().int().positive("Quantity must be greater than zero"),
  unitCost: z.number().nonnegative("Unit cost cannot be negative"),
  description: z.string().max(500).optional(),
});

export const createAdjustmentSchema = z.object({
  itemId: z.string().min(1, "Select a beverage"),
  // Which stock pool to adjust: warehouse (default) or counter.
  pool: z.enum(["WAREHOUSE", "COUNTER"]).default("WAREHOUSE"),
  direction: z.enum(["IN", "OUT"]),
  quantity: z.number().int().positive("Quantity must be greater than zero"),
  reason: z.string().min(1, "A reason is required"),
});

export const createTransferSchema = z.object({
  itemId: z.string().min(1, "Select a beverage"),
  quantity: z.number().int().positive("Quantity must be greater than zero"),
  note: z.string().max(500).optional(),
});

export const updateSettingSchema = z.object({
  lowStockThreshold: z.number().int().nonnegative("Threshold cannot be negative"),
});

export const createUserSchema = z.object({
  username: z.string().min(1, "Username is required").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "BARMAN", "WAITER"]),
});

export const updateUserSchema = z.object({
  username: z.string().min(1).max(50).optional(),
  role: z.enum(["ADMIN", "BARMAN", "WAITER"]).optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export const userStatusSchema = z.object({
  isActive: z.boolean(),
});
