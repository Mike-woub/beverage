# Beverage Inventory & Order Management — Phase 1 Design (Foundation)

## Overview

Phase 1 locks the **data contract** every later phase depends on: the complete Prisma schema, the duplicate-movement-prevention strategy, the dependency set with pinned versions, local Postgres via Docker Compose, the Prisma client singleton, a deterministic seed, and the npm scripts. No feature code (auth, APIs, UI) is written in this phase — only the foundation that makes those phases possible without re-litigating the schema.

The project is a **fresh Next.js 16.4.5 scaffold** (React 19.3, App Router, TypeScript strict). Code lives at **root level** (`app/`, `lib/`, `prisma/`, `server/`, `types/`) because the `@/*` tsconfig alias maps to the project root (`"@/*": ["./*"]`). **There is no `src/` directory** and one must not be introduced — the spec's suggested `src/` layout is re-mapped to root-level throughout. The house skill (`fullstack-crud-flow`) governs file layout and the layered data flow (DB → Prisma → API route → api/axios → service → TanStack hook → UI) and auth shape (NextAuth v4 Credentials + JWT); its conventions are adopted wherever they do not conflict with the spec. Where they conflict, the spec's business rules win.

### Locked technology stack (Phase 1 relevant)

- **Next.js 16.4.5**, App Router, TypeScript strict. Dynamic route params are a `Promise` (`await params`) — relevant to later phases, noted here so the contract is clear.
- **PostgreSQL** (Docker Compose for local dev) + **Prisma ORM** (`prisma` CLI + `@prisma/client`).
- **ID strategy: `cuid()`** for every model's primary key (see decision below). Locked and consistent across all models.
- **Money as Prisma `Decimal`** (`@db.Decimal(12, 2)`), **counts as `Int`**.

## ID strategy decision: `cuid()` (not autoincrement, not uuid)

The house skill uses `Int @id @default(autoincrement())`. The spec is domain-driven (users, orders, movements) where **non-enumerable, non-guessable** identifiers matter: an autoincrement `orderId` leaks order volume and invites IDOR probing of other waiters' orders. Between the two collision-resistant options, **`cuid()` is chosen over `uuid()`** because it is shorter, URL-safe without hyphen handling, monotonic-ish (better index locality than random v4 UUIDs), and is Prisma's idiomatic default. This is a deliberate, documented deviation from the skill's autoincrement convention, justified by the security/privacy requirements of the order domain. All ids are `String`. The skill's "api/service/hook treat ids as string" convention already fits string ids cleanly; the only skill snippet that must adapt is `parseInt(id)` in route handlers — with cuid string ids, routes use the `id` string directly (no `parseInt`). This is noted for later phases.

## Duplicate stock-movement prevention (the critical invariant)

A `StockMovement` row is the immutable audit record of a single stock change. Two classes of double-processing must be impossible at the **database** level (not just application level), because the enforcement owner for "a receipt/order-item is processed at most once per movement type" is the **DB unique constraint** — the app layer's transaction logic can have bugs or race, so the last line of defense is a constraint the database enforces unconditionally.

Decision — **composite partial-style uniqueness keyed by `(sourceFK, movementType)`**:

- `@@unique([orderItemId, movementType])` — an order item may legitimately generate **two** movements over its lifetime: one `ORDER_OUT` at submit and one `ORDER_CANCEL_IN` at cancel. A plain `@@unique([orderItemId])` would wrongly forbid the cancel movement. Keying on `(orderItemId, movementType)` allows exactly one of each type per order item, so a resubmitted deduction or a double-cancel restoration both violate the constraint and throw. NULL `orderItemId` rows (receipts, adjustments) are exempt because Postgres treats NULLs as distinct in a composite unique index — multiple receipt/adjustment movements coexist freely.
- `@@unique([stockReceiptId, movementType])` — a stock receipt generates exactly one `RECEIPT_IN`. Keying on `(stockReceiptId, movementType)` guarantees a receipt cannot be posted twice. (Keying on `stockReceiptId` alone would also work since a receipt only ever yields `RECEIPT_IN`, but the `(fk, movementType)` form is used for symmetry with the order-item rule and to stay correct if a future phase ever attaches another movement type to a receipt.)

Adjustment movements (`ADJUSTMENT_IN` / `ADJUSTMENT_OUT`) have **both** FKs NULL and are intentionally **not** uniqueness-constrained — a storekeeper may legitimately make many adjustments to the same item. Their integrity is owned by the application/service layer (every adjustment requires a reason and is wrapped in a transaction), which is acceptable because adjustments are manual, audited, deliberate acts rather than idempotency-sensitive automated flows. This split is stated explicitly in a schema comment.

## Final `prisma/schema.prisma` (the contract — copy verbatim)

```prisma
// Beverage Inventory & Order Management — Phase 1 schema (LOCKED CONTRACT)
// ID strategy: cuid() on every model (collision-resistant, URL-safe, good index locality).
// Money: Decimal(12,2). Counts: Int.

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  WAITER
  STOREKEEPER
}

enum OrderStatus {
  SUBMITTED
  COMPLETED
  CANCELLED
}

enum MovementType {
  ORDER_OUT
  ORDER_CANCEL_IN
  RECEIPT_IN
  ADJUSTMENT_IN
  ADJUSTMENT_OUT
}

model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  role         Role
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  orders         Order[]
  stockReceipts  StockReceipt[]
  stockMovements StockMovement[]
}

model Item {
  id        String   @id @default(cuid())
  name      String   @unique
  // price must be >= 0: enforced in app (Zod) + DB CHECK in the Phase 1 initial migration.
  price     Decimal  @db.Decimal(12, 2)
  // stock must be >= 0: enforced in app (conditional update) + DB CHECK in the Phase 1 initial migration.
  stock     Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  orderItems     OrderItem[]
  stockReceipts  StockReceipt[]
  stockMovements StockMovement[]

  @@index([isActive])
}

model Order {
  id          String      @id @default(cuid())
  orderNumber String      @unique
  userId      String
  totalAmount Decimal     @db.Decimal(12, 2)
  status      OrderStatus @default(SUBMITTED)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user       User        @relation(fields: [userId], references: [id])
  orderItems OrderItem[]

  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

model OrderItem {
  id        String   @id @default(cuid())
  orderId   String
  itemId    String
  quantity  Int
  // Historical price capture: unitPrice/subtotal are snapshotted at order time,
  // never derived live from Item.price (preserves historical pricing per spec).
  unitPrice Decimal  @db.Decimal(12, 2)
  subtotal  Decimal  @db.Decimal(12, 2)
  createdAt DateTime @default(now())

  order          Order           @relation(fields: [orderId], references: [id])
  item           Item            @relation(fields: [itemId], references: [id])
  stockMovements StockMovement[]

  // Each beverage appears once per order.
  @@unique([orderId, itemId])
  // NOTE: @@index([orderId]) is mandated by acceptance criterion #3. It is
  // technically redundant with @@unique([orderId, itemId]) — Postgres backs the
  // composite unique with a btree index led by orderId, which already serves
  // orderId-only lookups. It is kept deliberately (per the criterion), not by
  // mistake; the extra write cost is negligible for this workload.
  @@index([orderId])
  @@index([itemId])
}

model StockReceipt {
  id        String   @id @default(cuid())
  itemId    String
  userId    String
  quantity  Int
  unitCost  Decimal  @db.Decimal(12, 2)
  createdAt DateTime @default(now())

  item           Item            @relation(fields: [itemId], references: [id])
  user           User            @relation(fields: [userId], references: [id])
  stockMovements StockMovement[]

  @@index([itemId])
  @@index([userId])
}

model StockMovement {
  id             String       @id @default(cuid())
  itemId         String
  orderItemId    String?
  stockReceiptId String?
  userId         String
  movementType   MovementType
  quantity       Int
  description    String?
  createdAt      DateTime     @default(now())

  item         Item          @relation(fields: [itemId], references: [id])
  orderItem    OrderItem?    @relation(fields: [orderItemId], references: [id])
  stockReceipt StockReceipt? @relation(fields: [stockReceiptId], references: [id])
  user         User          @relation(fields: [userId], references: [id])

  // Duplicate-movement prevention (DB is the enforcement owner):
  //  - one ORDER_OUT and one ORDER_CANCEL_IN allowed per order item, no more.
  //  - one RECEIPT_IN allowed per receipt, no more.
  //  - NULLs are distinct in Postgres composite unique indexes, so adjustment
  //    movements (both FKs NULL) are intentionally unconstrained.
  @@unique([orderItemId, movementType])
  @@unique([stockReceiptId, movementType])
  @@index([itemId])
  @@index([userId])
  @@index([createdAt])
  @@index([movementType])
}

model InventorySetting {
  // Singleton: enforced by a fixed primary key value ("singleton") written by seed;
  // the app always reads/writes id = "singleton".
  id                String   @id @default("singleton")
  lowStockThreshold Int      @default(10)
  updatedAt         DateTime @updatedAt
}
```

### Schema notes

- **Non-negative price/stock** cannot be expressed natively in Prisma schema. Enforcement is layered: Zod validation at the API boundary (later phases), atomic conditional updates in the order/adjustment transactions (stock never read-then-written unprotected; later phases), **and** a DB-level guard as `CHECK` constraints (`Item.price >= 0`, `Item.stock >= 0`). These CHECKs are added to the **Phase 1 initial migration** (see the migration decision below) via a trailing raw-SQL block, so the DB is the final owner of the invariant from day one — not deferred.
- **InventorySetting singleton**: modeled with a fixed default id `"singleton"`. The seed upserts exactly one row; the app layer always targets `id: "singleton"`. This is the chosen approach over a `@@unique` boolean flag because it needs no extra column and makes the target key a constant.
- **Immutability of movements/receipts** is a convention (no update/delete code paths in services), not a DB trigger, in Phase 1 — documented as deferred-hardening.

## Phase 1 migration decision — Phase 1 owns the initial migration

Phase 1 **owns and runs the initial migration** (`prisma migrate dev --name init`, or the node-CLI equivalent `node node_modules/prisma/build/index.js migrate dev --name init`). This is a deliberate decision, not deferred: the Phase 1 acceptance criteria require `tsx prisma/seed.ts` to upsert rows, and a seed can only `INSERT`/`upsert` against tables that exist — which requires the schema to be materialized in the database first. Deferring the migration while keeping the seed in Phase 1 would be internally contradictory, so the base migration lands here.

Decision on the non-negative `CHECK` constraints: they are **folded into this same initial migration**, not split into a follow-up. The generated `migration.sql` creates the tables, enums, uniques, and indexes from the locked schema; a trailing raw-SQL block in that same migration adds:

```sql
ALTER TABLE "Item" ADD CONSTRAINT "Item_price_nonneg" CHECK ("price" >= 0);
ALTER TABLE "Item" ADD CONSTRAINT "Item_stock_nonneg" CHECK ("stock" >= 0);
```

This keeps the DB as the owner of the non-negative invariant from the very first migration, rather than leaving a window where the schema exists without the guard. Because this is a **brand-new** database (not the drifted DB the house skill warns about), `prisma migrate dev` is safe to run normally here — the skill's hand-maintained-idempotent-SQL caveat does not apply. Only **further** DB hardening (immutability triggers) remains deferred; the base migration and its CHECK constraints are Phase 1 deliverables.

## Phase 1 dependency list (version pins)

Runtime `dependencies` to add (exact/compatible pins chosen for Next 16 / React 19):

| Package | Pin | Purpose |
|---|---|---|
| `@prisma/client` | `6.2.1` | Generated Prisma client (runtime). |
| `bcryptjs` | `2.4.3` | Password hashing. **Intentionally** lands in Phase 1 (ahead of the auth phase) because the seed must store real bcrypt hashes for its dev users — a seed that wrote plaintext or placeholder hashes would be unusable once the auth phase verifies with `bcrypt.compare`. The rest of auth (NextAuth, session, role gating) stays deferred. |

Dev `devDependencies` to add:

| Package | Pin | Purpose |
|---|---|---|
| `prisma` | `6.2.1` | Prisma CLI (generate, migrate, seed). Must match `@prisma/client`. |
| `tsx` | `4.19.2` | Run `prisma/seed.ts` (TypeScript seed) without a build step. |
| `@types/bcryptjs` | `2.4.6` | Types for bcryptjs. |

Prisma 6.x is pinned (not 5.x as the skill header says) because Prisma 6 is the current line with first-class support for Node/Next 16 and React 19 toolchains; CLI and client versions are pinned **identically** to avoid engine/client mismatch. Later phases add NextAuth v4, TanStack Query v5, axios, zod, react-hook-form, shadcn/ui, lucide-react, recharts, sonner — **not installed in Phase 1**.

## Environment variables — `.env.example`

```
# PostgreSQL connection (Docker Compose service below)
DATABASE_URL="postgresql://beverage:beverage@localhost:5432/beverage?schema=public"

# NextAuth (consumed in the auth phase; declared now so the contract is complete)
NEXTAUTH_SECRET="replace-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

`.env.example` is committed; a developer copies it to `.env` (git-ignored). Phase 1 only needs `DATABASE_URL`; the NextAuth vars are declared for forward completeness.

## `docker-compose.yml` service shape

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: beverage-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: beverage
      POSTGRES_PASSWORD: beverage
      POSTGRES_DB: beverage
    ports:
      - "5432:5432"
    volumes:
      - beverage-pgdata:/var/lib/postgresql/data

volumes:
  beverage-pgdata:
```

The credentials and database name line up exactly with `DATABASE_URL`. A named volume persists data across restarts; Postgres 16 matches the engine the schema targets.

## `lib/prisma.ts` singleton shape

Per the house skill — one client, cached on `global` in dev to survive HMR:

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

Imported elsewhere as `@/lib/prisma` (root-level alias).

## `prisma/seed.ts` plan

A deterministic, **idempotent** seed (safe to re-run) run via `tsx`:

1. **InventorySetting** — `upsert` the singleton row (`where: { id: "singleton" }`, `update: {}`, `create: { id: "singleton", lowStockThreshold: 10 }`).
2. **Users** — `upsert` by unique `username` one of each role: `admin` (ADMIN), `waiter` (WAITER), `store` (STOREKEEPER), each with a bcrypt-hashed dev password (e.g. `ChangeMe123!`, hashed at runtime with `bcryptjs`). Document that these are dev-only credentials.
3. **Items** — `upsert` by unique `name` a handful of beverages (e.g. Coca-Cola, Sprite, Water, Coffee) with `price` and starting `stock`, `isActive: true`. No orders/receipts/movements are seeded (those are exercised by feature phases).

Idempotency via `upsert` on unique keys means re-running never duplicates rows and never throws on the duplicate-movement constraints (no movements are created).

## npm scripts to add

```jsonc
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

**Windows / PowerShell execution note (from the skill + repo facts):** the npm scripts above (`prisma:generate`, `prisma:migrate`, `db:seed`) are the committed *intent* and the canonical way a developer invokes these tasks. However, they call the `prisma`/`tsx` bin shims, and `npx`/`.ps1` shims may be blocked by PowerShell execution policy — so **automated pipeline steps must not rely on the npm scripts and must invoke the node CLIs directly instead**:

- generate: `node node_modules/prisma/build/index.js generate`
- initial migration: `node node_modules/prisma/build/index.js migrate dev --name init`
- seed: `node node_modules/tsx/dist/cli.mjs prisma/seed.ts`
- type-check: `node node_modules/typescript/bin/tsc --noEmit`

Chain commands with `;` (PowerShell) and set env with `$env:VAR`. There is no contradiction between the committed scripts and this note: the scripts document intent for a developer shell; the node-CLI forms are the execution-policy-proof path for automation. A running `next dev` can lock the Prisma engine DLL on Windows (EPERM on `generate`) — stop the dev server before regenerating. Because this is a **brand-new** database (not the drifted one the skill warns about), `prisma migrate dev` is safe to use normally here; the skill's hand-maintained-idempotent-SQL caveat does not apply.

## Requirements explicitly deferred to later phases

Phase 1 is schema + foundation only. The following spec requirements are **out of scope** here and owned by named later phases:

- **Authentication & authorization** — NextAuth v4 Credentials+JWT, `lib/auth.ts`, session validation, role gating, HTTP-only cookies, blocking inactive users. (Auth phase.)
- **Order submission / cancellation / completion** — interactive transactions, `SELECT FOR UPDATE` / atomic conditional stock updates via parameterized raw SQL, order-number generation, totals computed server-side. (Order phase.)
- **Stock receipts & adjustments** — receipt registration, reason-required adjustments, RECEIPT_IN/ADJUSTMENT movements. (Inventory phase.)
- **Low-stock / zero-stock behavior** — threshold reads, availability gating of inactive/zero-stock items. (Inventory + order phases.)
- **API routes, api/service/hook layers, UI** — the entire layered CRUD flow above Prisma. (Feature + frontend phases.)
- **Dashboard, reporting, Recharts visualizations.** (Dashboard phase.)
- **DB-level hardening beyond CHECK constraints** (e.g. immutability triggers for movements/receipts) — convention-enforced in Phase 1, optional DB-trigger hardening later. (The non-negative CHECK constraints themselves are NOT deferred — they ship in the Phase 1 initial migration; see the migration decision above.)

## Acceptance criteria for Phase 1

1. `prisma/schema.prisma` matches the block above exactly: `postgresql` datasource on `env("DATABASE_URL")`, `prisma-client-js` generator, all three enums, all seven models, `cuid()` ids throughout.
2. Every mandated `@@unique` is present: `User.username`, `Item.name`, `Order.orderNumber`, `OrderItem([orderId, itemId])`, `StockMovement([orderItemId, movementType])`, `StockMovement([stockReceiptId, movementType])`.
3. Every mandated `@@index` is present: `Item.isActive`; `Order.userId/status/createdAt`; `OrderItem.orderId/itemId`; `StockReceipt.itemId/userId`; `StockMovement.itemId/userId/createdAt/movementType`.
4. Decimal(12,2) on `price`, `unitPrice`, `subtotal`, `totalAmount`, `unitCost`; `Int` on `stock`, every `quantity`.
5. `prisma generate` succeeds and `tsc --noEmit` passes with the `@/lib/prisma` singleton in place.
6. `docker compose up -d` starts Postgres reachable at the `DATABASE_URL`; the **Phase 1 initial migration** (`prisma migrate dev --name init`, or the node-CLI equivalent) applies cleanly, creating all seven tables, both composite movement uniques, every mandated index, and the two `CHECK` constraints (`Item.price >= 0`, `Item.stock >= 0`); and `tsx prisma/seed.ts` then upserts the singleton setting, three role users, and sample items idempotently (re-running changes nothing and throws nothing). The migration must exist and run before the seed — the seed writes to tables the migration creates.
7. No `src/` directory is introduced; all paths are root-level and the existing `next.config.ts` config is preserved intact — both the `experimental` block (`agentFeedback: true`) and the top-level flags (`cacheComponents: true`, `partialPrefetching: true`, `turbopack` CSS rules). Adding the npm scripts and dependencies must not drop or reshape any of these.

## Responses to design review findings

Review: `.agents/tasks/beverage-phase1/design-review.md` (verdict `CHANGES_REQUESTED` — 1 MEDIUM, 3 NITs).

- **Finding #1 (MEDIUM — seed vs deferred migration conflict): ADDRESSED.** Took the review's preferred option: Phase 1 now **owns the initial migration**. Added a new "Phase 1 migration decision" section mandating `prisma migrate dev --name init` as a Phase 1 step, folded the non-negative `CHECK` constraints into that same initial migration (with the exact `ALTER TABLE ... CHECK` SQL), removed "author the initial migration" from the deferral list, narrowed the deferral to DB-trigger hardening only, and updated acceptance criterion #6 to require the migration to run (creating tables, uniques, indexes, and CHECKs) before the seed. The two sections are now consistent: the seed writes to tables the Phase 1 migration creates.
- **Finding #2 (NIT — redundant `OrderItem @@index([orderId])`): ADDRESSED (kept, annotated).** Kept the index because acceptance criterion #3 mandates it, and added a schema comment stating it is deliberate (redundant with the composite unique's leading column) so the implementer does not read the duplication as a mistake.
- **Finding #3 (NIT — npm scripts vs PowerShell shim caveat): ADDRESSED.** Rewrote the Windows/PowerShell note to state explicitly that the committed npm scripts are developer-shell intent while automated steps must invoke the node CLIs directly; listed the exact node-CLI commands for generate, the initial migration, the seed, and the type-check. Clarified there is no contradiction between the two.
- **Finding #4 (NIT — bcryptjs in Phase 1): ADDRESSED (confirmed intended).** Annotated the dependency table entry: bcryptjs lands in Phase 1 on purpose because the seed must store real bcrypt hashes for its dev users (a placeholder hash would fail once the auth phase runs `bcrypt.compare`); the rest of auth stays deferred.

No findings were backlogged or ignored. All changes stay within the original Phase 1 scope (schema + foundation) and the locked technology stack; no model, enum, typing, unique, or index was altered — the schema contract is unchanged except for the explanatory `@@index([orderId])` comment.
