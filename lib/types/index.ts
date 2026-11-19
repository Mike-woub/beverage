/**
 * Shared domain types for the Beverage Inventory & Order Management UI.
 *
 * These mirror the Prisma models defined in prisma/schema.prisma and act as the
 * UI-side contract. Following the fullstack-crud-flow skill's
 * lib/types/<feature>.types.ts convention, each feature's Entity + DTO types
 * live here (consolidated into one module for this app).
 *
 * Money values are represented as `number` on the client for display/arithmetic
 * convenience; the server remains the source of truth and recomputes all totals
 * using Decimal(12,2). Never treat client-side money math as authoritative.
 */

export type Role = "ADMIN" | "BARMAN" | "WAITER";

export type MovementType =
  | "ORDER_OUT"
  | "RECEIPT_IN"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "VOID_IN";

export type TransferStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface User {
  id: string;
  username: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  username: string;
  role: Role;
}

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface Item {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number; // warehouse
  counterStock: number; // bar/counter — what orders sell from
  shotsPerUnit: number; // portions/shots per bulk unit (default 1)
  shotPrice?: number | null; // selling price per shot at counter
  physicalCount?: number | null; // last physically checked count
  lastPhysicalCheckAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransferRequest {
  id: string;
  itemId: string;
  itemName: string;
  shotsPerUnit?: number;
  quantity: number;
  status: TransferStatus;
  note?: string | null;
  requestedBy: string;
  decidedBy?: string | null;
  createdAt: string;
  decidedAt?: string | null;
}

export interface CreateTransferDTO {
  itemId: string;
  quantity: number;
  note?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  waiterName: string;
  totalAmount: number;
  itemCount: number;
  itemsSummary?: string;
  isVoided: boolean;
  voidReason?: string | null;
  voidedAt?: string | null;
  voidedByName?: string | null;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StockReceipt {
  id: string;
  itemId: string;
  itemName: string;
  userId: string;
  userName: string;
  quantity: number;
  unitCost: number;
  description?: string | null;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  userId: string;
  userName: string;
  movementType: MovementType;
  quantity: number;
  description?: string | null;
  relatedOrderNumber?: string | null;
  relatedReceiptId?: string | null;
  createdAt: string;
}

export interface InventorySetting {
  id: string;
  lowStockThreshold: number;
  updatedAt: string;
}

/* ------------------------- DTOs (create / update) ------------------------- */

export interface LoginDTO {
  username: string;
  password: string;
}

export interface CreateItemDTO {
  name: string;
  category?: string;
  price: number;
  stock: number;
  costPrice?: number;
  shotsPerUnit?: number;
  shotPrice?: number;
}
export interface UpdateItemDTO {
  name?: string;
  category?: string;
  price?: number;
  shotsPerUnit?: number;
  shotPrice?: number | null;
  physicalCount?: number | null;
}

export interface VoidOrderDTO {
  reason: string;
}

export interface ShiftReport {
  day: string;
  totalSales: number;
  orderCount: number;
  totalUnitsSold: number;
  averageOrderValue: number;
  voidedOrdersCount: number;
  voidedOrdersTotal: number;
  waiters: Array<{
    waiterId: string;
    waiterName: string;
    orderCount: number;
    totalSales: number;
    revenueShare: number;
    averageOrderValue: number;
  }>;
  beverages: Array<{
    itemId: string;
    itemName: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalRevenue: number;
    revenueShare: number;
  }>;
}

export interface CreateUserDTO {
  username: string;
  password: string;
  role: Role;
}
export interface UpdateUserDTO {
  username?: string;
  role?: Role;
  password?: string;
}

export interface OrderLineInput {
  itemId: string;
  quantity: number;
}
export interface CreateOrderDTO {
  items: OrderLineInput[];
  // Optional "order on behalf of" — the waiter the order is attributed to.
  waiterId?: string;
}

export interface WaiterOption {
  id: string;
  username: string;
}

export interface SalesByWaiter {
  waiterId: string;
  waiterName: string;
  orderCount: number;
  totalSales: number;
}

export interface WaiterSoldItem {
  itemId: string;
  itemName: string;
  quantity: number;
  totalAmount: number;
  revenueShare: number;
  lastSoldDate?: string;
}

export interface WaiterSaleEvent {
  id: string;
  orderId: string;
  date: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  revenueShare: number;
}

export interface WaiterSalesDetailOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: number;
  itemCount: number;
  itemsSummary?: string;
  items: {
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
}

export interface WaiterSalesDetail {
  waiter: {
    id: string;
    username: string;
  };
  day: string | null;
  orderCount: number;
  totalSales: number;
  totalUnitsSold: number;
  sales: WaiterSaleEvent[];
  items: WaiterSoldItem[];
  orders: WaiterSalesDetailOrder[];
}

export interface DailyRevenue {
  day: string; // YYYY-MM-DD (Africa/Addis_Ababa)
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  orderCount: number;
}

export interface OrderDayGroup {
  day: string; // YYYY-MM-DD (Africa/Addis_Ababa)
  dayTotal: number;
  orders: Order[];
}

export interface PriceHistoryEntry {
  id: string;
  itemId: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  createdAt: string;
}

export interface CreateReceiptDTO {
  itemId: string;
  quantity: number;
  unitCost: number;
  description?: string;
}

export interface CreateAdjustmentDTO {
  itemId: string;
  pool: "WAREHOUSE" | "COUNTER";
  direction: "IN" | "OUT";
  quantity: number;
  reason: string;
}

/* ------------------------------- Dashboard ------------------------------- */

export interface DashboardSummary {
  totalBeverages: number;
  warehouseStock: number;
  counterStock: number;
  ordersToday: number;
  orderValueToday: number;
  // Low/out counts split by pool.
  warehouseLowCount: number;
  warehouseOutCount: number;
  counterLowCount: number;
  counterOutCount: number;
  pendingTransfers: number;
}

export interface TopItem {
  itemId: string;
  itemName: string;
  quantitySold: number;
}

export interface InventoryDistribution {
  itemId: string;
  itemName: string;
  stock: number;
}

/* ------------------------------- API shapes ------------------------------ */

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  status?: number;
}
