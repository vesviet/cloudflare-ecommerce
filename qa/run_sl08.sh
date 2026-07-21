#!/bin/bash
set -e
QA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "$QA_DIR/.." && pwd)"
echo "🧹 Cleaning up any stale processes..."
kill -9 $(lsof -t -i:8787 -i:8788 -i:9229 -i:9230 2>/dev/null) 2>/dev/null || true
echo "🧹 Clearing wrangler state directory to start fresh..."
rm -rf "$MONOREPO_ROOT/apps/public-api/.wrangler"
rm -rf "$MONOREPO_ROOT/apps/admin-api/.wrangler"
echo "🔄 Initializing test D1 database..."
cd "$MONOREPO_ROOT"
pnpm run setup:db
pnpm run setup:wal
echo "🚀 Starting public-api worker in background on port 8787..."
cd "$MONOREPO_ROOT/apps/public-api"
pnpm exec wrangler dev --port 8787 --ip 127.0.0.1 > public_api_log.txt 2>&1 &
echo "⏳ Sleeping 5 seconds to let public-api register Durable Objects..."
sleep 5
echo "🚀 Starting admin-api worker in background on port 8788..."
cd "$MONOREPO_ROOT/apps/admin-api"
pnpm exec wrangler dev --port 8788 --persist-to ../public-api/.wrangler/state --ip 127.0.0.1 > admin_api_log.txt 2>&1 &
function cleanup {
  echo "🧹 Shutting down background workers..."
  kill -9 $(lsof -t -i:8787 -i:8788 -i:9229 -i:9230 2>/dev/null) || true
}
trap cleanup EXIT
sleep 5
echo "🧪 Running Playwright E2E tests for sl08..."
cd "$QA_DIR"
export PUBLIC_API_URL=http://127.0.0.1:8787
export ADMIN_API_URL=http://127.0.0.1:8788
npx playwright test tests/sl08-stripe-webhook.spec.ts --workers=1
