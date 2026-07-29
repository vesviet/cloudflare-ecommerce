# ADR: Database Schema Source of Truth (DEBT-013)

- Status: **Proposed — needs decision**
- Date: 2026-07-29
- Owner: Technical Architect
- Related debt: DEBT-013 (P1), and the duplicate-schema drift noted during the 2026-07 audit.

## Context

- `drizzle-kit@0.20.18` fails on the current Node runtime (`Failed to find Response internal state key`) and expects `drizzle-orm@0.30.x`, while the root `pnpm` override pins `drizzle-orm@^0.45.2`. So `drizzle-kit generate` cannot run.
- Migrations under `packages/database/migrations` are therefore **hand-written**. The drizzle journal (`meta/_journal.json`) has entries for 0000–0015 but the `meta/*_snapshot.json` chain does not include 0007, 0014, or 0015, and migration `0010` is absent from the journal entirely.
- Consequence: the snapshot chain no longer describes the deployed schema. If someone repairs `drizzle-kit` and runs `generate`, it may emit DDL that is **already applied** (e.g. re-adding columns), corrupting a live D1 database.
- Secondary drift: there are **two schema definitions** — `packages/database/src/schema.ts` and `packages/core-services/src/local-schema.ts`. They disagree (e.g. `carts.last_active_at` / `abandoned_email_sent_at` exist in the deployed table via migrations 0011/0013 and are used by `core-services` local-schema, but are absent from `database/schema.ts`). Code paths pick different schemas, which hides column-level mistakes.

## Hard constraint

D1 tracks applied migrations **by file name**. Renaming or renumbering any already-applied migration file causes it to **replay**. No option below may rename/renumber existing migration files.

## Options

### Option A — Declare migrations hand-written; retire the drizzle-kit generator
- Keep `drizzle-orm` purely as the query builder. Stop using `drizzle-kit generate`.
- Delete/attic the `meta/` snapshot+journal so nobody is tempted to `generate` against a stale baseline.
- New schema changes = a hand-written, sequentially-numbered `.sql` migration + a matching manual edit to the ORM schema file.
- **Pros:** matches today's reality, zero tooling upgrade risk, cannot accidentally replay. **Cons:** loses type-safe auto-generation; relies on discipline to keep ORM schema and SQL in sync.

### Option B — Baseline the snapshot chain against the deployed schema
- Upgrade `drizzle-kit` to a version compatible with `drizzle-orm@0.45.x`, then `drizzle-kit introspect`/`pull` the **deployed** D1 to regenerate a correct baseline snapshot pinned at the current head (0015), and resume `generate` for future changes.
- **Pros:** restores generated, type-safe migrations. **Cons:** requires a verified prod-schema pull + careful baseline; upgrade may ripple through `drizzle-orm` usage; must be done on a copy first.

### Option C — Hybrid
- Upgrade `drizzle-kit`, `introspect` to rebuild the baseline, keep the journal going forward. Same as B but explicitly keeps the journal for history.

## Recommendation

Adopt **Option A now** (lowest risk, matches the hand-written reality) and, in the same change, **collapse the two ORM schemas into one source of truth** (make `core-services/local-schema.ts` re-export from `packages/database/src/schema.ts`, or vice-versa) so the ORM definition matches the deployed columns. Revisit Option B only if the team wants generated migrations back, and do the baseline against a **pulled prod schema on a scratch DB** first.

## Decision required from the team

1. Option A, B, or C?
2. Which file becomes the single ORM schema source of truth?
3. If A: confirm we archive (not delete-from-history) the drizzle `meta/` snapshots.

_No code/migration changes will be made until this ADR is accepted, because the operations are irreversible against the live D1._
