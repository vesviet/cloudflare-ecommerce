# Runbook — DEBT-014 Normalize `landing_pages.urgency_end_time` (epoch → ISO)

Executes the remaining half of DEBT-014. The **write path is already fixed**:
`apps/admin-api/src/routes/landing-pages.ts` normalizes input via
`toIsoStringOrNull()`, so all *new* rows are ISO strings. Only *legacy* rows saved
before that fix may still hold epoch values.

> **Gated — do not run automatically.** This is an **irreversible data write** on a
> live table. It must not be added to `packages/database/migrations/` (that dir is
> auto-applied by the deploy pipeline). Require: (1) explicit approval, (2) a
> verified D1 backup/export, (3) a dry-run first. Run manually via `wrangler d1
> execute`.

## Step 1 — Back up first (mandatory)

```bash
# Export the table (or the whole DB) before any write.
npx wrangler d1 export ecommerce-db --remote --output ./backup-ecommerce-$(date +%F).sql
# or at minimum snapshot the affected rows:
npx wrangler d1 execute ecommerce-db --remote \
  --command "SELECT id, urgency_end_time FROM landing_pages;"
```

## Step 2 — Dry run: find legacy epoch rows

A legacy value is numeric text (epoch seconds or millis) rather than an ISO string.

```sql
SELECT id, urgency_end_time
FROM landing_pages
WHERE urgency_end_time IS NOT NULL
  AND urgency_end_time GLOB '[0-9]*'          -- all-digit ⇒ epoch, not ISO
  AND urgency_end_time NOT LIKE '%-%';        -- ISO contains '-'
```

Confirm the count and eyeball the values before writing.

## Step 3 — Convert (after approval + backup)

Detect seconds vs milliseconds (>1e11 ⇒ ms) and rewrite as ISO 8601:

```sql
UPDATE landing_pages
SET urgency_end_time = strftime(
      '%Y-%m-%dT%H:%M:%fZ',
      CASE
        WHEN CAST(urgency_end_time AS INTEGER) > 100000000000
          THEN CAST(urgency_end_time AS INTEGER) / 1000.0   -- millis → seconds
        ELSE CAST(urgency_end_time AS INTEGER)              -- already seconds
      END,
      'unixepoch'
    )
WHERE urgency_end_time IS NOT NULL
  AND urgency_end_time GLOB '[0-9]*'
  AND urgency_end_time NOT LIKE '%-%';
```

Re-run the Step 2 query; it should now return zero rows.

## Step 4 — Follow-up code cleanup (only AFTER Step 3 verified on prod)

Once no epoch rows remain, remove the tolerant multi-format parsing so the code has
one code path:

- `apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx` (~lines 291-294):
  drop the `typeof lp.urgency_end_time === 'number'` / `> 1e11 ? *1 : *1000` branch;
  parse strictly as an ISO string.
- `apps/admin-ui/src/tabs/LandingPagesTab.tsx` (~line 85): the `!isNaN(new Date(...))`
  guard can be simplified once all values are ISO.

Do **not** do Step 4 before Step 3 — the parsing branches are the safety net for any
un-migrated row.
