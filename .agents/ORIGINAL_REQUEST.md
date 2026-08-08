# Original User Request

## Initial Request — 2026-08-08T09:54:58Z

Refactor the admin system of the `cloudflare-ecommerce` monorepo — a production Cloudflare Workers + Vite/React e-commerce admin panel. The goal is to fix all known bugs, structural issues, and code quality problems in the admin pipeline (admin-api backend + admin-ui frontend), producing clean TypeScript code that passes build and lint checks.

Working directory: D:\myproject\cloudflare-ecommerce

Integrity mode: development

---

## Context

The admin system spans 2 apps:
- `apps/admin-api/` — Hono.js on Cloudflare Workers (admin REST API)
- `apps/admin-ui/` — Vite + React SPA (admin dashboard)

### admin-api key files:
- `src/index.ts` — Main Hono app, CORS, auth middleware, route mounting
- `src/middleware/auth.ts` — CF Zero Trust JWT verification + RBAC `requireRole`
- `src/middleware/audit.ts` — Audit trail middleware (if exists)
- `src/routes/orders.ts` — 400-line orders CRUD + fulfill/refund/approve/cancel
- `src/routes/products.ts` — 366-line products CRUD with image upload, variants
- `src/routes/customers.ts` — 216-line customers CRUD
- `src/routes/coupons.ts` — 201-line coupons CRUD with `mapPromotionToCoupon` data adapter
- `src/routes/landing-pages.ts` — LP CRUD (already refactored)
- `src/routes/checkout.ts` — 163-line admin POS order creation
- `src/routes/adminUsers.ts` — 85-line admin users CRUD
- `src/routes/categories.ts` — Categories CRUD
- `src/routes/cms.ts` — CMS CRUD
- `src/routes/settings.ts` — Settings CRUD
- `src/routes/metrics.ts` — Dashboard metrics
- `src/types.ts` — Bindings type

### admin-ui key files:
- `src/App.tsx` — 233-line root component: auth flow, routing, lazy tab loading
- `src/App.css` — 1312-line stylesheet with CSS custom properties
- `src/types.ts` — 126-line type definitions (ProductData, OrderData, CustomerData, etc.)
- `src/tabs/` — OverviewTab, OrdersTab, ProductsTab, CategoriesTab, CustomersTab, CmsTab, TeamTab, SettingsTab, PromotionsTab, LandingPagesTab, LandingLeadsTab
- `src/components/Sidebar.tsx` — Navigation sidebar
- `src/components/OrderDetailModal.tsx` — 10707-byte order detail modal
- `src/components/RefundModal.tsx` — Refund flow modal
- `src/components/ui/` — GlassCard, SkeletonLoader, Pagination, ConfirmDialog
- `src/lib/apiFetch.ts` — Authenticated fetch wrapper
- `src/lib/useEscapeKey.ts` — Escape key hook

---

## Known Issues Found During Research

### Issue 1 — admin-api: Inconsistent error handling pattern across routes
Most routes catch errors and return `{ success: false, error: err.message }` but some routes expose raw DB error messages that may leak schema details. Some routes (e.g., `products.ts`) don't use `requireRole` on the list/get endpoints but do use it on write endpoints — inconsistency in who can read vs write.

### Issue 2 — admin-api/routes/orders.ts: Landing leads route misplaced
`GET /landing-leads` is defined in `orders.ts` (lines 289-330) even though leads belong to the landing pages domain. This violates single responsibility. The route should either be in its own file `landing-leads.ts` or in `landing-pages.ts`.

### Issue 3 — admin-api/routes/checkout.ts: Hardcoded shipping fee
Line 104: `const shippingFeeCents = 999;` — hardcoded magic number with no constant, no comment, and no connection to the settings system used elsewhere. This is an admin POS checkout route that ignores address-based shipping zones.

### Issue 4 — admin-api/routes/coupons.ts: `mapPromotionToCoupon` data adapter is a code smell
The `mapPromotionToCoupon` function (lines 15-29) duplicates field names (e.g., `expires_at: promo.expires_at ?? promo.ends_at, ends_at: promo.expires_at ?? promo.ends_at`) and exists only because the DB schema (promotions table) uses different field names (`ends_at`, `usage_limit`, `times_used`) than the frontend expects (`expires_at`, `max_uses`, `uses`). The adapter makes both field names exist simultaneously which is confusing. The fix should be to either:
  a) Make the API always return the canonical field names from the `promotions` table
  b) Create a proper typed DTO type instead of spreading both names

### Issue 5 — admin-ui/App.tsx: RBAC route guard is fragile and incomplete
Lines 143-148 in `App.tsx`:
```tsx
if (user?.role === 'editor' && !['/cms', '/categories'].includes(location.pathname)) {
  return <Navigate to="/cms" replace />;
}
if (user?.role === 'support' && !['/orders', '/customers'].includes(location.pathname)) {
  return <Navigate to="/orders" replace />;
}
```
This RBAC logic:
1. Is outside the router — it fires on every render, not just navigation
2. Uses string path comparison instead of a proper route allowlist config
3. Missing the `manager` role constraints (manager should access everything except `/team` and `/settings`)
4. Missing the `landing_page_admin` or any custom role handling
5. The `/landing-leads` and `/landing-pages` paths are not in the allowlist for `editor`

### Issue 6 — admin-ui/App.tsx: Route animation boilerplate duplicated 11 times
Every `<Route>` element in `App.tsx` (lines 161-220) wraps its element in an identical `<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>` wrapper. This is 40 lines of identical boilerplate that should be extracted into a helper component `<PageTransition>` or `<AnimatedRoute>`.

### Issue 7 — admin-ui/types.ts: `OrderData` type has stale/incorrect fields
`OrderData.status` type (line 91) lists `'pending_payment' | 'processing' | 'completed' | 'cancelled' | 'refunded' | 'failed'` but the actual order status state machine now includes `'confirmed'`, `'pending'`, `'shipped'` (used in the landing page COD flow from `orders.ts` lines 312-315 and 352). The type is out of sync with the DB.

### Issue 8 — admin-ui/OverviewTab.tsx: Currency formatting is USD, not VNĐ
Line 35: `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)` — The business operates in VNĐ. This should use VNĐ formatting consistent with the rest of the storefront.

### Issue 9 — admin-api/routes/orders.ts: Missing `requireRole` on GET /orders and GET /orders/:id
`orders.get('/orders', ...)` (line 13) and `orders.get('/orders/:id', ...)` (line 34) have NO `requireRole` middleware. Any authenticated admin user (even `editor` role) can read orders, which may not be intended. Compare with the POST/refund/fulfill routes that do use `requireRole(['superadmin', 'manager', 'support'])`.

### Issue 10 — admin-api/routes/products.ts: Product DELETE endpoint is missing
The products route has GET (list), GET (search), POST (create), PUT (update) — but NO DELETE endpoint. There's no way to delete a product from the admin API. The products table has a `deleted_at` column for soft-deletes.

---

## Requirements

### R1. Extract `GET /landing-leads` from orders.ts to its own route file
Create `apps/admin-api/src/routes/landingLeads.ts` with the landing leads route (moved from `orders.ts` lines 289-330). Mount it in `index.ts` as `app.route('/', landingLeadsRoutes)`. Remove it from `orders.ts`.

### R2. Add `requireRole` to GET /orders and GET /orders/:id
Add `requireRole(['superadmin', 'manager', 'support'])` middleware to both read-only order endpoints in `orders.ts`.

### R3. Add product soft-delete endpoint
Add `DELETE /products/:id` in `products.ts` that soft-deletes by setting `deleted_at = CURRENT_TIMESTAMP`. Only `superadmin` and `manager` can delete.

### R4. Fix `mapPromotionToCoupon` in coupons.ts — use canonical field names
Refactor to return only the canonical DB field names (`ends_at`, `usage_limit`, `times_used`) rather than duplicating aliases. Create a `CouponDTO` TypeScript type. Update callers in `admin-ui` if they rely on the alias names (`expires_at`, `max_uses`, `uses`).

### R5. Fix RBAC route guard in App.tsx
Extract a `ROLE_ROUTES` config object:
```ts
const ROLE_ROUTES: Record<string, string[]> = {
  editor: ['/cms', '/categories', '/landing-pages', '/landing-leads'],
  support: ['/orders', '/customers', '/landing-leads'],
  manager: ['/overview', '/orders', '/products', '/categories', '/customers', '/cms', '/promotions', '/landing-pages', '/landing-leads'],
};
```
Use this config in a proper `<ProtectedRoute>` wrapper component instead of the fragile inline if-statements. `superadmin` has access to all routes.

### R6. Extract `<PageTransition>` component
Create `apps/admin-ui/src/components/PageTransition.tsx` that wraps children in the motion.div animation. Replace the 11 duplicated route wrappers in `App.tsx` with `<PageTransition>`. This reduces App.tsx by ~40 lines.

### R7. Fix `OrderData` status type
In `apps/admin-ui/src/types.ts`, update `OrderData.status` to:
```ts
status: 'pending' | 'pending_payment' | 'confirmed' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded' | 'failed';
```

### R8. Fix currency formatting in OverviewTab.tsx
Replace the USD formatter with VNĐ:
```ts
const formatCurrency = (amount: number | string) => {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  // Amounts are stored as minor units (VNĐ × 100), divide by 100 to get display VNĐ
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n / 100);
};
```
Also add a comment explaining the minor unit convention.

### R9. Document magic shipping fee constant in admin checkout.ts
Add inline constant and comment:
```ts
// Flat shipping fee for admin POS orders (VNĐ minor units, zone-agnostic).
// TODO: Replace with address-based zone lookup from the public-api shipping-estimate endpoint.
const ADMIN_FLAT_SHIPPING_FEE_VND_CENTS = 999;
```

### R10. Build + Lint + Test pass
After all changes:
- `pnpm --filter @ecommerce/admin-ui build` → exit 0
- `pnpm --filter @ecommerce/admin-api lint` → 0 errors
- All pre-existing tests pass: `pnpm --filter @ecommerce/admin-api test`

---

## Sub-Tasks (auto-created)

### Task 1 — Research Phase
Read ALL the following files thoroughly before writing any code:
- `apps/admin-api/src/index.ts`
- `apps/admin-api/src/middleware/auth.ts`
- `apps/admin-api/src/routes/orders.ts` (full 400 lines)
- `apps/admin-api/src/routes/products.ts` (full 366 lines)
- `apps/admin-api/src/routes/customers.ts`
- `apps/admin-api/src/routes/coupons.ts` (full)
- `apps/admin-api/src/routes/checkout.ts`
- `apps/admin-api/src/routes/adminUsers.ts`
- `apps/admin-ui/src/App.tsx` (full 233 lines)
- `apps/admin-ui/src/types.ts` (full 126 lines)
- `apps/admin-ui/src/tabs/OverviewTab.tsx`
- `apps/admin-ui/src/tabs/PromotionsTab.tsx` (to understand coupon field usage)
- `apps/admin-ui/src/lib/apiFetch.ts`
Also scan `apps/admin-api/src/routes/__tests__/` directory for existing test patterns.

### Task 2 — R1: Extract landing-leads route
Create `landingLeads.ts`, mount in `index.ts`, remove from `orders.ts`.

### Task 3 — R2 + R9: RBAC fixes in admin-api
Add `requireRole` to GET /orders endpoints. Document shipping constant in checkout.ts.

### Task 4 — R3: Add product DELETE endpoint
Add soft-delete endpoint to `products.ts`.

### Task 5 — R4: Fix mapPromotionToCoupon
Refactor to canonical field names, create `CouponDTO` type, check admin-ui callers.

### Task 6 — R5 + R6: RBAC guard + PageTransition in admin-ui
Extract `ROLE_ROUTES` config and `ProtectedRoute` component. Create `PageTransition.tsx`. Update `App.tsx`.

### Task 7 — R7 + R8: Fix types + currency in admin-ui
Fix `OrderData.status` union type. Fix VNĐ currency formatting in OverviewTab.

### Task 8 — R10: Build, Lint, Test, Debug
Run all checks. Fix any TypeScript or ESLint errors. Iterate until all pass.

### Task 9 — Git Commit & Push
After all checks pass:
```
git add .
git commit -m "refactor(admin): route extraction, RBAC guard, soft-delete, VND currency, type fixes"
git push
```

---

## Acceptance Criteria

### admin-api
- [ ] `GET /landing-leads` is defined in `routes/landingLeads.ts`, NOT in `orders.ts`
- [ ] `GET /orders` and `GET /orders/:id` have `requireRole(['superadmin', 'manager', 'support'])` middleware
- [ ] `DELETE /products/:id` exists and performs soft-delete (`deleted_at = CURRENT_TIMESTAMP`), requires `superadmin` or `manager`
- [ ] `mapPromotionToCoupon` is removed or replaced with a typed `CouponDTO` that uses canonical field names
- [ ] Admin checkout.ts has a named constant for the shipping fee with an explanatory comment

### admin-ui
- [ ] `ROLE_ROUTES` config object exists mapping roles to allowed paths
- [ ] Route guard uses `ROLE_ROUTES` config, not hardcoded path strings in if-statements
- [ ] `PageTransition.tsx` component exists and is used in all 11 routes in `App.tsx`
- [ ] `OrderData.status` includes `'pending'`, `'confirmed'`, `'shipped'`
- [ ] `OverviewTab.tsx` `formatCurrency` uses VNĐ locale with a comment explaining `/100` minor unit conversion
- [ ] `App.tsx` is shorter (by at least 30 lines) after refactoring

### Build & Lint
- [ ] `pnpm --filter @ecommerce/admin-ui build` exits 0
- [ ] `pnpm --filter @ecommerce/admin-api lint` exits 0 errors
- [ ] All pre-existing tests pass

### Final Commit
- [ ] All changes committed and pushed: `refactor(admin): route extraction, RBAC guard, soft-delete, VND currency, type fixes`
