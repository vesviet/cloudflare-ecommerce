#!/bin/bash
# Helper script to run SL-07 E2E tests with a shared wrangler state

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔗 Symlinking admin-api .wrangler to public-api .wrangler to share state..."
if [ -d "apps/admin-api/.wrangler" ] && [ ! -L "apps/admin-api/.wrangler" ]; then
  rm -rf "apps/admin-api/.wrangler"
fi
if [ ! -L "apps/admin-api/.wrangler" ]; then
  ln -sf "../public-api/.wrangler" "apps/admin-api/.wrangler"
fi

echo "🔄 Initializing DB..."
cd apps/public-api
npx wrangler d1 migrations apply ecommerce-db --local
npx wrangler d1 execute ecommerce-db --local --file=seed.sql

echo "🚀 Starting public-api worker on port 8787..."
npx wrangler dev --port 8787 --inspector-port 9229 &
PUBLIC_PID=$!

echo "🚀 Starting admin-api worker on port 8788..."
cd ../admin-api
npx wrangler dev --port 8788 --inspector-port 9230 &
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

echo "🧪 Running all E2E Playwright tests..."
cd "$SCRIPT_DIR/qa"
npx playwright test tests/sl06-inventory-do-sync.spec.ts tests/sl07-fulfillment.spec.ts tests/sl08-stripe-webhook.spec.ts tests/combinations-realworld.spec.ts --workers=1
TEST_EXIT_CODE=$?

exit $TEST_EXIT_CODE
