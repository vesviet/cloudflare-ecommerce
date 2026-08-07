# Dispatch Instructions for Worker M2_2 (Storefront UI Fix)

You are teamwork_preview_worker_m2_2. Working directory: D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_worker_m2_2.
Read ORIGINAL_REQUEST.md at D:\myproject\cloudflare-ecommerce\.agents\ORIGINAL_REQUEST.md.
Read PROJECT.md at D:\myproject\cloudflare-ecommerce\.agents\orchestrator\PROJECT.md.
Read Challenger M2_2 report at D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_challenger_m2_2\handoff.md.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Fix Requirement:
In `apps/storefront-ui/src/app/landing/[slug]/LandingClient.tsx`:
Fix the combo rules initialization in client fallback mode.
Currently Line 43 has `initialComboRules || ...`. Because `[]` (empty array) is truthy in JavaScript, if `initialComboRules` is passed as `[]` when `initialLp` is omitted (client fetch fallback mode), it evaluates to `[]` and ignores `lp.combo_rules_json` after client-side fetch completes.

Update `comboRules` calculation logic to safely check if `initialComboRules` has items (e.g. `(initialComboRules && initialComboRules.length > 0) ? initialComboRules : (lp?.combo_rules_json ? parseComboRules(lp.combo_rules_json) : [])`), ensuring client-side fallback correctly parses `combo_rules_json` from fetched `lp` when `initialComboRules` is empty or undefined.

Ensure `LandingClient.tsx` remains under 150 lines and passes build:
- `pnpm --filter @ecommerce/storefront-ui build`

Write handoff report to `D:\myproject\cloudflare-ecommerce\.agents\teamwork_preview_worker_m2_2\handoff.md`.
