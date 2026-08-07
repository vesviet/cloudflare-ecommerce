# Orchestration Plan — Checkout Pipeline Refactoring

## Overview
This plan outlines the multi-phase refactoring of the checkout pipeline in `cloudflare-ecommerce` monorepo.
The orchestrator delegates all investigation, implementation, review, testing, and audit tasks to specialized subagents.

## Milestones & Execution Plan

### Milestone 1: Research & Investigation Phase (Parallel Explorers)
- **Goal**: Map complete data flow: `cartStore` → `checkout/page.tsx` → `checkout-api.ts` → `public-api/checkout.ts` → `InventoryService` → `PaymentService` → `OrderService` → `PromotionEngine`.
- **Agents**: Spawn 3 `teamwork_preview_explorer` subagents in parallel to investigate code files, Zod schemas, components, and services.
- **Deliverables**: Detailed analysis reports on code layout, type mismatches, missing constants, dead feature flags, currency display formatting, and exact line-by-line requirements for fixes.

### Milestone 2: Fix storefront-ui `checkout/page.tsx`
- **Goal**: Fix broken component structure in `apps/storefront-ui/src/app/checkout/page.tsx`.
- **Agents**: `teamwork_preview_worker` (Implementation), `teamwork_preview_reviewer` (Review & Verify), `teamwork_preview_auditor` (Forensic Audit).
- **Deliverables**: Complete, working Next.js page with thin Suspense wrapper, single `guestAddress` state, turnstile integration, form submission, loading state, cart clear & redirect on success.

### Milestone 3: Fix Inventory Item Shape Mismatch
- **Goal**: Align item shapes across `checkout.ts`, `inventory.service.ts`, and `order.service.ts`.
- **Agents**: `teamwork_preview_worker` (Implementation), `teamwork_preview_reviewer` (Review & Verify), `teamwork_preview_auditor` (Forensic Audit).
- **Deliverables**: Guaranteed parameter alignment (`id` vs `variation_id`) without `undefined` property access.

### Milestone 4: Remove Dead Feature Flag
- **Goal**: Remove `checkout-v2` flag check in `apps/public-api/src/routes/checkout.ts`.
- **Agents**: `teamwork_preview_worker` (Implementation), `teamwork_preview_reviewer` (Review & Verify), `teamwork_preview_auditor` (Forensic Audit).
- **Deliverables**: Cleaned checkout route without redundant flag checks, plus explanatory comment.

### Milestone 5: Fix Currency Mismatch in Shipping Display
- **Goal**: Change USD formatting `$${...}` to VNĐ format, clarify constant units with comments, add Stripe VNĐ technical debt comment.
- **Agents**: `teamwork_preview_worker` (Implementation), `teamwork_preview_reviewer` (Review & Verify), `teamwork_preview_auditor` (Forensic Audit).
- **Deliverables**: Proper VNĐ shipping display and documented constants.

### Milestone 6: Build, Lint & Test Verification
- **Goal**: Verify storefront-ui build, public-api lint, and test suites across public-api and core-services.
- **Agents**: `teamwork_preview_worker` (Runner & Fixer), `teamwork_preview_reviewer` (Verification), `teamwork_preview_auditor` (Forensic Audit).
- **Deliverables**: Clean build exit 0, 0 lint errors, 0 test failures.

### Milestone 7: Git Commit & Push & Victory Audit
- **Goal**: Commit all changes with exact message: `refactor(checkout): fix broken page, item shape mismatch, dead code, currency display` and push.
- **Agents**: `teamwork_preview_worker` (Git operation), `teamwork_preview_auditor` (Final Victory Audit).
- **Deliverables**: Git push completed, audit clean verdict reported.
