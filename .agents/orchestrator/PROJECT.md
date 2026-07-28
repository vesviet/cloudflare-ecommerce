# Project: Cloudflare E-Commerce Monorepo Architectural Constraints

## Architecture Overview
- Monorepo using `pnpm` workspaces and `turbo`.
- `apps/public-api`: Cloudflare Worker handling public storefront endpoints, database (`ecommerce-db`), Durable Objects (`INVENTORY_DO`), and cron triggers.
- `apps/admin-api`: Cloudflare Worker handling admin management endpoints, sharing D1 database state.
- `packages/contract`: Shared Zod schema & API contracts workspace for type-safe RPC across frontend and backend.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Data Retention Cron Job (Slice 6) | `apps/public-api`: `wrangler.toml` Cron trigger `0 0 * * *` & `src/index.ts` handler to delete `idempotency_keys`, abandoned `carts`, `checkout_idempotency` | None | DONE |
| 2 | ESLint Boundaries (Slice 7) | Enforce isolation between `apps/public-api` & `apps/admin-api` using `no-restricted-imports` and `no-restricted-syntax` AST selectors | None | DONE |
| 3 | API Contracts Workspace (Slice 8) | Verify & structure `packages/contract` Zod schemas & type-safe RPC boundaries for backend (Hono) & frontend | None | DONE |

## Interface Contracts
- `apps/public-api`: standard Cloudflare Worker `scheduled(event, env, ctx)` handler for daily maintenance.
- `packages/contract`: exports Zod schemas and Hono RPC types usable by `apps/public-api`, `apps/admin-api`, `apps/storefront-ui`, `apps/admin-ui`.

## Code Layout
- `apps/public-api/wrangler.toml`: Worker configuration (triggers, bindings).
- `apps/public-api/src/index.ts`: Worker entry point & scheduled event listener.
- `apps/admin-api/`: Admin worker codebase.
- `.eslintrc.js` or root/app eslint configs: ESLint rules and boundary settings.
- `packages/contract/`: Package source (`src/index.ts`, `package.json`, Zod schemas).
