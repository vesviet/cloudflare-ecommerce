#!/bin/bash
# =============================================================================
# Run All E2E Tests
# =============================================================================

# Stop on errors
set -e

# Get directories
QA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "$QA_DIR/.." && pwd)"

echo "🧹 Cleaning up any stale processes on ports 8787, 8788, 9229, 9230..."
kill -9 $(lsof -t -i:8787 -i:8788 -i:9229 -i:9230 2>/dev/null) 2>/dev/null || true

echo "🧹 Clearing wrangler state directory to start fresh..."
rm -rf "$MONOREPO_ROOT/apps/public-api/.wrangler"
rm -rf "$MONOREPO_ROOT/apps/admin-api/.wrangler"

echo "🔄 Initializing test D1 database..."
pnpm run setup:db

echo "🔄 Initializing WAL mode..."
pnpm run setup:wal

echo "🚀 Starting public-api worker in background on port 8787..."
cd "$MONOREPO_ROOT/apps/public-api"
pnpm exec wrangler dev --port 8787 --inspector-port 9229 --ip 127.0.0.1 &
PUBLIC_API_PID=$!

echo "⏳ Sleeping 5 seconds to let public-api register Durable Objects..."
sleep 5

echo "🚀 Starting admin-api worker in background on port 8788..."
cd "$MONOREPO_ROOT/apps/admin-api"
pnpm exec wrangler dev --port 8788 --persist-to ../public-api/.wrangler/state --inspector-port 9230 --ip 127.0.0.1 &
ADMIN_API_PID=$!

function cleanup {
  echo "🧹 Shutting down background workers..."
  pkill -9 -f wrangler || true
  pkill -9 -f workerd || true
  pkill -9 -f miniflare || true
  kill -9 $(lsof -t -i:8787 -i:8788 -i:9229 -i:9230 2>/dev/null) || true
}

trap cleanup EXIT

echo "⏳ Waiting for workers to become healthy..."
for i in {1..90}; do
  if curl -s http://127.0.0.1:8787/ > /dev/null && curl -s http://127.0.0.1:8788/api/me -H "X-Local-Admin-Email: admin@local.dev" > /dev/null; then
    echo "✅ Workers are healthy!"
    break
  fi
  if [ $i -eq 90 ]; then
    echo "❌ Timeout waiting for workers to start"
    exit 1
  fi
  sleep 1
done

echo "🧪 Running Playwright E2E tests..."
cd "$QA_DIR"
export PUBLIC_API_URL=http://127.0.0.1:8787
export ADMIN_API_URL=http://127.0.0.1:8788
npx playwright test tests/sl06-inventory-do-sync.spec.ts tests/sl07-fulfillment.spec.ts tests/sl08-stripe-webhook.spec.ts tests/combinations-realworld.spec.ts --workers=1

echo "🎉 All E2E tests executed successfully!"
