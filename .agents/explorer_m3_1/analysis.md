# Analysis Report: `@ecommerce/contract` Package Audit (Milestone 3 - Slice 8)

**Target Workspace**: `/home/user/personalized/cloudflare-ecommerce/packages/contract`  
**Date**: 2026-07-28  
**Investigator**: Explorer 1 (Milestone 3)

---

## Executive Summary

An exhaustive analysis of `/home/user/personalized/cloudflare-ecommerce/packages/contract` was conducted to evaluate its current implementation, build/test tooling, Zod schema coverage, TypeScript type exports, and readiness for type-safe RPC client integration across Hono backend workers (`apps/public-api`, `apps/admin-api`) and frontend clients (`apps/storefront-ui`, `apps/admin-ui`).

### Key Findings Overview
1. **Missing `tsconfig.json` & Build Pipeline**: `packages/contract` completely lacks a `tsconfig.json` file. It has no build script (`build`) to emit JavaScript/declaration files (`.d.ts`), no `lint` or `typecheck` scripts, and `package.json` lacks an `exports` map or `types` field.
2. **Zero TypeScript Type Exports**: None of the Zod schemas export their inferred TypeScript types (`export type X = z.infer<typeof XSchema>`). Consumer apps must manually infer types or duplicate interface declarations.
3. **Schema Duplications & Inconsistent Naming**:
   - Duplicate schemas exist between `src/index.ts` and `src/admin.ts` (e.g. `CheckoutSchema` vs `checkoutSchema`, `FulfillmentSchema` vs `fulfillSchema`).
   - Inconsistent casing: `src/index.ts` uses PascalCase (`ProductSchema`), while `src/admin.ts` uses camelCase (`categorySchema`, `adminUserSchema`).
   - Inconsistent Zod library imports: `src/index.ts` imports `@hono/zod-openapi`, while `src/admin.ts` imports standard `zod`. Admin schemas lack `.openapi()` metadata.
4. **Domain Schema Gaps**: Key domain entities are missing schemas in `packages/contract`, including `Cart`/`CartItem`, `Order`/`OrderItem` response details, `Category` (OpenAPI-enabled), `CustomerAuth`/`Login`/`Register`, `Media`/`Upload`, `FeatureFlag`, and pagination query parameters.
5. **RPC Boundary Disconnect**:
   - Neither frontend app (`apps/storefront-ui` or `apps/admin-ui`) lists `@ecommerce/contract` in its `package.json` dependencies.
   - Hono API routes in `public-api` and `admin-api` do not export shared `AppType` contracts or RPC client definitions via `@ecommerce/contract`.
6. **OpenAPI Generator Gaps**: `scripts/generate-openapi.ts` only registers 3 schemas (`ProductSchema`, `CheckoutSchema`, `ErrorResponseSchema`) out of 16+ schemas defined in the package.

---

## 1. Directory & File Inventory

```
packages/contract/
├── openapi.json                  # Generated OpenAPI 3.0.0 JSON specification
├── package.json                  # Package configuration (@ecommerce/contract)
├── vitest.config.mts             # Vitest test configuration
├── scripts/
│   └── generate-openapi.ts      # OpenAPI generation script via @asteasolutions/zod-to-openapi
└── src/
    ├── admin.ts                  # Admin Zod schema definitions (camelCase, standard zod)
    ├── index.ts                  # Public/core Zod schemas (PascalCase, @hono/zod-openapi) & re-exports
    └── __tests__/
        ├── order.test.ts         # Vitest unit test for fulfillSchema
        └── product.test.ts       # Vitest unit test for productFormSchema
```

*Note*: `tsconfig.json` is missing from `packages/contract`.

---

## 2. Package Configuration Audit (`package.json`, `tsconfig.json`, Turbo)

### `package.json`
```json
{
  "name": "@ecommerce/contract",
  "version": "1.0.0",
  "main": "src/index.ts",
  "scripts": {
    "build:openapi": "tsx scripts/generate-openapi.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@hono/zod-openapi": "^0.14.9",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@asteasolutions/zod-to-openapi": "^7.3.4",
    "tsx": "^4.23.1",
    "vitest": "^3.2.7"
  }
}
```

### Critical Package Gaps
1. **Missing `tsconfig.json`**:
   - TypeScript compiler cannot perform type-checking, declaration emission, or IDE resolution natively inside `packages/contract`.
   - Contrast with `packages/core-services/tsconfig.json` which specifies `target: "ES2022"`, `moduleResolution: "Bundler"`, `declaration: true`, `outDir: "./dist"`.
2. **Missing `types` & `exports` Fields**:
   - `"main": "src/index.ts"` points directly to uncompiled TypeScript source.
   - Missing `"types": "./src/index.ts"` (or `./dist/index.d.ts`).
   - Missing modern Node ESM package export mapping:
     ```json
     "exports": {
       ".": {
         "types": "./src/index.ts",
         "default": "./src/index.ts"
       }
     }
     ```
3. **Missing Scripts**:
   - No `"build"` script: `pnpm build` or `turbo run build` skips `packages/contract` entirely.
   - No `"typecheck"` script: `tsc --noEmit` cannot be executed.
   - No `"lint"` script: `eslint` or linter checks are bypassed.

---

## 3. Detailed Zod Schema & Type Export Review

### Defined Schemas Summary

| Module | Schema Export Name | Schema Target / Entity | Casing & OpenAPI Status | Duplicate / Conflict |
|---|---|---|---|---|
| `src/index.ts` | `ProductSchema` | Product Catalog | PascalCase, `@hono/zod-openapi` | Conflicts with `productFormSchema` |
| `src/index.ts` | `CheckoutSchema` | Guest & User Checkout | PascalCase, `@hono/zod-openapi` | Duplicate of `checkoutSchema` |
| `src/index.ts` | `ErrorResponseSchema` | Standard Error Response | PascalCase, `@hono/zod-openapi` | - |
| `src/index.ts` | `CouponSchema` | Discount Coupons | PascalCase, `@hono/zod-openapi` | - |
| `src/index.ts` | `ReviewSchema` | Product Customer Reviews | PascalCase, `@hono/zod-openapi` | - |
| `src/index.ts` | `WishlistSchema` | Customer Wishlist Item | PascalCase, `@hono/zod-openapi` | - |
| `src/index.ts` | `FulfillmentSchema` | Order Fulfillment | PascalCase, `@hono/zod-openapi` | Duplicate of `fulfillSchema` |
| `src/index.ts` | `RMASchema` | Return Merchandise Auth | PascalCase, `@hono/zod-openapi` | - |
| `src/admin.ts` | `adminUserSchema` | Admin User CRUD | camelCase, plain `zod` | - |
| `src/admin.ts` | `adminUserStatusSchema` | Admin User Status | camelCase, plain `zod` | - |
| `src/admin.ts` | `categorySchema` | Admin Category CRUD | camelCase, plain `zod` | - |
| `src/admin.ts` | `updateCategorySchema` | Admin Category Update | camelCase, plain `zod` | - |
| `src/admin.ts` | `checkoutSchema` | Admin Checkout Form | camelCase, plain `zod` | Duplicate of `CheckoutSchema` |
| `src/admin.ts` | `cmsSchema` | Admin Content / Banner | camelCase, plain `zod` | - |
| `src/admin.ts` | `updateCmsSchema` | Admin Content Update | camelCase, plain `zod` | - |
| `src/admin.ts` | `customerSchema` | Customer Profile / CRUD | camelCase, plain `zod` | - |
| `src/admin.ts` | `resetPasswordSchema` | Customer Password Reset | camelCase, plain `zod` | - |
| `src/admin.ts` | `fulfillSchema` | Admin Fulfillment Action | camelCase, plain `zod` | Duplicate of `FulfillmentSchema` |
| `src/admin.ts` | `productFormSchema` | Admin Product Form | camelCase, plain `zod` | Conflicts with `ProductSchema` |

### Critical Schema Gaps & Flaws

1. **Zero Exported TypeScript Types**:
   - `packages/contract` exports **0** TypeScript `z.infer<typeof ...>` types.
   - Applications importing `@ecommerce/contract` must write `z.infer<typeof Schema>` manually in every consumer file.
2. **Schema Duplication & Inconsistency**:
   - `CheckoutSchema` (`index.ts`, PascalCase, `@hono/zod-openapi`) vs `checkoutSchema` (`admin.ts`, camelCase, plain `zod`).
   - `FulfillmentSchema` (`index.ts`, PascalCase, `@hono/zod-openapi`) vs `fulfillSchema` (`admin.ts`, camelCase, plain `zod`).
   - `ProductSchema` (`index.ts`, read/response shape) vs `productFormSchema` (`admin.ts`, form submission shape with stringified JSON/images).
3. **Missing Domain Entities**:
   - **Cart / Cart Items**: No `CartSchema`, `CartItemSchema`, `AddToCartInputSchema`, or `UpdateCartItemSchema`.
   - **Order Details**: `ProductSchema` and `CheckoutSchema` exist, but no `OrderSchema` or `OrderItemSchema` for API GET responses.
   - **Category (Public/OpenAPI)**: `categorySchema` in `admin.ts` is plain Zod; no OpenAPI-compatible `CategorySchema`.
   - **Customer Auth**: `customerSchema` exists in `admin.ts`, but no `CustomerAuthSchema`, `CustomerLoginSchema`, `CustomerRegisterSchema`.
   - **Media**: No `UploadMediaSchema` or `MediaResponseSchema`.
   - **Feature Flags / Settings**: No `FeatureFlagSchema` or `SettingSchema`.
   - **Pagination & Filters**: No `PaginationQuerySchema` (`page`, `limit`, `sort`, `search`).

---

## 4. Build, Linting, & Unit Testing Evaluation

### Vitest Test Suite
- Current tests reside in `packages/contract/src/__tests__/`:
  - `order.test.ts`: Validates `fulfillSchema` against valid payloads, optional items, and missing tracking numbers.
  - `product.test.ts`: Validates `productFormSchema` against simple products, variable products, and missing required SKU/name.
- Test execution: `pnpm --filter @ecommerce/contract test` succeeds (6/6 passed, 945ms).
- **Test Coverage Gaps**:
  - `CheckoutSchema`, `ProductSchema`, `CouponSchema`, `ReviewSchema`, `WishlistSchema`, `FulfillmentSchema`, `RMASchema`, `adminUserSchema`, `categorySchema`, `cmsSchema`, `customerSchema` are completely un-tested.
  - No test suite verifies that `generate-openapi.ts` runs without throwing or produces valid JSON output.

### OpenAPI Generator (`scripts/generate-openapi.ts`)
- Execution command: `pnpm --filter @ecommerce/contract build:openapi` succeeds and outputs `openapi.json` (5,491 bytes).
- **Defect**: The generator script registers only `ProductSchema`, `CheckoutSchema`, and `ErrorResponseSchema`. All 13+ remaining schemas in `index.ts` and `admin.ts` are missing from the OpenAPI registry.

---

## 5. Type-Safe RPC & Frontend Integration Strategy

### Current State of Monorepo Imports
- **`apps/public-api`**: Imports `CheckoutSchema` from `@ecommerce/contract`.
- **`apps/admin-api`**: Imports `categorySchema`, `productFormSchema`, `adminUserSchema`, `cmsSchema`, `checkoutSchema`, `fulfillSchema`, `customerSchema` from `@ecommerce/contract`.
- **`apps/storefront-ui`** (Next.js): Does **NOT** depend on `@ecommerce/contract` (missing from `package.json`).
- **`apps/admin-ui`** (Vite/React): Does **NOT** depend on `@ecommerce/contract` (missing from `package.json`).

### Recommended Roadmap for RPC Boundaries
1. **Standardize & Export TypeScript Types**:
   - In `packages/contract/src/index.ts`, export inferred types for all Zod schemas:
     ```ts
     export type Product = z.infer<typeof ProductSchema>;
     export type CheckoutInput = z.infer<typeof CheckoutSchema>;
     export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
     export type Category = z.infer<typeof CategorySchema>;
     export type AdminUser = z.infer<typeof adminUserSchema>;
     export type Customer = z.infer<typeof customerSchema>;
     export type CMSItem = z.infer<typeof cmsSchema>;
     export type OrderFulfillment = z.infer<typeof FulfillmentSchema>;
     // ... and all other entities
     ```
2. **Harmonize Casing & OpenAPI Declarations**:
   - Migrate all schemas in `admin.ts` to use `@hono/zod-openapi` `z` and add `.openapi('SchemaName')` metadata.
   - Consolidate duplicate schemas (`CheckoutSchema` vs `checkoutSchema`, `FulfillmentSchema` vs `fulfillSchema`) into clean input/output schema variants (e.g. `CheckoutInputSchema`, `FulfillmentInputSchema`).
3. **Configure TypeScript Build & Package Exports**:
   - Add `packages/contract/tsconfig.json` with `declaration: true` and `outDir: "./dist"`.
   - Update `packages/contract/package.json` to include:
     - `"build": "tsc"`
     - `"typecheck": "tsc --noEmit"`
     - `"lint": "eslint ."`
     - `"types": "./dist/index.d.ts"`
     - `"exports"` map for ESM/CJS compatibility.
4. **Connect Frontends to `@ecommerce/contract`**:
   - Add `"@ecommerce/contract": "workspace:*"` to `apps/storefront-ui/package.json` and `apps/admin-ui/package.json`.
5. **Establish Hono RPC Route Contracts**:
   - Define shared Hono route contracts or export `AppType` definitions in `@ecommerce/contract` (or `@ecommerce/shared-routes`) so `hc<AppType>` can be instantiated in Next.js and Vite for end-to-end type safety without manual fetch typing.
