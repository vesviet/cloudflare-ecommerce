import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import Stripe from 'stripe';

const PUBLIC_API = process.env.PUBLIC_API_URL || 'http://127.0.0.1:8787';
const PUBLIC_API_DIR = path.resolve(__dirname, '../../apps/public-api');

function getStripeKeys() {
  const secretKeyEnv = process.env.STRIPE_SECRET_KEY;
  const webhookSecretEnv = process.env.STRIPE_WEBHOOK_SECRET;
  if (secretKeyEnv && webhookSecretEnv) {
    return { secretKey: secretKeyEnv, webhookSecret: webhookSecretEnv };
  }

  const varsPath = path.resolve(PUBLIC_API_DIR, '.dev.vars');
  if (!fs.existsSync(varsPath)) {
    return {
      secretKey: secretKeyEnv || '',
      webhookSecret: webhookSecretEnv || ''
    };
  }
  const content = fs.readFileSync(varsPath, 'utf-8');
  const secretKey = secretKeyEnv || content.match(/STRIPE_SECRET_KEY="([^"]+)"/)?.[1] || '';
  const webhookSecret = webhookSecretEnv || content.match(/STRIPE_WEBHOOK_SECRET="([^"]+)"/)?.[1] || '';
  return { secretKey, webhookSecret };
}

function sleep(ms: number) {
  try {
    const sab = new SharedArrayBuffer(4);
    const int32 = new Int32Array(sab);
    Atomics.wait(int32, 0, 0, ms);
  } catch (e) {
    const start = Date.now();
    while (Date.now() - start < ms) {}
  }
}

function queryD1(command: string): any[] {
  const wranglerConfigPath = path.resolve(__dirname, '../../apps/public-api/wrangler.toml');
  const tempFile = path.resolve(__dirname, `temp_query_${Math.random().toString(36).substring(7)}_${Date.now()}.sql`);
  fs.writeFileSync(tempFile, command, 'utf-8');
  
  let attempts = 0;
  const maxAttempts = 20;
  const delay = 300;
  
  while (attempts < maxAttempts) {
    try {
      const output = execSync(
        `npx wrangler d1 execute ecommerce-db --local --json --file="${tempFile}" --config="${wranglerConfigPath}"`,
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const rawOutput = output.toString();
      const jsonStart = rawOutput.indexOf('[');
      const jsonEnd = rawOutput.lastIndexOf(']');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No JSON array found in wrangler output");
      }
      const parsed = JSON.parse(rawOutput.substring(jsonStart, jsonEnd + 1));
      try { fs.unlinkSync(tempFile); } catch {}
      if (Array.isArray(parsed) && parsed[0]?.success) {
        return parsed[0].results || [];
      }
      return [];
    } catch (error: any) {
      const errorMsg = error.stderr?.toString() || error.message || '';
      if (errorMsg.includes('SQLITE_BUSY') || errorMsg.includes('database is locked') || errorMsg.includes('No JSON array found')) {
        attempts++;
        if (attempts < maxAttempts) {
          sleep(delay);
          continue;
        }
      }
      try { fs.unlinkSync(tempFile); } catch {}
      console.error(`D1 Query Error: ${errorMsg}`);
      return [];
    }
  }
  try { fs.unlinkSync(tempFile); } catch {}
  return [];
}

function executeD1(command: string) {
  const wranglerConfigPath = path.resolve(__dirname, '../../apps/public-api/wrangler.toml');
  const tempFile = path.resolve(__dirname, `temp_query_${Math.random().toString(36).substring(7)}_${Date.now()}.sql`);
  fs.writeFileSync(tempFile, command, 'utf-8');
  
  let attempts = 0;
  const maxAttempts = 20;
  const delay = 300;
  
  while (attempts < maxAttempts) {
    try {
      const output = execSync(
        `npx wrangler d1 execute ecommerce-db --local --json --file="${tempFile}" --config="${wranglerConfigPath}"`,
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const rawOutput = output.toString();
      const jsonStart = rawOutput.indexOf('[');
      const jsonEnd = rawOutput.lastIndexOf(']');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No JSON array found in wrangler output");
      }
      const parsed = JSON.parse(rawOutput.substring(jsonStart, jsonEnd + 1));
      try { fs.unlinkSync(tempFile); } catch {}
      if (Array.isArray(parsed) && !parsed[0]?.success) {
        throw new Error(parsed[0]?.error || 'Unknown D1 execution error');
      }
      return;
    } catch (error: any) {
      const errorMsg = error.stderr?.toString() || error.message || '';
      if (errorMsg.includes('SQLITE_BUSY') || errorMsg.includes('database is locked') || errorMsg.includes('No JSON array found')) {
        attempts++;
        if (attempts < maxAttempts) {
          sleep(delay);
          continue;
        }
      }
      try { fs.unlinkSync(tempFile); } catch {}
      console.error(`D1 Execute Error: ${errorMsg}`);
      throw error;
    }
  }
  try { fs.unlinkSync(tempFile); } catch {}
}

function setupTestProduct(id: string, sku: string, title: string, stock: number) {
  cleanupTestProduct(id);
  executeD1(`INSERT OR REPLACE INTO products (id, slug, sku, title, status, is_purchasable) VALUES ('${id}', '${id}', '${sku}', '${title}', 'published', 1);`);
  executeD1(`INSERT OR REPLACE INTO price_list_items (id, price_list_id, product_id, price) VALUES ('pli-${id}', 'pl_base', '${id}', 1000);`);
  executeD1(`INSERT OR REPLACE INTO inventory_levels (id, location_id, product_id, stock_quantity) VALUES ('inv-${id}', 'loc-1', '${id}', ${stock});`);
}

function cleanupTestProduct(id: string) {
  executeD1(`DELETE FROM inventory_levels WHERE product_id = '${id}';`);
  executeD1(`DELETE FROM price_list_items WHERE product_id = '${id}';`);
  executeD1(`DELETE FROM order_items WHERE product_id = '${id}';`);
  executeD1(`DELETE FROM inventory_reservations WHERE product_id = '${id}';`);
  executeD1(`DELETE FROM products WHERE id = '${id}';`);
}

async function sendStripeWebhook(request: any, eventType: string, eventId: string, eventData: any) {
  const { secretKey, webhookSecret } = getStripeKeys();
  const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10' as any });
  
  const payloadObj = {
    id: eventId,
    object: 'event',
    api_version: '2024-04-10',
    created: Math.floor(Date.now() / 1000),
    type: eventType,
    data: {
      object: eventData
    }
  };
  
  const payloadStr = JSON.stringify(payloadObj);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: payloadStr,
    secret: webhookSecret
  });
  
  return await request.post(`${PUBLIC_API}/api/webhooks/stripe`, {
    headers: {
      'Stripe-Signature': signature,
      'Content-Type': 'application/json'
    },
    data: payloadStr
  });
}

async function assertOrderStatus(orderId: string, expectedStatus: string, retries = 5) {
  for (let i = 0; i < retries; i++) {
    const res = queryD1(`SELECT status FROM orders WHERE id = '${orderId}';`);
    if (res[0]?.status === expectedStatus) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const finalStatus = queryD1(`SELECT status FROM orders WHERE id = '${orderId}';`)[0]?.status;
  expect(finalStatus).toBe(expectedStatus);
}

test.describe('SL-08: Stripe Webhook Race Condition', () => {

  test.afterEach(async () => {
    executeD1(`DELETE FROM idempotency_keys WHERE id LIKE 'evt-sl08-%';`);
  });

  test('TC-SL08-T1-01: Payment Success Webhook (Happy Path)', async ({ request }) => {
    const orderId = 'order-sl08-t1-01';
    executeD1(`INSERT OR REPLACE INTO orders (id, status, total_amount, session_id) VALUES ('${orderId}', 'pending_payment', 1000, 'sess-sl08-t1-01');`);

    const response = await sendStripeWebhook(request, 'checkout.session.completed', 'evt-sl08-t1-01', {
      id: 'sess-sl08-t1-01',
      object: 'checkout.session',
      payment_intent: 'pi-sl08-t1-01',
      metadata: { order_id: orderId }
    });
    expect(response.status()).toBe(200);

    await assertOrderStatus(orderId, 'processing');

    const idemKeys = queryD1(`SELECT id FROM idempotency_keys WHERE id = 'evt-sl08-t1-01';`);
    expect(idemKeys.length).toBe(1);

    executeD1(`DELETE FROM orders WHERE id = '${orderId}';`);
  });

  test('TC-SL08-T1-02: Late Webhook Arrival on Cancelled Order', async ({ request }) => {
    const orderId = 'order-sl08-t1-02';
    // Order already cancelled by cron
    executeD1(`INSERT OR REPLACE INTO orders (id, status, total_amount, session_id) VALUES ('${orderId}', 'cancelled', 1000, 'sess-sl08-t1-02');`);

    const response = await sendStripeWebhook(request, 'checkout.session.completed', 'evt-sl08-t1-02', {
      id: 'sess-sl08-t1-02',
      object: 'checkout.session',
      payment_intent: 'pi-sl08-t1-02',
      metadata: { order_id: orderId }
    });
    expect(response.status()).toBe(200);

    // Should remain cancelled (webhook does not update cancelled orders)
    await new Promise(resolve => setTimeout(resolve, 1000));
    const orderRes = queryD1(`SELECT status FROM orders WHERE id = '${orderId}';`);
    expect(orderRes[0]?.status).toBe('cancelled');

    executeD1(`DELETE FROM orders WHERE id = '${orderId}';`);
  });

  test('TC-SL08-T1-03: Webhook Idempotency Event Duplicate Prevention', async ({ request }) => {
    const orderId = 'order-sl08-t1-03';
    executeD1(`INSERT OR REPLACE INTO orders (id, status, total_amount, session_id) VALUES ('${orderId}', 'pending_payment', 1000, 'sess-sl08-t1-03');`);

    // First request
    const response1 = await sendStripeWebhook(request, 'checkout.session.completed', 'evt-sl08-t1-03', {
      id: 'sess-sl08-t1-03',
      object: 'checkout.session',
      payment_intent: 'pi-sl08-t1-03',
      metadata: { order_id: orderId }
    });
    expect(response1.status()).toBe(200);

    // Second request with same event ID
    const response2 = await sendStripeWebhook(request, 'checkout.session.completed', 'evt-sl08-t1-03', {
      id: 'sess-sl08-t1-03',
      object: 'checkout.session',
      payment_intent: 'pi-sl08-t1-03',
      metadata: { order_id: orderId }
    });
    expect(response2.status()).toBe(200);

    await assertOrderStatus(orderId, 'processing');

    const idemKeys = queryD1(`SELECT id FROM idempotency_keys WHERE id = 'evt-sl08-t1-03';`);
    expect(idemKeys.length).toBe(1); // Only 1 record

    executeD1(`DELETE FROM orders WHERE id = '${orderId}';`);
  });

  test('TC-SL08-T1-04: Stripe Checkout Session Expired Event', async ({ request }) => {
    const orderId = 'order-sl08-t1-04';
    const prodId = 'prod-sl08-t1-04';
    setupTestProduct(prodId, 'SKU-SL08-T1-04', 'Product SL08 T1-04', 5);

    executeD1(`INSERT OR REPLACE INTO orders (id, status, total_amount, session_id) VALUES ('${orderId}', 'pending_payment', 1000, 'sess-sl08-t1-04');`);
    executeD1(`INSERT OR REPLACE INTO order_items (id, order_id, product_id, quantity, price_at_purchase) VALUES ('item-sl08-t1-04', '${orderId}', '${prodId}', 2, 500);`);

    const response = await sendStripeWebhook(request, 'checkout.session.expired', 'evt-sl08-t1-04', {
      id: 'sess-sl08-t1-04',
      object: 'checkout.session',
      metadata: { order_id: orderId }
    });
    expect(response.status()).toBe(200);

    await assertOrderStatus(orderId, 'cancelled');

    // Verify stock restocked back to 7 (5 initial, 2 restocked)
    await new Promise(resolve => setTimeout(resolve, 1000));
    const results = queryD1(`SELECT stock_quantity FROM inventory_levels WHERE product_id = '${prodId}';`);
    expect(results[0].stock_quantity).toBe(7);

    executeD1(`DELETE FROM order_items WHERE order_id = '${orderId}';`);
    executeD1(`DELETE FROM orders WHERE id = '${orderId}';`);
    cleanupTestProduct(prodId);
  });

  test('TC-SL08-T1-05: Stripe Refunded Event', async ({ request }) => {
    const orderId = 'order-sl08-t1-05';
    const prodId = 'prod-sl08-t1-05';
    setupTestProduct(prodId, 'SKU-SL08-T1-05', 'Product SL08 T1-05', 5);

    executeD1(`INSERT OR REPLACE INTO orders (id, status, total_amount, payment_intent_id) VALUES ('${orderId}', 'processing', 1000, 'pi-sl08-t1-05');`);
    executeD1(`INSERT OR REPLACE INTO order_items (id, order_id, product_id, quantity, price_at_purchase) VALUES ('item-sl08-t1-05', '${orderId}', '${prodId}', 2, 500);`);

    const response = await sendStripeWebhook(request, 'charge.refunded', 'evt-sl08-t1-05', {
      id: 'ch-sl08-t1-05',
      object: 'charge',
      payment_intent: 'pi-sl08-t1-05'
    });
    expect(response.status()).toBe(200);

    await assertOrderStatus(orderId, 'refunded');

    // Verify restocked
    await new Promise(resolve => setTimeout(resolve, 1000));
    const results = queryD1(`SELECT stock_quantity FROM inventory_levels WHERE product_id = '${prodId}';`);
    expect(results[0].stock_quantity).toBe(7);

    executeD1(`DELETE FROM order_items WHERE order_id = '${orderId}';`);
    executeD1(`DELETE FROM orders WHERE id = '${orderId}';`);
    cleanupTestProduct(prodId);
  });

  test('TC-SL08-T2-01: Stripe Webhook Missing Signature Header', async ({ request }) => {
    const response = await request.post(`${PUBLIC_API}/api/webhooks/stripe`, {
      data: { type: 'checkout.session.completed' }
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Missing Stripe-Signature');
  });

  test('TC-SL08-T2-02: Stripe Webhook Invalid Signature Payload', async ({ request }) => {
    const response = await request.post(`${PUBLIC_API}/api/webhooks/stripe`, {
      headers: {
        'Stripe-Signature': 't=123,v1=bad_sig'
      },
      data: { type: 'checkout.session.completed' }
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid Stripe signature');
  });

  test('TC-SL08-T2-03: Out-of-Order Delivery (Refund Before Success)', async ({ request }) => {
    const orderId = 'order-sl08-t2-03';
    executeD1(`INSERT OR REPLACE INTO orders (id, status, total_amount, session_id, payment_intent_id) VALUES ('${orderId}', 'pending_payment', 1000, 'sess-sl08-t2-03', 'pi-sl08-t2-03');`);

    // 1. Deliver charge.refunded first
    const refundRes = await sendStripeWebhook(request, 'charge.refunded', 'evt-sl08-t2-03-refund', {
      id: 'ch-sl08-t2-03',
      object: 'charge',
      payment_intent: 'pi-sl08-t2-03'
    });
    expect(refundRes.status()).toBe(200);

    // 2. Deliver checkout.session.completed second
    const successRes = await sendStripeWebhook(request, 'checkout.session.completed', 'evt-sl08-t2-03-success', {
      id: 'sess-sl08-t2-03',
      object: 'checkout.session',
      payment_intent: 'pi-sl08-t2-03',
      metadata: { order_id: orderId }
    });
    expect(successRes.status()).toBe(200);

    // D1 order status must NOT be processing, it should ideally stay refunded (if out of order occurred, it overwrote it)
    await new Promise(resolve => setTimeout(resolve, 1000));
    const orderRes = queryD1(`SELECT status FROM orders WHERE id = '${orderId}';`);
    expect(orderRes[0]?.status).not.toBe('processing');

    executeD1(`DELETE FROM orders WHERE id = '${orderId}';`);
    executeD1(`DELETE FROM idempotency_keys WHERE id LIKE 'evt-sl08-t2-03-%';`);
  });

  test('TC-SL08-T2-04: Concurrent Cron Cancel and Webhook Success', async ({ request }) => {
    const orderId = 'order-sl08-t2-04';
    executeD1(`INSERT OR REPLACE INTO orders (id, status, total_amount, session_id) VALUES ('${orderId}', 'pending_payment', 1000, 'sess-sl08-t2-04');`);

    // Trigger both concurrently via real signed webhooks
    const p1 = sendStripeWebhook(request, 'checkout.session.completed', 'evt-sl08-t2-04', {
      id: 'sess-sl08-t2-04',
      object: 'checkout.session',
      payment_intent: 'pi-sl08-t2-04',
      metadata: { order_id: orderId }
    });
    
    const p2 = sendStripeWebhook(request, 'checkout.session.expired', 'evt-sl08-t2-04-expired', {
      id: 'sess-sl08-t2-04',
      object: 'checkout.session',
      metadata: { order_id: orderId }
    });

    await Promise.all([p1, p2]);

    await new Promise(resolve => setTimeout(resolve, 1000));
    const orderRes = queryD1(`SELECT status FROM orders WHERE id = '${orderId}';`);
    // Status must be either cancelled or processing, never both or corrupted
    expect(['cancelled', 'processing']).toContain(orderRes[0]?.status);

    executeD1(`DELETE FROM orders WHERE id = '${orderId}';`);
    executeD1(`DELETE FROM idempotency_keys WHERE id = 'evt-sl08-t2-04-expired';`);
  });

  test('TC-SL08-T2-05: Missing Order ID in Stripe Metadata', async ({ request }) => {
    const orderId = 'order-sl08-t2-05';
    executeD1(`INSERT OR REPLACE INTO orders (id, status, total_amount, session_id) VALUES ('${orderId}', 'pending_payment', 1000, 'sess-sl08-t2-05');`);

    // No metadata or session ID match
    const response = await sendStripeWebhook(request, 'checkout.session.completed', 'evt-sl08-t2-05', {
      id: 'sess-different-id',
      object: 'checkout.session',
      payment_intent: 'pi-different',
      metadata: {}
    });
    expect(response.status()).toBe(200);

    // Order status should remain pending_payment
    await new Promise(resolve => setTimeout(resolve, 1000));
    const orderRes = queryD1(`SELECT status FROM orders WHERE id = '${orderId}';`);
    expect(orderRes[0]?.status).toBe('pending_payment');

    executeD1(`DELETE FROM orders WHERE id = '${orderId}';`);
  });
});
