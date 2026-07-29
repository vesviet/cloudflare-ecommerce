# ADR: Database Schema Source of Truth (DEBT-013)

- Status: **Accepted 2026-07-29 (Option B)** — execution steps in `plan/runbook-debt-013-schema-baseline.md`; gated on a drizzle-kit upgrade + D1 introspection run by a maintainer (needs a scoped D1 API token or a locally-migrated D1)
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

## Research — Drizzle official guidance

Sources: https://orm.drizzle.team/docs/get-started/d1-existing , https://orm.drizzle.team/docs/drizzle-kit-pull , drizzle-team/drizzle-orm#5528

- Drizzle documents an explicit **brownfield / "database-first"** flow for existing D1: `npx drizzle-kit pull --init` with `driver: 'd1-http'` (accountId + databaseId + API token) **introspects the deployed database** and regenerates `schema.ts`, the `meta` snapshot baseline, a migration file, and `relations.ts`. Introspection is **read-only** against the DB, so it is safe to run to rebuild an accurate baseline.
- Drizzle's docs confirm the exact drift mechanism we hit: `generate` diffs the schema against the **checked-in snapshot history**; when snapshots are missing or migrations land out of chronological order, `generate` can emit DDL that is already applied (issue #5528). This is why our missing 0007/0014/0015 snapshots are dangerous.
- Drizzle also ships `drizzle-kit export`, `check`, plus "Custom migrations" and "Migrations for teams" docs for hand-written SQL — the supported path if we choose Option A.

## Recommendation

**Option B, implemented via the documented `drizzle-kit pull --init` brownfield flow**, is now the preferred path because it: (1) is read-only against production, (2) rebuilds a correct snapshot baseline pinned at the current head (0015), and (3) simultaneously **resolves the duplicate-schema drift** by producing one introspected `schema.ts` to adopt as the single source of truth.

Guard rails when executing (post-approval):
- Do **not** re-apply the generated baseline migration to the live D1 — it would try to recreate existing tables. Keep the existing `0000`–`0015` files unrenamed as history; treat the freshly introspected snapshot as the baseline for future `generate` only.
- Requires bumping `drizzle-kit` to a build compatible with `drizzle-orm@0.45.x` (or `drizzle-kit@rc`) and a scoped D1 API token for the `d1-http` driver.
- Collapse the two ORM schemas: adopt the introspected schema as the single file and have the other module re-export it.

**Option A** (declare migrations hand-written, drop the journal, use `export`/custom-migrations going forward) remains the lower-effort fallback if the team does not want generated migrations back.

## Decision required from the team

1. Option A, B, or C?
2. Which file becomes the single ORM schema source of truth?
3. If A: confirm we archive (not delete-from-history) the drizzle `meta/` snapshots.

_No code/migration changes will be made until this ADR is accepted, because the operations are irreversible against the live D1._
