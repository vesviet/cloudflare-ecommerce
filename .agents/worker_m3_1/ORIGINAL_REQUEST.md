## 2026-07-28T07:03:16Z
You are Worker 1 for Milestone 3 (API Contracts Workspace - Slice 8).
Your working directory is `/home/user/personalized/cloudflare-ecommerce/.agents/worker_m3_1`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Objectives:
You are implementing Milestone 3: API Contracts Workspace (Slice 8).
Review Explorer reports at:
- `/home/user/personalized/cloudflare-ecommerce/.agents/explorer_m3_1/analysis.md`
- `/home/user/personalized/cloudflare-ecommerce/.agents/explorer_m3_2/analysis.md`
- `/home/user/personalized/cloudflare-ecommerce/.agents/explorer_m3_3/analysis.md`

Tasks:
1. `packages/contract` workspace enhancements:
   - Add `tsconfig.json` to `packages/contract`.
   - Update `package.json` in `packages/contract` with proper `"types"`, `"main"`, and scripts (`build`, `typecheck`, `test`).
   - Clean up and structure `src/index.ts` and `src/admin.ts`.
   - Export TypeScript inferred types for all Zod schemas (`export type X = z.infer<typeof XSchema>`).
   - Fix schema naming inconsistencies and duplications (`CheckoutSchema` / `checkoutSchema`, `FulfillmentSchema` / `fulfillSchema`).
   - Update `cmsSchema` type enum to include `'article'`, `'event'` alongside existing types so `CmsForm.tsx` requests pass validation.
   - Update `customerSchema` for `accepts_marketing` to allow boolean or coerced number/union (`z.union([z.boolean(), z.number().transform(v => Boolean(v))])` or similar) so `AddCustomerModal.tsx` submits cleanly.
   - Ensure all core domain Zod schemas (Cart, Checkout, Product, Category, Customer, Coupon, Review, CMS, Fulfillment) are exported.

2. Backend RPC Boundaries:
   - In `apps/public-api/src/index.ts` and `apps/admin-api/src/index.ts`, export `export type AppType = typeof app`.
   - Refactor `public-api/src/routes/reviews.ts`, `admin-api/src/routes/coupons.ts`, and `shared-routes/src/customer.ts` to use `@ecommerce/contract` Zod schemas via `@hono/zod-validator`.

3. Frontend RPC Integration:
   - Add `@ecommerce/contract` workspace dependency to `apps/storefront-ui/package.json` and `apps/admin-ui/package.json`.
   - Create type-safe RPC client utility modules (`src/lib/api-client.ts` or similar) in `apps/storefront-ui` and `apps/admin-ui` using Hono `hc` (`import { hc } from 'hono/client'`) typed with `AppType` from backend workers.

4. Test & Verification:
   - Run tests across `packages/contract`, `apps/public-api`, and `apps/admin-api`.
   - Ensure all Vitest unit/integration tests pass (100% pass rate).
   - Document commands executed, build outputs, test results, and file changes in `/home/user/personalized/cloudflare-ecommerce/.agents/worker_m3_1/changes.md` and deliver handoff report at `/home/user/personalized/cloudflare-ecommerce/.agents/worker_m3_1/handoff.md`.
   - Send message to parent when done.
