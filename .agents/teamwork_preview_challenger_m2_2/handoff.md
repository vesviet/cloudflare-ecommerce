# Handoff Report: ESLint Boundary & Fitness Function Stress Test (Slice 7)

## 1. Observation

Direct empirical observations collected during stress testing in `/home/user/personalized/cloudflare-ecommerce`:

### A. Configuration Files Inspected
- `apps/public-api/eslint.config.mjs` (Lines 25–40): Restricted imports matching `*admin-api*`, `*admin-api*/**`, `**/admin-api/**`, `**/admin-api`. Restricted syntax for `req.json` and `req.parseBody`.
- `apps/admin-api/eslint.config.mjs` (Lines 25–40): Restricted imports matching `*public-api*`, `*public-api*/**`, `**/public-api/**`, `**/public-api`. Restricted syntax for `req.json` and `req.parseBody`.
- `apps/public-api/package.json` (Line 9): `"lint": "eslint src/"`
- `apps/admin-api/package.json` (Line 7): `"lint": "eslint src/"`
- `packages/contract/package.json`, `packages/core-services/package.json`, `packages/database/package.json`, `packages/shared-routes/package.json`: No `lint` script, no ESLint configuration files present.

### B. Empirical Test Command Execution & Output

1. **Static ESM Imports & Re-exports (`no-restricted-imports`)**:
   - Command: `pnpm exec eslint src/boundary_test.ts` (in `apps/public-api`)
   - Lines tested:
     - `import { adminApp } from '../../admin-api/src/index';`
     - `import { customers } from '../../../apps/admin-api/src/routes/customers';`
     - `import type { AdminType } from '../../admin-api/src/index';`
     - `export { adminApp as reExportedAdmin } from '../../admin-api/src/index';`
   - Result: **CAUGHT** with ESLint error:
     ```
     error  '../../admin-api/src/index' import is restricted from being used by a pattern. Cross-app imports from admin-api into public-api are strictly forbidden  no-restricted-imports
     ```

2. **TypeScript Inline Type Annotation Query (`TSImportType`)**:
   - Code: `export type TSImportTest = import('../../admin-api/src/index').AdminType;`
   - Command: `pnpm exec eslint src/boundary_test.ts`
   - Result: **0 ERRORS, 0 WARNINGS** (BYPASSED `no-restricted-imports`).

3. **Dynamic ESM Imports (`import(...)`)**:
   - Code:
     ```ts
     export async function testDynamicImport1() {
       const mod = await import('../../admin-api/src/index');
       return mod;
     }
     ```
   - Command: `pnpm exec eslint src/boundary_test.ts`
   - Result: **0 ERRORS, 0 WARNINGS** (BYPASSED `no-restricted-imports`).

4. **Destructured / Reassigned Request Parsing (`no-restricted-syntax`)**:
   - Code tested:
     ```ts
     export async function test2_2a(c: any) {
       const { req } = c;
       return await req.json();
     }
     export async function test2_2c(c: any) {
       const { req } = c;
       return await req.parseBody();
     }
     ```
   - Command: `pnpm exec eslint src/boundary_test.ts`
   - Result: **0 ERRORS, 0 WARNINGS** (BYPASSED `no-restricted-syntax`).

5. **Bracket Property Access (`no-restricted-syntax`)**:
   - Code tested: `return await c.req['json']();` and `return await c.req['parseBody']();`
   - Command: `pnpm exec eslint src/boundary_test.ts`
   - Result: **0 ERRORS, 0 WARNINGS** (BYPASSED `no-restricted-syntax`).

6. **Type Cast Access (`no-restricted-syntax`)**:
   - Code tested: `return await (c.req as any).json();`
   - Command: `pnpm exec eslint src/boundary_test.ts`
   - Result: **0 ERRORS, 0 WARNINGS** (BYPASSED `no-restricted-syntax`).

7. **Scope Outside `src/` Directory**:
   - File created: `apps/public-api/scripts/boundary_outside_src.ts` containing restricted imports and direct `req.json()` calls.
   - Command run: `pnpm --filter public-api lint` (runs `eslint src/`).
   - Result: Script exited with 0 errors for `scripts/boundary_outside_src.ts` because `eslint src/` ignores files outside `src/`.

---

## 2. Logic Chain

1. **Observed AST Selector Limits**:
   - The ESLint AST selector configured for `no-restricted-syntax` is:
     `CallExpression[callee.object.property.name='req'][callee.property.name='json']`
   - In ESLint's AST representation:
     - `c.req.json()` produces a `MemberExpression` (`callee.object`) whose `property` is an `Identifier` named `'req'`.
     - When `const { req } = c; req.json()` is written, `callee.object` is an `Identifier` node (`req`), which has no `.property` key. Thus `callee.object.property` evaluates to `undefined`, making the selector evaluate to `false`.
     - When `c.req['json']()` is written, `callee.property` is a `Literal` node (`'json'`), so `callee.property.name` evaluates to `undefined`.
     - Therefore, simple syntax variations like destructuring or bracket access completely bypass request validation rules.

2. **Observed `no-restricted-imports` Limits**:
   - Standard ESLint core rule `no-restricted-imports` only checks `ImportDeclaration` AST nodes.
   - Dynamic expressions `import('...')` produce `ImportExpression` nodes.
   - TypeScript inline type imports `type T = import('...').Foo` produce `TSImportType` nodes.
   - Because `no-restricted-imports` does not inspect `ImportExpression` or `TSImportType` nodes, developers can dynamically load cross-app code or reference cross-app types without ESLint raising an error.

3. **Observed Architectural Boundary Gaps**:
   - Shared packages (`packages/contract`, `packages/core-services`, `packages/database`, `packages/shared-routes`) lack ESLint rules and lint scripts altogether.
   - If a shared package imports from `apps/admin-api` and `apps/public-api` imports from that shared package, cross-app dependencies leak transitively through the shared package layer without detection.
   - Restricting lint execution to `eslint src/` leaves root-level scripts, tooling, and non-`src` directories unmonitored.

---

## 3. Caveats

- Runtime module loading behavior was tested via lint AST analysis; runtime execution of dynamic imports in Cloudflare Workers environment depends on Wrangler bundling settings.
- Custom ESLint plugins (e.g. `@typescript-eslint/naming-convention` or custom selectors) were not evaluated beyond what is explicitly configured in `apps/public-api/eslint.config.mjs` and `apps/admin-api/eslint.config.mjs`.

---

## 4. Conclusion & Recommendations

**Overall Risk Assessment: HIGH**

While standard static `import { ... } from '../../admin-api/...'` declarations are successfully blocked, the current boundary implementation contains several critical bypasses:

1. **Critical Bypasses Found**:
   - **TypeScript Inline Type Query (`TSImportType`)**: `type T = import('../../admin-api/src/index').AdminType` bypasses `no-restricted-imports`.
   - **Dynamic Module Import (`ImportExpression`)**: `const mod = await import('../../admin-api/src/index')` bypasses `no-restricted-imports`.
   - **Destructured & Indirect Request Parsing (`no-restricted-syntax`)**: `const { req } = c; await req.json();` and `const req = c.req; await req.json();` bypass request validation enforcement.
   - **Bracket Property Access (`no-restricted-syntax`)**: `c.req['json']()` bypasses request validation enforcement.
   - **Unmonitored Non-`src/` Directories**: `pnpm lint` only checks `src/`, ignoring scripts and top-level workspace tools.
   - **Unmonitored Shared Packages**: `packages/*` lack ESLint configuration and cross-app import boundaries.

2. **Actionable Mitigations**:
   - **Fix Request Parsing Rule**: Update `no-restricted-syntax` AST selector to catch call expressions on property `json` or `parseBody` regardless of receiver object shape:
     ```js
     {
       selector: "CallExpression[callee.property.name=/^(json|parseBody)$/], CallExpression[callee.property.value=/^(json|parseBody)$/]",
       message: "Use zValidator instead of req.json() or req.parseBody() for request parsing."
     }
     ```
   - **Fix Cross-App Import Rules**: Combine `no-restricted-imports` with custom AST selectors or `@typescript-eslint/no-restricted-imports` (or ESLint plugin boundary enforcement) covering `ImportExpression` and `TSImportType`:
     ```js
     {
       selector: "ImportExpression[source.value=/*(admin-api|public-api)*/], TSImportType[argument.value=/*(admin-api|public-api)*/]",
       message: "Cross-app dynamic imports and type imports are strictly forbidden."
     }
     ```
   - **Expand Lint Scope**: Update `package.json` lint scripts to `eslint .` (or target all source directories and shared packages).

---

## 5. Verification Method

To independently verify these findings on `/home/user/personalized/cloudflare-ecommerce`:

1. **Verify Clean Baseline**:
   ```bash
   pnpm --filter public-api lint && pnpm --filter admin-api lint
   ```
   *Expected result*: Command passes with 0 errors.

2. **Verify TSImportType & Dynamic Import Bypass**:
   Create a file `apps/public-api/src/verify_bypass.ts`:
   ```ts
   export type LeakedType = import('../../admin-api/src/index').AdminType;
   export async function leakedDynamicImport() {
     return await import('../../admin-api/src/index');
   }
   ```
   Run:
   ```bash
   pnpm exec eslint apps/public-api/src/verify_bypass.ts
   ```
   *Expected result*: **0 errors**. (Confirms bypass of `no-restricted-imports`).

3. **Verify Destructured req.json() Bypass**:
   Add to `apps/public-api/src/verify_bypass.ts`:
   ```ts
   export async function leakedJsonParse(c: any) {
     const { req } = c;
     return await req.json();
   }
   ```
   Run:
   ```bash
   pnpm exec eslint apps/public-api/src/verify_bypass.ts
   ```
   *Expected result*: **0 errors**. (Confirms bypass of `no-restricted-syntax`).

4. Clean up `apps/public-api/src/verify_bypass.ts` after verification.

---

## Challenge Summary

**Overall risk assessment**: HIGH

## Challenges

### [Critical] Challenge 1: Destructured Request Parsing Bypass (`no-restricted-syntax`)
- **Assumption challenged**: Assuming `no-restricted-syntax` prevents unvalidated `req.json()` or `req.parseBody()` calls across handlers.
- **Attack scenario**: Developers writing `const { req } = c; await req.json()` bypass ESLint entirely, allowing unvalidated request body parsing into handlers without `zValidator`.
- **Blast radius**: Production endpoint crashes or invalid payload processing due to missing Zod validation schemas.
- **Mitigation**: Update ESLint selector to match any `CallExpression` targeting `json` or `parseBody` on request objects, or match property names globally.

### [High] Challenge 2: Dynamic Import & Inline Type Query Bypass (`no-restricted-imports`)
- **Assumption challenged**: Assuming `no-restricted-imports` isolates `public-api` and `admin-api` domain code completely.
- **Attack scenario**: Developers using `await import('../../admin-api/src/...')` or `type T = import('../../admin-api/src/...').Type` bypass boundary rules.
- **Blast radius**: Coupling between public and admin APIs, unintended dependency graph expansion, domain boundary leakage.
- **Mitigation**: Add `no-restricted-syntax` rules targeting `ImportExpression` and `TSImportType` AST nodes matching restricted path patterns.

### [Medium] Challenge 3: Unmonitored Non-`src/` Files and Shared Packages
- **Assumption challenged**: Assuming all monorepo code is subject to architecture fitness functions.
- **Attack scenario**: Code placed in `scripts/` or `packages/core-services` imports across app boundaries without lint checks.
- **Blast radius**: Indirect cross-app leaks via shared packages.
- **Mitigation**: Add `eslint.config.mjs` to packages, configure boundary rules across all monorepo workspaces, update `lint` scripts to `eslint .`.

## Stress Test Results

- `import { adminApp } from '../../admin-api/src/index'` -> Restricted static ESM import -> **CAUGHT (Pass)**
- `import type { AdminType } from '../../admin-api/src/index'` -> Restricted type declaration -> **CAUGHT (Pass)**
- `type T = import('../../admin-api/src/index').AdminType` -> Inline TSImportType -> **BYPASSED (Fail)**
- `await import('../../admin-api/src/index')` -> Dynamic ImportExpression -> **BYPASSED (Fail)**
- `c.req.json()` -> Direct request parse -> **CAUGHT (Pass)**
- `const { req } = c; await req.json()` -> Destructured request parse -> **BYPASSED (Fail)**
- `c.req['json']()` -> Bracket property request parse -> **BYPASSED (Fail)**
- `(c.req as any).json()` -> Type cast request parse -> **BYPASSED (Fail)**
- `apps/public-api/scripts/test.ts` -> File outside `src/` directory -> **IGNORED (Fail)**

## Unchallenged Areas

- Cloudflare Workers runtime module binding isolation (tested static and AST lint boundaries; runtime isolation not evaluated).
