# Phase 1 Design Review — Beverage Inventory & Order Management

Reviewed document: `.agents/tasks/beverage-phase1/design.md` (revised, responding to a prior review that raised 1 MEDIUM + 3 NITs).

This is an independent re-review conducted fresh against the locked spec and the actual repo. The design is a schema/foundation contract that every later phase inherits, so correctness here is weighted heavily. I verified the repo-fact claims (tsconfig alias, next.config.ts settings, package.json baseline, skill contents) against the real files rather than trusting the design's description.

## Verdict summary

The prior review's MEDIUM (seed-vs-migration contradiction) and all three NITs are genuinely resolved in this revision. My independent pass over the schema, enums, ID strategy, duplicate-movement constraints, index set, root-level layout, dependency pins, env, docker-compose, prisma singleton, seed plan, and npm scripts found no HIGH or MEDIUM defects. Two NITs remain (documentation-level, non-blocking).

Result: no HIGH or MEDIUM findings → **APPROVED**.

## Verified Assumptions

These design claims were checked against the actual source and hold:

1. **tsconfig alias `@/*` → project root.** `tsconfig.json` has `"paths": { "@/*": ["./*"] }`. The design's root-level (no `src/`) layout and `@/lib/prisma` import are consistent with this. VERIFIED.
2. **`next.config.ts` settings the design promises to preserve.** The real file contains `experimental: { agentFeedback: true }`, top-level `cacheComponents: true`, `partialPrefetching: true`, and the `turbopack.rules["*.css"]` loader block — exactly as acceptance criterion #7 enumerates. VERIFIED.
3. **package.json baseline.** Real file pins `next` `16.4.5`, `react`/`react-dom` `19.3.0`, `eslint-config-next` `16.4.5`, Tailwind v4 (`tailwindcss: ^4`, `@tailwindcss/turbopack: ^4`), and existing scripts `dev/build/start/lint`. The design's "fresh Next 16.4.5 / React 19.3 scaffold" and its additive-scripts claim match. VERIFIED.
4. **No existing `prisma/schema.prisma`.** Workspace search returns no schema file, so Phase 1 genuinely authors it from scratch — consistent with "Phase 1 owns the initial migration." VERIFIED.
5. **Skill singleton shape.** `lib/prisma.ts` in the design is a verbatim match of the `fullstack-crud-flow` SKILL's `lib/prisma.ts` snippet. VERIFIED.
6. **Skill node-CLI / PowerShell caveat.** The SKILL does document that `npx`/`.ps1` shims may be blocked and recommends `node node_modules/...` invocations plus the `tsc --noEmit` validation path; the design's Windows note is faithful to it. VERIFIED.
7. **Skill uses `autoincrement()` / Prisma 5 header.** Confirmed in the SKILL; the design's documented deviation (cuid, Prisma 6) is a real deviation, correctly flagged as such. VERIFIED.
8. **Duplicate-movement NULL-distinct reasoning (Postgres semantics).** The design's claim that a composite unique index treats rows with a NULL member as distinct is correct standard Postgres behavior. Traced through each movement type: `ORDER_OUT`/`ORDER_CANCEL_IN` carry a non-null `orderItemId` (constrained, one of each allowed, duplicates blocked) and null `stockReceiptId` (exempt from the receipt unique); `RECEIPT_IN` carries non-null `stockReceiptId` (one per receipt) and null `orderItemId` (exempt from the order unique); `ADJUSTMENT_IN/OUT` carry both FKs null (exempt from both, allowing many). This satisfies the step requirement that the strategy permit BOTH an ORDER_OUT and an ORDER_CANCEL_IN per order item while blocking duplicates of each. The strategy is SOUND. VERIFIED.

## Unverified / Wrong Assumptions

No wrong assumptions found. The following are forward-looking claims that cannot be verified in this repo state but are reasonable and do not block:

1. **Prisma `6.2.1` client+CLI pins and their compatibility with Next 16 / React 19.** Neither `prisma` nor `@prisma/client` is installed yet (no `node_modules/prisma` or `node_modules/@prisma/client`), so the exact pin cannot be validated against an installed engine here. The choice of a pinned, identical client/CLI pair on the Prisma 6 line is sound practice; implementers should confirm `6.2.1` resolves at install time and, if not, pin to the nearest available 6.x patch (keeping CLI and client identical). UNVERIFIED (environment), non-blocking.
2. **`prisma-client-js` generator + `cuid()` under Prisma 6.** `cuid()` remains supported by the stable `prisma-client-js` generator in Prisma 6 (the newer `prisma-client` generator is preview and is correctly NOT selected). Consistent and standard, but not executable in this repo state. UNVERIFIED (environment), non-blocking.
3. **Hand-editing the generated `migration.sql` to append the two `CHECK` constraints.** This is a standard, supported workflow, but depends on the implementer adding the trailing SQL block after `prisma migrate dev` generates the file. Flagged so the coder does not forget it is a manual append; acceptance criterion #6 already encodes the expectation. UNVERIFIED (future action), non-blocking.

## Findings

1. **NIT — Redundant `@@index([orderId])` on `OrderItem`.** Location: `model OrderItem`. The composite `@@unique([orderId, itemId])` already materializes a btree index led by `orderId`, which serves `orderId`-only lookups, so the standalone `@@index([orderId])` adds write cost with no read benefit. The design keeps it deliberately because acceptance criterion #3 mandates it, and annotates it with a schema comment explaining the redundancy. This is an acceptable resolution (consistency with the stated criterion over micro-optimization). Concrete fix if ever revisited: drop `@@index([orderId])` and strike it from criterion #3; otherwise keep as-is with the existing comment. Non-blocking.

2. **NIT — Monetary precision `@db.Decimal(12, 2)` is a design choice beyond the bare spec.** Location: schema money fields (`price`, `unitPrice`, `subtotal`, `totalAmount`, `unitCost`). The spec says "Decimal" without a precision/scale; the design fixes `(12, 2)`. This is a reasonable, defensible choice (two-decimal currency, max ~10 digits before the point) and is applied consistently to all five money fields, satisfying criterion #4. Flagged only so the precision is a conscious lock: if any currency in scope needs more than 2 fractional digits or values above ~10^10, revisit the scale/precision now (changing it later is a data-type migration). Concrete fix: none required; confirm `(12, 2)` covers the expected price range. Non-blocking.

## Checklist coverage (for the record — each item resolved into the findings/assumptions above, no separate "informational" section)

- Valid `schema.prisma` block with `postgresql` + `env("DATABASE_URL")` datasource and `prisma-client-js` generator — present and correct.
- All seven models with every required field, correct `createdAt`/`updatedAt` presence per spec — present.
- `Decimal` on all five money fields, `Int` on stock/quantity — present (precision choice noted as NIT #2).
- Enums `Role`, `OrderStatus`, `MovementType` with exact members — present and exact.
- Single consistent ID strategy (`cuid()` everywhere) — present; deviation from skill documented.
- `@@unique([orderId, itemId])` on `OrderItem` and the sound dual-composite movement uniques — present; soundness traced in Verified Assumption #8.
- Required `@@index` set — present and matches criterion #3 (with NIT #1 on the intentionally-redundant one).
- Root-level paths, no `src/`, next.config.ts preserved — consistent with the real files (Verified Assumptions #1, #2).
- Dependency pins, env set, docker-compose shape, `lib/prisma.ts` singleton, seed plan, npm scripts — all present and internally consistent (version resolvability is Unverified Assumption #1, environment-dependent).
