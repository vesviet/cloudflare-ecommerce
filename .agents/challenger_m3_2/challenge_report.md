# Milestone 3 - API Contracts Workspace (Slice 8): Adversarial Challenge Report

## Challenge Summary

**Overall risk assessment**: HIGH

Empirical testing of Milestone 3 revealed critical TypeScript compilation errors in both frontend user interfaces (`apps/storefront-ui` and `apps/admin-ui`) caused by invalid relative import paths in their respective `api-client.ts` modules. Additionally, strict typechecking of `apps/public-api` surfaced 10 TypeScript type mismatch errors in `scheduled.test.ts`. Conversely, `@ecommerce/contract` and `apps/admin-api` typecheck cleanly, with `@ecommerce/contract` passing all 54 unit tests.

---

## Challenges

### [High] Challenge 1: Invalid Relative Import Path in `apps/storefront-ui/src/lib/api-client.ts`

- **Assumption challenged**: `storefront-ui` can import `AppType` from `public-api` using relative path `../../../apps/public-api/src/index`.
- **Attack scenario**: Executing `pnpm --filter storefront-ui exec tsc --noEmit`.
- **Blast radius**: `storefront-ui` fails to compile with TypeScript error `TS2307`.
- **Empirical evidence**:
  ```text
  src/lib/api-client.ts:2:30 - error TS2307: Cannot find module '../../../apps/public-api/src/index' or its corresponding type declarations.
  2 import type { AppType } from '../../../apps/public-api/src/index';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  ```
- **Root cause analysis**: File `apps/storefront-ui/src/lib/api-client.ts` is 2 directory levels below `apps/storefront-ui` (`src/lib`). Going up 3 levels (`../../../`) moves to `/home/user/personalized/cloudflare-ecommerce/apps`. Appending `apps/public-api/src/index` resolves to `apps/apps/public-api/src/index`, which does not exist on disk.
- **Mitigation**: Change import path to `../../public-api/src/index`.

---

### [High] Challenge 2: Invalid Relative Import Path in `apps/admin-ui/src/lib/api-client.ts`

- **Assumption challenged**: `admin-ui` can import `AppType` from `admin-api` using relative path `../../../apps/admin-api/src/index`.
- **Attack scenario**: Executing `pnpm --filter admin-ui run build` (`tsc -b && vite build`).
- **Blast radius**: `admin-ui` build fails completely with TypeScript error `TS2307`.
- **Empirical evidence**:
  ```text
  src/lib/api-client.ts:2:30 - error TS2307: Cannot find module '../../../apps/admin-api/src/index' or its corresponding type declarations.
  2 import type { AppType } from '../../../apps/admin-api/src/index';
                                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  ```
- **Root cause analysis**: File `apps/admin-ui/src/lib/api-client.ts` is 2 directory levels below `apps/admin-ui` (`src/lib`). Going up 3 levels (`../../../`) moves to `/home/user/personalized/cloudflare-ecommerce/apps`. Appending `apps/admin-api/src/index` resolves to `apps/apps/admin-api/src/index`, which does not exist on disk.
- **Mitigation**: Change import path to `../../admin-api/src/index`.

---

### [Medium] Challenge 3: Type Mismatch in `apps/public-api/src/__tests__/scheduled.test.ts`

- **Assumption challenged**: `apps/public-api` codebase and tests pass strict `tsc --noEmit`.
- **Attack scenario**: Executing `pnpm --filter public-api exec tsc --noEmit`.
- **Blast radius**: 10 `TS2345` compilation errors across `scheduled.test.ts`.
- **Empirical evidence**:
  ```text
  src/__tests__/scheduled.test.ts:78:51 - error TS2345: Argument of type '{ DB: any; }' is not assignable to parameter of type 'Bindings'.
    Type '{ DB: any; }' is missing the following properties from type 'Bindings': CACHE_KV, PRODUCTS_R2, CMS_R2, EVENT_QUEUE, and 7 more.
  ```
- **Root cause analysis**: `scheduled.test.ts` defines `mockEnv = { DB: {} as any }` and passes it to `worker.scheduled(...)`, which expects the full `Bindings` type.
- **Mitigation**: Cast `mockEnv as Bindings` (or `mockEnv as any`) when calling `worker.scheduled`.

---

## Stress Test Results

| Scenario | Target Package/App | Expected | Actual Result | Status |
|---|---|---|---|---|
| Contract Schema Validation | `@ecommerce/contract` | All 54 tests pass | 54/54 tests passed across 4 test suites | **PASS** |
| Contract Typecheck | `@ecommerce/contract` | 0 TS errors | 0 TS errors (`tsc --noEmit`) | **PASS** |
| Admin API Typecheck | `apps/admin-api` | 0 TS errors | 0 TS errors (`tsc --noEmit`) | **PASS** |
| Public API Typecheck | `apps/public-api` | 0 TS errors | 10 TS errors in `scheduled.test.ts` | **FAIL** |
| Storefront UI Typecheck | `apps/storefront-ui` | 0 TS errors | Error `TS2307` in `api-client.ts:2` | **FAIL** |
| Admin UI Build & Typecheck | `apps/admin-ui` | Build succeeds | Error `TS2307` in `api-client.ts:2` | **FAIL** |
| RPC Client Creation & Type Inference | `public-api` & `admin-api` | `hc<AppType>` infers endpoints | Verified type safety with correct relative paths | **PASS** |

---

## Unchallenged Areas

- E2E runtime HTTP requests using Miniflare dev servers (out of scope for static contract typing and TS compilation verification).
- Non-TypeScript JS build output bundles (handled downstream by Vite and Next.js once TS errors are resolved).
