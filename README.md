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

### 1. Zero DevOps Deployment
All code pushed to `main` is automatically picked up by Cloudflare Pages and Cloudflare Workers for immediate edge deployment. No intermediate CI pipelines are required for infrastructure updates.

### 2. Auto-generated Mobile SDKs
Whenever `packages/contract` is updated, our GitHub Actions pipeline (`openapi-sdk.yml`) automatically:
1. Compiles the Zod definitions into `openapi.json`.
2. Generates the Dart and Swift API clients.
3. Commits and pushes the new SDKs back to the `/sdks/` directory in this repository.

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

### Running Locally
```bash
# Install dependencies
pnpm install

# Start all local development servers
pnpm dev
```
