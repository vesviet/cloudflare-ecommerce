# Adversarial Challenge Report: Storefront UI Edge Cases (M2)

**Challenger**: teamwork_preview_challenger_m2_2  
**Role**: Empirical Challenger (critic, specialist)  
**Milestone**: M2 (Storefront UI Landing Page System Refactor)  
**Verdict**: **REJECT**  
**Date**: 2026-08-07  

---

## 1. Observation

### 1.1 Checked Code Files & Line Numbers
- **`apps/storefront-ui/src/app/landing/[slug]/page.tsx`**:
  - Pre-fetches LP data server-side using `fetch(`${API_BASE}/api/landing-pages/${slug}`, { next: { revalidate: 60 } })`.
  - Safely calls `notFound()` when response is not OK or `!data.success`.
  - `generateMetadata` extracts `seo_title` and `seo_description`.
  - `PageProps` types `params` as `Promise<{ slug: string }>`.

- **`apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx`**:
  - Component length: **134 lines** (meets < 150 lines constraint).
  - TypeScript types: All props strictly typed without `any` in `LandingClientProps`.
  - **Line 43**:
    ```typescript
    const comboRules: ComboRule[] = initialComboRules || (lp?.combo_rules_json ? (typeof lp.combo_rules_json === 'string' ? (() => { try { return JSON.parse(lp.combo_rules_json); } catch { return []; } })() : (Array.isArray(lp.combo_rules_json) ? lp.combo_rules_json : [])) : []);
    ```

- **`apps/storefront-ui/src/app/landing/[slug]/LandingHero.tsx`**:
  - Hardcoded fake social proof (`4.9` rating, `1200` reviews, `583 824` sold) completely removed.
  - Rationale comment present at lines 128-129.
  - Minor unit division `/100` documented at lines 24-27.

- **`apps/storefront-ui/src/app/landing/[slug]/types.ts`**:
  - Clean TypeScript interfaces created for all data domain shapes and sub-component props.

### 1.2 Empirical Build & Test Execution Results
- `pnpm --filter storefront-ui exec tsc --noEmit` → Exit code 0 (0 TypeScript errors).
- `pnpm --filter storefront-ui lint` → 0 errors.
- `pnpm --filter public-api lint` → 0 errors.
- `pnpm --filter admin-api lint` → 0 errors.
- `pnpm --filter public-api test` → 66/66 passed.
- `pnpm --filter core-services test` → 115/115 passed.

---

## 2. Logic Chain

1. **Client Fallback Short-Circuit Bug (CRITICAL EDGE CASE)**:
   - When `LandingClient` runs in client-side fallback mode (i.e. `initialLp` is `undefined` or `null`), `page.tsx` passes `comboRules={[]}` (an empty array) as `initialComboRules`.
   - In JavaScript/TypeScript, `[]` (an empty array) is **truthy** (`Boolean([]) === true`).
   - Line 43 evaluates: `initialComboRules || (lp?.combo_rules_json ? ...)`
   - Because `initialComboRules` is `[]` (truthy), the `||` operator short-circuits immediately and evaluates to `[]`.
   - When `useEffect` fetches `lp` from `apiUrl` and sets `lp`, `lp.combo_rules_json` contains valid combo rules (e.g., JSON string or array).
   - However, because line 43 short-circuits on `initialComboRules` (`[]`), `comboRules` remains `[]` and `lp.combo_rules_json` is completely ignored and discarded.
   - Consequence: In client fallback mode, combo selection options fail to render in `LandingOrderForm`, breaking combo order functionality.

2. **Required Fix**:
   - Change line 43 of `LandingClient.tsx` to check for non-empty array before short-circuiting:
     ```typescript
     const comboRules: ComboRule[] = (initialComboRules && initialComboRules.length > 0)
       ? initialComboRules
       : (lp?.combo_rules_json
           ? (typeof lp.combo_rules_json === 'string'
               ? (() => { try { return JSON.parse(lp.combo_rules_json); } catch { return []; } })()
               : (Array.isArray(lp.combo_rules_json) ? lp.combo_rules_json : []))
           : []);
     ```

3. **Validation of Other Requirements**:
   - `page.tsx` SSR & 404 `notFound()` handling: Pass.
   - `generateMetadata`: Pass.
   - `LandingClient.tsx` line count (< 150): Pass (134 lines).
   - No `any` types on top-level component props: Pass.
   - Removal of hardcoded social proof with explanation: Pass.
   - Documentation of `/100` price unit division: Pass.
   - Build, lint, and test suites: Pass.

---

## 3. Caveats

- The short-circuit bug only affects client-side fallback rendering when `initialLp` is undefined and `initialComboRules` is `[]`. Server-side rendering (SSR) path where `initialComboRules` is populated passes normally.
- However, requirement R1 explicitly mandates: *"LandingClient should still support client-side fetch as a fallback when initialLp is not provided"*. Therefore, client fallback must function correctly with combo rules.

---

## 4. Conclusion

**Verdict: REJECT**

While the modular structure, line count constraints, SSR setup, metadata, social proof removal, price unit documentation, and TypeScript interfaces are well-designed and pass compilation, line 43 of `LandingClient.tsx` contains a short-circuit bug (`initialComboRules || ...`) that breaks `combo_rules_json` parsing during client fallback mode.

**Actionable Next Step for Worker M2**:
Update `apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx` line 43 to check `(initialComboRules && initialComboRules.length > 0)` instead of `initialComboRules || ...`.

---

## 5. Verification Method

To verify the bug and fix empirically:

1. Render `LandingClient` with `initialLp={undefined}` and `comboRules={[]}`.
2. Provide a mock `apiUrl` response returning `data.combo_rules_json = '[{"id":"c1","name":"Combo 1","price":100000}]'`.
3. Inspect `comboRules` state:
   - **Bug state**: `comboRules` evaluates to `[]`. Combo rules are missing from DOM.
   - **Fixed state**: `comboRules` evaluates to `[{id: 'c1', name: 'Combo 1', price: 100000}]`. Combo rules render correctly in `LandingOrderForm`.
