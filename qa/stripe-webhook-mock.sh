#!/bin/bash
# =============================================================================
# Stripe Webhook Test — Idempotency & Event Delivery
# =============================================================================
#
# PURPOSE:
#   Verify that processing the same Stripe event N times only advances the order
#   once (idempotency). The webhook handler uses INSERT OR IGNORE on idempotency_keys
#   to detect duplicates atomically.
#
# IMPORTANT — SIGNED EVENTS REQUIRED:
#   This endpoint requires a valid Stripe-Signature header (HMAC-SHA256).
#   Raw curl with unsigned JSON will ALWAYS be rejected with 400 "Invalid Stripe signature".
#
#   Use ONE of these methods for real testing:
#
#   METHOD 1 — Stripe CLI (recommended for local testing):
#     Install: https://stripe.com/docs/stripe-cli
#     1. Start your worker: cd apps/public-api && wrangler dev
#     2. In a second terminal:
#        stripe listen --forward-to http://localhost:8787/api/webhooks/stripe
#     3. Trigger a test event:
#        stripe trigger checkout.session.completed
#     4. Repeat step 3 two more times to test idempotency.
#     ORACLE: Stripe CLI console shows only 1 order status update across 3 deliveries.
#
#   METHOD 2 — Stripe CLI event replay (for a real session ID):
#     stripe events resend <evt_id>   # Find event IDs in Stripe Dashboard > Developers > Events
#
#   METHOD 3 — Integration test with valid signature (for CI):
#     Use the stripe-node library to generate a signed payload:
#       const stripe = new Stripe(STRIPE_SECRET_KEY)
#       const payload = JSON.stringify({ type: 'checkout.session.completed', ... })
#       const signature = stripe.webhooks.generateTestHeaderString({
#         payload, secret: STRIPE_WEBHOOK_SECRET
#       })
#       # Then POST with -H "Stripe-Signature: $signature"
#
# WHAT TO OBSERVE (all methods):
#   - DB query BEFORE: SELECT status FROM orders WHERE id = '<your_order_id>'
#     Expected before: status = 'pending_payment'
#   - DB query AFTER first delivery: status = 'processing'
#   - DB query AFTER 2nd and 3rd delivery: status unchanged = 'processing'
#   - Console logs show "[Webhook] Duplicate event ... already processed, skipping" for repeats
#
# =============================================================================

echo "⚠️  STRIPE WEBHOOK TEST — READ INSTRUCTIONS ABOVE"
echo ""
echo "This script demonstrates the expected behavior but CANNOT test the live endpoint"
echo "because Stripe signature verification requires HMAC-signed events."
echo ""
echo "Use 'stripe listen --forward-to http://localhost:8787/api/webhooks/stripe' for local testing."
echo ""
echo "To verify idempotency manually:"
echo "  1. Run: stripe trigger checkout.session.completed"
echo "  2. Query D1: wrangler d1 execute DB --local --command \"SELECT id, status FROM orders ORDER BY created_at DESC LIMIT 3\""
echo "  3. Run: stripe trigger checkout.session.completed  (same event type — idempotency key will block)"
echo "  4. Query D1 again — status should still be 'processing', not changed again"
echo ""
echo "Alternatively, use 'stripe events resend <evt_id>' to replay the exact same event ID."
