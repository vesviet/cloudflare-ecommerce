# Aura Store - Cloudflare E-commerce Platform

Aura Store is a 100% Serverless Edge e-commerce platform built on Cloudflare Workers, Cloudflare Pages, and Cloudflare D1. It is designed to be highly scalable, globally distributed, and maintain a "Zero DevOps" footprint while automatically serving Mobile Apps via auto-generated SDKs.

## Business Context
- **Problem**: Traditional e-commerce setups require heavy DevOps overhead, slow global response times, and manual synchronization between Backend APIs and Mobile Applications.
- **Outcome**: A fully edge-native platform that reduces operational costs, ensures sub-millisecond API responses globally, and auto-generates Mobile SDKs (iOS & Android) on every contract change.
- **Key Capabilities**: 
  - Internal Role-Based Access Control (RBAC) for administrative roles.
  - Global Storefront UI and secure Admin UI.
  - Native Mobile SDK synchronization.

## Architecture

The system is a Monorepo powered by **Turborepo** and deployed entirely on the Cloudflare ecosystem.

### Apps
- `apps/storefront-ui`: Public-facing E-commerce website (Next.js 15+ / React).
- `apps/admin-ui`: Internal administrative dashboard (Vite / React).
- `apps/public-api`: Cloudflare Worker serving the Storefront UI and public integrations.
- `apps/admin-api`: Cloudflare Worker serving the Admin UI, handling RBAC, content management, and fulfillment.

### Packages
- `packages/database`: D1 SQLite database schema and migrations (powered by Drizzle ORM).
- `packages/contract`: Zod schemas and OpenAPI specifications used to validate API payloads.

### Generated SDKs
- `sdks/dart/`: Auto-generated Flutter (Dart) SDK.
- `sdks/swift/`: Auto-generated iOS (Swift 5) SDK.

## Core Workflows & CI/CD

### 1. Deployment
Pushes to `main` run the `deploy.yml` GitHub Actions pipeline. A mandatory quality gate job runs ESLint, Vitest, `pnpm audit`, and a Trivy filesystem scan; deployment only starts once it passes. The pipeline then applies D1 migrations, deploys both Workers, and builds and deploys the two Pages projects.

### 2. Auto-generated Mobile SDKs
Whenever `packages/contract/src` is updated, the `openapi-sdk.yml` pipeline:
1. Compiles the Zod definitions into `openapi.json`.
2. Generates the Dart and Swift API clients.
3. Opens a pull request on the `auto/sdk-update` branch with the regenerated `/sdks/` output.

The SDK changes land after that pull request is reviewed and merged, so `main` is never written to directly by the generator.

Mobile teams consume these SDKs directly via Git submodules or package managers pointing to the respective folders, ensuring they always have the latest API contracts without manual handoffs.

## Internal RBAC & Security
The system uses a strict Role-Based Access Control model managed in `packages/database`:
- **Roles**: `superadmin`, `manager`, `support`, `editor`.
- **Enforcement**: Middleware in `admin-api` validates JWT/Session tokens against D1 to authorize endpoints.

## Development Setup

### Prerequisites
- Node.js 22+
- `pnpm` 9+
- Cloudflare Wrangler CLI
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (For local webhook testing)

### Running Locally
```bash
# Install dependencies
pnpm install

# Start all local development servers
pnpm dev
```

### Required Secrets
`JWT_SECRET` must be set for every environment that serves customer routes. Registration, login, the customer session middleware, and the review and return endpoints return `500` when it is missing rather than falling back to a default, so a misconfigured environment fails loudly instead of issuing tokens signed with a known key.

Set it locally in `apps/public-api/.dev.vars` and in production via `wrangler secret put JWT_SECRET`. The same applies to `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CARRIER_WEBHOOK_SECRET`, `RESEND_API_KEY`, and `TURNSTILE_SECRET_KEY`.

### Rate Limiting
Login, registration, review submission, and checkout are rate limited through the Cloudflare rate limiting bindings declared in `apps/public-api/wrangler.toml`. Each limit uses its own `namespace_id`, and `period` may only be `10` or `60` seconds. When a binding is unavailable, such as in local dev or tests, requests pass through unlimited and a warning is logged.

### Stripe Webhook Local Testing
To test Stripe Webhooks locally, run the Stripe CLI to forward events to the local `public-api` worker:
```bash
stripe listen --forward-to localhost:8787/api/webhooks/stripe
```
Then copy the webhook secret provided by the CLI and set it in your `apps/public-api/.dev.vars` file as `STRIPE_WEBHOOK_SECRET=whsec_...`
