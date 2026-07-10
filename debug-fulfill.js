const { spawn, execSync } = require('child_process');
const http = require('http');

const PUBLIC_API_DIR = 'apps/public-api';
const ADMIN_API_DIR = 'apps/admin-api';

function executeD1(command) {
  const escaped = command.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  try {
    execSync(
      `npx wrangler d1 execute ecommerce-db --local --command "${escaped}"`,
      { cwd: PUBLIC_API_DIR, env: { ...process.env, PAGER: 'cat' } }
    );
  } catch (error) {
    console.error("D1 Execute Error:", error.message);
  }
}

async function main() {
  console.log(" Wiping wrangler state...");
  execSync('rm -rf apps/public-api/.wrangler apps/admin-api/.wrangler');

  console.log(" Running setup:db...");
  execSync('pnpm run setup:db');

  console.log(" Starting public-api...");
  const publicApi = spawn('npx', ['wrangler', 'dev', '--port', '8787', '--inspector-port', '9229'], {
    cwd: PUBLIC_API_DIR,
    stdio: 'ignore'
  });

  console.log(" Starting admin-api...");
  const adminApi = spawn('npx', ['wrangler', 'dev', '--port', '8788', '--persist-to', '../public-api/.wrangler/state', '--inspector-port', '9230'], {
    cwd: ADMIN_API_DIR,
    stdio: 'ignore'
  });

  // Wait 5 seconds
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log(" Seeding test data...");
  const prodId = 'test-sl07-t1-01-prod';
  const orderId = 'test-sl07-t1-01-order';
  const itemId = 'test-sl07-t1-01-item';

  executeD1(`INSERT OR REPLACE INTO products (id, slug, sku, title, status, is_purchasable) VALUES ('${prodId}', '${prodId}', 'SKU-1', 'Product 1', 'published', 1);`);
  executeD1(`INSERT OR REPLACE INTO price_list_items (id, price_list_id, product_id, price) VALUES ('pli-${prodId}', 'pl_base', '${prodId}', 1000);`);
  executeD1(`INSERT OR REPLACE INTO inventory_levels (id, location_id, product_id, stock_quantity) VALUES ('inv-${prodId}', 'loc-1', '${prodId}', 10);`);
  executeD1(`INSERT OR REPLACE INTO orders (id, status, total_amount, guest_email) VALUES ('${orderId}', 'processing', 1000, 'test-sl07-t1-01@example.com');`);
  executeD1(`INSERT OR REPLACE INTO order_items (id, order_id, product_id, quantity, price_at_purchase) VALUES ('${itemId}', '${orderId}', '${prodId}', 2, 1000);`);

  console.log(" Sending fulfill request...");
  const reqData = JSON.stringify({
    tracking_number: 'TRK-SL07-T1-01',
    carrier_name: 'UPS',
    items: [{ order_item_id: itemId, quantity: 2 }]
  });

  const req = http.request({
    hostname: '127.0.0.1',
    port: 8788,
    path: `/api/orders/${orderId}/fulfill`,
    method: 'POST',
    headers: {
      'X-Local-Admin-Email': 'admin@tanhdev.com',
      'Content-Type': 'application/json',
      'Content-Length': reqData.length
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log("=== RESPONSE ===");
      console.log("Status:", res.statusCode);
      console.log("Body:", body);
      
      console.log(" Shutting down...");
      publicApi.kill('SIGKILL');
      adminApi.kill('SIGKILL');
      process.exit(0);
    });
  });

  req.on('error', (err) => {
    console.error("Request error:", err.message);
    publicApi.kill('SIGKILL');
    adminApi.kill('SIGKILL');
    process.exit(1);
  });

  req.write(reqData);
  req.end();
}

main();
