# Frontend API Contracts Analysis (Milestone 3 - Slice 8)

## 1. Executive Summary
This analysis evaluates how frontend applications (`apps/storefront-ui` and `apps/admin-ui`) consume `packages/contract` Zod schemas and type-safe RPC boundaries. 

**Key Findings:**
1. **Zero Contract Package Consumption**: Neither `apps/storefront-ui` nor `apps/admin-ui` lists `@ecommerce/contract` as a dependency in `package.json` or imports any Zod schemas from `packages/contract`.
2. **Absence of RPC Boundaries**: Frontends make raw untyped `fetch()` requests with manual string endpoints. Neither `apps/public-api` nor `apps/admin-api` exports `AppType` for Hono RPC client usage (`hono/client` / `hc<AppType>()`).
3. **Type Duplication**: Frontends maintain manual local TypeScript interfaces (`apps/admin-ui/src/types.ts`, `apps/storefront-ui/src/store/cartStore.ts`) rather than sharing types exported by `@ecommerce/contract`.
4. **Critical Schema & Type Mismatches**:
   - **CMS Types**: `CmsForm.tsx` offers `article` and `event` options, which are missing from `cmsSchema` enum in `packages/contract/src/admin.ts:47`, causing runtime HTTP 400 validation failures when validated by `apps/admin-api/src/routes/cms.ts:47`.
   - **Customer Marketing Flag**: `AddCustomerModal.tsx` submits `accepts_marketing` as `1` / `0` (number), whereas `customerSchema` in `packages/contract/src/admin.ts:83` expects a boolean (`z.boolean().optional()`), causing HTTP 400 errors upon submission.
   - **Bypassed Contract Schemas**: `apps/admin-api/src/routes/coupons.ts` defines a local inline Zod `couponSchema` with number flags (`is_active: z.number()`), bypassing `@ecommerce/contract`'s `CouponSchema` (which expects boolean `is_active`).
   - **Checkout B2B Fields**: `CheckoutPage` (`apps/storefront-ui/src/app/checkout/page.tsx`) passes `b2b_company` and `b2b_vat_id` as root payload parameters, which are absent from `CheckoutSchema` in `packages/contract/src/index.ts:15`.

---

## 2. Inventory of Frontend Applications

| Application | Stack / Framework | Deployment / Context | Contract Package Status |
|---|---|---|---|
| `apps/storefront-ui` | Next.js 16 (App Router), React 19, Zustand | Cloudflare Pages (`@cloudflare/next-on-pages`) | ❌ Not imported; missing from `package.json` |
| `apps/admin-ui` | Vite 8, React 19, SWR, React Router v7 | SPA (Cloudflare Pages static assets) | ❌ Not imported; missing from `package.json` |

---

## 3. Analysis of Contract Package & RPC Consumption

### 3.1 Package Dependencies
Inspection of package configurations:
- `packages/contract/package.json:2`: Defines package name as `"@ecommerce/contract"`.
- `apps/storefront-ui/package.json`: Does NOT include `"@ecommerce/contract"` in `dependencies` or `devDependencies`.
- `apps/admin-ui/package.json`: Does NOT include `"@ecommerce/contract"` in `dependencies` or `devDependencies`.
- Direct search for `@ecommerce/contract` in `apps/` shows it is ONLY referenced in `apps/public-api` and `apps/admin-api`.

### 3.2 Hono RPC Boundary Analysis
- Search for `hono/client`, `hc(`, or `AppType` across `apps/storefront-ui` and `apps/admin-ui` returned zero results.
- `apps/public-api/src/index.ts` and `apps/admin-api/src/index.ts` do not export their router types (`export type AppType = typeof routes`).
- Frontends use raw `fetch()` calls with manual URL strings:
  - `apps/storefront-ui/src/app/checkout/page.tsx:167`: `fetch(`${API_BASE}/api/checkout`, ...)`
  - `apps/admin-ui/src/tabs/ProductsTab.tsx:16`: `useSWR<{ success: boolean, data: ProductData[] }>('/products')`
  - `apps/admin-ui/src/tabs/CategoriesTab.tsx:64`: `fetch(`${API_BASE_URL}/categories`, ...)`

### 3.3 Manual Type Duplication
- `apps/admin-ui/src/types.ts:1-125`: Defines manual duplicate interfaces (`ProductData`, `ProductVariation`, `CategoryData`, `CustomerData`, `CmsEntry`, `OrderData`, `OrderItemData`, `CouponData`).
- `apps/storefront-ui/src/store/cartStore.ts:4-12`: Defines manual `CartItem` interface.
- `apps/storefront-ui/src/app/checkout/page.tsx:17-21`: Defines manual `GuestAddress` interface.

---

## 4. Import Mismatches, Type Errors, and Schema Discrepancies

### Finding 1: CMS Entry Type Enum Mismatch (Runtime 400 Failure)
- **Source Location (Frontend)**: `apps/admin-ui/src/components/cms/CmsForm.tsx:238-242`
  ```tsx
  <select value={editingEntry.type || 'post'} ...>
    <option value="post">📝 Blog Post</option>
    <option value="article">📄 Article</option>
    <option value="event">📅 Event</option>
    <option value="banner">🖼️ Banner</option>
    <option value="landing_page">🚀 Landing Page</option>
  </select>
  ```
- **Contract Schema**: `packages/contract/src/admin.ts:47`
  ```ts
  export const cmsSchema = z.object({
    type: z.enum(['post', 'page', 'block', 'banner', 'landing_page']),
    ...
  })
  ```
- **Backend Route Validation**: `apps/admin-api/src/routes/cms.ts:47`
  ```ts
  app.post('/', requireRole([...]), zValidator('json', cmsSchema), async (c) => ...
  ```
- **Discrepancy**: Frontend options `article` and `event` are invalid per `cmsSchema`. Selecting either option and submitting results in an HTTP 400 Bad Request error from `admin-api`.
- **Field Name Mismatches**: `CmsForm.tsx` sends `content` (markdown) and `featured_image_url`, whereas `cmsSchema` defines `content_json` and `featured_image`.

### Finding 2: Customer `accepts_marketing` Data Type Error
- **Source Location (Frontend)**: `apps/admin-ui/src/components/customers/AddCustomerModal.tsx:41`
  ```ts
  accepts_marketing: newCustomerAcceptsMarketing ? 1 : 0
  ```
- **Contract Schema**: `packages/contract/src/admin.ts:83`
  ```ts
  export const customerSchema = z.object({
    ...
    accepts_marketing: z.boolean().optional(),
  })
  ```
- **Backend Route Validation**: `apps/admin-api/src/routes/customers.ts:82` & `119`
  ```ts
  customers.post('/customers', ..., zValidator('json', customerSchema), ...)
  ```
- **Discrepancy**: Frontend sends numeric `1` or `0`. `customerSchema` requires boolean (`true` / `false`). Zod validation fails before request processing.

### Finding 3: Coupon Schema Bypass and `is_active` Type Inconsistency
- **Source Location (Frontend)**: `apps/admin-ui/src/tabs/PromotionsTab.tsx:20`, `83`
  - Sends `is_active: 1` (number).
- **Contract Schema**: `packages/contract/src/index.ts:57`
  - `CouponSchema` defines `is_active: z.boolean().default(true)`.
- **Backend Discrepancy**: `apps/admin-api/src/routes/coupons.ts:21` bypasses `@ecommerce/contract` by creating a local Zod schema:
  ```ts
  const couponSchema = z.object({
    ...
    is_active: z.number().optional(),
  })
  ```

### Finding 4: Storefront Checkout B2B Fields Missing from Contract
- **Source Location (Frontend)**: `apps/storefront-ui/src/app/checkout/page.tsx:161-164`
  ```ts
  if (isB2B) {
    payload.b2b_company = b2bCompany;
    payload.b2b_vat_id = b2bVatId;
  }
  ```
- **Contract Schema**: `packages/contract/src/index.ts:15-38`
  - `CheckoutSchema` defines `shipping_address_json`, `billing_address_json`, `email`, `items`, etc., but does not include `b2b_company` or `b2b_vat_id` as top-level fields.

---

## 5. Architectural Recommendations & Remediation Plan

1. **Add Contract Package Dependency**:
   - Add `"@ecommerce/contract": "workspace:*"` to `apps/storefront-ui/package.json` and `apps/admin-ui/package.json`.
2. **Align Contract Schemas**:
   - Update `cmsSchema` in `packages/contract/src/admin.ts` to support `article` and `event` enum values, or update `CmsForm.tsx` to align with contract type values.
   - Update `customerSchema` in `packages/contract/src/admin.ts` or `AddCustomerModal.tsx` to standardize `accepts_marketing` as a boolean (`boolean` in Zod and JSON payload).
   - Include `b2b_company` and `b2b_vat_id` in `CheckoutSchema` in `packages/contract/src/index.ts`.
3. **Consolidate Backend Route Schemas**:
   - Refactor `apps/admin-api/src/routes/coupons.ts` to import and use `CouponSchema` from `@ecommerce/contract` instead of local inline schema definitions.
4. **Establish Type-Safe Hono RPC Client**:
   - Export `AppType` from `apps/public-api` and `apps/admin-api`.
   - Implement type-safe Hono client instance (`hc<AppType>`) in `apps/storefront-ui` and `apps/admin-ui` to eliminate untyped `fetch()` calls and replace manual type definitions in `apps/admin-ui/src/types.ts`.
