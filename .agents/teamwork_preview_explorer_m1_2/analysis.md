# Structured Analysis Report: SL-02 (RMA & Clean Architecture) and SL-03 (Fulfillment) Refactoring Plan

## 1. Executive Summary
This report analyzes the compilation failures and architectural debt within the Cloudflare Ecommerce workspace resulting from migration `0010_cold_kid_colt.sql`. 
Specifically, the database tables `rma_requests`, `fulfillments`, and `fulfillment_items` were dropped from the schema but remain referenced in route controllers and core service files.
This document outlines:
- Verbatim table references causing compilation failures.
- A mapping plan from deleted tables to the new `returns`, `return_items`, `refunds`, `shipments`, and `shipment_items` tables.
- A Clean Architecture refactoring plan that delegating all direct database interactions and Stripe calls from Hono controllers to the service layer.
- An alignment strategy for order status validation logic.

---

## 2. Table Schema Comparison

| Dropped Table / Column | New Table / Column | Description / Action Required |
| :--- | :--- | :--- |
| `rmaRequests` | `returns` | Stores metadata about customer return requests. |
| `rmaRequests` (auto-refund columns) | `refunds` | Stores financial refund transactions, linking return/order to Stripe. |
| N/A (previously implicitly full) | `returnItems` | Line-item detail mapping return request to specific items & quantities. |
| `fulfillments` | `shipments` | Stores tracking, status, and R2 labels for dispatched orders. |
| `fulfillments.carrier` | `shipments.carrier_name` | Column rename to avoid collision and standardize. |
| `fulfillmentItems` | `shipmentItems` | Maps shipment IDs to order line items and quantities. |
| `fulfillmentItems.fulfillment_id` | `shipmentItems.shipment_id` | Foreign key renamed to refer to the new `shipments` parent table. |

---

## 3. Analysis of Deleted Table References

### A. RMA Compilation Failures
Running `tsc --noEmit` returns the following database compilation failures related to RMA:
- `packages/core-services/src/rma.service.ts`:
  - Lines 20-21: `schema.rmaRequests` is not present in exported database types when checking for existing returns.
  - Line 29: Inserts into `schema.rmaRequests` fail type-checking.
  - Lines 42-43: Queries from `schema.rmaRequests` for processing returns fail.
  - Lines 51-53: Updates to `schema.rmaRequests` for rejecting returns fail.
  - Lines 88-90: Updates to `schema.rmaRequests` for approving returns fail.
- `apps/public-api/src/routes/rma.ts`:
  - Line 61: Direct database insert to `schema.rmaRequests`.
  - Lines 80-82: Direct database update to `schema.rmaRequests`.

### B. Fulfillment Compilation Failures
Running `tsc --noEmit` returns the following database compilation failures related to Fulfillment:
- `packages/core-services/src/fulfillment.service.ts`:
  - Line 8: Direct insert to `schema.fulfillments` fails because the table was dropped.
  - Line 23: Direct insert to `schema.fulfillmentItems` fails because the table was dropped.
  - Lines 44-46: Direct update to `schema.fulfillments` fails.

---

## 4. Refactoring Plan for SL-02: RMA & Clean Architecture

### A. Core Architecture Separation
Currently, `apps/public-api/src/routes/rma.ts` directly queries D1 via Drizzle, performs manual VIP checks, handles Stripe payment refund operations, and coordinates order status updates. This is a severe Clean Architecture violation.
**Refactoring Plan**:
1. Remove all direct D1/Drizzle selections, Stripe SDK usage, and execution context `.waitUntil` calls from the route controller.
2. Delegate all return creation, verification, and payment refund actions to a new unified method `RmaService.createReturnRequest`.
3. Keep the controller thin: it parses/validates the payload with Zod, invokes the service layer, and translates the service's output to an HTTP response.

### B. Order Status Validation Unification
- **Current mismatch**:
  - `rma.ts` controller: only allows RMA if status is `completed` or `processing`.
  - `rma.service.ts`: only allows RMA if status is `completed` or `delivered`.
- **Resolution**:
  Unify both layers to accept exactly `completed` or `delivered` statuses. A `processing` order is paid but not yet fulfilled/dispatched; therefore, it cannot be physically returned. Cancelling/refunding a `processing` order should be handled via the cancel/refund pipeline, not via the RMA (Return Merchandise Authorization) pipeline.

### C. Proposed Code Changes for RMA

#### 1. Proposed Core Service refactoring (`packages/core-services/src/rma.service.ts`)
We will rewrite `RmaService` to handle returns, return items, refunds, and invoke Stripe refunds securely using the official SDK.

```typescript
import { eq, and, ne, sql } from 'drizzle-orm';
import { schema } from '@ecommerce/database';
import Stripe from 'stripe';
import { OrderService } from './order.service';

export interface ReturnRequestPayload {
  drizzleDb: any;
  rawD1Db: any;
  orderId: string;
  customerId: string;
  reason: string;
  stripeSecretKey?: string;
  waitUntil?: (promise: Promise<any>) => void;
}

export class RmaService {
  /**
   * Orchestrates the creation of a return request, executes auto-approval logic,
   * inserts returns & return_items, and schedules async payment refunds if eligible.
   */
  static async createReturnRequest(payload: ReturnRequestPayload) {
    const { drizzleDb, rawD1Db, orderId, customerId, reason, stripeSecretKey, waitUntil } = payload;

    // 1. Validate order existence and customer ownership
    const order = await drizzleDb.select().from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .get();
      
    if (!order || order.customer_id !== customerId) {
      throw new Error('Order not found or access denied');
    }

    // 2. Unified Order Status Validation (accepts completed or delivered)
    if (order.status !== 'completed' && order.status !== 'delivered') {
      throw new Error('Can only request RMA for completed or delivered orders');
    }

    // 3. Prevent duplicate active return requests
    const existingReturn = await drizzleDb.select().from(schema.returns)
      .where(and(eq(schema.returns.order_id, orderId), ne(schema.returns.status, 'rejected')))
      .get();
      
    if (existingReturn) {
      throw new Error('A return request already exists for this order');
    }

    // 4. Auto-approve logic: check order amount threshold (< 500,000 cents/VND) or VIP tags
    let status = 'pending';
    let isVip = false;
    const customer = await drizzleDb.select().from(schema.customers)
      .where(eq(schema.customers.id, customerId))
      .get();
    
    if (customer && customer.tags_json) {
      try {
        const tags = JSON.parse(customer.tags_json);
        if (tags.includes('VIP')) isVip = true;
      } catch { /* ignore parsing exceptions */ }
    }

    const AUTO_APPROVE_THRESHOLD = 500000;
    if (order.total_amount < AUTO_APPROVE_THRESHOLD || isVip) {
      status = 'approved';
    }

    const returnId = `ret_${crypto.randomUUID()}`;

    // 5. Query batching for transactional integrity
    const orderItems = await drizzleDb.select().from(schema.orderItems)
      .where(eq(schema.orderItems.order_id, orderId))
      .all();

    const queries: any[] = [];
    
    // Insert into returns table
    queries.push(
      drizzleDb.insert(schema.returns).values({
        id: returnId,
        order_id: orderId,
        customer_id: customerId,
        status,
        reason,
        refund_amount: order.total_amount,
      })
    );

    // Insert all order items into returnItems table (defaulting to returning full quantity)
    for (const item of orderItems) {
      queries.push(
        drizzleDb.insert(schema.returnItems).values({
          id: `reti_${crypto.randomUUID()}`,
          return_id: returnId,
          order_item_id: item.id,
          quantity: item.quantity,
          restock_condition: 'sellable',
        })
      );
    }

    await drizzleDb.batch(queries as any);

    // 6. Handle Stripe Refund synchronously or asynchronously
    if (status === 'approved') {
      const refundPromise = (async () => {
        try {
          let stripeRefundId = 'mock_refund_id';
          if (order.payment_intent_id && stripeSecretKey) {
            const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' });
            
            // Format payment intent id if it is a checkout session reference
            let paymentIntentId = order.payment_intent_id;
            if (paymentIntentId.startsWith('cs_')) {
              const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
              paymentIntentId = typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id || paymentIntentId;
            }

            const refund = await stripe.refunds.create({
              payment_intent: paymentIntentId,
            });
            stripeRefundId = refund.id;
          }

          // Insert into refunds table
          const refundRecordId = `ref_${crypto.randomUUID()}`;
          await drizzleDb.insert(schema.refunds).values({
            id: refundRecordId,
            order_id: orderId,
            return_id: returnId,
            amount: order.total_amount,
            status: 'completed',
            gateway_refund_id: stripeRefundId,
          }).run();

          // Restock inventory and mark order status to refunded
          await OrderService.refundOrderAndRestock(drizzleDb, rawD1Db, orderId, order.status);

        } catch (stripeErr: any) {
          console.error('[RMA Auto-refund] Async Stripe Refund failed:', stripeErr.message);
          
          // Insert failed/pending refund record for admin visibility
          await drizzleDb.insert(schema.refunds).values({
            id: `ref_${crypto.randomUUID()}`,
            order_id: orderId,
            return_id: returnId,
            amount: order.total_amount,
            status: 'failed',
          }).run().catch(console.error);
        }
      })();

      if (waitUntil) {
        waitUntil(refundPromise);
      } else {
        await refundPromise;
      }
    }

    return { returnId, status };
  }

  /**
   * Admin-facing method to process pending returns (approval or rejection)
   */
  static async processRMA(drizzleDb: any, rawD1Db: any, returnId: string, action: 'approve' | 'reject', stripeSecretKey?: string) {
    const returnReq = await drizzleDb.select().from(schema.returns)
      .where(eq(schema.returns.id, returnId))
      .get();

    if (!returnReq || returnReq.status !== 'pending') {
      throw new Error('Invalid return request or already processed');
    }

    if (action === 'reject') {
      await drizzleDb.update(schema.returns)
        .set({ status: 'rejected', updated_at: sql`CURRENT_TIMESTAMP` })
        .where(eq(schema.returns.id, returnId))
        .run();
      return { success: true, status: 'rejected' };
    }

    // Process approval
    const order = await drizzleDb.select().from(schema.orders)
      .where(eq(schema.orders.id, returnReq.order_id))
      .get();

    if (!order) {
      throw new Error('Associated order not found');
    }

    let stripeRefundId = 'manual_refund_id';
    if (order.payment_intent_id && stripeSecretKey) {
      try {
        const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' });
        
        let paymentIntentId = order.payment_intent_id;
        if (paymentIntentId.startsWith('cs_')) {
          const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
          paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id || paymentIntentId;
        }

        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
        });
        stripeRefundId = refund.id;
      } catch (e: any) {
        throw new Error(`Refund processing failed: ${e.message}`);
      }
    }

    // Add record in refunds table
    await drizzleDb.insert(schema.refunds).values({
      id: `ref_${crypto.randomUUID()}`,
      order_id: returnReq.order_id,
      return_id: returnId,
      amount: returnReq.refund_amount || order.total_amount,
      status: 'completed',
      gateway_refund_id: stripeRefundId,
    }).run();

    // Update return status to approved
    await drizzleDb.update(schema.returns)
      .set({ status: 'approved', updated_at: sql`CURRENT_TIMESTAMP` })
      .where(eq(schema.returns.id, returnId))
      .run();

    // Perform restoration of order and inventory restocking
    await OrderService.refundOrderAndRestock(drizzleDb, rawD1Db, returnReq.order_id, order.status);

    return { success: true, status: 'approved' };
  }
}
```

#### 2. Proposed Route Controller refactoring (`apps/public-api/src/routes/rma.ts`)
The endpoint delegating logic to the service layer.

```typescript
import { Hono } from 'hono'
import { createDb } from '@ecommerce/database'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { RmaService } from '@ecommerce/core-services'

type Bindings = {
  DB: D1Database
  STRIPE_SECRET_KEY: string
}

const rma = new Hono<{ Bindings: Bindings }>()

const rmaRequestSchema = z.object({
  order_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  reason: z.string().min(5),
})

rma.post('/', zValidator('json', rmaRequestSchema), async (c) => {
  try {
    const { order_id, customer_id, reason } = c.req.valid('json')
    const db = createDb(c.env.DB)

    const result = await RmaService.createReturnRequest({
      drizzleDb: db,
      rawD1Db: c.env.DB,
      orderId: order_id,
      customerId: customer_id,
      reason,
      stripeSecretKey: c.env.STRIPE_SECRET_KEY,
      waitUntil: c.executionCtx.waitUntil.bind(c.executionCtx)
    });

    return c.json({ success: true, rma_id: result.returnId, status: result.status })

  } catch (err: any) {
    const isNotFound = err.message.includes('not found') || err.message.includes('denied');
    return c.json({ success: false, error: err.message }, isNotFound ? 404 : 400)
  }
})

export default rma
```

---

## 5. Refactoring Plan for SL-03: Fulfillment Mapping

### A. Schema Differences Mapping
We will replace the references to the dropped `fulfillments` and `fulfillmentItems` tables inside the fulfillment service.
- Use `schema.shipments` instead of `schema.fulfillments`.
- Use `schema.shipmentItems` instead of `schema.fulfillmentItems`.
- Map `carrier` database field to `carrier_name`.
- Map `fulfillment_id` relation column to `shipment_id`.
- Update valid shipment statuses to match `'pending', 'ready', 'shipped', 'delivered', 'failed'`.

### B. Proposed Code Changes for Fulfillment

#### 1. Proposed Core Service Refactoring (`packages/core-services/src/fulfillment.service.ts`)

```typescript
import { eq, sql } from 'drizzle-orm';
import { schema } from '@ecommerce/database';

export class FulfillmentService {
  /**
   * Creates a shipment header and associates shipment items with specific quantities.
   */
  static async createFulfillment(drizzleDb: any, orderId: string, items: { orderItemId: string, quantity: number }[], trackingNumber?: string, carrier?: string) {
    const id = `ship_${crypto.randomUUID()}`;
    
    // Insert into shipments table
    await drizzleDb.insert(schema.shipments).values({
      id,
      order_id: orderId,
      status: 'pending', // default state mapping from processing
      tracking_number: trackingNumber || null,
      carrier_name: carrier || null, // renamed from carrier to carrier_name
    }).run();

    // Insert associated items
    if (items && items.length > 0) {
      const shipmentItems = items.map(item => ({
        id: `shipi_${crypto.randomUUID()}`,
        shipment_id: id, // renamed from fulfillment_id to shipment_id
        order_item_id: item.orderItemId,
        quantity: item.quantity,
      }));
      await drizzleDb.insert(schema.shipmentItems).values(shipmentItems).run();
    }

    return id;
  }

  /**
   * Updates status of a shipment and sets shipped_at/delivered_at timestamps.
   */
  static async updateStatus(drizzleDb: any, shipmentId: string, status: string) {
    const validStatuses = ['pending', 'ready', 'shipped', 'delivered', 'failed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid shipment status: ${status}`);
    }

    const updates: any = {
      status,
      updated_at: sql`CURRENT_TIMESTAMP`,
    };

    if (status === 'shipped') {
      updates.shipped_at = sql`CURRENT_TIMESTAMP`;
    } else if (status === 'delivered') {
      updates.delivered_at = sql`CURRENT_TIMESTAMP`;
    }

    await drizzleDb.update(schema.shipments)
      .set(updates)
      .where(eq(schema.shipments.id, shipmentId))
      .run();

    return true;
  }
}
```

#### 2. Alignment recommendation for Admin Routes (`apps/admin-api/src/routes/orders.ts`)
The endpoint `orders.post('/orders/:id/fulfill', ...)` currently writes to `schema.shipments` and `schema.shipmentItems` using raw Drizzle builder commands inline in the route handler. 
To satisfy **Clean Architecture** patterns, we should refactor it to call `FulfillmentService.createFulfillment` instead of writing raw database queries:

```typescript
// Proposed refactoring in apps/admin-api/src/routes/orders.ts
orders.post('/orders/:id/fulfill', requireRole(['superadmin', 'manager', 'support']), zValidator('json', fulfillSchema), async (c) => {
  const orderId = c.req.param('id');
  try {
    const { tracking_number, carrier_name, items } = c.req.valid('json');
    const db = createDb(c.env.DB);
    
    const order = await db.select({ status: schema.orders.status })
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .get();
    
    if (!order) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    if (order.status !== 'processing') {
      return c.json({ success: false, error: `Order cannot be fulfilled from status: ${order.status}` }, 400);
    }

    // Delegate database inserts to FulfillmentService
    const mappedItems = (items || []).map(i => ({ orderItemId: i.order_item_id, quantity: i.quantity }));
    const shipmentId = await FulfillmentService.createFulfillment(db, orderId, mappedItems, tracking_number, carrier_name);

    // Complete order status and execute update
    await db.update(schema.orders)
      .set({ status: 'completed', updated_at: sql`CURRENT_TIMESTAMP` })
      .where(eq(schema.orders.id, orderId))
      .run();

    // Trigger ORDER_SHIPPED events in queue
    if (c.env.EVENT_QUEUE) {
      await c.env.EVENT_QUEUE.send({
        type: 'ORDER_SHIPPED',
        orderId,
        trackingNumber: tracking_number,
        carrierName: carrier_name,
        isPartial: false
      });
    }

    return c.json({ success: true, message: `Order ${orderId} completely fulfilled successfully`, shipment_id: shipmentId });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
```

---

## 6. Verification Plan
To verify the implementation of this refactoring plan:
1. **Typescript compilation check**: Run `npx tsc --noEmit` inside both `packages/core-services` and `apps/public-api`. Compilation should report 0 errors for these files.
2. **Table-driven Unit Tests**: Add new unit tests under `packages/core-services/src/__tests__/rma.service.test.ts` and `packages/core-services/src/__tests__/fulfillment.service.test.ts` to assert that:
   - VIP users are auto-approved for RMA.
   - Orders under threshold are auto-approved for RMA.
   - Correct items are mapped to `returnItems` table.
   - Shipments and ShipmentItems are inserted correctly.
   - Status transitions are validated and updated with appropriate timestamps (`shipped_at`, `delivered_at`).
