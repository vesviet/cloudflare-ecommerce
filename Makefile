.PHONY: help install build lint typecheck dev-all dev-public-api dev-admin-api dev-storefront dev-admin-ui db-migrate-local db-studio test-all test-idor test-stripe-mock test-load

# Default target: show help menu
help:
	@echo "======================================================================"
	@echo "                Aura E-Commerce Development Makefile                  "
	@echo "======================================================================"
	@echo "Available commands:"
	@echo "  make install           - Install all monorepo dependencies"
	@echo "  make build             - Build all apps and packages using Turborepo"
	@echo "  make lint              - Lint all codebases"
	@echo "  make typecheck         - Run TypeScript type checks across all workspaces"
	@echo "  make dev-all           - Spin up all development servers via Turborepo"
	@echo "  make dev-public-api    - Start the public-api dev server"
	@echo "  make dev-admin-api     - Start the admin-api dev server"
	@echo "  make dev-storefront    - Start the storefront-ui next.js dev server"
	@echo "  make dev-admin-ui      - Start the admin-ui vite dev server"
	@echo "  make db-migrate-local  - Generate drizzle schema updates and apply to local D1"
	@echo "  make db-studio         - Run drizzle-kit studio to browse database"
	@echo "  make test-all          - Run all local security and webhook mock tests"
	@echo "  make test-idor         - Execute local IDOR security test script"
	@echo "  make test-stripe-mock  - Execute local Stripe webhook mock test script"
	@echo "  make test-load         - Execute k6 load test script"
	@echo "======================================================================"

install:
	pnpm install

build:
	pnpm build

lint:
	pnpm lint

typecheck:
	pnpm --filter public-api exec tsc --noEmit && pnpm --filter storefront-ui exec tsc --noEmit && pnpm --filter admin-ui exec tsc -b

dev-all:
	pnpm dev

dev-public-api:
	pnpm --filter public-api dev

dev-admin-api:
	pnpm --filter admin-api dev

dev-storefront:
	pnpm --filter storefront-ui dev

dev-admin-ui:
	pnpm --filter admin-ui dev

db-migrate-local:
	pnpm --filter @ecommerce/database exec drizzle-kit generate:sqlite --config=drizzle.config.ts
	pnpm --filter public-api wrangler d1 migrations apply ecommerce-db-prod --local

db-studio:
	pnpm --filter @ecommerce/database exec drizzle-kit studio --config=drizzle.config.ts

test-all: test-idor test-stripe-mock

test-idor:
	@chmod +x ./qa/idor-security-test.sh
	./qa/idor-security-test.sh

test-stripe-mock:
	@chmod +x ./qa/stripe-webhook-mock.sh
	./qa/stripe-webhook-mock.sh

test-load:
	@if command -v k6 >/dev/null 2>&1; then \
		k6 run qa/k6-load-test.js; \
	else \
		echo "ERROR: k6 load test tool is not installed. Please install k6 (https://k6.io)"; \
		exit 1; \
	fi
