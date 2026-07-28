# Original User Request

## 2026-07-28T06:43:50Z

Implement 3 new architectural constraints (Cron Job for Data Retention, ESLint Boundaries for Trust Zones, and Zod API Contracts Workspace) into the Cloudflare E-Commerce Monorepo as specified in the v1.3 Technical Delivery Plan.

Working directory: /home/user/personalized/cloudflare-ecommerce
Integrity mode: benchmark

## Requirements

### R1. Data Retention Cron Job (Slice 6)
- Modify the `public-api` Cloudflare Worker to include a daily Cron Trigger (`0 0 * * *`).
- The Cron job must delete `idempotency_keys` and abandoned `carts` older than 7 days using the `created_at` timestamp.

### R2. Architecture Fitness Functions (Slice 7)
- Configure `eslint-plugin-boundaries` or `no-restricted-imports` to enforce strict isolation between `apps/public-api` and `apps/admin-api`.
- Cross-imports between these two apps must trigger an ESLint error.

### R3. API Contracts Workspace (Slice 8)
- Verify and structure the `packages/contract` workspace to export Zod schemas.
- Ensure type-safe RPC boundaries can be consumed by both backend (Hono) and frontend (Next.js/Vite) apps.

## Acceptance Criteria

### Implementation Quality
- [ ] Code passes all existing tests (`pnpm --filter public-api test` and `pnpm --filter admin-api test`).
- [ ] ESLint correctly blocks cross-imports between `public-api` and `admin-api` when running `pnpm run lint`.
- [ ] The Cron trigger syntax in `wrangler.toml` and `src/index.ts` is valid and syntactically correct.
