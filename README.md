# Beverage Inventory & Order Management System

A full-stack Next.js 16 application that replaces manual handheld beverage stock
management and ordering. Waiters place beverage orders; administrators and
storekeepers manage inventory, receipts, and reporting.

Built with Next.js 16 (App Router), TypeScript (strict), PostgreSQL, Prisma,
NextAuth v4 (Credentials + JWT), Zod, Tailwind CSS v4, lucide-react, recharts,
and a layered architecture (DB → Prisma → service → API route → api client →
service → hook → UI).

## Features

- **Authentication & RBAC** — NextAuth credentials login (JWT, HTTP-only cookie),
  three roles (ADMIN, WAITER, STOREKEEPER), inactive-account blocking, and
  server-side authorization re-verified in every Route Handler.
- **POS-style ordering** — waiters build orders from available beverages;
  stock-capped quantities; totals recomputed on the server.
- **Transactional stock** — order submission/cancellation run in PostgreSQL
  interactive transactions with `SELECT ... FOR UPDATE` row locking and atomic
  conditional updates, so concurrent orders cannot oversell inventory.
- **Inventory** — beverage CRUD, stock receipts, reason-required adjustments,
  and an immutable stock-movement audit trail (duplicate movements blocked by
  composite unique constraints).
- **Dashboard** — live summary cards, recent orders, top beverages, inventory
  distribution chart, and low-stock alerts, all from real DB aggregation.
- **User management & settings** — ADMIN-only account management and a global
  low-stock threshold.

## API

Route Handlers live under `app/api/v1/*` (plus NextAuth at
`app/api/auth/[...nextauth]`). Every protected handler validates input with Zod
and authorizes against the signed session JWT. The shared service layer in
`server/services/*` holds the business logic and is the single source of truth
for both the API and any future server actions.

## Prerequisites

- **Node.js 20+** (the repo was validated on Node 24).
- **PostgreSQL 14+** running locally (or reachable via `DATABASE_URL`).
- Network access to an npm registry (see "npm registry note" below).

## Database

Create a database and matching user (defaults expected by `.env`):

```sql
CREATE USER beverage WITH PASSWORD 'beverage';
CREATE DATABASE beverage OWNER beverage;
GRANT ALL PRIVILEGES ON DATABASE beverage TO beverage;
```

If your local Postgres uses different credentials, update `DATABASE_URL` in
`.env` to match.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and adjust values as needed:

   ```bash
   cp .env.example .env
   ```

   `.env` is git-ignored. At minimum `DATABASE_URL` must point at the Postgres
   instance started by Docker Compose. `ADMIN_USERNAME` / `ADMIN_PASSWORD` seed
   the initial admin account — change them before any non-local use.

3. Ensure your local PostgreSQL is running and the `beverage` database exists
   (see "Database" above).

4. Apply the database schema (creates all tables, indexes, unique constraints,
   and the non-negative price/stock CHECK constraints):

   ```bash
   npm run prisma:migrate   # prisma migrate dev
   ```

5. Generate the Prisma client:

   ```bash
   npm run prisma:generate
   ```

6. Seed the database (idempotent — safe to re-run):

   ```bash
   npm run db:seed
   ```

   This creates the singleton inventory setting (low-stock threshold 10), one
   user per role (`admin`, `waiter`, `store`), and a handful of sample
   beverages.

## Development

```bash
npm run dev
```

Open http://localhost:3000.

## Production build

```bash
npm run build
npm run start
```

## Useful scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Production build. |
| `npm run start` | Run the production build. |
| `npm run lint` | Run ESLint. |
| `npm run prisma:generate` | Generate the Prisma client. |
| `npm run prisma:migrate` | Create/apply a development migration. |
| `npm run db:seed` | Seed the database (idempotent). |

## Windows / PowerShell note

The committed npm scripts above are the canonical way to run these tasks in a
developer shell. If PowerShell's execution policy blocks the `prisma` / `tsx`
bin shims, invoke the Node CLIs directly instead:

```powershell
node node_modules/prisma/build/index.js generate
node node_modules/prisma/build/index.js migrate dev --name init
node node_modules/tsx/dist/cli.mjs prisma/seed.ts
node node_modules/typescript/bin/tsc --noEmit
```

Chain commands with `;` (not `&&`) and set env vars with `$env:VAR`. A running
`next dev` can lock the Prisma query-engine DLL on Windows — stop the dev server
before regenerating the client.

## npm registry note

This project ships a local `.npmrc` that points npm at the public registry
(`https://registry.npmjs.org/`). If your organization requires an internal
registry, delete `.npmrc` and connect to the network where that registry
resolves. Installs require reachable registry access over HTTPS.

## Data model (Phase 1)

Seven Prisma models back the system: `User`, `Item`, `Order`, `OrderItem`,
`StockReceipt`, `StockMovement`, and the singleton `InventorySetting`. Money is
stored as `Decimal(12,2)`; stock and quantities are integers; primary keys are
`cuid()`. Stock movements are protected against duplicate processing by
composite unique constraints on `(orderItemId, movementType)` and
`(stockReceiptId, movementType)`. See `prisma/schema.prisma` for the full
contract.
