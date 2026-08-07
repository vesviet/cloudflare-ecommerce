# Handoff Report: Storefront UI Landing Page Refactoring (M2)

**Worker**: teamwork_preview_worker_m2_1  
**Milestone**: M2 (Storefront UI Landing Page System Refactor)  
**Date**: 2026-08-07  
**Working Directory**: `D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_worker_m2_1`

---

## 1. Observation

### 1.1 Initial State Observations
- **`page.tsx` (`apps/storefront-ui/src/app/landing/[slug]/page.tsx`)**:
  - Had no server-side `fetch()` call or ISR revalidation config.
  - Passed no initial `lp` data or `comboRules` to `LandingClient`, forcing complete client-side data fetching via `useEffect`.
  - Missing `generateMetadata` export for SEO title and description.
  - Missing 404 handling (`notFound()` from `next/navigation`).
  - Used `any` type for `params`.

- **`LandingClient.tsx` (`apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx`)**:
  - 536 lines monolithic component bundling pixels script injection, sticky header, hero image gallery, rating social proof block, price section, features list, countdown timer, order form, combo selector, variant selector, Turnstile script, success confirmation panel, and footer markdown.
  - Contained hardcoded fake social proof numbers (`4.9` rating, `1200` reviews, `583 824` sold).
  - Lacked inline documentation explaining the `/100` price minor unit conversion.
  - Used multiple `any` types for props and state.

### 1.2 Actions & Modifications Implemented
1. **Created `apps/storefront-ui/src/app/landing/[slug]/types.ts`**:
   - Defined strict TypeScript interfaces: `LandingPageData`, `LandingPageProduct`, `LandingPageVariant`, `LandingPageImage`, `ComboRule`, `LandingFormData`, `SuccessData`, and props interfaces.
   - Removed all `any` types across the sub-components and top-level prop types.

2. **Refactored `apps/storefront-ui/src/app/landing/[slug]/page.tsx`**:
   - Converted `LandingPage` into an async server component.
   - Pre-fetches landing page data server-side via `fetch(`${API_BASE}/api/landing-pages/${slug}`, { next: { revalidate: 60 } })`.
   - Safely parses `combo_rules_json` and passes `initialLp`, `comboRules`, `initialSlug`, and `apiUrl` to `LandingClient`.
   - Calls `notFound()` from `next/navigation` when `!data || data.success === false`.
   - Exported `generateMetadata({ params }: PageProps): Promise<Metadata>` returning `{ title: lp.seo_title || lp.title, description: lp.seo_description }`.
   - Typed `PageProps` as `{ params: Promise<{ slug: string }> }` for Next.js 16 compatibility.

3. **Extracted `apps/storefront-ui/src/app/landing/[slug]/LandingPixels.tsx`**:
   - Isolated Facebook and TikTok pixel `<Script>` injection.
   - Cleanly sanitizes pixel IDs and uses `strategy="afterInteractive"`.

4. **Extracted `apps/storefront-ui/src/app/landing/[slug]/LandingHero.tsx`**:
   - Extracted sticky header, urgency viewers badge, image gallery + thumbnails, title, pricing block, features list, and countdown timer.
   - **R3 Compliance**: Completely removed hardcoded fake social proof (`4.9`, `1200`, `583 824`) and inserted an inline rationale comment explaining that static fake numbers create trust and legal risks.
   - **R6 Compliance**: Added explicit inline comments explaining that `regular_price` and `price` fields from `price_list_items` are stored in minor units (VNĐ × 100), so dividing by 100 converts them to display VNĐ.

5. **Extracted `apps/storefront-ui/src/app/landing/[slug]/LandingOrderForm.tsx`**:
   - Extracted checkout form, combo radio selector, variant dropdown selector, customer inputs (name, phone, address, note), Turnstile widget, out-of-stock warning badge, COD order success confirmation panel, and footer markdown.

6. **Refactored `apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx`**:
   - Refactored into a thin orchestrator component of **134 lines** (strictly under the < 150 line constraint).
   - Manages top-level state (`lp`, `loading`, `error`, `activeImageIndex`, `formData`, `isSubmitting`, `successData`, `errorMsg`) and form submission handler `handleSubmit`.
   - Maintains client-side `fetch()` fallback when `initialLp` is not provided.
   - Fixed `useEffect` dependency array by removing `lp` to prevent infinite re-fetches.

---

## 2. Logic Chain

1. **SSR Data Fetching & SEO (R1)**:
   - Server-side pre-fetching at request time with `{ next: { revalidate: 60 } }` delivers fully populated HTML to search engines and users on initial load, eliminating loading spinners and enabling full SEO indexing.
   - `generateMetadata` extracts `seo_title` and `seo_description` from the cached API response.
   - `notFound()` correctly sets HTTP 404 header and renders the 404 UI when an invalid slug is requested.

2. **Modular Architecture & Sub-Component Extraction (R2)**:
   - Splitting the 536-line monolith into 4 modular sub-components (`types.ts`, `LandingPixels.tsx`, `LandingHero.tsx`, `LandingOrderForm.tsx`) isolates rendering logic and side effects.
   - `LandingClient.tsx` acts purely as a state orchestrator (134 lines), satisfying the < 150 lines requirement.
   - Eliminating `any` types guarantees complete compile-time type safety.

3. **Fake Social Proof Removal (R3)**:
   - Removing static hardcoded values (`4.9` rating, `1200` reviews, `583 824` sold) prevents misleading legal/compliance liabilities while preserving configurable urgency badges (`urgency_fake_views`).

4. **Price Unit Transparency (R6)**:
   - Minor unit division (`/100`) is explicitly documented in `LandingHero.tsx` to clarify backend-to-frontend unit contracts.

5. **Build Verification (R7)**:
   - Command `pnpm --filter storefront-ui build` executed and exited with code 0. Next.js 16 successfully type-checked all routes and compiled `/landing/[slug]` into an edge-rendered dynamic route.

---

## 3. Caveats

- `process.env.NEXT_PUBLIC_API_URL` defaults to `'https://api-shop.tanhdev.com'` when not set in environment variables.
- Next.js 16 requires `params` on `PageProps` to be `Promise<{ slug: string }>`. `const { slug } = await params;` is used throughout `page.tsx`.
- No caveats regarding component functionality or build stability.

---

## 4. Conclusion

All Storefront UI Landing Page refactoring requirements (R1, R2, R3, R6, R7) have been fully met and verified:
- SSR data fetching, revalidation (60s), metadata generation, and 404 handling are implemented in `page.tsx`.
- `LandingClient.tsx` is reduced from 536 lines to 134 lines (< 150 lines).
- `types.ts`, `LandingPixels.tsx`, `LandingHero.tsx`, and `LandingOrderForm.tsx` are cleanly extracted.
- Hardcoded fake social proof removed with rationale comment.
- Price minor unit `/100` division documented.
- `pnpm --filter storefront-ui build` builds cleanly with exit code 0.

---

## 5. Verification Method

To verify these changes independently:

1. Run Next.js production build for storefront-ui:
   ```bash
   pnpm --filter storefront-ui build
   ```
   **Expected output**: Exit code 0, 0 TypeScript errors, `ƒ /landing/[slug]` generated.

2. Inspect extracted component files:
   - `apps/storefront-ui/src/app/landing/[slug]/types.ts`
   - `apps/storefront-ui/src/app/landing/[slug]/page.tsx`
   - `apps/storefront-ui/src/app/landing/[slug]/LandingPixels.tsx`
   - `apps/storefront-ui/src/app/landing/[slug]/LandingHero.tsx`
   - `apps/storefront-ui/src/app/landing/[slug]/LandingOrderForm.tsx`
   - `apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx` (verify line count < 150)
