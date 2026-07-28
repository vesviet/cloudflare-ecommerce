# Handoff Report: ESLint Boundaries Investigation (Slice 7)

## 1. Observation

### 1.1 ESLint & Build Infrastructure Inspection
- **Root Configuration**:
  - `package.json` (`/home/user/personalized/cloudflare-ecommerce/package.json`), line 7: `"lint": "turbo run lint"`
  - `turbo.json` (`/home/user/personalized/cloudflare-ecommerce/turbo.json`), line 11: `"lint": {}`
- **`apps/public-api` Configuration**:
  - `package.json` (`/home/user/personalized/cloudflare-ecommerce/apps/public-api/package.json`):
    - Line 9: `"lint": "eslint src/"`
    - Line 25: `"eslint": "^9.39.4"`
    - Line 27: `"typescript-eslint": "^8.59.2"`
  - `eslint.config.mjs` (`/home/user/personalized/cloudflare-ecommerce/apps/public-api/eslint.config.mjs`):
    - Uses ESLint 9 Flat Config syntax via `typescript-eslint` (`tseslint.config`).
    - Configured rules currently include `@typescript-eslint/no-unused-vars`, `prefer-const`, and AST selector constraints via `no-restricted-syntax`.
- **`apps/admin-api` Configuration**:
  - `package.json` (`/home/user/personalized/cloudflare-ecommerce/apps/admin-api/package.json`):
    - Line 7: `"lint": "eslint src/"`
    - Line 25: `"eslint": "^9.39.4"`
    - Line 27: `"typescript-eslint": "^8.59.2"`
  - `eslint.config.mjs` (`/home/user/personalized/cloudflare-ecommerce/apps/admin-api/eslint.config.mjs`):
    - Mirroring structure of `apps/public-api/eslint.config.mjs`.

### 1.2 Current Lint Status
- Executing `pnpm --filter public-api lint`:
  ```
  > public-api@ lint /home/user/personalized/cloudflare-ecommerce/apps/public-api
  > eslint src/
  ✖ 3 problems (0 errors, 3 warnings)
  ```
- Executing `pnpm --filter admin-api lint`:
  ```
  > admin-api@ lint /home/user/personalized/cloudflare-ecommerce/apps/admin-api
  > eslint src/
  ✖ 3 problems (0 errors, 3 warnings)
  ```
- Note on monorepo-wide `pnpm run lint`: Running Turbo across all 8 workspace packages triggers an existing error in `apps/storefront-ui` (`A configuration object specifies rule "react-hooks/exhaustive-deps", but could not find plugin "react-hooks"`). However, `public-api` and `admin-api` lint tasks run cleanly with zero errors.

### 1.3 Empirical Verification of `no-restricted-imports` Pattern Matching
Testing ESLint 9 Flat Config with `@typescript-eslint/parser` confirmed that `no-restricted-imports` with wildcard pattern matching successfully catches and blocks all cross-app import variants:
1. Relative cross-imports (e.g., `import { x } from '../../admin-api/src/routes/cms';` -> BLOCKED with `ruleId: 'no-restricted-imports'`)
2. Path alias/full path imports (e.g., `import { x } from '../../apps/admin-api/src/routes/cms';` -> BLOCKED)
3. Direct package imports (e.g., `import { x } from 'admin-api';` -> BLOCKED)
4. TypeScript type imports (e.g., `import type { x } from '../../admin-api/src/types';` -> BLOCKED)
5. Valid intra-app relative imports (e.g., `import { checkout } from './routes/checkout';` -> ALLOWED)
6. Shared workspace package imports (e.g., `import { schema } from '@ecommerce/database';` -> ALLOWED)

---

## 2. Logic Chain

1. **Rule Selection (ESLint Core `no-restricted-imports`)**:
   - Both `apps/public-api` and `apps/admin-api` utilize ESLint 9 (`^9.39.4`) with flat configuration format (`eslint.config.mjs`).
   - Standard ESLint core rule `no-restricted-imports` supports pattern glob matching without introducing extra external dependencies (`eslint-plugin-boundaries` or `eslint-plugin-import`).
   - Using built-in `no-restricted-imports` ensures zero dependency overhead, zero version incompatibility risk with ESLint 9 Flat Config, and instant execution performance.

2. **Pattern Engineering for `apps/public-api`**:
   - Objective: Block any import originating from or referencing `admin-api`.
   - Specifying `patterns: [{ group: ["*admin-api*", "*admin-api*/**", "**/admin-api/**", "**/admin-api"], message: "Cross-app imports from admin-api into public-api are strictly forbidden." }]` captures:
     - Relative escapes: `../../admin-api/...`, `../admin-api/...`, `../../apps/admin-api/...`, `../../../apps/admin-api/...`
     - Alias/package specifiers: `admin-api`, `@apps/admin-api`, `@apps/admin-api/...`
     - Type imports: `import type { ... } from '../../admin-api/...'`
   - Tested against valid imports (`./routes/...`, `../index`, `@ecommerce/database`, `hono`, `zod`), confirming zero false positives for valid intra-app or workspace package code.

3. **Pattern Engineering for `apps/admin-api`**:
   - Objective: Block any import originating from or referencing `public-api`.
   - Symmetrically specifying `patterns: [{ group: ["*public-api*", "*public-api*/**", "**/public-api/**", "**/public-api"], message: "Cross-app imports from public-api into admin-api are strictly forbidden." }]`.

---

## 3. Caveats

1. **`storefront-ui` Pre-existing Lint Issue**:
   - Running `pnpm run lint` at root (`turbo run lint`) triggers a failure in `apps/storefront-ui` due to missing `react-hooks` plugin in `eslint-config-next`.
   - Verification of Slice 7 should focus on `pnpm --filter public-api lint` and `pnpm --filter admin-api lint` (or `pnpm --filter public-api --filter admin-api lint`).
2. **ESLint Suppressions**:
   - Developers could theoretically bypass lint rules using `// eslint-disable-next-line no-restricted-imports`. Code reviews or CI checks should enforce no disabling of architectural boundary rules.

---

## 4. Conclusion

To implement Requirement 2: ESLint Boundaries (Slice 7):

1. **Update `apps/public-api/eslint.config.mjs`**:
   Add the following rule configuration to the rules block:
   ```javascript
   "no-restricted-imports": [
     "error",
     {
       patterns: [
         {
           group: [
             "*admin-api*",
             "*admin-api*/**",
             "**/admin-api/**",
             "**/admin-api"
           ],
           message: "Cross-app imports from admin-api into public-api are strictly forbidden."
         }
       ]
     }
   ]
   ```

2. **Update `apps/admin-api/eslint.config.mjs`**:
   Add the following rule configuration to the rules block:
   ```javascript
   "no-restricted-imports": [
     "error",
     {
       patterns: [
         {
           group: [
             "*public-api*",
             "*public-api*/**",
             "**/public-api/**",
             "**/public-api"
           ],
           message: "Cross-app imports from public-api into admin-api are strictly forbidden."
         }
       ]
     }
   ]
   ```

---

## 5. Verification Method

### 5.1 Baseline Verification (Passing Check)
Run the following terminal commands:
```bash
pnpm --filter public-api lint
pnpm --filter admin-api lint
```
**Expected Result**: Commands complete with exit code 0 and output 0 errors.

### 5.2 Negative Test 1: `apps/public-api` Cross-Import Error
1. Edit `apps/public-api/src/index.ts` to add a temporary illegal cross-import:
   ```typescript
   import { auditLogger } from '../../admin-api/src/middleware/audit';
   ```
2. Run command:
   ```bash
   pnpm --filter public-api lint
   ```
3. **Expected Result**: ESLint exits with code 1 and logs:
   `error: '../../admin-api/src/middleware/audit' import is restricted from being used by a pattern. Cross-app imports from admin-api into public-api are strictly forbidden. (no-restricted-imports)`
4. Revert `apps/public-api/src/index.ts`.

### 5.3 Negative Test 2: `apps/admin-api` Cross-Import Error
1. Edit `apps/admin-api/src/index.ts` to add a temporary illegal cross-import:
   ```typescript
   import { cartCleanupCron } from '../../public-api/src/workers/cart-cleanup.cron';
   ```
2. Run command:
   ```bash
   pnpm --filter admin-api lint
   ```
3. **Expected Result**: ESLint exits with code 1 and logs:
   `error: '../../public-api/src/workers/cart-cleanup.cron' import is restricted from being used by a pattern. Cross-app imports from public-api into admin-api are strictly forbidden. (no-restricted-imports)`
4. Revert `apps/admin-api/src/index.ts`.
