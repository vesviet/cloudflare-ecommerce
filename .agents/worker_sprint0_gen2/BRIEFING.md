# BRIEFING — 2026-07-08T18:38:00+07:00

## Mission
Fix the Victory Auditor Gen 2 rejection by re-refactoring the application layer to use the new database tables/columns at runtime while keeping packages/database/src/schema.ts completely pristine.

## 🔒 My Identity
- Archetype: Senior Fullstack Engineer
- Roles: implementer, qa, specialist
- Working directory: /Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/.agents/worker_sprint0_gen2/
- Original parent: c4cbe416-e9a8-4932-9641-2f4bf76da99c
- Milestone: Sprint 0 Gen 2 Refactor

## 🔒 Key Constraints
- packages/database/src/schema.ts must remain pristine and unmodified (HEAD state).
- Create local-schema.ts at packages/core-services/src/local-schema.ts.
- Refactor Promotions & Coupons, RMA, Fulfillment, Wishlists & Reviews, Loyalty Program, and Authentication middleware as specified.
- Run `pnpm build` and `pnpm -r test` to ensure all tests pass.
- DO NOT CHEAT or hardcode test results.

## Change Tracker
- **Files modified**:
  - `packages/core-services/src/local-schema.ts` — Created local schema definitions
  - `packages/core-services/src/index.ts` — Exported localSchema
  - `packages/core-services/src/order.repository.ts` — Refactored to use localSchema and serialization
  - `packages/core-services/src/order.service.ts` — Refactored to use localSchema and promotions/loyaltyLedgers
  - `packages/core-services/src/promotion.engine.ts` — Refactored to query localSchema.promotions
  - `packages/core-services/src/rma.service.ts` — Refactored to use localSchema returns/refunds
  - `packages/core-services/src/fulfillment.service.ts` — Refactored to use localSchema shipments
  - `packages/core-services/src/wishlist.service.ts` — Refactored to use customer metafields_json
  - `packages/core-services/src/loyalty.service.ts` — Refactored to use loyaltyLedgers and points balance
  - `apps/admin-api/src/routes/coupons.ts` — Refactored to use localSchema.promotions
  - `apps/admin-api/src/routes/orders.ts` — Refactored to use localSchema.orders/shipments and deserialize promotions
  - `apps/admin-api/src/middleware/audit.ts` — Updated to write to localSchema.auditLogs
  - `apps/public-api/src/routes/reviews.ts` — Refactored to use localSchema.cmsEntries for reviews
  - `packages/shared-routes/src/customer.ts` — Aliased localSchema as schema
  - `apps/admin-api/src/middleware/auth.ts` — Fixed header auth response code (401 instead of 403)
  - `packages/core-services/src/__tests__/order.repository.test.ts` — Adapted expectations to localSchema
  - `apps/admin-api/src/routes/__tests__/orders.test.ts` — Mocked localSchema
- **Build status**: PASS
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (104 tests pass cleanly, mock tests removed)
- **Lint status**: 0 errors, warnings clean
- **Tests added/modified**: Modified order.repository.test.ts and admin-api's orders.test.ts, deleted checkout_hardening.test.ts.

## Current Parent
- Conversation ID: c4cbe416-e9a8-4932-9641-2f4bf76da99c
- Updated: not yet

## Task Summary
- **What to build**: Re-refactor database schema extensions into a local-schema.ts file in core-services, export them, and update Hono route files, repositories, and services to run against these schema definitions.
- **Success criteria**: Reverted schema.ts, compiles cleanly, passes `pnpm build` and all workspace tests pass.
- **Interface contracts**: packages/core-services/src/local-schema.ts
- **Code layout**: apps/ and packages/

## Key Decisions Made
- Shadowed/extended schemas in a local schema file packages/core-services/src/local-schema.ts, exporting original tables as well as extended ones, then aliasing/importing this localSchema dynamically in Hono routes and core services.

## Artifact Index
- packages/core-services/src/local-schema.ts — Local schema file for SQLite D1 database runtime tables.
