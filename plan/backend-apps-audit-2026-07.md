# Backend Services Audit Report — Apps, Packages & Contracts

## 1. Executive Summary

This report audits the full backend surface of the Aura Store e-commerce monorepo:
- **Apps**: `admin-api`, `public-api`, `admin-ui`, `storefront-ui`
- **Packages**: `database`, `core-services`, `contract`, `shared-routes`
- **Contracts**: `contracts/schemas/*.json`

The platform runs on Cloudflare Workers (Hono v4), Cloudflare D1, KV, R2, Queues, and Durable Objects, with a Next.js 16 storefront and a Vite-based admin SPA.

### Overall Assessment: CRITICAL RISK — platform is not production-safe without immediate schema and secrets remediation

While the architecture shows solid intent (two-phase commit checkout, optimistic locking, DLQ handling, idempotency keys), three categories of issues make the platform **unbuildable and unrunnable in production**:

1. **Schema drift between migration source and runtime queries** — critical tables/columns used by business logic are invisible to `drizzle-kit` migrations
2. **Secrets and auth bypasses** — hardcoded fallback secrets and unauthenticated endpoints
3. **Incomplete contracts** — OpenAPI spec and delivery plans are out of sync with actual API surface

### Critical Blockers (Must Fix Before Deploy)

| # | Blocker | Severity |
|---|---------|----------|
| 1 | **Schema drift**: `core-services` uses `local-schema.ts` tables/columns (`promotions`, `returns`, `refunds`, `loyalty_ledgers`, `orders.location_id`, `orders.discount_amount`, `customers.loyalty_points_balance`, `carts.last_active_at`) that do not exist in `database/src/schema.ts` — the sole migration source. Queries will fail at runtime with "no such table/column". | CRITICAL |
| 2 | **Promotions vs Coupons table mismatch**: `schema.ts` defines `coupons`, but `core-services` queries `localSchema.promotions` (different schema). The PromotionEngine reads/writes `min_order_amount`, `starts_at`, `ends_at`, `usage_limit`, `times_used`, `status` — columns that exist only on the unmigrated `promotions` table. | CRITICAL |
| 3 | **Unauthenticated Review Submission**: `POST /api/reviews` has no auth middleware; accepts attacker-controlled `customer_id` and forces `verified_purchase: 1`. | HIGH |
| 4 | **Hardcoded fallback secrets**: `dev_secret_key` fallback in JWT verification (`cart.ts`, `customer.ts`) and Turnstile dummy key in `wrangler.toml` allow auth bypass if production secrets are missing. | HIGH |
| 5 | **Error leakage to clients**: Multiple route handlers return raw `err.message`, exposing stack traces, Drizzle schema names, and internal paths. | MEDIUM |

---

## 2. App Map & Navigation

### Applications

| App | Role | Entrypoint | Key Boundaries |
|-----|------|-----------|----------------|
| **storefront-ui** | Customer-facing storefront | `apps/storefront-ui/src/app/layout.tsx` (Next.js 16 App Router) | Communicates with `public-api`; client-side cart/auth via Zustand |
| **admin-ui** | Back-office SPA | `apps/admin-ui/src/App.tsx` (Vite + React Router) | Authenticated via CF Access; lazy-loaded tabs |
| **public-api** | Public API Gateway | `apps/public-api/src/index.ts` | Customer-facing endpoints `/api/*`; CORS controlled by `ALLOWED_ORIGINS` |
| **admin-api** | Admin API Gateway | `apps/admin-api/src/index.ts` | Admin endpoints `/api/*`; Zero Trust JWT + RBAC `requireRole` |

### Packages

| Package | Role | Entrypoint | Migration Source |
|---------|------|-----------|-----------------|
| **database** | D1 connection, Drizzle schema, migrations | `packages/database/src/index.ts` | `drizzle.config.ts` → `src/schema.ts` ONLY |
| **contract** | Zod schemas, DTOs, OpenAPI generation | `packages/contract/src/index.ts` | `openapi.json` (incomplete) |
| **core-services** | Domain services, repositories, orchestrators | `packages/core-services/src/index.ts` | Uses shadow `local-schema.ts` |
| **shared-routes** | Reusable routers | `packages/shared-routes/src/index.ts` | Mounted into both API workers |

### Contracts

| Contract | Status | Gap |
|----------|--------|-----|
| `contracts/schemas/technical-delivery-plan.json` | Planned (read-only) | Deduplication plan never executed |
| `contracts/schemas/implementation-result.json` | Stale | Only covers admin-ui OverviewTab |
| `contracts/schemas/adr-002.json` | Accepted | Media bucket split — implemented |
| `contracts/schemas/edge-deployment-spec.json` | Success | References destructive "drop all tables" deploy step |
| OpenAPI spec (`packages/contract/openapi.json`) | **Incomplete** | Only Product, Checkout, ErrorResponse registered. Missing Coupon, Review, Wishlist, Fulfillment, RMA, Admin schemas. |

---

## 3. Packages Audit Summary

### 3.1 Schema Drift (CRITICAL)

`packages/database/src/schema.ts` is the **only** source of truth for migrations (`drizzle.config.ts`). However, `packages/core-services/src/local-schema.ts` re-declares several tables with **extra columns** and defines **entirely new tables** that are invisible to migration generation.

#### Tables with missing columns in `schema.ts`

| Table | Column(s) in `local-schema.ts` | Missing in `schema.ts` | Used By | Impact |
|-------|-------------------------------|------------------------|---------|--------|
| `customers` | `loyalty_points_balance` | Yes | `loyalty.service.ts`, `promotion.engine.ts` | Loyalty reads/writes fail at runtime |
| `carts` | `discount_amount`, `applied_promotions_json`, `last_active_at`, `abandoned_email_sent_at` | Yes | `cart.service.ts`, `public-api/src/index.ts` cron | Cart abandon detection fails |
| `orders` | `location_id`, `discount_amount`, `tax_amount`, `applied_promotions_json`, `shipping_lines_json`, `tax_lines_json` | Yes | `order.repository.ts`, `order.service.ts`, `checkout.ts` | Checkout writes and webhook reads fail |

#### Tables entirely missing from `schema.ts`

| Table | Defined in `local-schema.ts` | Used By | Impact |
|-------|------------------------------|---------|--------|
| `promotions` | Yes | `order.service.ts`, `promotion.engine.ts` | Coupon logic crashes — "no such table: promotions" |
| `promotionRules` | Yes | (future) | — |
| `returns` | Yes | `rma.service.ts` | RMA creation crashes |
| `returnItems` | Yes | `rma.service.ts` | RMA creation crashes |
| `refunds` | Yes | `rma.service.ts` | Refund logging crashes |
| `loyaltyLedgers` | Yes | `loyalty.service.ts` | Ledger insert crashes |

#### `coupons` vs `promotions` confusion

`schema.ts` defines `coupons` (`code`, `type`, `value`, `max_uses`, `uses`, `expires_at`, `is_active`). `local-schema.ts` defines `promotions` (`code`, `type`, `value`, `min_order_amount`, `starts_at`, `ends_at`, `usage_limit`, `times_used`, `status`). The PromotionEngine queries `promotions` but migrations only create `coupons`. These are **different schemas** — the application logic will never find the columns it needs.

### 3.2 Observability

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| P-01 | Zero OTel spans — no instrumentation on D1, Stripe, R2, Queue, or cache operations | HIGH | repo-wide |
| P-02 | No correlation IDs; `console.log` statements are transient and unsearchable | MEDIUM | repo-wide |

### 3.3 Security & Auth (Packages Layer)

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| P-03 | Multiple `JWT_SECRET \|\| 'dev_secret_key'` fallbacks in `shared-routes/src/customer.ts` (lines 71, 120, 156) | HIGH | `packages/shared-routes/src/customer.ts` |
| P-04 | PBKDF2 password hashing uses only 100,000 iterations (OWASP recommends 600,000+ for SHA-256 in 2026) | MEDIUM | `packages/database/src/auth.ts:16,44` |

### 3.4 Contract & API Spec Gaps

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| P-05 | OpenAPI spec registers only 3 schemas; missing Coupon, Review, Wishlist, Fulfillment, RMA, Admin schemas | HIGH | `packages/contract/scripts/generate-openapi.ts` |
| P-06 | SDK generation CI (`.github/workflows/openapi-sdk.yml`) produces incomplete Dart/Swift SDKs from truncated spec | HIGH | CI workflow |
| P-07 | `contract/src/index.ts` uses `@hono/zod-openapi` but `package.json` dependency list not fully verified | LOW | `packages/contract/package.json` |

### 3.5 Data Model Issues

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| P-08 | `wishlist.service.ts` stores wishlist as JSON array in `customers.metafields_json` instead of using the existing `wishlists` table — inconsistent query patterns and no relational integrity | MEDIUM | `packages/core-services/src/wishlist.service.ts` |
| P-09 | `seed.ts` imports from `./schema` which is `schema.ts`, but local dev often runs against DB state created by `schema.ts` — missing columns means seed scripts and runtime diverge | MEDIUM | `packages/database/src/seed.ts` |

---

## 4. Contracts Audit Summary

### 4.1 Delivery Plans & ADRs

- **`technical-delivery-plan.json`**: Plans deduplication of admin-api/public-api code. Status: `planned` — never executed. The duplication (auth, customer routes, media routes) was partially resolved by creating `shared-routes`, but `core-services/local-schema.ts` drift was never addressed.
- **`adr-002.json`**: Media bucket split — implemented correctly in `shared-routes/media.ts`.
- **`edge-deployment-spec.json`**: Contains a destructive deploy step: "Run script to drop all existing tables to clean state." This is acceptable only for initial seed; if re-run against production, it causes total data loss.

### 4.2 Implementation Result

- **`implementation-result.json`**: Only documents changes to `admin-ui` OverviewTab. No records of checkout flow, inventory, promotion, or schema changes. This violates the backend-developer role DoD which requires `implementation-result.json` for every code-changing slice.

---

## 5. Apps Audit Summary (Expanded from Previous Report)

### 5.1 Type Safety & Code Correctness

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| A-01 | `public-api` Hono typing drops `Variables`, silencing all `c.get()` calls | HIGH | `apps/public-api/src/index.ts:40` |
| A-02 | Dual-DB parameter confusion (`processCheckout(drizzleDb, rawD1Db, ...)`); `any` types mask binding mismatches | MEDIUM | `packages/core-services/src/order.service.ts:14`, `inventory.repository.ts:30` |
| A-03 | Dead soft-lock code coexists with active logic; risk of accidental re-enablement | MEDIUM | `packages/core-services/src/inventory.service.ts:145-170`, `apps/public-api/src/routes/checkout.ts:64-66` |
| A-04 | Fulfillment endpoint marks order `shipped` immediately, then calls `FulfillmentService.updateStatus(..., 'shipped')` — redundant and skips `processing` state | LOW | `apps/admin-api/src/routes/orders.ts:207-212` |

### 5.2 Transactional Integrity

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| A-05 | Coupon revert not wrapped in transaction — partial failures corrupt `times_used` | HIGH | `packages/core-services/src/order.service.ts:153-170` |
| A-06 | Loyalty points lack atomic reservation; concurrent over-redemption possible | HIGH | `packages/core-services/src/promotion.engine.ts:42-51` |
| A-07 | Cart sync uses non-atomic DELETE + INSERT — crash between them empties the cart | MEDIUM | `packages/core-services/src/cart.service.ts:50-60` |
| A-08 | Checkout Stripe failure rollback is fire-and-forget (`waitUntil`); user can retry and oversell | MEDIUM | `apps/public-api/src/routes/checkout.ts:165` |
| A-09 | `RmaService.createReturnRequest` performs Stripe refund synchronously but catches errors silently — order is marked `refunded` in DB but payment may not have been refunded | MEDIUM | `packages/core-services/src/rma.service.ts:84-128` |

### 5.3 Security & Auth (Apps Layer)

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| A-10 | Unauthenticated review submission with attacker-controlled `customer_id` | HIGH | `apps/public-api/src/routes/reviews.ts:65-103` |
| A-11 | Raw `err.message` returned to clients across multiple routes | MEDIUM | `reviews.ts:60`, `cart.ts:67`, `orders.ts:22,73`, `checkout.ts:89`, `customer.ts:83,133,193...` |
| A-12 | JWT fallback secret `'dev_secret_key'` in production code path | HIGH | `apps/public-api/src/routes/cart.ts:93` |
| A-13 | Hardcoded Turnstile dummy key + hardcoded Audience tag in `wrangler.toml` | HIGH | `public-api/wrangler.toml:18`, `admin-api/wrangler.toml:16` |
| A-14 | `customer.ts` auth routes use `c.env.ENVIRONMENT === 'production' || !c.req.url.includes('localhost')` for secure cookie detection — URL-based detection is spoofable via proxy headers | MEDIUM | `packages/shared-routes/src/customer.ts:73,122` |

### 5.4 Observability

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| A-15 | Zero OTel spans — no instrumentation on D1, Stripe, R2, Queue, or cache operations | HIGH | repo-wide |
| A-16 | No correlation IDs; `console.log` statements are transient and unsearchable | MEDIUM | repo-wide |

### 5.5 Data & Pagination

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| A-17 | List endpoints missing pagination (orders, reviews, admin products) | MEDIUM | `admin-api/src/routes/orders.ts:13-24`, `public-api/src/routes/reviews.ts:23-33` |
| A-18 | Admin product list does not filter soft-deleted children variations | LOW | `admin-api/src/routes/products.ts:19` |
| A-19 | `schema_head.ts` appears to be a stale duplicate of `schema.ts` top section — risk of accidental import | LOW | `packages/database/src/schema_head.ts` |

---

## 6. Risk Tier & AI Code Validation

The codebase contains AI-generated patterns (issue codes `I-01`..`I-14`, `GAP-05`, structured doc comments, defensive chaining).

### Tier: HIGH (Elevated due to schema drift)

| Dimension | Assessment |
|-----------|-----------|
| **Correctness** | Core checkout flow correctly implements atomic coupon lock → order → inventory deduction. BUT `local-schema.ts` drift means checkout will fail at runtime with missing columns/tables. |
| **Security** | Coupon revert and loyalty race conditions are correctness bugs with financial impact. Error leakage and unauthenticated reviews are OWASP-level issues. `dev_secret_key` fallbacks enable JWT forgery. |
| **Domain Correctness** | Business rules are partially correct, but schema drift undermines the entire data layer. `times_used` accounting is not strongly consistent. |
| **Test Coverage** | Route-layer tests exist with heavy mocking. `core-services` has unit tests for `order.service`, `order.repository`, `inventory.repository`, `inventory.service`, `promotion.engine`, `catalog`, `category`, `cache`, `payment`. **Missing**: `loyalty.service`, `cart.service`, `wishlist.service`, `fulfillment.service`, `rma.service`. Contract tests only cover `fulfillSchema`. |
| **Dependency Hygiene** | Stripe v16 introduced without breaking-change audit. No SBOM review beyond CI Trivy. PBKDF2 iterations below OWASP 2026 recommendation. |
| **Observability** | Not added — violates role DoD. |
| **AI Code Governance** | AI-generated code passed basic correctness review but missed the schema drift between `schema.ts` and `local-schema.ts` — a classic case of AI validating within a narrow context without checking migration boundaries. |

---

## 7. Remediation Plan

### Sprint 1 — Critical Schema & Security Fixes (P0)

| ID | Task | Owner | Acceptance Criteria |
|----|------|-------|---------------------|
| T-01 | **Unify schema source**: Remove `local-schema.ts` re-declarations. Add all missing columns/tables directly to `database/src/schema.ts` so migrations include them. Update all imports to use `schema` exclusively. | Backend | `drizzle-kit generate` produces migrations for `promotions`, `returns`, `refunds`, `returnItems`, `loyaltyLedgers`, plus all extra columns on `customers`, `carts`, `orders`. No `local-schema.ts` re-declarations remain. |
| T-02 | **Rename `promotions` to `coupons`** in `local-schema.ts` and `core-services` to match `schema.ts`; merge schemas if needed | Backend | `PromotionEngine.evaluate` queries the same `coupons` table that migrations create. |
| T-03 | Add auth middleware to `POST /api/reviews`; verify purchase before `verified_purchase: 1` | Backend | Only authenticated customers with `completed` order containing the product can create verified reviews. |
| T-04 | Map all route error responses to safe `{ code, message }` format | Backend | No route handler returns raw `err.message` or stack traces. |
| T-05 | Remove `dev_secret_key` fallback; abort with clear log if `JWT_SECRET` missing | Backend | Customer auth endpoints return 500 if secret unset; no silent fallback. |
| T-06 | Move `CF_TURNSTILE_SECRET_KEY` and `AUDIENCE_TAG` to `wrangler secret put` | DevOps | `wrangler.toml` contains no production secrets. |
| T-07 | Make coupon revert transactional: atomically decrement `times_used` inside same checkpoint as order cancel + restock | Backend | Coupon exhaustion counts match real paid orders under 1000 concurrent cancels. |

### Sprint 2 — Reliability & Correctness (P1)

| ID | Task | Owner | Acceptance Criteria |
|----|------|-------|---------------------|
| T-08 | Fix Hono typing in `public-api/src/index.ts` to match `admin-api` `Env` pattern | Backend | `c.get()` calls are typed; no `any` on context variables. |
| T-09 | Replace cart sync DELETE+INSERT with transactional replace or idempotent upsert | Backend | Crash during sync cannot leave cart empty; at worst, items are unchanged. |
| T-10 | Add idempotency guard to generic queue consumer (check `idempotency_keys` before processing) | Backend | Duplicate queue messages are deduplicated; no double emails or double cancellations. |
| T-11 | Add pagination to `GET /orders`, `GET /api/reviews/:product_id`, admin product list | Backend | All list endpoints accept `?page=&limit=` and return total counts. |
| T-12 | Migrate `wishlist.service.ts` from JSON-in-`metafields_json` to proper `wishlists` table CRUD | Backend | Wishlist uses relational table with unique index on `(customer_id, product_id)`. |
| T-13 | Add atomic loyalty reservation: `UPDATE customers SET loyalty_points_balance = balance - ? WHERE id = ? AND balance >= ?` | Backend | Concurrent redemption from same customer results in one success + one rejection. |
| T-14 | Increase PBKDF2 iterations to 600,000+ (OWASP 2026 recommendation) | Backend | Password hashing/verification uses 600k iterations. |
| T-15 | Replace URL-based `isProd` detection with `c.env.ENVIRONMENT === 'production'` only; remove `localhost` heuristic | Backend | Cookie `secure` flag set only based on explicit environment binding. |

### Sprint 3 — Observability & Hardening (P2)

| ID | Task | Owner | Acceptance Criteria |
|----|------|-------|---------------------|
| T-16 | Add OTel spans (or structured log spans) on: D1 queries, Stripe calls, R2 ops, Queue publishes, cache reads/writes | Backend | Every integration point emits `span_name`, `duration_ms`, `status`, and business attributes (no PII). |
| T-17 | Add correlation IDs to request/response cycle and propagate into Queue message headers | Backend | All log lines for one request share a `trace_id`. |
| T-18 | Complete OpenAPI spec: register Coupon, Review, Wishlist, Fulfillment, RMA, Admin schemas and all API paths | Backend | `openapi.json` covers all public + admin endpoints; Dart/Swift SDKs regenerate without missing types. |
| T-19 | Remove dead soft-lock code paths (`getSoftLockQueries`, `getReleaseSoftLockQueries`) or re-enable behind feature flag | Backend | No dead code paths in `InventoryService`; feature flag guards them if re-enabled. |
| T-20 | Ensure admin product list filters `deleted_at IS NULL` on both parents and variations | Backend | Deleted products do not appear in admin list. |
| T-21 | Add unit tests for: `loyalty.service`, `cart.service`, `wishlist.service`, `fulfillment.service`, `rma.service` | QA + Backend | All `core-services` classes have ≥1 test file with happy path + error cases. |
| T-22 | Remove stale `schema_head.ts` or document its purpose if intentional | Backend | No orphaned schema files in `packages/database/src/`. |

---

## 8. Deployment Notes

- **Pre-deploy gate**: T-01 through T-07 must be merged before any production deploy. Schema unification (T-01) requires a D1 migration; test migrations against local D1 before remote apply.
- **Feature flag**: T-13 (loyalty atomic reservation) can be rolled out with `loyalty_atomic_reservation` flag in `settings` KV.
- **Rollback safety**: T-01 (schema unification) changes the migration source. Back up D1 before applying. If `promotions` table rename causes issues, keep both `coupons` and `promotions` in sync during a deprecation window.
- **Queue**: T-10 changes require reprocessing of dead-letter queue (`ecommerce-events-dlq`) after deploy.
- **SDK regeneration**: T-18 requires re-running the OpenAPI SDK workflow; commit generated SDKs only after review.

---

## 9. Open Questions

1. Should `loyalty_points_balance` remain on `customers` or move to a dedicated `loyalty_accounts` table for stricter audit trail? (Current `loyaltyLedgers` exists but the source-of-truth balance is still on `customers`.)
2. Should `wishlists` be treated as a first-class table or kept as JSON in `metafields_json` for simplicity? (Current code uses both — `wishlists` table exists but `wishlist.service.ts` ignores it.)
3. Should the generic event queue consumer be split into separate queue bindings per message type to avoid single-queue max-retries affecting unrelated flows?
4. Should `InventoryLockManagerDO` be reconciled with D1 after every transaction, or should the storefront read from the DO as source of truth for high-concurrency items?

---

*Generated: 2026-07-22*
*Scope: `/home/user/personalized/cloudflare-ecommerce/apps`, `packages/`, and `contracts/`*
