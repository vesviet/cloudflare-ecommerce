import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(), // UUID v4
  email: text('email').notNull().unique(),
  password_hash: text('password_hash'),
  first_name: text('first_name'),
  last_name: text('last_name'),
  phone: text('phone'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull().default('simple'),
  regular_price: integer('regular_price'),
  sale_price: integer('sale_price'),
  is_purchasable: integer('is_purchasable').notNull().default(1),
  in_stock: integer('in_stock').notNull().default(1),
  attributes: text('attributes'),
  status: text('status').default('draft'), // draft, published, archived
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const productVariations = sqliteTable('product_variations', {
  id: text('id').primaryKey(),
  product_id: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull().unique(),
  regular_price: integer('regular_price').notNull(),
  sale_price: integer('sale_price'),
  stock: integer('stock').notNull().default(0), // Lưu ý: Constraint CHECK(stock >= 0) sẽ được quản lý thông qua raw SQL lúc setup bảng
  is_purchasable: integer('is_purchasable').notNull().default(1),
  in_stock: integer('in_stock').notNull().default(1),
  attributes_json: text('attributes_json'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  customer_id: text('customer_id').references(() => customers.id),
  status: text('status').default('pending_payment'),
  payment_intent_id: text('payment_intent_id'),
  total_amount: real('total_amount').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
