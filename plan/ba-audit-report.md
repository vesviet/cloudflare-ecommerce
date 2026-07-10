# Aura Store Platform - Business Analysis (BA) Audit Report

## 1. Executive Summary

This Business Analysis (BA) Audit Report provides a comprehensive review of the Aura Store e-commerce platform. It synthesizes the findings of the three explorer subagents who audited the database schemas, Zod contract packages, public client APIs, admin-api endpoints, and key transactional flows.

### Overall Platform Quality
The platform is built on modern serverless technologies (Cloudflare Workers, Cloudflare D1, KV, and R2) and utilizes a monorepo structure. While the core relational schema design is well-structured and aligns with e-commerce standards, the implementation exhibits severe structural drift. Specifically, a major database refactor (Migration `0010_cold_kid_colt.sql`) dropped legacy tables to introduce standardized replacements, but the application controllers and services were never updated to match. This results in **immediate compilation failures** in both the public-api and admin-api services, rendering the platform unbuildable.

### Major Architectural Risks
1. **Decoupled Durable Object Inventory Lock**: When high-concurrency inventory locking is enabled via `INVENTORY_DO`, checkout deductions bypass the Cloudflare D1 database and write to an isolated, in-memory SQLite database inside the Durable Object. There is no synchronization mechanism back to D1. Because the storefront catalog reads stock levels from D1, the storefront and checkout systems immediately diverge, leading to stale storefront stock displays and potential overselling.
2. **Multi-Location Inventory Corruption**: The inventory deduction and restocking queries in `InventoryRepository` lack a `location_id` filter. In addition, `getCommitDeductionQueries` (Lines 170-174) and `getRestockQueries` (Lines 197-202) inside `packages/core-services/src/inventory.service.ts` similarly lack `location_id` qualifiers in their database updates. In multi-location scenarios, stock is deducted from or added to **every location** a product is listed in, corrupting inventory state.
3. **Fulfillment State Machine Mismatch**: The admin fulfillment endpoint immediately marks orders as `completed` in the database, skipping the `shipped` state. The carrier webhook processor expects orders to transition from `shipped` to `completed` upon delivery. Because the order is already `completed`, the webhook handler skips processing carrier notifications.

### Compilation and Build Errors
The platform cannot be built due to references to deleted tables in the following files:
*   `apps/admin-api/src/routes/coupons.ts`: References `schema.coupons` (deleted).
*   `apps/admin-api/src/middleware/audit.ts`: References `schema.couponAuditLog` (deleted).
*   `packages/core-services/src/rma.service.ts` & `apps/public-api/src/routes/rma.ts`: Reference `schema.rmaRequests` (deleted).
*   `packages/core-services/src/fulfillment.service.ts`: References `schema.fulfillments` and `schema.fulfillmentItems` (deleted).
*   `packages/core-services/src/order.repository.ts`: References `schema.orderDiscounts` (deleted) on database inserts.
*   `apps/admin-api/src/routes/orders.ts`: References `schema.orderDiscounts` and `schema.coupons` (deleted) during order queries.
*   `apps/public-api/src/routes/reviews.ts`: References `schema.productReviews` (deleted) on product reviews retrieval and creation.
*   `packages/core-services/src/wishlist.service.ts`: References `schema.wishlists` (deleted) on wishlist additions, removals, and merges, and executes a raw SQL query referencing the deleted `"wishlists"` table.
*   `apps/public-api/src/index.ts`: The hourly cron job crashes with a `ReferenceError` because it uses the `and` operator in a Drizzle query but does not import it from `drizzle-orm`.

### Security Issues
*   **RBAC Bypass**: The admin authentication middleware only verifies that the request originates from an active admin email. Individual routes do not apply role-based access control by default. Critical write paths (Categories, Coupons, Products, Settings, and Customer creation) lack `requireRole` guards, allowing low-privilege admin roles (e.g., `support`) to perform unauthorized modifications or deletions.
*   **Local Dev Authentication Bypass**: Setting `LOCAL_DEV=true` allows full access to the admin API using a spoofed `X-Local-Admin-Email` header, bypassing Cloudflare Zero Trust. This poses a major risk if enabled in production.

---

## 2. Codebase Index & Navigation Map

To ensure consistent integration and prevent architectural violations, the Aura Store platform's codebase is indexed across its four applications and four packages:

### Applications
1. **storefront-ui**
   - **Role**: Customer-facing storefront interface.
   - **Entrypoint**: Next.js / Astro page route controllers and rendering components.
   - **Boundaries**: Operates within the browser and public client context; communicates with the `public-api` gateway.
   - **Dependencies**: Depends on the shared validation models in the `contract` package and routing patterns in `shared-routes`.
2. **admin-ui**
   - **Role**: Store management and back-office administrative portal.
   - **Entrypoint**: Single Page Application (SPA) entrypoint (e.g. `src/main.tsx`).
   - **Boundaries**: Authenticated, internal administrative workspace.
   - **Dependencies**: Depends on administrative validation models in the `contract` package.
3. **public-api**
   - **Role**: Public API Gateway for e-commerce client operations.
   - **Entrypoint**: `apps/public-api/src/index.ts`.
   - **Boundaries**: Public-facing REST endpoints (e.g., `/api/cart`, `/api/checkout`, `/api/rma`).
   - **Dependencies**: Depends on `database` client, Zod schemas in `contract`, business logic in `core-services`, and HTTP routes in `shared-routes`.
4. **admin-api**
   - **Role**: Back-office administrative API Gateway.
   - **Entrypoint**: `apps/admin-api/src/index.ts`.
   - **Boundaries**: Private administrative endpoints protected by Cloudflare Access/Zero Trust authentication.
   - **Dependencies**: Depends on `database`, `contract`, and `core-services`.

### Packages
1. **database**
   - **Role**: Database connection initializer, Drizzle schema mappings, and D1 migrations.
   - **Entrypoint**: `packages/database/src/index.ts`.
   - **Boundaries**: Direct database interface layer.
   - **Dependencies**: Depends on `drizzle-orm` and raw D1 bindings.
2. **contract**
   - **Role**: Shared data transfer object (DTO) models, validation schemas, and TypeScript interfaces.
   - **Entrypoint**: `packages/contract/src/index.ts`.
   - **Boundaries**: Language-level input/output constraints.
   - **Dependencies**: Depends on `zod` validator.
3. **core-services**
   - **Role**: Domain services, repositories, and business transaction orchestrators.
   - **Entrypoint**: `packages/core-services/src/index.ts`.
   - **Boundaries**: Encapsulates business rules (e.g., `OrderService`, `InventoryService`, `RmaService`) to prevent leakage into controllers.
   - **Dependencies**: Depends on `database` for persistence and `contract` for validation constraints.
4. **shared-routes**
   - **Role**: Reusable middleware, shared route maps, and edge routing modules.
   - **Entrypoint**: Reusable route definitions and configuration. Exports `customerRouter`, `mediaRouter`, and `featureFlagsRoute`, and manages default feature flag fallbacks from Cloudflare KV.
   - **Dependencies**: Depends on `database` and `contract`.

---

## 3. Per-Domain Business Rules Analysis

### 3.1 Catalog / Product Information Management (PIM)
*   **Business Rules**:
    *   Products can be `simple` or `variable`.
    *   Pricing and stock levels are separated from the main `products` table (Migration `0007_cultured_thena.sql`).
    *   Pricing must reside in the `price_list_items` table under the base price list `pl_base`.
    *   Stock levels must reside in the `inventory_levels` table under location `loc_default` for simple products.
    *   Storefront compatibility requires aliasing `price_list_items.price` to `regular_price` and `inventory_levels.stock_quantity` to `stock_quantity`.
*   **State Transition Notes**:
    *   Product statuses: `draft` -> `published` -> `archived`.
*   **Edge Cases**:
    *   **Silent Discard of Secondary Categories**: The product form validation contract parses `secondary_categories`, but the upsert service `prepareUpsertProduct` ignores it, failing to write category relationships.
    *   **Orphaned Assets**: Updating a product's images deletes the linkages in the `product_assets` junction table but leaves the files in the `PRODUCTS_R2` bucket and their references in the `assets` table, causing storage leaks.
*   **Open Questions**:
    *   Why are secondary categories validated in the contract if they are not supported in the database service?
*   **Race Conditions / Consistency Issues**:
    *   Concurrent updates to a product's price or stock by different administrators can result in last-write-wins conflicts unless handled within a D1 batch transaction.

### 3.2 Cart
*   **Business Rules**:
    *   Carts support both guest sessions and logged-in customers.
    *   Carts can sync items across devices.
    *   Abandoned carts are eligible for cleanup and promotional email alerts after inactivity.
*   **State Transition Notes**:
    *   Cart status: `active` -> `abandoned` -> (archived or cleaned up).
*   **Edge Cases**:
    *   Merging guest carts with customer carts upon login must resolve duplicate item IDs by summing quantities.
*   **Open Questions**:
    *   What is the exact inactivity duration before a cart is marked `abandoned`?
*   **Race Conditions / Consistency Issues**:
    *   **Cart Cleanup Cron Crash**: The cron job in `apps/public-api/src/index.ts` crashes due to a `ReferenceError` because the `and` function from `drizzle-orm` is not imported, preventing abandoned cart cleanup from executing.

### 3.3 Checkout
*   **Business Rules**:
    *   Requires a valid email for guests or an authenticated customer account.
    *   Must validate inventory and pricing prior to payment session creation.
    *   Utilizes a Two-Phase Commit (2PC) orchestrator to coordinate inventory lock and Stripe checkout session creation.
*   **State Transition Notes**:
    *   Order checkout state: `pending_payment` -> `processing` (payment successful) or `failed`/`cancelled` (rollback/restock).
*   **Edge Cases**:
    *   **Feature Flag Fallback No-Op**: The `checkout-v2` setting is read. If disabled, it prints a log message but still runs the V2 checkout code, as no V1 fallback path exists.
    *   **Mock Shipping Engine**: Zipcode shipping rates are flat-fee ($9.99) and cached in KV, acting as a mock rather than a real-time carrier integration.
*   **Open Questions**:
    *   Should the `checkout-v2` feature flag be removed if there is no intention of supporting a V1 fallback?
*   **Race Conditions / Consistency Issues**:
    *   **Durable Object Stock Isolation**: When `INVENTORY_DO` is active, stock checks and deductions write to the DO's local SQLite DB, which is isolated from the main D1 database. The storefront reads D1, leading to immediately diverging stock levels. Additionally, if the table does not exist in the DO SQLite, it defaults to a mock stock of 100, allowing overselling.

### 3.4 Orders
*   **Business Rules**:
    *   Orders are created in a `pending_payment` state during checkout.
    *   Status transitions are protected using optimistic concurrency locking (`updateOrderStatus` checks the expected `oldStatus`).
*   **State Transition Notes**:
    *   `pending_payment` -> `processing` -> `completed` / `cancelled` / `refunded`.
*   **Edge Cases**:
    *   **Late Stripe Payment Webhook**: The 5-minute cron job cancels `pending_payment` orders older than 15 minutes, restocks their items, and sets their status to `cancelled`. If the customer pays after 15 minutes, the Stripe webhook arrives, checks if the status is `pending_payment` (which is now `cancelled`), and exits successfully without updating the order or restocking.
*   **Open Questions**:
    *   How should the system alert administrators or trigger automated refunds when late payments occur?
*   **Race Conditions / Consistency Issues**:
    *   Concurrent execution of the cancel cron and the Stripe payment webhook is resolved by optimistic locking. However, the losing payment webhook fails silently, leading to unpaid but shipped goods (overselling) or charged but cancelled orders.

### 3.5 Fulfillment
*   **Business Rules**:
    *   Fulfillment processes order items and generates tracking numbers and carrier associations.
    *   Supports partial or full shipments.
*   **State Transition Notes**:
    *   Order status: `processing` -> `shipped` -> `completed`.
*   **Edge Cases**:
    *   **Broken Database Tables**: The fulfillment service `FulfillmentService` attempts to write to `schema.fulfillments` and `schema.fulfillmentItems` which were dropped in migration `0010_cold_kid_colt.sql`, causing runtime failures.
*   **Open Questions**:
    *   How should partial shipments affect the main order status?
*   **Race Conditions / Consistency Issues**:
    *   **Fulfillment State Skipping**: The admin fulfillment route updates order status directly to `completed` (skipping `shipped`). Because the status is already `completed`, the carrier webhook processor (which expects `shipped` to transition to `completed` upon delivery) fails to transition the order and skips delivery logs.

### 3.6 RMA (Returns & Refunds)
*   **Business Rules**:
    *   Customers can self-request returns for `completed` or `delivered` orders.
    *   **Auto-Approve Rule**: Requests are auto-approved if the customer has a "VIP" tag or if the order total is below 500,000 cents/VND.
    *   Approved returns trigger an asynchronous Stripe refund.
*   **State Transition Notes**:
    *   Return status: `requested` -> `approved`/`rejected` -> `refunded`.
*   **Edge Cases**:
    *   **Broken Controller**: The RMA route and service write to `schema.rmaRequests` (deleted), causing crashes on all requests.
*   **Open Questions**:
    *   Why was the `rma_requests` table dropped without updating the RMA controller or service?
*   **Race Conditions / Consistency Issues**:
    *   If Stripe refunding succeeds but the subsequent update to `schema.rmaRequests` fails, the order status in the DB will remain out of sync.
    *   **Clean Architecture Violation & Route Contradiction**: The public API `/api/rma` route controller (`rma.ts`) completely bypasses the `RmaService` layer, making direct queries and writes to D1 using the deleted `schema.rmaRequests` table. Furthermore, there is a direct logic contradiction: the `/api/rma` controller validates order eligibility using `order.status !== 'completed' && order.status !== 'processing'`, whereas the `RmaService.createRMARequest` service validates using `order.status !== 'completed' && order.status !== 'delivered'`. This bypasses business rules encapsulation and introduces conflicting state validations.

### 3.7 Coupons (Promotions)
*   **Business Rules**:
    *   Coupons (promotions) have usage limits and expiration dates.
    *   Checkout checkout validation increments the coupon's `times_used` counter.
*   **State Transition Notes**:
    *   Promotion status: `active` -> `disabled`.
*   **Edge Cases**:
    *   **Broken Admin Routes**: Admin coupon endpoints attempt to query `schema.coupons` and `schema.couponAuditLog` (both deleted), crashing on load.
*   **Open Questions**:
    *   How should we migrate the coupon UI and admin routes to reference the `promotions` and `promotion_rules` tables?
*   **Race Conditions / Consistency Issues**:
    *   The checkout flow uses a proper atomic database lock on `schema.promotions` to prevent concurrent limit bypass. However, because admin management is broken, administrators cannot deactivate or edit promotions.

### 3.8 Customers
*   **Business Rules**:
    *   Stores profile data, marketing preferences, and loyalty points.
    *   Addresses are stored and retrieved with a KV-based cache (`user_addresses_${customerId}`).
    *   Updates to addresses must evict the KV cache key.
*   **State Transition Notes**:
    *   Customer status: `active` -> `inactive`.
*   **Edge Cases**:
    *   An address update evicts the KV cache, but if the subsequent cache delete fails or lags, the customer will read stale address data from the storefront.
*   **Open Questions**:
    *   Why are there no role-based permission checks on the admin customer creation endpoint?
*   **Race Conditions / Consistency Issues**:
    *   High-frequency address updates can cause cache-invalidation races where stale data is re-cached.

---

## 4. Two-Phase Commit (2PC) Checkout Flow Deep Dive

The checkout flow utilizes a structured Two-Phase Commit orchestrator to manage state changes across multiple systems (inventory, payments, promotions, and loyalty) before finalizing the order.

```
[Storefront Checkout]
       │
       ▼
┌──────────────────────────────────────────┐
│  Phase 0: Atomic Coupon Lock (D1)        │
│  - Update promotions.times_used          │
│  - Check times_used < usage_limit        │
└──────────────────┬───────────────────────┘
                   │ Success
                   ▼
┌──────────────────────────────────────────┐
│  Phase 1: Create Order (D1)              │
│  - Insert orders & orderItems            │
│  - Set status to 'pending_payment'       │
└──────────────────┬───────────────────────┘
                   │ Success
                   ▼
┌──────────────────────────────────────────┐
│  Phase 1.5: Lock Loyalty Points (D1)     │
│  - Deduct loyalty balance                │
└──────────────────┬───────────────────────┘
                   │ Success
                   ▼
┌──────────────────────────────────────────┐
│  Phase 2: Atomic Inventory Lock          │
│  - Deduct stock levels                   │
└──────────────────┬───────────────────────┘
                   │
         ┌─────────┴─────────┐
         │ INVENTORY_DO ?    │
         └────┬──────────┬───┘
              │ No       │ Yes
              ▼          ▼
   ┌───────────────┐  ┌────────────────────────┐
   │ Deduct in D1  │  │ Call Durable Object    │
   │ (All locations│  │ - Deduct in DO SQLite  │
   │ due to bug)   │  │ (Stale: D1 not updated)│
   └──────┬────────┘  └──────────┬─────────────┘
          │                      │
          └──────────┬───────────┘
                     │ Success
                     ▼
┌──────────────────────────────────────────┐
│  Phase 3: Create Stripe Session          │
│  - Generate Payment Intent               │
│  - Update order with session_id          │
└──────────────────┬───────────────────────┘
                   │ Payment Success Webhook
                   ▼
┌──────────────────────────────────────────┐
│  Phase 4: Confirm Order Payment (D1)     │
│  - Update status to 'processing'         │
└──────────────────────────────────────────┘
```

### The Webhook vs. Cancel Cron Race Condition
The platform processes order cancellations via a background cron job running every 5 minutes. If a payment is not completed within 15 minutes, the cron job cancels the order and restocks the items:

1.  **Cron Execution**: The cancel cron transitions the order status in D1:
    $$\text{pending\_payment} \xrightarrow{\text{Cron (15 mins)}} \text{cancelled}$$
    It then increments the inventory back in the database (restocking).
2.  **Late Payment**: The customer pays the Stripe checkout session after the 15-minute window. Stripe captures the funds and fires the `checkout.session.completed` webhook.
3.  **Webhook Processing**: The webhook handler processes the event:
    ```typescript
    if (order && order.status === 'pending_payment') {
      await OrderService.processPaymentSuccess(db, orderId);
    }
    ```
4.  **Failure State**: Because the order status is already `cancelled`, the webhook processor ignores the payment. It returns an HTTP 200 to Stripe, but the order remains `cancelled` in D1 and the inventory remains restocked.
5.  **Impact**: The customer is charged, but the order is marked cancelled. The inventory has been restocked and potentially sold to another customer, resulting in silent revenue leaks, database inconsistency, and order fulfillment failures.

### Inventory DO Decoupling
The Durable Object (`InventoryLockManagerDO`) is decoupled from the main database:
*   **Isolated Storage**: The DO stores inventory stock in its own SQLite database.
*   **No Synchronization**: There is no sync pipeline to replicate updates made in the DO SQLite database back to the main D1 database.
*   **Stale Storefront**: The storefront catalog reads inventory levels from D1. Since checkouts modify only the DO SQLite DB, the storefront continues to display stale stock levels, showing products as in-stock when they are sold out.
*   **Mock Default**: If the product table is uninitialized in the DO SQLite database, it defaults to a mock stock quantity of `100`, bypassing actual inventory limits.

### Adversarial Scenarios & Stress Test Challenges

#### Stripe Webhook Out-of-Order Delivery
A major vulnerability exists regarding the non-deterministic arrival order of Stripe webhooks. Due to network congestion or retry mechanics, a `charge.refunded` webhook might be received and processed by the application *before* the corresponding `checkout.session.completed` webhook.
*   **Root Cause**: Since there is no status sequencing guard in the webhook router, the refund handler attempts to transition the order to `refunded`. However, if the order is still in `pending_payment` state when the refund webhook arrives, the system may transition it to `refunded` or fail. When the delayed `checkout.session.completed` webhook subsequently arrives, it may overwrite the state back to `paid` or `processing`, leaving a refunded order marked as successfully paid.
*   **Impact**: Unreconciled inventory deductions, paid order states for refunded customers, and automated fulfillment of refunded orders.

#### Single Durable Object Concurrency Bottleneck
When `INVENTORY_DO` is enabled for high-concurrency inventory locking, the platform routes all inventory validation and lock checkouts through a single global Durable Object instance.
*   **Root Cause**: The current design lacks sharding by product category, warehouse location, or product ID. Under high-concurrency checkout events (e.g., flash sales), a single Durable Object becomes a severe choke point. It must synchronously handle, check, and persist stock levels in its internal SQLite instance for all cart checkouts.
*   **Impact**: This centralized bottleneck triggers Cloudflare Workers CPU limit (50ms execution limit) or timeout limit exceptions (causing connection aborts), leading to checkout failures, HTTP 500 errors, and complete checkout flow degradation during peak traffic.

---

## 5. State Transition Maps

### 5.1 Order Lifecycle Status Map

| Current Status | Event / Trigger | Target Status | Description / Action |
|---|---|---|---|
| `None` | Customer Checkout | `pending_payment` | Order and items created; coupon and loyalty locked; inventory deducted. |
| `pending_payment` | Stripe Webhook Success | `processing` | Payment verified; order ready for fulfillment. |
| `pending_payment` | Stripe Session Fail / Cancel | `cancelled` | Rollback coupon, loyalty, and restock inventory. |
| `pending_payment` | Cancel Cron (15-min timeout) | `cancelled` | Rollback coupon, loyalty, and restock inventory. |
| `pending_payment` | Inventory Lock Failure | `failed` | Rollback coupon, loyalty; abort checkout. |
| `processing` | Admin Fulfill | `completed` | Fulfills items, inserts shipment with status `shipped`, sets order to `completed` (skips `shipped` state). |
| `processing` | Admin Refund | `refunded` | Initiates Stripe refund; restocks inventory. |
| `completed` | Customer RMA Approved | `refunded` | Updates return status to `refunded`; updates order status to `refunded`. |

### 5.2 Inventory State Map

```
┌─────────────────┐       Admin Stock Update (loc_default)
│  Default Stock  ├─────────────────────────────────────────┐
└────────┬────────┘                                         │
         │                                                  │
         │ Checkout (INVENTORY_DO Enabled?)                 │
         │                                                  │
    ┌────┴────────────────────────┐                         │
    │                             │                         │
    ▼ Yes                         ▼ No                      ▼
┌─────────────────────────┐   ┌─────────────────────────┐  ┌─────────────────────────┐
│ DO SQLite Stock         │   │ D1 Stock Deducted       │  │ D1 Stock Updated        │
│ Deducted                │   │ (All Locations)         │  │ (Single Location)       │
│ - Isolated SQLite write │   │ - Missing location_id   │  │ - loc_default           │
│ - D1 remains stale      │   │ - Double deduction risk │  └─────────────────────────┘
└─────────────────────────┘   └─────────────────────────┘
```

### 5.3 RMA (Return) State Map

```
┌─────────────┐       Auto-Approve (VIP or < 500K)
│  Requested  ├─────────────────────────────────────────┐
└──────┬──────┘                                         │
       │                                                │
       │ Admin Action                                   │
       ├───────────────────┐                            │
       │                   │                            │
       ▼ Approve           ▼ Reject                     ▼
┌─────────────┐     ┌─────────────┐             ┌─────────────┐
│  Approved   │     │  Rejected   │             │  Approved   │
└──────┬──────┘     └─────────────┘             └──────┬──────┘
       │                                               │
       │ Async Stripe Refund                           │ Async Stripe Refund
       ├───────────────────┐                           ├───────────────────┐
       │                   │                           │                   │
       ▼ Success           ▼ Fail                      ▼ Success           ▼ Fail
┌─────────────┐     ┌─────────────┐             ┌─────────────┐     ┌─────────────┐
│  Refunded   │     │  Approved   │             │  Refunded   │     │  Approved   │
└─────────────┘     └─────────────┘             └─────────────┘     └─────────────┘
```

---

## 6. Assumption Register

Assumptions are evaluated and scored using:
$$\text{Risk Score} = \text{Impact} \times (6 - \text{Confidence})$$
where Impact and Confidence are scored from 1 to 5.

| # | Assumption | Impact (1-5) | Confidence (1-5) | Risk Score | Proposed Validation Method |
|---|---|---|---|---|---|
| 1 | **Database Migrations Are In Sync**: Dropped tables are physically absent in all target databases. | 5 | 2 | **20** | Run `pnpm build` in a clean workspace; inspect all compilation errors relating to missing properties on `schema`. |
| 2 | **LOCAL_DEV Is Safely Disabled**: The authentication bypass header is disabled in production environments. | 5 | 2 | **20** | Audit the CI/CD pipeline settings and add a runtime check in `admin-api/src/index.ts` to block requests if `LOCAL_DEV` is `true` in production. |
| 3 | **Durable Object Is Not Active**: The platform does not use `INVENTORY_DO` in production, avoiding data divergence. | 4 | 2 | **16** | Review configuration files (`wrangler.toml`) and perform integration checks to verify if `INVENTORY_DO` is bound to the worker namespace. |
| 4 | **Products Reside In A Single Warehouse**: The shop operates out of a single default inventory location. | 4 | 3 | **12** | Inspect the locations table and verify whether secondary warehouses are actively defined or queryable. |
| 5 | **Stripe Webhooks Are Never Delayed**: Payment callbacks occur within the 15-minute order cancellation window. | 3 | 2 | **12** | Audit historical transaction logs to calculate the percentage of payment completions occurring after 15 minutes. |
| 6 | **Low-Privilege Admin Access Is Restricted**: Administrators with manager or support roles only use the UI and cannot call admin routes directly. | 4 | 3 | **12** | Conduct penetration testing on the admin-api using a support-level admin token to verify if write paths block unauthorized access. |
| 7 | **Checkout V2 Settings Are Final**: Storefront configurations will never disable the `checkout-v2` flag. | 2 | 4 | **4** | Inspect the storefront code to ensure that the V2 checkout path is the sole supported pathway. |
| 8 | **Shipping Rates Are Hardcoded**: Flat-rate shipping calculations are acceptable for the current business model. | 2 | 4 | **4** | Review product shipping requirements to determine if weight-based or carrier-calculated rates are necessary. |

---

## 7. Open Questions List

### 7.1 Critical Severity
1.  **Code Compilation Failure**: How was migration `0010_cold_kid_colt.sql` merged without refactoring the corresponding API routers and services? What is the timeline for refactoring these files to compile against the standard schema?
2.  **Undocumented Compilation Failures**: Four additional key code paths reference deleted tables or invalid raw queries:
    - `packages/core-services/src/order.repository.ts` (references deleted `schema.orderDiscounts`).
    - `apps/admin-api/src/routes/orders.ts` (references deleted `schema.orderDiscounts` and `schema.coupons`).
    - `apps/public-api/src/routes/reviews.ts` (references deleted `schema.productReviews`).
    - `packages/core-services/src/wishlist.service.ts` (references deleted `schema.wishlists` and runs a raw SQL query referencing `FROM wishlists`).
    Why were these omitted from the original migration audit and what is the refactoring strategy?
3.  **RMA Clean Architecture Violation**: Why does the public API `/api/rma` route controller (`rma.ts`) completely bypass the `RmaService` layer and perform direct reads and writes to D1 using the deleted `schema.rmaRequests`? Why does the controller's validation status logic (`order.status !== 'completed' && order.status !== 'processing'`) contradict the service layer's status logic (`order.status !== 'completed' && order.status !== 'delivered'`)?
4.  **Missing Role-Based Access Control**: Why are critical write routes in `admin-api` (such as Category modifications, Settings updates, and Product additions) not protected by `requireRole` middleware?
5.  **Authentication Bypass Vulnerability**: How is the system protected from accidental deployment of `LOCAL_DEV=true` configurations, which allow full admin API access via the `X-Local-Admin-Email` header?

### 7.2 High Severity
1.  **Durable Object State Decoupling**: If `INVENTORY_DO` is intended for production concurrency control, what is the design for synchronizing the DO's internal SQLite database with the main D1 database? How should the DO initialize its stock levels on startup?
2.  **Multi-Location Stock Deductions**: Why does the SQL update statement in `InventoryRepository` as well as the functions `getCommitDeductionQueries` (Lines 170-174) and `getRestockQueries` (Lines 197-202) inside `packages/core-services/src/inventory.service.ts` omit the `location_id` filter? This bug causes double/multiple stock deductions and restocking across all warehouses.
3.  **State Machine Skip in Fulfillment**: Why does the admin fulfillment route mark orders as `completed` directly, skipping the `shipped` state? This skips the carrier delivery webhook updates entirely.
4.  **Late Stripe Webhook Payments**: What is the designated business process when a customer completes payment for an order that the cron job has already marked as `cancelled` and restocked?
5.  **Stripe Webhook Out-of-Order Delivery**: What mechanism is planned to handle cases where a `charge.refunded` webhook is received prior to the `checkout.session.completed` webhook due to network latency, leaving refunded orders in a paid/processing state?
6.  **Single Durable Object Concurrency Bottleneck**: How will the platform prevent timeout and CPU exceptions from a single global Durable Object handling the high concurrency checkout inventory load without sharding?

### 7.3 Medium Severity
1.  **Silently Discarded Secondary Categories**: Why does the `prepareUpsertProduct` service extract but completely discard the `secondary_categories` parameter?
2.  **Storage Resource Leaks**: Why does the asset update service delete image linkages from `product_assets` but leave orphan records in the `assets` table and files in the `PRODUCTS_R2` bucket?
3.  **Abandoned Cart Cron Failure**: Why is the `and` function from `drizzle-orm` not imported in `apps/public-api/src/index.ts`, leading to runtime crashes during cart cleanup?

---

## 8. Recommendations

### 8.1 For the Technical Lead
1.  **Refactor Broken Controllers & Enforce Clean Architecture**:
    - Rewrite all references to dropped database tables in `admin-api` and `public-api` to point to standard schemas:
      *   Map `schema.coupons` and `schema.couponAuditLog` to `schema.promotions` and `schema.promotionRules`.
      *   Map `schema.rmaRequests` to `schema.returns`, `schema.returnItems`, and `schema.refunds`.
      *   Map `schema.fulfillments` and `schema.fulfillmentItems` to `schema.shipments` and `schema.shipmentItems`.
    - Refactor the public API `/api/rma` route controller to delegate requests directly to `RmaService.createRMARequest` instead of making raw database calls to the deleted `schema.rmaRequests`.
    - Standardize order status eligibility validation rules across the RMA routes and service layers to eliminate contradictions (e.g., standardizing on allowing RMA only for `completed` or `delivered` states).
2.  **Fix Newly Discovered Compilation Failures**:
    - **Order Repository**: Refactor `packages/core-services/src/order.repository.ts` to remove insertions into the deleted `schema.orderDiscounts` or rewrite it to map discounts to the new promotions schema.
    - **Orders Admin Router**: Refactor `apps/admin-api/src/routes/orders.ts` to remove the leftJoin on `schema.coupons` and `schema.orderDiscounts`, replacing them with queries against the new promotions/promotional rules tables.
    - **Product Reviews Router**: Refactor `apps/public-api/src/routes/reviews.ts` to remove references to `schema.productReviews`, replacing them with references to the new reviews schema or cleaning up unused routes.
    - **Wishlist Service**: Refactor `packages/core-services/src/wishlist.service.ts` to remove references to `schema.wishlists` and rewrite the `getWishlist` raw SQL query (`FROM wishlists`) to map to the new database schema structure.
3.  **Enforce Deny-by-Default RBAC**: Restructure the `adminAuth` middleware to require specific role authorization for all write routes. Ensure that low-privilege roles like `support` cannot execute settings changes or catalog deletions.
4.  **Fix Multi-Warehouse Stock Deductions**:
    - Modify `InventoryRepository.deductStock` and `restock` to accept a `locationId` parameter and append it to the SQL `WHERE` clause.
    - Modify `getCommitDeductionQueries` (Lines 170-174) and `getRestockQueries` (Lines 197-202) inside `packages/core-services/src/inventory.service.ts` to accept `locationId` (or extract it from the order/item context) and append `eq(schema.inventoryLevels.location_id, locationId)` to the update query filter:
      ```typescript
      // For getCommitDeductionQueries
      eq(schema.inventoryLevels.location_id, locationId)
      
      // For getRestockQueries
      and(
        eq(schema.inventoryLevels.product_id, item.product_id),
        eq(schema.inventoryLevels.location_id, locationId)
      )
      ```
5.  **Resolve Durable Object State Divergence**: If the Durable Object is required for locking, implement a sync system (such as writing to a queue to update D1) and seed DO storage from D1 on initial fetch. If not required, decommission `INVENTORY_DO` and utilize D1 transaction blocks.
6.  **Address Late Stripe Payments**: Update `webhook-processor.ts` to handle Stripe webhook completed events for `cancelled` orders by creating a support ticket/alert or initiating an automatic Stripe refund.
7.  **Fix public-api Imports**: Import `and` from `drizzle-orm` in `apps/public-api/src/index.ts` to resolve the cart cleanup cron crash.
8.  **Implement Asset Cleanup**: Add a cleanup worker or hook to delete orphan entries in `assets` and their corresponding files in the R2 bucket when products are updated or deleted.
9.  **Mitigate Stripe Webhook Out-of-Order Delivery**: Implement an event sequencing validator in the webhook router. If a refund event has already occurred or the checkout event is delayed, prevent a stale payment status overwrite. Add transactional locks or transaction history validation.
10. **Scale Durable Object locks**: Implement key-based sharding for the Durable Objects (e.g. sharding DO namespaces by `product_id` or `location_id`) to distribute the concurrency load and prevent CPU execution or timeout limit exceptions on a single global DO.

### 8.2 For the Product Manager
1.  **Define Order State Machine**: Confirm the business lifecycle of an order. Confirm if orders should transition through a `shipped` status and whether delivery webhooks should update order states.
2.  **Establish Late Payment Policies**: Clarify the business policy for late payments. Should they trigger an automatic Stripe refund, or should they be held in a pending state for manual admin resolution?
3.  **Evaluate Feature Flags**: Decide if a V1 checkout fallback is necessary. If not, remove the `checkout-v2` setting and its log-only code to simplify the architecture.
4.  **Specify Shipping Engine Requirements**: Establish requirements for a real-time shipping carrier integration to replace the static zipcode cache.
