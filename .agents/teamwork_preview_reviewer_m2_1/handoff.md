# Handoff Report: Review of M2 Storefront UI Refactoring

**Reviewer**: teamwork_preview_reviewer_m2_1  
**Milestone**: M2 (Storefront UI Landing Page Refactoring)  
**Date**: 2026-08-07  
**Verdict**: **APPROVE**  

---

## 1. Review Summary

The refactoring of the Storefront UI landing page system in `apps/storefront-ui` for Milestone M2 has been thoroughly reviewed and verified. All requirements (R1, R2, R3, R6, R7 build check) specified in `ORIGINAL_REQUEST.md` and `PROJECT.md` have been fully satisfied.

- `page.tsx` is transformed into an async server component with ISR pre-fetching (`{ revalidate: 60 }`), SEO metadata generation (`generateMetadata`), and proper 404 handling (`notFound()`).
- `LandingClient.tsx` has been decomposed from a 536-line monolith into modular sub-components (`types.ts`, `LandingPixels.tsx`, `LandingHero.tsx`, `LandingOrderForm.tsx`). `LandingClient.tsx` line count is now 134 lines (well under the 150 line threshold).
- All prop interfaces use strict TypeScript types (no `any` for top-level component props).
- Hardcoded fake social proof metrics (4.9 rating, 1200 reviews, 583 824 sold) were completely removed from `LandingHero.tsx` with an inline rationale comment explaining trust/legal risks.
- Minor unit price conversion (`/100`) is explicitly documented in `LandingHero.tsx` and `types.ts`.
- Production build via `pnpm --filter storefront-ui build` completes cleanly with exit code 0.

---

## 2. Observation

### 2.1 File Inspections & Verifications

1. **`apps/storefront-ui/src/app/landing/[slug]/page.tsx`**:
   - `fetch()` with `{ next: { revalidate: 60 } }` implemented on lines 21-24 and 56-59.
   - Base API URL uses `process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'`.
   - `generateMetadata` exported on lines 13-43 returning `title` (`lp.seo_title || lp.title`) and `description` (`lp.seo_description`).
   - `notFound()` called on lines 49, 62, 67, 82 when slug is missing, fetch fails, or data is missing.
   - Passes `initialLp`, `comboRules`, `initialSlug`, and `apiUrl` to `<LandingClient />`.

2. **`apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx`**:
   - Line count: 134 lines (satisfies < 150 line limit requirement R2).
   - Component props interface `LandingClientProps` strictly typed without `any`.
   - Client-side fetch fallback retained (lines 27-41) for when `initialLp` is not supplied.
   - `useEffect` dependency array fixed (line 41: `[slug, apiUrl]`, removing `lp`).

3. **`apps/storefront-ui/src/app/landing/[slug]/LandingPixels.tsx`**:
   - Extracted Facebook and TikTok pixel script injections using `next/script` with `strategy="afterInteractive"`.

4. **`apps/storefront-ui/src/app/landing/[slug]/LandingHero.tsx`**:
   - Hardcoded fake social proof block removed.
   - Rationale comment on lines 128-129: `// R3: Removed hardcoded fake social proof block (4.9 rating, 1200 reviews, 583 824 sold) as uniform fake data presents trust and legal risks.`
   - Price unit division `/100` documented on lines 24-25: `// R6 Documentation: regular_price and price from price_list_items store values in minor units (VNĐ × 100). Dividing by 100 converts them to display VNĐ values.`

5. **`apps/storefront-ui/src/app/landing/[slug]/LandingOrderForm.tsx`**:
   - Extracted checkout form, combo selector, variant dropdown, customer inputs, Turnstile widget, out-of-stock state, and success confirmation panel.

6. **`apps/storefront-ui/src/app/landing/[slug]/types.ts`**:
   - Defined strict interfaces `LandingPageData`, `LandingPageProduct`, `LandingPageVariant`, `LandingPageImage`, `ComboRule`, `LandingFormData`, `SuccessData`.

### 2.2 Verification Command Output
- Command: `pnpm --filter storefront-ui build`
- Result: **Exit Code 0**
- Log output:
  `✓ Compiled successfully in 3.48s`
  `Linting and checking validity of types ...`
  `Route (app) /landing/[slug] 1.44 kB 97.2 kB`
  `Finished in 9.9s`

---

## 3. Logic Chain

1. **R1 (SSR & SEO Metadata)**:
   - Moving data fetching into `page.tsx` with ISR `revalidate: 60` allows server-side rendering of product title, description, and imagery, resolving the CSR spinner issue and enabling search engine indexing.
   - `generateMetadata` dynamically populates HTML `<title>` and `<meta name="description">`.
   - `notFound()` triggers Next.js standard 404 response header and UI for invalid slugs.

2. **R2 (Component Splitting & Line Count)**:
   - Extracting sub-components reduces `LandingClient.tsx` from 536 lines to 134 lines (< 150 lines), creating modular, maintainable UI components.
   - Eliminating `any` types on component props enforces strict compile-time safety.

3. **R3 & R6 (Trust & Documentation)**:
   - Deleting hardcoded fake social proof eliminates compliance/legal risks.
   - Explanatory comments on `/100` division document the backend-frontend contract for price minor units.

4. **Integrity & Quality**:
   - Build check compiled without errors or type issues. No hardcoded test results, facade implementations, or integrity violations were detected.

---

## 4. Caveats

- Environment variable `NEXT_PUBLIC_API_URL` defaults to `'https://api-shop.tanhdev.com'` when not provided in the environment.
- No caveats identified.

---

## 5. Conclusion & Recommendation

**Verdict**: **APPROVE**  
Milestone M2 implementation is complete, well-architected, and fully verified. Proceed to Milestone M3 (Verification & Quality across all packages).

---

## 6. Verification Method

To verify independently:
```bash
# 1. Run production build for storefront-ui
pnpm --filter storefront-ui build

# 2. Check line count of LandingClient.tsx
wc -l apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx
# Target: < 150 lines (Actual: 134 lines)
```
