## 2026-07-28T06:58:29Z
<USER_REQUEST>
You are Worker (Refinement) for Milestone 2: Architecture Fitness Functions / ESLint Boundaries (Slice 7).

Working directory: /home/user/personalized/cloudflare-ecommerce/.agents/teamwork_preview_worker_m2_refine
Project root: /home/user/personalized/cloudflare-ecommerce
Challenger handoff reports: /home/user/personalized/cloudflare-ecommerce/.agents/teamwork_preview_challenger_m2_1/handoff.md and /home/user/personalized/cloudflare-ecommerce/.agents/teamwork_preview_challenger_m2_2/handoff.md

Task:
Harden the ESLint boundary rules in `apps/public-api/eslint.config.mjs` and `apps/admin-api/eslint.config.mjs` to block dynamic imports (`import(...)`), TS inline type imports (`import(...)`), and `require(...)` using `no-restricted-syntax` rules in addition to `no-restricted-imports`:

1. Update `apps/public-api/eslint.config.mjs`:
   In addition to `no-restricted-imports`, configure `no-restricted-syntax` selectors:
   - `ImportExpression[source.value=/admin-api/]` with message "Dynamic cross-app imports from admin-api into public-api are strictly forbidden."
   - `TSImportType[argument.value=/admin-api/]` with message "Inline type cross-app imports from admin-api into public-api are strictly forbidden."
   - `CallExpression[callee.name='require'][arguments.0.value=/admin-api/]` with message "Cross-app require statements from admin-api into public-api are strictly forbidden."

2. Update `apps/admin-api/eslint.config.mjs`:
   In addition to `no-restricted-imports`, configure `no-restricted-syntax` selectors:
   - `ImportExpression[source.value=/public-api/]` with message "Dynamic cross-app imports from public-api into admin-api are strictly forbidden."
   - `TSImportType[argument.value=/public-api/]` with message "Inline type cross-app imports from public-api into admin-api are strictly forbidden."
   - `CallExpression[callee.name='require'][arguments.0.value=/public-api/]` with message "Cross-app require statements from public-api into admin-api are strictly forbidden."

3. Run `pnpm --filter public-api lint` and `pnpm --filter admin-api lint` to verify 0 errors on baseline code.
4. Run negative verification tests demonstrating that static imports, dynamic `import(...)`, TS type imports `import(...)`, and `require(...)` are all blocked with ESLint errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Document all changes made, test commands executed, and output results in `/home/user/personalized/cloudflare-ecommerce/.agents/teamwork_preview_worker_m2_refine/handoff.md`.
Report back via send_message when done.
</USER_REQUEST>
