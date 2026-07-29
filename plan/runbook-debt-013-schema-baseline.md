# Runbook — DEBT-013 Schema Baseline (Option B)

Executes the accepted ADR `plan/adr-schema-source-of-truth.md`. Goal: rebuild an
accurate Drizzle snapshot baseline from the deployed schema and collapse the two
ORM schema definitions into a single source of truth.

> **Why this is a maintainer task, not automated:** the introspection step needs
> either a scoped Cloudflare **D1 API token** (a secret) to reach the remote DB,
> or a locally-migrated D1. It also requires upgrading `drizzle-kit`, which must be
> validated by actually running it. None of this may run against production
> without sign-off. Do the whole runbook on a scratch/local DB first.

## Preconditions / constraints

- **Never rename or renumber** existing migration files `0000`–`0015`. D1 tracks
  applied migrations by file name; a rename replays the migration.
- **Never re-apply** the regenerated baseline migration to a database that already
  has the tables — introspection output is a *baseline*, not a delta.
- Work on a copy: introspect, inspect, and diff before touching anything shared.

## Step 0 — Upgrade tooling

`drizzle-kit@0.20.17` fails on current Node and expects `drizzle-orm@0.30.x`, while
the repo pins `drizzle-orm@^0.45.2`. Align them:

```bash
pnpm --filter @ecommerce/database add -D drizzle-kit@latest   # or @rc, matching drizzle-orm 0.45.x
```

Verify it runs at all:

```bash
pnpm --filter @ecommerce/database exec drizzle-kit --version
```

## Step 1 — Point drizzle.config at a real target

Replace the legacy `driver: 'd1'` config in `packages/database/drizzle.config.ts`
with the modern form. Two options:

**Option 1a — local D1 (no prod secret needed, preferred for the baseline):**
Apply all migrations to a local D1 first (`pnpm run setup:db`), then introspect the
resulting SQLite file:

```ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: './migrations',
  schema: './src/schema.ts',
  dialect: 'sqlite',
  dbCredentials: { url: '<path to .wrangler/state/.../*.sqlite>' },
});
```

**Option 1b — remote prod D1 (needs a scoped D1 API token):**

```ts
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: './migrations',
  schema: './src/schema.ts',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!, // ecommerce-db
    token: process.env.CLOUDFLARE_D1_TOKEN!,          // scoped D1:read token
  },
});
```

## Step 2 — Introspect (read-only)

```bash
pnpm --filter @ecommerce/database exec drizzle-kit pull --init
```

This is read-only against the DB. It regenerates `schema.ts`, a fresh `meta`
snapshot baseline, a baseline `migration.sql`, and `relations.ts`.

## Step 3 — Adopt one source of truth

- Diff the introspected `schema.ts` against both existing definitions:
  - `packages/database/src/schema.ts`
  - `packages/core-services/src/local-schema.ts`
  Expected divergences from the audit: `carts.last_active_at` /
  `abandoned_email_sent_at` exist in the DB (migrations 0011/0013) and in
  `local-schema` but are missing from `database/schema.ts`.
- Make `packages/database/src/schema.ts` the canonical, introspected schema.
- Have `packages/core-services/src/local-schema.ts` **re-export** from
  `@ecommerce/database` (or delete it and update imports) so there is exactly one
  definition.

## Step 4 — Reconcile the migration history

- Keep `0000`–`0015` as-is (do not rename).
- Treat the introspected snapshot as the new baseline for future `generate` only.
  Do **not** apply the baseline `migration.sql` to any DB that already has the
  schema.

## Step 5 — Verify

```bash
pnpm --filter public-api test
pnpm --filter admin-api test
pnpm --filter @ecommerce/core-services test
pnpm --filter @ecommerce/core-services typecheck
pnpm --filter admin-api exec tsc --noEmit
pnpm --filter public-api exec tsc --noEmit
# Confirm no schema drift remains:
pnpm --filter @ecommerce/database exec drizzle-kit check
```

## Step 6 — Fallback (Option A)

If the team prefers not to restore generated migrations: declare migrations
hand-written, remove the drizzle `meta/` journal, and adopt `drizzle-kit export`
+ custom migrations going forward. Still complete Step 3 (single schema source).
