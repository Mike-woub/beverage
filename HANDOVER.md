# Handover — Beverage Inventory & Order Management

A note for the next engineer/agent. It explains **what** the app is, **how** it's
built, the **current state**, and the **gotchas** that will bite you if you don't
know them. Read `AGENTS.md` and `.agents/skills/fullstack-crud-flow/SKILL.md`
too — they are the house rules this project follows.

---

## 1. What this app does

A bar/restaurant beverage system that replaces manual handheld stock + ordering.
Three user roles:

- **ADMIN** — runs everything: beverages, warehouse stock, receipts, stock
  adjustments, approving transfers, users, settings, and all reports.
- **BARMAN** — takes orders at the counter (POS screen), sells from the
  **counter** stock, and requests stock transfers from the warehouse when low.
- **WAITER** — view-only: sees their own order history, nothing else. Orders are
  attributed to a waiter by the barman.

### The two-tier stock model (most important concept)

Every beverage (`Item`) has **two** stock pools:

- `stock` = **warehouse** (back store). Admin-only. Receipts and adjustments
  land here. It is the source for transfers.
- `counterStock` = **counter/bar**. What the barman sells from. **Orders deduct
  from `counterStock`, never from the warehouse.**

Stock only reaches the counter via an **admin-approved transfer**:
1. Barman creates a `TransferRequest` (PENDING) from the Counter Storage page.
2. Admin approves → atomic move: warehouse −qty, counter +qty, with
   `TRANSFER_OUT` + `TRANSFER_IN` movement records. Or admin rejects (no change).

So an order fails with 409 if the **counter** is short, even when the warehouse
is full — the barman must get a transfer approved first.

### Order rules

- Orders are taken by BARMAN (or ADMIN) and **attributed to a WAITER**
  (`Order.userId` = waiter; `Order.placedById` = operator who entered it).
- BARMAN **must** pick a waiter (no "self"); ADMIN may pick a waiter or default
  to themselves. Quick 1-tap waiter selection chips are available on the POS.
- Fast POS order flow: 1-click direct order submission (`Place Order · [Total]`)
  with horizontal category filters (`All`, `Beer`, `Soft Drinks`, `Hot Drinks`, `Water & Juice`, `Other`).
- Totals are always recomputed on the server from DB prices. Historical prices
  are snapshotted on `OrderItem` (`unitPrice`/`subtotal`).
- **Order Voiding (`VOID_IN`)**: Admins can void mistaken orders with a mandatory
  audit reason. Counter stock is restored atomically via row locks, movements are
  logged with `VOID_IN`, and voided orders are automatically excluded from revenue,
  waiter sales, and top items.

### Reporting & Shift Settlement (admin)

- **Revenue Analytics**: daily totals (selectable 7/30/90 days window) with daily
  totals table and ETB trend charts.
- **Sales by Waiter**: per-waiter totals, filterable by a single day (default
  today) or all-time. Clicking any waiter opens an itemized modal of beverages sold
  sorted by date/revenue/quantity.
- **End of Shift Report (Z-Report)** (`/shift-report`): Daily settlement reconciling
  total revenue, units sold, average ticket, voided order totals, waiter settlement
  (with click-to-view itemized breakdown), and beverage consumption. Supports CSV export
  and printable report format.
- **Price history**: every selling-price change is logged (`PriceHistory`).
- All day-grouping uses the **Africa/Addis_Ababa** business day, not UTC.
- **Sidebar Notification Pill**: Live pulsing amber counter badge next to "Stock Transfers"
  alerts admins and staff whenever pending transfers await approval.

---

## 2. Tech stack & architecture

- **Next.js 16.4.5** (App Router, Turbopack), **React 19**, **TypeScript strict**.
  ⚠️ This is Next 16 with breaking changes — see `AGENTS.md`. Dynamic route
  params are a **Promise** (`ctx.params` must be awaited). `next.config.ts` has
  `cacheComponents: true`, which **forbids `export const dynamic` in route
  handlers** (don't add it — it fails the build).
- **PostgreSQL** + **Prisma 6.2.1**. Code lives at **root level** (`app/`,
  `lib/`, `server/`, `prisma/`, `types/`) — the `@/*` alias maps to the project
  root. There is **no `src/` directory**; don't introduce one.
- **NextAuth v4** (Credentials + JWT) for auth.
- **Tailwind v4**, **zod**, **react-hook-form** (available), **lucide-react**
  (icons), **recharts** (charts), **sonner** (toasts), **@tanstack/react-query**
  (installed — see the caveat in §5).

### Layered data flow (strict — from the house skill)

```
DB ── Prisma ── server/services/* ── app/api/v1/* (Route Handler)
                                           │
   UI component ── lib/hooks/use*.ts ── lib/services/*.service.ts ── lib/api/client.ts (fetch)
```

- **UI never calls fetch directly.** Components use `lib/hooks/use*` hooks.
- `lib/services/*.service.ts` = thin HTTP calls via `lib/api/client.ts`
  (a small fetch wrapper; baseURL `/api/v1`).
- `server/services/*` = **all business logic + transactions** (the single source
  of truth). Route handlers are thin: auth-check → zod-validate → call service.
- Authorization is re-checked in **every** route handler via `server/http.ts`
  (`requireAuth` / `requireRole`), reading the role from the signed JWT. Never
  trust the client for role.

### Key directories

- `prisma/schema.prisma` — the data contract. `prisma/migrations/` — SQL
  migrations (some are hand-authored; see §5). `prisma/seed.ts` — seed.
- `server/services/` — `order`, `item`, `inventory`, `transfer`, `user`,
  `dashboard` services. `server/http.ts` — auth guards + JSON helpers + error
  shaping.
- `app/api/v1/*` — REST route handlers. `app/api/auth/[...nextauth]` — NextAuth.
- `app/(auth)/login`, `app/(dashboard)/*` — pages. The dashboard segment layout
  (`app/(dashboard)/layout.tsx`) guards the session and role-gates each segment,
  redirecting via `homeRouteFor(role)`.
- `lib/auth/session.tsx` — client session context + `ROLE_ACCESS` RBAC matrix +
  `homeRouteFor`. `lib/auth.ts` — NextAuth `authOptions`.
- `lib/query/query-client.tsx` — a **custom** TanStack-Query-shaped cache (see §5).
- `lib/types/index.ts` — shared DTO/entity types. `lib/validations/schemas.ts` —
  zod request schemas. `lib/utils.ts` — money/date/day-label helpers (Addis TZ).
- `components/` — `ui/` primitives (hand-built, not shadcn), `layout/Sidebar`,
  `dashboard/`, `inventory/`, `orders/`, `counter/`, `users/`, `shared/`.

### Data model (Prisma)

`User` (role: ADMIN|BARMAN|WAITER) · `Item` (price, `stock`=warehouse,
`counterStock`=counter) · `Order` (+`placedById`, no status) · `OrderItem`
(price snapshot) · `StockReceipt` (warehouse in) · `StockMovement`
(ORDER_OUT / RECEIPT_IN / ADJUSTMENT_IN|OUT / TRANSFER_OUT|IN; immutable audit) ·
`TransferRequest` (PENDING|APPROVED|REJECTED) · `PriceHistory` ·
`InventorySetting` (singleton, `lowStockThreshold`, default 10).

Concurrency: order submission and transfer approval use **interactive
transactions with `SELECT … FOR UPDATE`** (raw SQL, since Prisma has no row-lock
API) plus atomic conditional updates, so concurrent operations can't drive stock
negative. DB `CHECK` constraints enforce `price/stock/counterStock >= 0`.

---

## 3. Current progress — DONE and working

- ✅ Full schema + migrations applied to local Postgres; seed works.
- ✅ Auth (NextAuth credentials + JWT), RBAC enforced server-side and in the UI.
- ✅ Beverage CRUD, warehouse receipts, pool-aware stock adjustments, immutable
  movement audit trail.
- ✅ Two-tier stock + transfer-request/approval flow (admin approves; atomic
  move; barman blocked from approving).
- ✅ POS ordering (counter-stock-capped, review+confirm, auto-complete,
  on-behalf-of-waiter).
- ✅ Waiter view-only "My Orders" grouped by day.
- ✅ Admin reports: Revenue (daily), Sales by Waiter (day filter), price history.
- ✅ Dashboard with warehouse/counter stock split, low/out counts per pool,
  pending-transfer count, recent orders, top items, charts.
- ✅ Realtime UI refresh: mutations invalidate query keys and the custom cache
  **actively refetches mounted queries** (this was a real bug, now fixed).
- ✅ `tsc --noEmit` passes; `next build` passes (35 routes).

### Verified live (API smoke tests, since removed)

Login per role; order attribution; counter-insufficient order blocked (409);
barman transfer request → admin approve moves stock atomically → subsequent order
deducts counter only; barman approve blocked (403); daily revenue + sales-by-day
aggregation; stock decrement reflected on refetch.

### Seed accounts (dev only — `ChangeMe123!`)

`admin` (ADMIN) · `barman` (BARMAN) · `waiter`, `sara` (WAITER). Change these
before any real use; `ADMIN_USERNAME`/`ADMIN_PASSWORD` come from `.env`.

---

## 4. How to run

Prereqs: Node 20+ (validated on 24), local PostgreSQL, a reachable npm registry.

```powershell
# 1. Install deps (see §5 registry/TLS caveats if it hangs)
npm install

# 2. Point DATABASE_URL in .env at your local Postgres (see .env.example).

# 3. Apply schema + generate client + seed. On Windows, invoke node CLIs
#    directly (npm/npx .ps1 shims are blocked by execution policy):
node node_modules/prisma/build/index.js migrate deploy
node node_modules/prisma/build/index.js generate
node node_modules/tsx/dist/cli.mjs prisma/seed.ts

# 4. Dev server
npm run dev   # http://localhost:3000
```

Type-check: `node node_modules/typescript/bin/tsc --noEmit`.
Build: `node node_modules/next/dist/bin/next build`.

---

## 5. Gotchas / things that WILL trip you up

1. **Windows Prisma engine lock (EPERM on generate).** A running `next dev`
   locks `query_engine-windows.dll.node`. If `prisma generate` fails with
   `EPERM: rename …`, **stop every `next dev`/`next start` process first**, then
   regenerate. This recurs constantly; it's the #1 time-sink.

2. **`prisma migrate dev` is interactive and refuses non-interactive shells**
   when a change triggers a warning (e.g. dropping an enum value). This repo's
   enum changes were handled by **hand-authoring `migration.sql`** in a new
   `prisma/migrations/<ts>_<name>/` folder and applying with
   `prisma migrate deploy`. If you change enums/columns destructively and the DB
   has disposable data, `migrate reset --force --skip-seed --skip-generate`
   first, then write the SQL, then `migrate deploy`. Keep schema.prisma and the
   SQL in sync by hand.

3. **Cache Components forbids `export const dynamic` in route handlers.** Don't
   add it; the build fails. Handlers are dynamic at request time anyway.

4. **Stale `.next` after deleting/renaming routes.** `.next/types/**` and
   `.next/dev/types/**` validators reference old route files and make `tsc`/
   `build` fail with "Cannot find module …/route.js". Fix: `Remove-Item -Recurse
   -Force .next` then rebuild.

5. **The query cache is a custom shim, not real TanStack Query.** See
   `lib/query/query-client.tsx`. It mimics `useQuery`/`useMutation`/invalidation.
   `@tanstack/react-query` is installed but **not wired in** — the shim predates
   the install and was kept because it works and the swap is mechanical. If you
   migrate: the hook shapes already match; swap imports and mount a real
   `QueryClientProvider`. Invalidation keys in mutations (e.g. `["items",
   "dashboard", "transfers", "movements"]`) are what drive realtime refresh —
   keep them accurate when adding mutations, or the UI shows stale data.

6. **UI primitives are hand-built, not shadcn/ui** (`components/ui/`). shadcn was
   never initialized. Icons are lucide, charts recharts, toasts sonner.

7. **`.npmrc` + registry.** The machine's default npm registry
   (`registry.safaricomet.net`) may be unreachable off the corp network, and the
   public registry has been intermittently blocked / TLS-intercepted here. If
   installs hang: check `.npmrc`, and if you hit `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`,
   prefer `NODE_EXTRA_CA_CERTS=<corp-ca.pem>` over disabling TLS.

8. **Timezone.** Store UTC; all "by day" grouping/labels use Africa/Addis_Ababa
   (UTC+3, no DST). Helpers: `addisDayKey`/`addisDayRangeUtc` (server,
   `order.service.ts`), `todayAddisKey`/`formatDayLabel` (client, `utils.ts`).

9. **`AGENTS.md` block is re-added by `next dev`.** The `nextjs-agent-rules`
   block in `AGENTS.md` is regenerated; committing it with your work keeps the
   tree clean. Don't fight it.

---

## 6. Known gaps / possible next steps

- No automated test suite yet (spec asked for auth/RBAC/order/concurrency tests).
  Verification so far was manual API smoke tests.
- `@tanstack/react-query` / shadcn are installed but unused — migrate if desired
  (§5.5, §5.6).
- Transfer requests have no "cancel by requester" or edit flow — only
  admin approve/reject.
- `lib/api/mock-db.ts` was removed; everything is live against Postgres now.
- Production hardening (rate limiting, real `NEXTAUTH_SECRET`, non-dev admin
  credentials, immutability DB triggers for movements) is not done.
