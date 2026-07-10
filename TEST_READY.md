# E2E Test Suite Readiness Summary (SL-06, SL-07, SL-08)

This test suite covers Sprint 1 requirements for:
*   **SL-06: Inventory DO Sync & Location Filter**
*   **SL-07: Fulfillment State Transition**
*   **SL-08: Stripe Webhook Race Condition**

All tests are implemented using `@playwright/test` and are located under the `qa/tests/` directory.

---

## 📊 Test Case Coverage Matrix (40 Test Cases)

### Tier 1: Feature Coverage (15 test cases)
*   **SL-06: Inventory DO Sync & Location Filter**
    *   `TC-SL06-T1-01`: Product Stock Deduction (DO Disabled)
    *   `TC-SL06-T1-02`: Product Stock Deduction (DO Enabled)
    *   `TC-SL06-T1-03`: Multi-Location Stock Deduction (DO Disabled)
    *   `TC-SL06-T1-04`: Multi-Location Restocking (DO Disabled)
    *   `TC-SL06-T1-05`: Catalog Stock Display Check (DO Enabled)
*   **SL-07: Fulfillment State Transition**
    *   `TC-SL07-T1-01`: Single Item Full Shipment Fulfillment
    *   `TC-SL07-T1-02`: Carrier Webhook Delivery Transition
    *   `TC-SL07-T1-03`: Order State Transition Mismatch Validation
    *   `TC-SL07-T1-04`: Carrier Webhook Dispatch Transition
    *   `TC-SL07-T1-05`: Fulfill Non-existent Order ID
*   **SL-08: Stripe Webhook Race Condition**
    *   `TC-SL08-T1-01`: Payment Success Webhook (Happy Path)
    *   `TC-SL08-T1-02`: Late Webhook Arrival on Cancelled Order
    *   `TC-SL08-T1-03`: Webhook Idempotency Event Duplicate Prevention
    *   `TC-SL08-T1-04`: Stripe Checkout Session Expired Event
    *   `TC-SL08-T1-05`: Stripe Refunded Event

### Tier 2: Boundary & Corner Cases (15 test cases)
*   **SL-06: Inventory DO Sync & Location Filter**
    *   `TC-SL06-T2-01`: Zero Stock Levels (DO Enabled)
    *   `TC-SL06-T2-02`: DO SQLite Missing Table Auto-Recovery
    *   `TC-SL06-T2-03`: Exceeding Available Stock (DO Disabled)
    *   `TC-SL06-T2-04`: Exceeding Available Stock (DO Enabled)
    *   `TC-SL06-T2-05`: High-Volume Concurrent Checkouts on Single Product (DO Enabled)
*   **SL-07: Fulfillment State Transition**
    *   `TC-SL07-T2-01`: Fulfill Order in Pending Payment State
    *   `TC-SL07-T2-02`: Fulfill Order in Cancelled State
    *   `TC-SL07-T2-03`: Partial Order Item Fulfillment
    *   `TC-SL07-T2-04`: Fulfill Quantity Exceeding Ordered Quantity
    *   `TC-SL07-T2-05`: Carrier Webhook Signature Validation Failure
*   **SL-08: Stripe Webhook Race Condition**
    *   `TC-SL08-T2-01`: Stripe Webhook Missing Signature Header
    *   `TC-SL08-T2-02`: Stripe Webhook Invalid Signature Payload
    *   `TC-SL08-T2-03`: Out-of-Order Delivery (Refund Before Success)
    *   `TC-SL08-T2-04`: Concurrent Cron Cancel and Webhook Success
    *   `TC-SL08-T2-05`: Missing Order ID in Stripe Metadata

### Tier 3: Cross-Feature Combinations (3 test cases)
*   `TC-COM-T3-01`: Flash Sale Checkout Collision with Expiry Cron (SL-06 + SL-08)
*   `TC-COM-T3-02`: Fulfill Order During Webhook Late Processing Collision (SL-07 + SL-08)
*   `TC-COM-T3-03`: Multi-Location Deduction and Partial Fulfillment Stock Sync (SL-06 + SL-07)

### Tier 4: Real-World Application Scenarios (7 test cases)
*   `TC-REA-T4-01`: Full Customer Checkout-to-Delivery Journey (Happy Path)
*   `TC-REA-T4-02`: Expired Checkout Recovery and Late Payment Reconciliation
*   `TC-REA-T4-03`: Flash Sale High-Concurrency Inventory Sell-Out
*   `TC-REA-T4-04`: Auto-Approved Customer Return (RMA) with Stripe Refund
*   `TC-REA-T4-05`: Multi-Warehouse Out-of-Stock Recovery
*   `TC-REA-T4-06`: Admin RBAC Authorization Bypass Attempt
*   `TC-REA-T4-07`: Local Dev Authentication Bypass in Production Mode

---

## 🛠 File Layout & Location

1.  **Inventory DO Sync & Location Filter Tests**: `qa/tests/sl06-inventory-do-sync.spec.ts`
2.  **Fulfillment Tests**: `qa/tests/sl07-fulfillment.spec.ts`
3.  **Stripe Webhook Tests**: `qa/tests/sl08-stripe-webhook.spec.ts`
4.  **Combinations & Real-World Tests**: `qa/tests/combinations-realworld.spec.ts`
5.  **Execution script**: `qa/run_all_e2e.sh`
6.  **TypeScript configuration**: `qa/tsconfig.json`

---

## 🚀 Execution Instructions

### Environment Configurations

You can configure target hostnames and Stripe webhook keys using the following environment variables:
- `PUBLIC_API_URL`: The target URL for public API endpoints (default: `http://localhost:8787`).
- `ADMIN_API_URL`: The target URL for admin API endpoints (default: `http://localhost:8788`).
- `STRIPE_SECRET_KEY`: Override for the Stripe Secret Key (falls back to `.dev.vars` if not set).
- `STRIPE_WEBHOOK_SECRET`: Override for the Stripe Webhook Secret (falls back to `.dev.vars` if not set).

### Option 1: Automated Run (Spins up workers & runs tests)
```bash
# Make script executable (if not already)
chmod +x qa/run_all_e2e.sh
# Run the automated suite
./qa/run_all_e2e.sh
```

### Option 2: Manual Run
1.  **Start Public and Admin Workers**:
    ```bash
    # Terminal 1:
    cd apps/public-api && pnpm dev
    # Terminal 2:
    cd apps/admin-api && pnpm dev
    ```
2.  **Execute Playwright Tests**:
    ```bash
    cd qa
    pnpm install
    # Check TypeScript compilation
    npm run typecheck
    # Run all tests
    npx playwright test
    # Or run specific specs
    pnpm run test:sl06
    pnpm run test:sl07
    pnpm run test:sl08
    pnpm run test:comb
    ```
