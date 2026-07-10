#!/bin/bash
set -e

MONOREPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QA_DIR="$MONOREPO_ROOT/qa"

echo "🚀 Starting public-api worker in background on port 8787..."
cd "$MONOREPO_ROOT/apps/public-api"
npx wrangler dev --port 8787 --inspector-port 9229 --ip 127.0.0.1 &
PUBLIC_API_PID=$!

echo "🚀 Starting admin-api worker in background on port 8788..."
cd "$MONOREPO_ROOT/apps/admin-api"
npx wrangler dev --port 8788 --persist-to ../public-api/.wrangler/state --inspector-port 9230 --ip 127.0.0.1 &
ADMIN_API_PID=$!

cleanup() {
  echo "🧹 Shutting down background workers (PIDs: $PUBLIC_API_PID, $ADMIN_API_PID)..."
  kill $PUBLIC_API_PID 2>/dev/null || true
  kill $ADMIN_API_PID 2>/dev/null || true
}

trap cleanup EXIT

echo "⏳ Waiting for workers to become healthy..."
for i in {1..30}; do
  if curl -s http://127.0.0.1:8787/ > /dev/null && curl -s http://127.0.0.1:8788/api/me -H "X-Local-Admin-Email: admin@local.dev" > /dev/null; then
    echo "✅ Workers are healthy!"
    break
  fi
  if [ $i -eq 30 ]; then
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
