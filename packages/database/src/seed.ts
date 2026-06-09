import { drizzle } from 'drizzle-orm/libsql'; // Or any local sqlite driver for testing
import { createClient } from '@libsql/client';
import { products, categories, adminUsers } from './schema';

// This script is meant to be run against a local sqlite file or LibSQL for testing
// usage: npx tsx src/seed.ts
async function runSeed() {
  const sqlite = createClient({ url: 'file:local.db' });
  const db = drizzle(sqlite);

  console.log('Seeding data...');

  // 1. Admin User
  await db.insert(adminUsers).values({
    id: 'admin_1',
    email: 'admin@aura.store',
    name: 'Aura Admin',
    role: 'superadmin',
  }).onConflictDoNothing();

  // 2. Category
  await db.insert(categories).values({
    id: 'cat_ac',
    slug: 'may-lanh',
    name: 'Máy lạnh',
  }).onConflictDoNothing();

  // 3. Case 1: Simple Product (In stock)
  await db.insert(products).values({
    id: 'prod_simple_1',
    slug: 'samsung-inverter-ar40-standard',
    sku: 'SS-AR40-STD',
    title: 'Máy lạnh Samsung Standard 1.0 HP',
    type: 'simple',
    regular_price: 8000000,
    manage_stock: 1,
    stock_quantity: 50,
    allow_backorders: 0,
    in_stock: 1,
    primary_category_id: 'cat_ac',
  }).onConflictDoNothing();

  // 4. Case 2: Configurable Product (Parent + 2 Children)
  await db.insert(products).values({
    id: 'prod_parent_1',
    slug: 'samsung-inverter-ar40-premium',
    title: 'Máy lạnh Samsung Premium Inverter AR40',
    type: 'configurable',
    manage_stock: 0, // Parent doesn't hold stock
    in_stock: 1,
    primary_category_id: 'cat_ac',
  }).onConflictDoNothing();

  // Child 1 (1 HP)
  await db.insert(products).values({
    id: 'prod_child_1hp',
    parent_id: 'prod_parent_1',
    slug: 'samsung-inverter-ar40-premium-1hp',
    sku: 'SS-AR40-PRM-1HP',
    title: 'Máy lạnh Samsung Premium Inverter AR40 1 HP',
    type: 'simple',
    regular_price: 10000000,
    manage_stock: 1,
    stock_quantity: 10,
    in_stock: 1,
    attributes_json: JSON.stringify({ capacity: '1 HP' }),
  }).onConflictDoNothing();

  // Child 2 (1.5 HP)
  await db.insert(products).values({
    id: 'prod_child_15hp',
    parent_id: 'prod_parent_1',
    slug: 'samsung-inverter-ar40-premium-15hp',
    sku: 'SS-AR40-PRM-15HP',
    title: 'Máy lạnh Samsung Premium Inverter AR40 1.5 HP',
    type: 'simple',
    regular_price: 12000000,
    manage_stock: 1,
    stock_quantity: 5,
    in_stock: 1,
    attributes_json: JSON.stringify({ capacity: '1.5 HP' }),
  }).onConflictDoNothing();

  // 5. Case 3: Out of stock product
  await db.insert(products).values({
    id: 'prod_oos_1',
    slug: 'samsung-inverter-ar40-old',
    sku: 'SS-AR40-OLD',
    title: 'Máy lạnh Samsung Đời Cũ (Hết Hàng)',
    type: 'simple',
    regular_price: 5000000,
    manage_stock: 1,
    stock_quantity: 0,
    allow_backorders: 0,
    in_stock: 0,
    primary_category_id: 'cat_ac',
  }).onConflictDoNothing();

  // 6. Case 4: Preorder product (Out of stock but allow backorders)
  await db.insert(products).values({
    id: 'prod_preorder_1',
    slug: 'samsung-windfree-2027',
    sku: 'SS-WF-2027',
    title: 'Máy lạnh Samsung WindFree 2027 (Preorder)',
    type: 'simple',
    regular_price: 15000000,
    manage_stock: 1,
    stock_quantity: 0,
    allow_backorders: 1,
    in_stock: 1,
    primary_category_id: 'cat_ac',
  }).onConflictDoNothing();

  console.log('Seed completed.');
}

runSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});
