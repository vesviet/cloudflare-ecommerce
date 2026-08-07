# Handoff Report: Storefront UI Combo Rules Fallback Fix (M2_2)

## 1. Observation
- File modified: `apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx` at line 43.
- Target code before modification:
  ```typescript
  const comboRules: ComboRule[] = initialComboRules || (lp?.combo_rules_json ? (typeof lp.combo_rules_json === 'string' ? (() => { try { return JSON.parse(lp.combo_rules_json); } catch { return []; } })() : (Array.isArray(lp.combo_rules_json) ? lp.combo_rules_json : [])) : []);
  ```
- Target code after modification:
  ```typescript
  const comboRules: ComboRule[] = (initialComboRules && initialComboRules.length > 0) ? initialComboRules : (lp?.combo_rules_json ? (typeof lp.combo_rules_json === 'string' ? (() => { try { return JSON.parse(lp.combo_rules_json); } catch { return []; } })() : (Array.isArray(lp.combo_rules_json) ? lp.combo_rules_json : [])) : []);
  ```
- Line count of `apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx`: 134 lines (meets < 150 lines constraint).
- Type checking: `pnpm --filter storefront-ui exec tsc --noEmit` exited with code 0.
- Production build: `pnpm --filter storefront-ui build` compiled successfully and exited with code 0.

## 2. Logic Chain
1. When `LandingClient` is used in client-side fallback mode, `initialLp` is `undefined` and `page.tsx` passes `initialComboRules` as `[]`.
2. In JavaScript / TypeScript, `[]` is a truthy value (`Boolean([]) === true`).
3. The previous expression `initialComboRules || ...` evaluated to `initialComboRules` (`[]`) and short-circuited, skipping the right-hand side `(lp?.combo_rules_json ? ...)` evaluation entirely.
4. Consequently, after the client-side `useEffect` fetched the landing page `lp` data, `comboRules` remained `[]`, discarding `lp.combo_rules_json`.
5. Changing the condition to `(initialComboRules && initialComboRules.length > 0)` guarantees that an empty array `initialComboRules` does not short-circuit, allowing `lp.combo_rules_json` to be parsed into `comboRules` upon client-side fetch completion.

## 3. Caveats
No caveats.

## 4. Conclusion
The short-circuit evaluation bug in `LandingClient.tsx` line 43 has been resolved. `LandingClient.tsx` has 134 lines (< 150), passes type-checking (`tsc --noEmit`) and production build (`pnpm --filter storefront-ui build`), and correctly falls back to parsing `lp.combo_rules_json` when `initialComboRules` is empty or undefined.

## 5. Verification Method
1. Run `pnpm --filter storefront-ui exec tsc --noEmit` -> Exit code 0.
2. Run `pnpm --filter storefront-ui build` -> Exit code 0 ("Compiled successfully").
3. Inspect `apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx` line 43 to verify length check.
4. Run `wc -l apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx` -> 134 lines (< 150).
