#!/bin/bash
# Helper script to run SL-07 E2E tests

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔄 Re-initializing DB..."
mkdir -p apps/public-api/.wrangler/state/v3/d1
mkdir -p apps/admin-api/.wrangler/state/v3/d1
pnpm run setup:db

echo "🚀 Starting public-api worker on port 8787..."
cd apps/public-api
npx wrangler dev --port 8787 --inspector-port 9229 --persist-to=.wrangler/state &
PUBLIC_PID=$!

echo "🚀 Starting admin-api worker on port 8788..."
cd ../admin-api
npx wrangler dev --port 8788 --inspector-port 9230 --persist-to=../public-api/.wrangler/state &
ADMIN_PID=$!

cleanup() {
  echo "🧹 Cleaning up background workers (PIDs: $PUBLIC_PID, $ADMIN_PID)..."
  kill $PUBLIC_PID 2>/dev/null || true
  kill $ADMIN_PID 2>/dev/null || true
}

trap cleanup EXIT

echo "⏳ Waiting for workers to start..."
for i in {1..30}; do
  if curl -s http://localhost:8787/ > /dev/null && curl -s http://localhost:8788/api/me -H "X-Local-Admin-Email: admin@local.dev" > /dev/null; then
    echo "✅ Workers are healthy!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Timeout waiting for workers to start"
    exit 1
  fi
  sleep 1
done

echo "🧪 Running Playwright tests for SL-07..."
cd "$SCRIPT_DIR/qa"
npx playwright test tests/sl07-fulfillment.spec.ts --workers=1
TEST_EXIT_CODE=$?

exit $TEST_EXIT_CODE
