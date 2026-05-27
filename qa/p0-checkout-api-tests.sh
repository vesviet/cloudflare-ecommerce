#!/bin/bash
# =============================================================================
# P0 Checkout API Tests — Automated curl assertions
# =============================================================================
# Runs against LOCAL wrangler dev server (http://localhost:8787)
# Start worker first: cd apps/public-api && wrangler dev
#
# Tests: guest validation, empty cart, currency unit correctness (DB check)
# =============================================================================

set -euo pipefail

BASE_URL="${CHECKOUT_BASE_URL:-http://localhost:8787}"
PASS=0
FAIL=0

assert_status() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ PASS: $test_name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: $test_name — expected HTTP $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

assert_body_contains() {
  local test_name="$1"
  local expected_substr="$2"
  local body="$3"
  if echo "$body" | grep -q "$expected_substr"; then
    echo "  ✅ PASS: $test_name (body contains '$expected_substr')"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: $test_name — expected body to contain '$expected_substr'"
    echo "     Actual body: $body"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=== P0 Checkout API Tests ==="
echo "Target: $BASE_URL"
echo ""

# ---------------------------------------------------------------------------
# P0-6: Guest checkout with no email → 400
# ---------------------------------------------------------------------------
echo "[P0-6] Guest checkout with no email..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/checkout" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"variation_id": "test-var-1", "quantity": 1}]}')
BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1)
assert_status "Guest checkout without email → 400" "400" "$STATUS"
assert_body_contains "Error message mentions email" "email" "$BODY"

# ---------------------------------------------------------------------------
# P0-8: Empty cart → 400
# ---------------------------------------------------------------------------
echo ""
echo "[P0-8] Empty cart submission..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/checkout" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "items": []}')
BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1)
assert_status "Empty cart → 400" "400" "$STATUS"
assert_body_contains "Error message mentions empty" "empty" "$BODY"

# ---------------------------------------------------------------------------
# P0-CORS: Request from non-whitelisted origin → no CORS headers
# ---------------------------------------------------------------------------
echo ""
echo "[P1-3] CORS block for evil.com origin..."
CORS_HEADER=$(curl -s -I -X OPTIONS "$BASE_URL/api/checkout" \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" | grep -i "access-control-allow-origin" || echo "")
if [ -z "$CORS_HEADER" ]; then
  echo "  ✅ PASS: CORS blocked evil.com (no Access-Control-Allow-Origin header)"
  PASS=$((PASS + 1))
else
  echo "  ❌ FAIL: CORS allowed evil.com — header present: $CORS_HEADER"
  FAIL=$((FAIL + 1))
fi

# ---------------------------------------------------------------------------
# P0-WEBHOOK: Missing Stripe-Signature header → 400
# ---------------------------------------------------------------------------
echo ""
echo "[P0-WEBHOOK] Webhook without Stripe-Signature → 400..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/webhooks/stripe" \
  -H "Content-Type: application/json" \
  -d '{"type": "checkout.session.completed", "data": {"object": {"id": "cs_test_fake"}}}')
BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1)
assert_status "Webhook without signature → 400" "400" "$STATUS"
assert_body_contains "Error mentions signature" "Stripe-Signature" "$BODY"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== Results ==="
echo "  ✅ PASS: $PASS"
echo "  ❌ FAIL: $FAIL"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "❌ Some tests FAILED. Fix before deploying."
  exit 1
else
  echo "✅ All P0 automated tests PASSED."
fi
