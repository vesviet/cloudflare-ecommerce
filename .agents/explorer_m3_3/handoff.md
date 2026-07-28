# Handoff Report — Frontend Contract Exploration (Milestone 3 - Slice 8)

## 1. Observation

Direct observations from inspecting repository source files and package configurations:

1. **Package Dependencies Missing**:
   - `packages/contract/package.json:2`: Declares `"name": "@ecommerce/contract"`.
   - `apps/storefront-ui/package.json:12-22`: `dependencies` lists `@marsidev/react-turnstile`, `@stripe/react-stripe-js`, `@stripe/stripe-js`, `lucide-react`, `next`, `react`, `react-dom`, `react-markdown`, `zustand`. `@ecommerce/contract` is **absent**.
   - `apps/admin-ui/package.json:12-24`: `dependencies` lists `@uiw/react-md-editor`, `clsx`, `framer-motion`, `lucide-react`, `react`, `react-dom`, `react-hook-form`, `react-markdown`, `react-router-dom`, `swr`, `tailwind-merge`. `@ecommerce/contract` is **absent**.

2. **Absence of Hono RPC Client**:
   - Workspace-wide search for `hono/client`, `hc(`, or `AppType` across `apps/storefront-ui` and `apps/admin-ui` returned `No results found`.
   - `apps/storefront-ui/src/app/checkout/page.tsx:167`: Uses untyped raw fetch `fetch(`${API_BASE}/api/checkout`, { method: 'POST', body: JSON.stringify(payload) })`.
   - `apps/admin-ui/src/tabs/ProductsTab.tsx:16`: Uses `useSWR<{ success: boolean, data: ProductData[] }>('/products')`.

3. **Manual Type Duplication**:
   - `apps/admin-ui/src/types.ts:11-30`: Manually defines `interface ProductData { ... }`, `CategoryData`, `CustomerData`, `CmsEntry`, `OrderData`, `CouponData`.

4. **CMS Enum Value Mismatch**:
   - `apps/admin-ui/src/components/cms/CmsForm.tsx:238-242`: Dropdown options include `<option value="article">` and `<option value="event">`.
   - `packages/contract/src/admin.ts:47`: `cmsSchema` defines `type: z.enum(['post', 'page', 'block', 'banner', 'landing_page'])`.
   - `apps/admin-api/src/routes/cms.ts:47`: Enforces `zValidator('json', cmsSchema)`. Submitting `article` or `event` results in a HTTP 400 validation error from Zod.

5. **Customer `accepts_marketing` Data Type Mismatch**:
   - `apps/admin-ui/src/components/customers/AddCustomerModal.tsx:41`: Submits `accepts_marketing: newCustomerAcceptsMarketing ? 1 : 0` (number).
   - `packages/contract/src/admin.ts:83`: `customerSchema` defines `accepts_marketing: z.boolean().optional()`.
   - `apps/admin-api/src/routes/customers.ts:82, 119`: Enforces `zValidator('json', customerSchema)`. Submitting numeric `1` or `0` triggers Zod validation failure ("Expected boolean, received number").

6. **Local Schema Bypass in `coupons.ts`**:
   - `apps/admin-api/src/routes/coupons.ts:15-26`: Defines a local `const couponSchema = z.object({ is_active: z.number().optional(), ... })`, overriding `@ecommerce/contract`'s `CouponSchema` (which uses `is_active: z.boolean()`).

7. **Storefront Checkout B2B Payload Discrepancy**:
   - `apps/storefront-ui/src/app/checkout/page.tsx:161-164`: Appends `payload.b2b_company` and `payload.b2b_vat_id` to root payload.
   - `packages/contract/src/index.ts:15-38`: `CheckoutSchema` omits `b2b_company` and `b2b_vat_id`.

---

## 2. Logic Chain

1. **Step 1 (Dependencies)**: Observation #1 confirms that neither `apps/storefront-ui` nor `apps/admin-ui` depends on `@ecommerce/contract` in `package.json`. Therefore, neither frontend application consumes shared Zod schemas at build or run time.
2. **Step 2 (RPC Client)**: Observation #2 shows zero imports of `hono/client` or `AppType` in frontend code, proving that type-safe RPC boundaries do not exist between frontend UI applications and backend Worker APIs.
3. **Step 3 (Type Duplication)**: Observation #3 demonstrates that because contracts are not imported, `apps/admin-ui` has created local, parallel interface declarations in `src/types.ts` that risk drifting out of sync with backend database models.
4. **Step 4 (CMS Type Mismatch)**: Observation #4 links `CmsForm.tsx` dropdown values (`article`, `event`) directly to `packages/contract/src/admin.ts:47` (`cmsSchema`) and `apps/admin-api/src/routes/cms.ts:47` (`zValidator`). Because `cmsSchema` lacks `article` and `event`, any attempt by an administrator to create or update content under these categories will fail at runtime with HTTP 400 Bad Request.
5. **Step 5 (Customer Flag Mismatch)**: Observation #5 connects `AddCustomerModal.tsx` (`accepts_marketing: 1 | 0`) to `customerSchema` (`z.boolean()`). The backend route uses `zValidator('json', customerSchema)`, so sending integers causes Zod type mismatch errors.
6. **Step 6 (Contract Bypass)**: Observation #6 demonstrates that `apps/admin-api/src/routes/coupons.ts` works around type inconsistencies by defining its own local Zod schema, undermining the single-source-of-truth objective of `packages/contract`.

---

## 3. Caveats

- **Scope Limit**: Investigation focused on static source analysis and contract schema boundaries across `apps/storefront-ui`, `apps/admin-ui`, `packages/contract`, `apps/public-api`, and `apps/admin-api`.
- **Runtime Execution**: Frontends were not executed in a live browser session during this inspection pass, but all schema type mismatches were verified against Zod validation logic in backend route definitions.

---

## 4. Conclusion

Frontend applications (`apps/storefront-ui` and `apps/admin-ui`) are currently completely decoupled from `packages/contract` Zod schemas and Hono type-safe RPC boundaries. This leads to duplicate interface maintenance, raw untyped `fetch()` calls, and runtime HTTP 400 errors due to schema definition mismatches (CMS types and customer marketing flags). 

To achieve Milestone 3 (API Contracts Workspace - Slice 8) objectives, the monorepo requires:
1. Adding `@ecommerce/contract` as a dependency to frontend apps.
2. Updating `packages/contract` schemas to align with frontend UI form inputs (or updating UI components to align with contract definitions).
3. Exporting backend `AppType` definitions and establishing `hono/client` RPC clients in frontends.

---

## 5. Verification Method

To independently verify these findings:

1. **Check Dependency Isolation**:
   ```bash
   grep -i "contract" /home/user/personalized/cloudflare-ecommerce/apps/storefront-ui/package.json
   grep -i "contract" /home/user/personalized/cloudflare-ecommerce/apps/admin-ui/package.json
   ```
   *Expected Result*: Output is empty (no contract package declared).

2. **Inspect CMS Type Enum Mismatch**:
   - Inspect lines 238-242 of `/home/user/personalized/cloudflare-ecommerce/apps/admin-ui/src/components/cms/CmsForm.tsx`.
   - Inspect line 47 of `/home/user/personalized/cloudflare-ecommerce/packages/contract/src/admin.ts`.
   - Note that `article` and `event` exist in `CmsForm.tsx` but are absent in `cmsSchema`.

3. **Inspect Customer Marketing Flag Type Mismatch**:
   - Inspect line 41 of `/home/user/personalized/cloudflare-ecommerce/apps/admin-ui/src/components/customers/AddCustomerModal.tsx`.
   - Inspect line 83 of `/home/user/personalized/cloudflare-ecommerce/packages/contract/src/admin.ts`.
   - Note `1 : 0` (number) vs `z.boolean().optional()`.

4. **Inspect RPC Client Absence**:
   ```bash
   grep -rn "hono/client" /home/user/personalized/cloudflare-ecommerce/apps/
   ```
   *Expected Result*: No matching lines found in frontend applications.
