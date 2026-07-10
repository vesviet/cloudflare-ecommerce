# Aura Store E-Commerce Platform - Audit Analysis & Remediation Plan

## Executive Summary
*The Aura Store platform exhibits a severe disconnect between its database schema and application controllers due to an out-of-sync database migration (`0010_cold_kid_colt.sql`). This results in immediate compilation failures and runtime crashes across both the public and admin APIs, alongside critical security bypasses and transactional inventory corruption risks that prevent any viable production launch.*

---

## 1. P0 & P1 Issue Categorization and Root Cause Analysis

### 1.1 P0: Immediate Compilation & Build Errors (Platform Inoperable)
*   **Root Cause**: Migration `0010_cold_kid_colt.sql` dropped legacy tables (`coupons`, `coupon_audit_log`, `coupon_customer_uses`, `fulfillments`, `fulfillment_items`, `rma_requests`, `order_discounts`, `product_reviews`, and `wishlists`) to introduce standardized, normalized tables. However, the corresponding application services and controllers were never refactored to compile against the updated Drizzle schemas.
*   **Specific Compilation Breaches**:
    *   `apps/admin-api/src/routes/coupons.ts`: References deleted `schema.coupons` and `schema.couponCustomerUses` tables.
    *   `apps/admin-api/src/middleware/audit.ts`: References deleted `schema.couponAuditLog` table.
    *   `packages/core-services/src/rma.service.ts` & `apps/public-api/src/routes/rma.ts`: Reference deleted `schema.rmaRequests` table.
    *   `packages/core-services/src/fulfillment.service.ts`: References deleted `schema.fulfillments` and `schema.fulfillmentItems` tables.
    *   `packages/core-services/src/order.repository.ts`: Inserts records directly into deleted `schema.orderDiscounts`.
    *   `apps/admin-api/src/routes/orders.ts`: References deleted `schema.orderDiscounts` and `schema.coupons` tables during order queries.
    *   `apps/public-api/src/routes/reviews.ts`: References deleted `schema.productReviews` table.
    *   `packages/core-services/src/wishlist.service.ts`: References deleted `schema.wishlists` and runs a raw SQL query `FROM wishlists`.
*   **Hourly Cron Trigger Crash**:
    *   `apps/public-api/src/index.ts` uses the `and` operator in a Drizzle query for cart cleanup but fails to import it from `drizzle-orm`, causing a `ReferenceError` runtime crash.

### 1.2 P0: Critical Security Bypasses (Unauthorized Administrative Access)
*   **Local Dev Authentication Bypass**:
    *   Setting `LOCAL_DEV=true` allows requests containing a spoofed `X-Local-Admin-Email` header to bypass Cloudflare Zero Trust and gain full administrative API rights. This header bypass lacks production-level environment checking and poses an existential risk if deployed to production.
*   **Lack of Role-Based Access Control (RBAC)**:
    *   The admin authentication middleware verifies active administrative email status but fails to enforce permissions on specific routes. Critical state-changing endpoints (Categories, Settings, Customer Creation, Products, Promotions) lack `requireRole` guards, allowing low-privilege roles (e.g. `support`) to perform destructive writes.

### 1.3 P0: Database and Inventory State Corruption
*   **Decoupled Durable Object Stock State (`INVENTORY_DO`)**:
    *   When the high-concurrency inventory locking system is active, checkout deductions bypass the Cloudflare D1 database and write to an isolated SQLite instance within the Durable Object. There is no synchronization pipeline back to D1. Storefront catalog reads occur in D1, meaning the storefront displays stale stock levels and permits overselling.
    *   *DO Mock Default*: If the product table is uninitialized in the DO SQLite, it defaults to a stock of 100, bypassing D1 inventory limits.
*   **Multi-Location Stock Corruption**:
    *   The inventory deduction and restocking queries inside `InventoryRepository` as well as the functions `getCommitDeductionQueries` (Lines 170-174) and `getRestockQueries` (Lines 197-202) inside `packages/core-services/src/inventory.service.ts` lack any `location_id` qualifiers in their update queries. Consequently, stock is deducted from or added to **every location** a product is listed in, corrupting inventory state across warehouses.

### 1.4 P1: Transactional and API Logic Failures
*   **Late Stripe Payment Webhook Race Condition**:
    *   A background cron cancels `pending_payment` orders older than 15 minutes, restocks their items, and sets their status to `cancelled`. If a customer pays after this 15-minute window, the Stripe success webhook (`checkout.session.completed`) checks if the status is `pending_payment`. Since it is already `cancelled`, the webhook exits with a 200 OK but ignores the payment, leaving the order cancelled, stock restocked (and potentially sold), and the customer charged.
*   **Stripe Webhook Out-of-Order Delivery**:
    *   A delayed `checkout.session.completed` webhook arriving *after* a `charge.refunded` webhook will overwrite the order state back to `paid` or `processing` due to the lack of an event sequencing validator.
*   **Single Durable Object Concurrency Bottleneck**:
    *   Routing all inventory locks through a single global Durable Object without sharding (e.g., sharding by `product_id`) creates a CPU execution bottleneck (50ms execution limit) and connection timeout exceptions during high concurrency events (e.g. flash sales).
*   **RMA Clean Architecture Violation**:
    *   The public API `/api/rma` controller bypasses the `RmaService` to make direct queries and writes to D1 against the deleted `schema.rmaRequests` table.
    *   *Contradictory Logic*: The controller validates order eligibility using `status !== 'completed' && status !== 'processing'`, while `RmaService.createRMARequest` checks `status !== 'completed' && status !== 'delivered'`, creating split-brain state validation.

---

## 2. PM Prioritization Brief (Business Context)

### 2.1 Impact Classification Matrix

| Impact Category | Identified Issues | Business Impact Description |
| :--- | :--- | :--- |
| **Revenue Loss** | • Late Stripe Webhook Race<br>• Decoupled DO Inventory Lock<br>• Multi-Location Stock Corruption | Customers are charged for cancelled orders that cannot be fulfilled. Storefront catalog stock divergence leads to overselling, stockouts, and manual refund operations. Stock values are double-deducted across warehouses. |
| **Security Risk** | • Local Dev Authentication Bypass<br>• Missing RBAC guards on write routes | Spoofed headers bypass Zero Trust authentication completely. Low-privilege admin roles (e.g., support staff) can perform unauthorized product deletions or access sensitive customer PII. |
| **Operational Degradation** | • Complete Build Compilation Failure<br>• Cart Cleanup Cron Crash<br>• Single DO Concurrency Bottleneck | Codebase cannot build or deploy, blocking feature delivery. Cron crashes block automated database cleanup. Centralized DO locks fail under flash sale traffic, resulting in checkout downtime. |
| **UX Degradation** | • Fulfillment State Skipping<br>• Contradictory RMA Val. Rules | Skipping the `shipped` state prevents customers from receiving tracking numbers. Stale stock displays frustrate customers when items are out of stock. Conflicting RMA logic prevents eligible return requests. |

### 2.2 Proposed Release Gates
1.  **Gate 1 (Build and Compiles)**: The platform **cannot** go to production until the monorepo builds successfully (`pnpm build` completes with zero errors) and all references to dropped database tables are resolved.
2.  **Gate 2 (Data Integrity)**: The platform **cannot** go to production until multi-location inventory queries utilize location filters, and Durable Object stock levels synchronize in real-time with D1 catalog levels to prevent overselling.
3.  **Gate 3 (Financial Reconciliation)**: The platform **cannot** go to production until the Stripe/VNPay webhook handler is updated to automatically trigger support notifications or refunds for orders paid after the 15-minute cancellation window.
4.  **Gate 4 (Access Control)**: The platform **cannot** go to production until the `LOCAL_DEV` bypass header is strictly locked out of production environments and role guards are enforced on all admin write paths.

### 2.3 Business Hypothesis Statements
1.  **Given** the evidence that checkout stock deductions do not update the primary storefront database (D1), fixing the inventory synchronization mechanism will prevent catalog stock divergence, reducing customer support tickets for oversold items by 95%.
2.  **Given** the evidence that the cancel cron cancels orders after 15 minutes and late webhooks are ignored, updating the late payment processor to handle post-cancellation events will prevent charging customers for cancelled orders and eliminate credit card chargeback disputes from delayed transactions.
3.  **Given** the evidence that admin write endpoints lack role checks and dev bypass headers are accessible in the code, implementing strict role validations and environment-level access controls will prevent unauthorized administrative actions and safeguard customer PII from unauthorized access.
4.  **Given** the evidence that inventory updates lack location filters, adding a location filter to stock modifications will prevent multi-warehouse stock corruption, ensuring accurate stock valuations and operational alignment with fulfillment warehouses.

---

## 3. Technical Delivery Plan

### 3.1 Sprint 0: Phase 1 & 2 Remediation (P0 Compilation & Security Fixes)

#### Slice 1: `SL-01-COMP-PROMOTIONS`
*   **Description**: Refactor coupon management and order route files in `admin-api` and `public-api` to interact with `promotions` and `promotionRules` schemas, replacing references to deleted `coupons`, `couponAuditLog`, and `orderDiscounts` tables.
*   **Owner Role**: Backend Developer / Tech Lead
*   **Depends On**: None
*   **Estimated Complexity**: Medium (M)
*   **Quality Gate**: Build compiles for `admin-api` and `public-api`. Promotions creation, update, and order query endpoints successfully tested via API request mocks.
*   **Impact Radius**: Promotions module, admin coupon management endpoints.
*   **Rollback Strategy**: Revert git commits targeting coupon routes and database interactions.

#### Slice 2: `SL-02-COMP-RMA`
*   **Description**: Refactor public API RMA endpoints and `rma.service.ts` to utilize the new `returns`, `returnItems`, and `refunds` tables instead of the deleted `rmaRequests` table. Enforce Clean Architecture by routing all controller logic through the `RmaService` layer and unifying order validation rules.
*   **Owner Role**: Backend Developer
*   **Depends On**: None
*   **Estimated Complexity**: Medium (M)
*   **Quality Gate**: Build compiles. RMA endpoints return correct error responses for ineligible orders and insert returns/refunds successfully into the new database tables.
*   **Impact Radius**: RMA module, customer portals.
*   **Rollback Strategy**: Revert git commits targeting RMA routes and services.

#### Slice 3: `SL-03-COMP-FULFILLMENT`
*   **Description**: Refactor `fulfillment.service.ts` and related admin API routes to target the standardized `shipments` and `shipmentItems` tables instead of deleted `fulfillments` and `fulfillmentItems`.
*   **Owner Role**: Backend Developer
*   **Depends On**: None
*   **Estimated Complexity**: Medium (M)
*   **Quality Gate**: Build compiles. Fulfillment generation requests successfully insert shipment records and ship items without database errors.
*   **Impact Radius**: Fulfillment module, shipping integrations.
*   **Rollback Strategy**: Revert git commits targeting fulfillment services and routes.

#### Slice 4: `SL-04-COMP-MISC`
*   **Description**: Resolve remaining build errors including wishlist services (re-introduce or rewrite `wishlists` to map to schema, refactoring raw SQL queries `FROM wishlists`), reviews API routes, and order repository references. Import `and` from `drizzle-orm` in the public API index to fix the cart cleanup cron.
*   **Owner Role**: Backend Developer
*   **Depends On**: SL-01-COMP-PROMOTIONS
*   **Estimated Complexity**: Low (L)
*   **Quality Gate**: Clean monorepo build (`pnpm build` exits with code 0). Cart cleanup cron successfully runs locally.
*   **Impact Radius**: Wishlist service, Reviews API, Order repository, public API gateway.
*   **Rollback Strategy**: Revert git commits.

#### Slice 5: `SL-05-SEC-AUTH`
*   **Description**: Remove the `LOCAL_DEV` bypass header capability for non-development environments by restricting its evaluation to local sandbox configurations only. Apply a `requireRole` decorator to all administrative write routes to prevent low-privilege admin users from executing unauthorized catalog changes.
*   **Owner Role**: Security Engineer / Technical Lead
*   **Depends On**: None
*   **Estimated Complexity**: Medium (M)
*   **Quality Gate**: Automated security tests verify that spoofed `X-Local-Admin-Email` headers return a 401 Unauthorized in production environments, and role-based guards return 403 Forbidden for low-privilege tokens.
*   **Impact Radius**: Administrative authentication and authorization layer.
*   **Rollback Strategy**: Revert middleware code changes.

---

### 3.2 Sprint 1: Transaction Integrity and Performance (P1 Refinements)

#### Slice 6: `SL-06-INV-MULTILOC`
*   **Description**: Resolve multi-warehouse stock corruption by updating `InventoryRepository.deductStock`, `restock`, and core-service functions (`getCommitDeductionQueries`, `getRestockQueries`) to accept a `locationId` parameter and apply it as a filter in all Drizzle update/select queries.
*   **Owner Role**: Backend Developer
*   **Depends On**: SL-04-COMP-MISC
*   **Estimated Complexity**: Medium (M)
*   **Quality Gate**: Database tests verify that inventory updates only apply to the row matching both `product_id` and `location_id`.
*   **Impact Radius**: Inventory database level, checkout processing.
*   **Rollback Strategy**: Revert changes in inventory service and repository.

#### Slice 7: `SL-07-INV-DO-SYNC`
*   **Description**: Remediate Durable Object inventory decoupling. Implement stock seeding from D1 on DO initial fetch, implement namespace sharding (key-based sharding by `product_id` or `location_id`) to distribute lock loads, and establish a queue or transactional hook to sync DO SQLite inventory updates back to D1 in real-time.
*   **Owner Role**: Platform Engineer / Tech Lead
*   **Depends On**: SL-06-INV-MULTILOC
*   **Estimated Complexity**: Large (L)
*   **Quality Gate**: Load testing simulates 1,000 req/sec checkout concurrency without DO CPU timeout exceptions, and storefront catalog stock matches DO limits.
*   **Impact Radius**: Storefront catalog, Durable Object locking service, checkout APIs.
*   **Rollback Strategy**: Deactivate `INVENTORY_DO` config and fallback to pure D1 database transaction locking.

#### Slice 8: `SL-08-TX-WEBHOOK-CRON`
*   **Description**: Address Stripe webhook race conditions. Update the success webhook handler to process payments for already `cancelled` orders by creating a support ticket and triggering a refund. Implement a state sequencing validation filter in the Stripe webhook router to prevent delayed payment webhooks from overwriting refund states.
*   **Owner Role**: Backend Developer
*   **Depends On**: SL-04-COMP-MISC
*   **Estimated Complexity**: Medium (M)
*   **Quality Gate**: Integration tests verify that late webhook execution fails gracefully with correct state logs and initiates refunds, and out-of-order webhooks do not result in incorrect state overwrites.
*   **Impact Radius**: Stripe webhook handler, order cancellation cron, refund processor.
*   **Rollback Strategy**: Revert changes in webhook-processor.ts.

#### Slice 9: `SL-09-FULFILL-FLOW`
*   **Description**: Correct the fulfillment lifecycle state skipping. Refactor the admin fulfillment controller to update order statuses to `shipped` instead of `completed` upon generating a tracking number. Modify the carrier delivery webhook to listen for tracking updates and transition orders from `shipped` to `completed` upon delivery confirmation.
*   **Owner Role**: Backend Developer
*   **Depends On**: Slice 3 (`SL-03-COMP-FULFILLMENT`)
*   **Estimated Complexity**: Small (S)
*   **Quality Gate**: Fulfillment integration tests validate the full state lifecycle: processing -> shipped -> completed, and carrier webhooks trigger delivery confirmation logs.
*   **Impact Radius**: Order fulfillment state machine, customer delivery logs.
*   **Rollback Strategy**: Revert status transition adjustments in admin fulfillment controllers.

---

## 4. Debt Register Additions

The following items are appended to the Aura Store platform Debt Register, starting from `DEBT-005`:

```json
[
  {
    "id": "DEBT-005",
    "type": "Architecture",
    "severity": "P0",
    "title": "Codebase Out of Sync with Database Migration 0010 (Dropped Tables)",
    "description": "Several API routes and services reference tables dropped in migration 0010_cold_kid_colt.sql, leading to immediate compilation failures and runtime crashes across coupons, RMA, fulfillment, wishlists, and reviews.",
    "status": "New",
    "identified_at": "2026-07-07T14:28:27Z",
    "owner": "Technical Lead",
    "repayment_plan": "Refactor all referenced models, services, and route controllers in admin-api, public-api, and core-services to target the new standardized database schemas."
  },
  {
    "id": "DEBT-006",
    "type": "Architecture",
    "severity": "P0",
    "title": "Decoupled Durable Object Stock State",
    "description": "When INVENTORY_DO is active, checkout stock deductions write to the DO's local SQLite database but are never synchronized back to the main D1 database. The storefront reads D1, leading to stale stock displays and overselling.",
    "status": "New",
    "identified_at": "2026-07-07T14:28:27Z",
    "owner": "Platform Architect",
    "repayment_plan": "Implement sharding on DO namespaces by product_id and establish a message-queue or transactional webhook sync mechanism to replicate DO SQLite inventory changes back to D1 in real-time."
  },
  {
    "id": "DEBT-007",
    "type": "Security",
    "severity": "P1",
    "title": "Missing Role-Based Access Control on Administrative Write Routes",
    "description": "Critical administrative write paths (Categories, Settings, Customers, Promotions, Products) lack role-based guards, allowing low-privilege admin roles to perform destructive deletions or modifications.",
    "status": "New",
    "identified_at": "2026-07-07T14:28:27Z",
    "owner": "Security Engineer",
    "repayment_plan": "Add requireRole middleware with specific permission checks to protect all state-changing endpoints in admin-api."
  },
  {
    "id": "DEBT-008",
    "type": "Architecture",
    "severity": "P0",
    "title": "Location-Agnostic Inventory Deductions",
    "description": "Inventory deduction and restocking queries inside InventoryRepository and inventory.service.ts lack location_id qualifiers, resulting in stock modifications applying to every location a product is listed in.",
    "status": "New",
    "identified_at": "2026-07-07T14:28:27Z",
    "owner": "Backend Developer",
    "repayment_plan": "Refactor InventoryRepository and inventory.service.ts queries to accept location_id and append location filters to all Drizzle update/select clauses."
  },
  {
    "id": "DEBT-009",
    "type": "Architecture",
    "severity": "P1",
    "title": "Stripe Webhook and Cancel Cron Race Conditions",
    "description": "The system cancels orders after 15 minutes of non-payment. Late Stripe payments are ignored by the webhook handler (leaving the customer charged but order cancelled). Out-of-order webhooks overwrite order states back to paid/processing after refunds are already processed.",
    "status": "New",
    "identified_at": "2026-07-07T14:28:27Z",
    "owner": "Backend Developer",
    "repayment_plan": "Update webhook-processor.ts to trigger automatic refunds/support alerts for late payments, and integrate a state sequencing validation filter in the Stripe webhook router."
  },
  {
    "id": "DEBT-010",
    "type": "Architecture",
    "severity": "P1",
    "title": "RMA Routing Bypass and Conflicting Eligibility Logic",
    "description": "The public API RMA controller bypasses the RmaService layer to make raw D1 queries. Additionally, its order status eligibility check contradicts the eligibility check inside RmaService, creating conflicting state validation rules.",
    "status": "New",
    "identified_at": "2026-07-07T14:28:27Z",
    "owner": "Backend Developer",
    "repayment_plan": "Refactor public-api /api/rma controller to delegate requests directly to RmaService, and unify order status eligibility validations to eliminate split-brain logic."
  }
]
```

---

## 5. Risk Register

If the platform is shipped before these issues are resolved, the top three business risks are:

1.  **Existential Security Compromise (Admin Access Bypass)**:
    Leaving the `LOCAL_DEV` spoofing header active or failing to enforce RBAC write guards exposes the admin API to complete takeovers. Low-privilege users, compromised accounts, or malicious actors can bypass Cloudflare Access, modify store settings, delete catalogs, and access sensitive customer PII (credit logs, transaction details, home addresses).
2.  **Severe Revenue Leakage & Chargeback Disputes (Late Webhooks & Concurrency Bottlenecks)**:
    The combination of order cancel crons ignoring late Stripe webhooks (charging customers without delivering goods) and the centralized Durable Object lock causing CPU limits/timeouts under load will lead to checkout failures. The resulting lost transactions, inventory overselling, and chargeback penalties from credit card networks present severe financial and reputational threats.
3.  **Widespread Warehouse Data Corruption & Catalog Divergence**:
    Because database queries double-deduct and restock inventory across *all* locations (due to the missing `location_id` filter) and Durable Object deductions do not synchronize back to the storefront D1 catalog, inventory levels will immediately corrupt. The storefront will display products as in-stock when they are sold out, and warehouses will display inaccurate, corrupted stock quantities, rendering fulfillment impossible.

---

## 6. Definition of Done (DoD)

The Aura Store platform is considered **unblocked and ready for production deployment** when the following criteria are met:

1.  **Build Completes**: The monorepo builds successfully (`pnpm build`) with zero compilation errors in any workspace.
2.  **P0 Compilation Remediation Verified**: Compilation errors in the promotions, RMA, fulfillment, reviews, and wishlist modules are resolved, and routes are confirmed functional.
3.  **Security Gates Passed**: Spoofed authentication headers are verified blocked in production configurations. RBAC guards are confirmed active on all administrative write routes.
4.  **Inventory Integrity Verified**: Multi-location queries filter successfully by `location_id`.
5.  **Phase 7 QA Tasks Successfully Passed** (from `/Users/tuananh/Desktop/mywebsite/cloudflare-ecommerce/plan/execution-tasks.md`):
    *   **Load Test (Overselling)**: k6/Artillery simulation of 1,000 req/sec checkout concurrency demonstrates that inventory limits are strictly respected, sharded Durable Objects do not trigger CPU or timeout exceptions, and storefront catalog stock levels in D1 synchronize correctly.
    *   **Security Test (IDOR & Access)**: Verification checks confirm that guest tokens for User A cannot query Order IDs for User B (IDOR prevention), and administrative write paths reject low-privilege tokens without required roles.
    *   **Stripe Mock Test**: Simulation of late-arriving Stripe payment success events and out-of-order events (e.g., refund webhook preceding payment checkout) via Stripe CLI demonstrates that the system does not enter incorrect states, and automatically triggers support alerts or refunds for late/cancelled payments.

---

## 7. Order State Transition Table

The table below maps the corrected order status transitions, accounting for the restored `shipped` status, webhook delivery confirmations, and late payment reconciliation.

| Current Status | Target Status | Event / Trigger | Triggering Entity / Component | Action / System Response |
| :--- | :--- | :--- | :--- | :--- |
| **None** | `pending_payment` | Customer initializes checkout session | Storefront Checkout Orchestrator | Create order and item entries; apply soft lock on inventory levels; apply atomic coupon/loyalty locks. |
| **pending_payment** | `processing` | Stripe payment success webhook received within 15 mins | Stripe Webhook Processor | Verify webhook signature and transaction details; transition order status; release soft inventory locks; finalize stock deduction. |
| **pending_payment** | `cancelled` | Payment not completed within 15 mins | Order Cancellation Cron | Set status to `cancelled`; release atomic coupon and loyalty locks; restock soft-locked inventory. |
| **pending_payment** | `failed` | Stripe payment session initialization or inventory locking fails | Checkout Orchestrator | Abort order creation; rollback soft-locked inventory, coupons, and loyalty points. |
| **pending_payment** | `cancelled` (with Alert) | Stripe payment success webhook received *after* 15 mins | Stripe Webhook Processor | Mark order status as `cancelled` (payment failed/late); log transaction; **trigger automatic Stripe refund** or **escalate to support ticket**. |
| **processing** | `shipped` | Admin generates tracking number and carrier allocation | Admin Fulfillment Endpoint | Insert shipment details into `shipments` and `shipmentItems` tables; set order status to `shipped`; send tracking email to customer. |
| **processing** | `refunded` | Admin issues manual return or refund | Admin RMA Endpoint | Call Stripe Refund API; restock items into specified inventory location; transition order status. |
| **shipped** | `completed` | Carrier webhook confirms successful delivery | Carrier Webhook Router | Verify tracking status; log delivery confirmation timestamp; transition order status; release delivery notification. |
| **shipped** | `refunded` | Customer requests return or return webhook registers return-to-sender | Carrier / Customer Portal | Approve return request; update return status; call Stripe refund API; transition order status. |
| **completed** | `refunded` | Customer RMA request approved and processed | Customer RMA Portal / Admin | Update return status to `refunded`; invoke Stripe Refund API; restock items into database; transition order status. |
