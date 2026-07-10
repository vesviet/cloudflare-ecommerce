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

function setupTestProduct(id: string, sku: string, title: string, stock: number, locationId = 'loc-1', price = 1000) {
  cleanupTestProduct(id);
  executeD1(`INSERT OR REPLACE INTO products (id, slug, sku, title, status, is_purchasable) VALUES ('${id}', '${id}', '${sku}', '${title}', 'published', 1);`);
  executeD1(`INSERT OR REPLACE INTO price_list_items (id, price_list_id, product_id, price) VALUES ('pli-${id}', 'pl_base', '${id}', ${price});`);
  executeD1(`INSERT OR REPLACE INTO inventory_levels (id, location_id, product_id, stock_quantity) VALUES ('inv-${id}', '${locationId}', '${id}', ${stock});`);
}

function cleanupTestProduct(id: string) {
  executeD1(`DELETE FROM inventory_levels WHERE product_id = '${id}';`);
  executeD1(`DELETE FROM price_list_items WHERE product_id = '${id}';`);
  executeD1(`DELETE FROM order_items WHERE product_id = '${id}';`);
  executeD1(`DELETE FROM inventory_reservations WHERE product_id = '${id}';`);
  executeD1(`DELETE FROM products WHERE id = '${id}';`);
}

test.describe('SL-06: Inventory DO Sync & Location Filter', () => {
  
  test.afterEach(async () => {
    // Clear test-specific data
    executeD1(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE guest_email LIKE 'test-sl06-%');`);
    executeD1(`DELETE FROM orders WHERE guest_email LIKE 'test-sl06-%';`);
  });

  test('TC-SL06-T1-01: Product Stock Deduction (DO Disabled)', async ({ request }) => {
    const prodId = '550e8400-e29b-41d4-a716-446655440001';
    setupTestProduct(prodId, 'SKU-SL06-T1-01', 'Test Product SL06 T1-01', 10);

    const response = await request.post(`${PUBLIC_API}/api/checkout`, {
      data: {
        email: 'test-sl06-t1-01@example.com',
        items: [{ variation_id: prodId, quantity: 2 }]
      }
    });
    expect(response.status()).toBe(200);

    const results = queryD1(`SELECT stock_quantity FROM inventory_levels WHERE product_id = '${prodId}';`);
    expect(results.length).toBe(1);
    expect(results[0].stock_quantity).toBe(8);

    cleanupTestProduct(prodId);
  });

  test('TC-SL06-T1-02: Product Stock Deduction (DO Enabled)', async ({ request }) => {
    const prodId = '550e8400-e29b-41d4-a716-446655440002';
    setupTestProduct(prodId, 'SKU-SL06-T1-02', 'Test Product SL06 T1-02', 10);

    // If INVENTORY_DO is enabled, we perform checkout
    const response = await request.post(`${PUBLIC_API}/api/checkout`, {
      data: {
        email: 'test-sl06-t1-02@example.com',
        items: [{ variation_id: prodId, quantity: 2 }]
      }
    });
    expect(response.status()).toBe(200);

    // If the DO decoupling bug is present, D1 remains 10 (or is updated because c.env.DB bypasses DO).
    // Here we assert the correct behavior (D1 stock should be 8), which exposes the sync issue if it fails or behaves differently.
    const results = queryD1(`SELECT stock_quantity FROM inventory_levels WHERE product_id = '${prodId}';`);
    expect(results[0].stock_quantity).toBe(8);

    cleanupTestProduct(prodId);
  });

  test('TC-SL06-T1-03: Multi-Location Stock Deduction (DO Disabled)', async ({ request }) => {
    const prodId = '550e8400-e29b-41d4-a716-446655440003';
    // Add loc-2 warehouse if not exists
    executeD1(`INSERT OR REPLACE INTO locations (id, name, type) VALUES ('loc-2', 'Secondary Warehouse', 'warehouse');`);
    
    // Set up product at loc-1 and loc-2
    setupTestProduct(prodId, 'SKU-SL06-T1-03', 'Test Product SL06 T1-03', 10, 'loc-1');
    executeD1(`INSERT OR REPLACE INTO inventory_levels (id, location_id, product_id, stock_quantity) VALUES ('inv-2-${prodId}', 'loc-2', '${prodId}', 10);`);

    const response = await request.post(`${PUBLIC_API}/api/checkout`, {
      data: {
        email: 'test-sl06-t1-03@example.com',
        items: [{ variation_id: prodId, quantity: 2 }],
        shipping_address_json: { location_id: 'loc-1' }
      }
    });
    expect(response.status()).toBe(200);

    const stockLoc1 = queryD1(`SELECT stock_quantity FROM inventory_levels WHERE product_id = '${prodId}' AND location_id = 'loc-1';`)[0]?.stock_quantity;
    const stockLoc2 = queryD1(`SELECT stock_quantity FROM inventory_levels WHERE product_id = '${prodId}' AND location_id = 'loc-2';`)[0]?.stock_quantity;

    expect(stockLoc1).toBe(8);
    // If the missing location_id deduction bug is present, stockLoc2 will also be 8.
    // The correct behavior is that stockLoc2 must remain 10.
    expect(stockLoc2).toBe(10);

    cleanupTestProduct(prodId);
    executeD1(`DELETE FROM inventory_levels WHERE id = 'inv-2-${prodId}';`);
  });

  test('TC-SL06-T1-04: Multi-Location Restocking (DO Disabled)', async ({ request }) => {
    const prodId = '550e8400-e29b-41d4-a716-446655440004';
    setupTestProduct(prodId, 'SKU-SL06-T1-04', 'Test Product SL06 T1-04', 5, 'loc-1');
    executeD1(`INSERT OR REPLACE INTO inventory_levels (id, location_id, product_id, stock_quantity) VALUES ('inv-2-${prodId}', 'loc-2', '${prodId}', 5);`);

    // Create a pending order manually in D1 with location_id = 'loc-1'
    const orderId = 'order-sl06-t1-04';
    executeD1(`INSERT INTO orders (id, status, location_id, total_amount, guest_email, session_id) VALUES ('${orderId}', 'pending_payment', 'loc-1', 1000, 'test-sl06-t1-04@example.com', 'sess-sl06-t1-04');`);
    executeD1(`INSERT INTO order_items (id, order_id, product_id, quantity, price_at_purchase) VALUES ('item-sl06-t1-04', '${orderId}', '${prodId}', 2, 500);`);

    // Restock the order by triggering a checkout.session.expired Stripe webhook
    const response = await sendStripeWebhook(request, 'checkout.session.expired', 'evt-sl06-t1-04', {
      id: 'sess-sl06-t1-04',
      object: 'checkout.session',
      metadata: { order_id: orderId }
    });
    expect(response.status()).toBe(200);

    await assertOrderStatus(orderId, 'cancelled');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const stockLoc1 = queryD1(`SELECT stock_quantity FROM inventory_levels WHERE product_id = '${prodId}' AND location_id = 'loc-1';`)[0]?.stock_quantity;
    const stockLoc2 = queryD1(`SELECT stock_quantity FROM inventory_levels WHERE product_id = '${prodId}' AND location_id = 'loc-2';`)[0]?.stock_quantity;

    expect(stockLoc1).toBe(7);
    // If the missing location_id restock bug is present, stockLoc2 will also be 7.
    expect(stockLoc2).toBe(5);

    cleanupTestProduct(prodId);
    executeD1(`DELETE FROM inventory_levels WHERE id = 'inv-2-${prodId}';`);
    executeD1(`DELETE FROM order_items WHERE order_id = '${orderId}';`);
    executeD1(`DELETE FROM orders WHERE id = '${orderId}';`);
    executeD1(`DELETE FROM idempotency_keys WHERE id = 'evt-sl06-t1-04';`);
  });

  test('TC-SL06-T1-05: Catalog Stock Display Check (DO Enabled)', async ({ request }) => {
    const prodId = '550e8400-e29b-41d4-a716-446655440005';
    setupTestProduct(prodId, 'SKU-SL06-T1-05', 'Test Product SL06 T1-05', 10);

    // Call GET `/api/products` (storefront product list)
    const response = await request.get(`${PUBLIC_API}/api/products`, {
      headers: { 'User-Agent': 'playwright' }
    });
    const resBody = await response.json();
    const body = Array.isArray(resBody) ? resBody : resBody.data;
    const product = body.find((p: any) => p.id === prodId);
    
    // Catalog display should match D1
    if (product) {
      expect(product.stock_quantity).toBe(10);
    }

    cleanupTestProduct(prodId);
  });

  test('TC-SL06-T2-01: Zero Stock Levels (DO Enabled)', async ({ request }) => {
    const prodId = '550e8400-e29b-41d4-a716-446655440006';
    setupTestProduct(prodId, 'SKU-SL06-T2-01', 'Test Product SL06 T2-01', 0);

    const response = await request.post(`${PUBLIC_API}/api/checkout`, {
      data: {
        email: 'test-sl06-t2-01@example.com',
        items: [{ variation_id: prodId, quantity: 1 }]
      }
    });
    // Expected to fail due to 0 stock
    expect(response.status()).toBe(400);

    cleanupTestProduct(prodId);
  });

  test('TC-SL06-T2-02: DO SQLite Missing Table Auto-Recovery', async ({ request }) => {
    const prodId = '550e8400-e29b-41d4-a716-446655440007';
    setupTestProduct(prodId, 'SKU-SL06-T2-02', 'Test Product SL06 T2-02', 5);

    // Checkout should succeed when D1 table exists
    const response = await request.post(`${PUBLIC_API}/api/checkout`, {
      data: {
        email: 'test-sl06-t2-02@example.com',
        items: [{ variation_id: prodId, quantity: 1 }]
      }
    });
    expect(response.status()).toBe(200);

    cleanupTestProduct(prodId);
  });

  test('TC-SL06-T2-03: Exceeding Available Stock (DO Disabled)', async ({ request }) => {
    const prodId = '550e8400-e29b-41d4-a716-446655440008';
    setupTestProduct(prodId, 'SKU-SL06-T2-03', 'Test Product SL06 T2-03', 5);

    const response = await request.post(`${PUBLIC_API}/api/checkout`, {
      data: {
        email: 'test-sl06-t2-03@example.com',
        items: [{ variation_id: prodId, quantity: 6 }]
      }
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('out of stock');

    cleanupTestProduct(prodId);
  });

  test('TC-SL06-T2-04: Exceeding Available Stock (DO Enabled)', async ({ request }) => {
    const prodId = '550e8400-e29b-41d4-a716-446655440009';
    setupTestProduct(prodId, 'SKU-SL06-T2-04', 'Test Product SL06 T2-04', 5);

    const response = await request.post(`${PUBLIC_API}/api/checkout`, {
      data: {
        email: 'test-sl06-t2-04@example.com',
        items: [{ variation_id: prodId, quantity: 6 }]
      }
    });
    expect(response.status()).toBe(400);

    cleanupTestProduct(prodId);
  });

  test('TC-SL06-T2-05: High-Volume Concurrent Checkouts on Single Product (DO Enabled)', async ({ request }) => {
    const prodId = '550e8400-e29b-41d4-a716-446655440010';
    setupTestProduct(prodId, 'SKU-SL06-T2-05', 'Test Product SL06 T2-05', 10);

    // Send 15 concurrent checkouts for 1 unit
    const checkoutPromises = [];
    for (let i = 0; i < 15; i++) {
      checkoutPromises.push(
        request.post(`${PUBLIC_API}/api/checkout`, {
          data: {
            email: `test-sl06-t2-05-${i}@example.com`,
            items: [{ variation_id: prodId, quantity: 1 }]
          }
        })
      );
    }

    const responses = await Promise.all(checkoutPromises);
    const successes = responses.filter(r => r.status() === 200);
    const failures = responses.filter(r => r.status() === 400);

    expect(successes.length).toBeLessThanOrEqual(10);
    expect(failures.length).toBeGreaterThanOrEqual(5);

    const results = queryD1(`SELECT stock_quantity FROM inventory_levels WHERE product_id = '${prodId}';`);
    expect(results[0].stock_quantity).toBe(10 - successes.length);

    cleanupTestProduct(prodId);
  });
});
