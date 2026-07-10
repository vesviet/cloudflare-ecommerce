import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const PUBLIC_API = process.env.PUBLIC_API_URL || 'http://127.0.0.1:8787';
const ADMIN_API = process.env.ADMIN_API_URL || 'http://127.0.0.1:8788';
const PUBLIC_API_DIR = path.resolve(__dirname, '../../apps/public-api');

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

function setupProcessingOrder(orderId: string, email: string, prodId: string, qty: number, orderItemId: string) {
  executeD1(`INSERT OR REPLACE INTO orders (id, status, total_amount, guest_email) VALUES ('${orderId}', 'processing', 1000, '${email}');`);
  executeD1(`INSERT OR REPLACE INTO order_items (id, order_id, product_id, quantity, price_at_purchase) VALUES ('${orderItemId}', '${orderId}', '${prodId}', ${qty}, 1000);`);
}

function cleanupOrder(orderId: string) {
  executeD1(`DELETE FROM shipment_items WHERE shipment_id IN (SELECT id FROM shipments WHERE order_id = '${orderId}');`);
  executeD1(`DELETE FROM shipments WHERE order_id = '${orderId}';`);
  executeD1(`DELETE FROM order_items WHERE order_id = '${orderId}';`);
  executeD1(`DELETE FROM orders WHERE id = '${orderId}';`);
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

async function assertFulfillmentStatus(orderId: string, expectedStatus: string, retries = 5) {
  for (let i = 0; i < retries; i++) {
    const res = queryD1(`SELECT status FROM shipments WHERE order_id = '${orderId}';`);
    if (res[0]?.status === expectedStatus) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const finalStatus = queryD1(`SELECT status FROM shipments WHERE order_id = '${orderId}';`)[0]?.status;
  expect(finalStatus).toBe(expectedStatus);
}

test.describe('SL-07: Fulfillment State Transition', () => {

  test('TC-SL07-T1-01: Single Item Full Shipment Fulfillment', async ({ request }) => {
    const prodId = 'test-sl07-t1-01-prod';
    const orderId = 'test-sl07-t1-01-order';
    const itemId = 'test-sl07-t1-01-item';

    setupTestProduct(prodId, 'SKU-SL07-T1-01', 'Product SL07 T1-01', 10);
    setupProcessingOrder(orderId, 'test-sl07-t1-01@example.com', prodId, 2, itemId);

    const response = await request.post(`${ADMIN_API}/api/orders/${orderId}/fulfill`, {
      headers: {
        'X-Local-Admin-Email': 'admin@tanhdev.com',
        'Content-Type': 'application/json'
      },
      data: {
        tracking_number: 'TRK-SL07-T1-01',
        carrier_name: 'UPS',
        items: [{ order_item_id: itemId, quantity: 2 }]
      }
    });
    expect(response.status()).toBe(200);

    // Verify order is marked shipped (not completed)
    const orderRes = queryD1(`SELECT status FROM orders WHERE id = '${orderId}';`);
    expect(orderRes[0]?.status).toBe('shipped');

    // Verify a fulfillment is created and status is shipped
    const fulfillmentRes = queryD1(`SELECT status, tracking_number, carrier_name FROM shipments WHERE order_id = '${orderId}';`);
    expect(fulfillmentRes.length).toBe(1);
    expect(fulfillmentRes[0].status).toBe('shipped');
    expect(fulfillmentRes[0].tracking_number).toBe('TRK-SL07-T1-01');

    cleanupOrder(orderId);
    cleanupTestProduct(prodId);
  });

  test('TC-SL07-T1-02: Carrier Webhook Delivery Transition', async ({ request }) => {
    const prodId = 'test-sl07-t1-02-prod';
    const orderId = 'test-sl07-t1-02-order';
    const itemId = 'test-sl07-t1-02-item';

    setupTestProduct(prodId, 'SKU-SL07-T1-02', 'Product SL07 T1-02', 10);
    setupProcessingOrder(orderId, 'test-sl07-t1-02@example.com', prodId, 1, itemId);

    // Fulfill order via admin route to transition to shipped state naturally
    const fulfillRes = await request.post(`${ADMIN_API}/api/orders/${orderId}/fulfill`, {
      headers: {
        'X-Local-Admin-Email': 'admin@tanhdev.com',
        'Content-Type': 'application/json'
      },
      data: {
        tracking_number: 'TRK-SL07-T1-02',
        carrier_name: 'DHL',
        items: [{ order_item_id: itemId, quantity: 1 }]
      }
    });
    expect(fulfillRes.status()).toBe(200);

    const response = await request.post(`${PUBLIC_API}/api/webhooks/carrier`, {
      headers: {
        'X-Carrier-Webhook-Secret': 'test_carrier_secret',
        'Content-Type': 'application/json'
      },
      data: {
        order_id: orderId,
        status: 'Delivered',
        carrier_name: 'DHL',
        tracking_number: 'TRK-SL07-T1-02'
      }
    });
    expect(response.status()).toBe(200);

    // Wait and assert
    await assertOrderStatus(orderId, 'completed');
    await assertFulfillmentStatus(orderId, 'delivered');

    cleanupOrder(orderId);
    cleanupTestProduct(prodId);
  });

  test('TC-SL07-T1-03: Order State Transition Mismatch Validation', async ({ request }) => {
    const prodId = 'test-sl07-t1-03-prod';
    const orderId = 'test-sl07-t1-03-order';
    const itemId = 'test-sl07-t1-03-item';

    setupTestProduct(prodId, 'SKU-SL07-T1-03', 'Product SL07 T1-03', 10);
    setupProcessingOrder(orderId, 'test-sl07-t1-03@example.com', prodId, 1, itemId);

    // Send Carrier Delivered Webhook on an un-shipped (processing) order.
    // completeOrder will fail or return false because order is not in 'shipped' state.
    const carrierResponse = await request.post(`${PUBLIC_API}/api/webhooks/carrier`, {
      headers: {
        'X-Carrier-Webhook-Secret': 'test_carrier_secret',
        'Content-Type': 'application/json'
      },
      data: {
        order_id: orderId,
        status: 'Delivered',
        carrier_name: 'DHL',
        tracking_number: 'TRK-SL07-T1-03'
      }
    });
    expect(carrierResponse.status()).toBe(200);

    // Assert that the order status remains processing and is NOT updated to completed
    await new Promise(resolve => setTimeout(resolve, 1000));
    const orderRes2 = queryD1(`SELECT status FROM orders WHERE id = '${orderId}';`);
    expect(orderRes2[0]?.status).toBe('processing'); // Remains processing

    cleanupOrder(orderId);
    cleanupTestProduct(prodId);
  });

  test('TC-SL07-T1-04: Carrier Webhook Dispatch Transition', async ({ request }) => {
    const prodId = 'test-sl07-t1-04-prod';
    const orderId = 'test-sl07-t1-04-order';
    const itemId = 'test-sl07-t1-04-item';

    setupTestProduct(prodId, 'SKU-SL07-T1-04', 'Product SL07 T1-04', 10);
    setupProcessingOrder(orderId, 'test-sl07-t1-04@example.com', prodId, 1, itemId);
    
    // Set up a pending fulfillment record
    executeD1(`INSERT OR REPLACE INTO shipments (id, order_id, status, tracking_number, carrier_name) VALUES ('ful-sl07-t1-04', '${orderId}', 'processing', 'TRK-SL07-T1-04', 'UPS');`);

    const response = await request.post(`${PUBLIC_API}/api/webhooks/carrier`, {
      headers: {
        'X-Carrier-Webhook-Secret': 'test_carrier_secret',
        'Content-Type': 'application/json'
      },
      data: {
        order_id: orderId,
        status: 'Shipped',
        carrier_name: 'UPS',
        tracking_number: 'TRK-SL07-T1-04'
      }
    });
    expect(response.status()).toBe(200);

    await assertFulfillmentStatus(orderId, 'shipped');

    cleanupOrder(orderId);
    cleanupTestProduct(prodId);
  });

  test('TC-SL07-T1-05: Fulfill Non-existent Order ID', async ({ request }) => {
    const response = await request.post(`${ADMIN_API}/api/orders/ord-missing-999/fulfill`, {
      headers: {
        'X-Local-Admin-Email': 'admin@tanhdev.com',
        'Content-Type': 'application/json'
      },
      data: {
        items: [{ order_item_id: 'item-missing-999', quantity: 1 }],
        tracking_number: 'TRK-SL07-T1-05',
        carrier_name: 'UPS'
      }
    });
    expect(response.status()).toBe(404);
  });

  test('TC-SL07-T2-01: Fulfill Order in Pending Payment State', async ({ request }) => {
    const prodId = 'test-sl07-t2-01-prod';
    const orderId = 'test-sl07-t2-01-order';
    const itemId = 'test-sl07-t2-01-item';

    setupTestProduct(prodId, 'SKU-SL07-T2-01', 'Product SL07 T2-01', 10);
    // Create order in pending_payment status
    executeD1(`INSERT OR REPLACE INTO orders (id, status, total_amount, guest_email) VALUES ('${orderId}', 'pending_payment', 1000, 'test-sl07-t2-01@example.com');`);
    executeD1(`INSERT OR REPLACE INTO order_items (id, order_id, product_id, quantity, price_at_purchase) VALUES ('${itemId}', '${orderId}', '${prodId}', 1, 1000);`);

    const response = await request.post(`${ADMIN_API}/api/orders/${orderId}/fulfill`, {
      headers: {
        'X-Local-Admin-Email': 'admin@tanhdev.com',
        'Content-Type': 'application/json'
      },
      data: {
        tracking_number: 'TRK-SL07-T2-01',
        carrier_name: 'UPS',
        items: [{ order_item_id: itemId, quantity: 1 }]
      }
    });
    expect(response.status()).toBe(400);

    const orderRes = queryD1(`SELECT status FROM orders WHERE id = '${orderId}';`);
    expect(orderRes[0]?.status).toBe('pending_payment');

    cleanupOrder(orderId);
    cleanupTestProduct(prodId);
  });

  test('TC-SL07-T2-02: Fulfill Order in Cancelled State', async ({ request }) => {
    const prodId = 'test-sl07-t2-02-prod';
    const orderId = 'test-sl07-t2-02-order';
    const itemId = 'test-sl07-t2-02-item';

    setupTestProduct(prodId, 'SKU-SL07-T2-02', 'Product SL07 T2-02', 10);
    executeD1(`INSERT OR REPLACE INTO orders (id, status, total_amount, guest_email) VALUES ('${orderId}', 'cancelled', 1000, 'test-sl07-t2-02@example.com');`);
    executeD1(`INSERT OR REPLACE INTO order_items (id, order_id, product_id, quantity, price_at_purchase) VALUES ('${itemId}', '${orderId}', '${prodId}', 1, 1000);`);

    const response = await request.post(`${ADMIN_API}/api/orders/${orderId}/fulfill`, {
      headers: {
        'X-Local-Admin-Email': 'admin@tanhdev.com',
        'Content-Type': 'application/json'
      },
      data: {
        tracking_number: 'TRK-SL07-T2-02',
        carrier_name: 'UPS',
        items: [{ order_item_id: itemId, quantity: 1 }]
      }
    });
    expect(response.status()).toBe(400);

    cleanupOrder(orderId);
    cleanupTestProduct(prodId);
  });

  test('TC-SL07-T2-03: Partial Order Item Fulfillment', async ({ request }) => {
    const prodId = 'test-sl07-t2-03-prod';
    const orderId = 'test-sl07-t2-03-order';
    const itemId = 'test-sl07-t2-03-item';

    setupTestProduct(prodId, 'SKU-SL07-T2-03', 'Product SL07 T2-03', 10);
    setupProcessingOrder(orderId, 'test-sl07-t2-03@example.com', prodId, 2, itemId);

    // Fulfill only 1 of the 2 ordered items
    const response = await request.post(`${ADMIN_API}/api/orders/${orderId}/fulfill`, {
      headers: {
        'X-Local-Admin-Email': 'admin@tanhdev.com',
        'Content-Type': 'application/json'
      },
      data: {
        tracking_number: 'TRK-SL07-T2-03',
        carrier_name: 'DHL',
        items: [{ order_item_id: itemId, quantity: 1 }]
      }
    });
    expect(response.status()).toBe(200);

    // Verify a fulfillment is created
    const fulfillmentRes = queryD1(`SELECT status, tracking_number FROM shipments WHERE order_id = '${orderId}';`);
    expect(fulfillmentRes.length).toBe(1);
    expect(fulfillmentRes[0].status).toBe('shipped');

    cleanupOrder(orderId);
    cleanupTestProduct(prodId);
  });

  test('TC-SL07-T2-04: Fulfill Quantity Exceeding Ordered Quantity', async ({ request }) => {
    const prodId = 'test-sl07-t2-04-prod';
    const orderId = 'test-sl07-t2-04-order';
    const itemId = 'test-sl07-t2-04-item';

    setupTestProduct(prodId, 'SKU-SL07-T2-04', 'Product SL07 T2-04', 10);
    setupProcessingOrder(orderId, 'test-sl07-t2-04@example.com', prodId, 1, itemId);

    // Try to fulfill 2 items when only 1 was ordered
    const response = await request.post(`${ADMIN_API}/api/orders/${orderId}/fulfill`, {
      headers: {
        'X-Local-Admin-Email': 'admin@tanhdev.com',
        'Content-Type': 'application/json'
      },
      data: {
        tracking_number: 'TRK-SL07-T2-04',
        carrier_name: 'UPS',
        items: [{ order_item_id: itemId, quantity: 2 }]
      }
    });
    // Expected to fail due to quantity constraint
    expect(response.status()).toBe(400);

    cleanupOrder(orderId);
    cleanupTestProduct(prodId);
  });

  test('TC-SL07-T2-05: Carrier Webhook Signature Validation Failure', async ({ request }) => {
    const response = await request.post(`${PUBLIC_API}/api/webhooks/carrier`, {
      headers: {
        'X-Carrier-Webhook-Secret': 'wrong_secret',
        'Content-Type': 'application/json'
      },
      data: {
        order_id: 'some-order',
        status: 'Delivered'
      }
    });
    expect(response.status()).toBe(401);
  });
});
