.PHONY: install dev build lint clean setup setup-db setup-kv

# Install dependencies using pnpm
install:
	pnpm install

# Start the entire monorepo in development mode
dev:
	pnpm dev

# Build all apps and packages
build:
	pnpm build

# Run linting
lint:
	pnpm lint

# Full local setup: Install, migrate local DB, setup KV flags, and configure secrets
setup: install setup-db setup-kv setup-secrets
	@echo "Setup complete! Run 'make dev' to start the application."

# Setup local secrets (.dev.vars)
setup-secrets:
	@echo "Setting up local secrets (.dev.vars)..."
	@if [ ! -f apps/public-api/.dev.vars ]; then \
		cp apps/public-api/.dev.vars.example apps/public-api/.dev.vars; \
		echo "Created apps/public-api/.dev.vars - Please update with real test keys if needed."; \
	else \
		echo "apps/public-api/.dev.vars already exists."; \
	fi

# Apply migrations to the local SQLite D1 database
setup-db:
	@echo "Applying D1 migrations locally..."
	cd apps/public-api && npx wrangler d1 migrations apply e-commerce --local

# Setup local KV namespace for Feature Flags
setup-kv:
	@echo "Setting up local KV Feature Flags..."
	cd apps/public-api && npx wrangler kv:key put --binding=CACHE_KV "feature_flags" '{"rma_self_service": true}' --local

# Clean node_modules and turbo caches
clean:
	rm -rf node_modules
	rm -rf .turbo
	find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
	find . -name ".turbo" -type d -prune -exec rm -rf '{}' +
