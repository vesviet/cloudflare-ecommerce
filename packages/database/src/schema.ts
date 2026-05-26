import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(), // UUID v4
  email: text('email').notNull().unique(),
  password_hash: text('password_hash'),
  status: text('status').notNull().default('active'), // active, suspended, verification_pending, invited
  first_name: text('first_name'),
  last_name: text('last_name'),
  phone: text('phone'),
  dob: text('dob'), // ISO Date (YYYY-MM-DD)
  gender: text('gender'), // male, female, other, unspecified
  company_name: text('company_name'),
  vat_tax_id: text('vat_tax_id'),
  avatar_url: text('avatar_url'),
  
  // Auth & Security
  email_verified: integer('email_verified').default(0),
  email_verification_token: text('email_verification_token'),
  password_reset_token: text('password_reset_token'),
  password_reset_expires_at: integer('password_reset_expires_at'),
  
  // Marketing & Attribution
  accepts_marketing: integer('accepts_marketing').default(0),
  accepts_marketing_updated_at: text('accepts_marketing_updated_at'),
  tags_json: text('tags_json').default('[]'),
  signup_utm_source: text('signup_utm_source'),
  signup_utm_medium: text('signup_utm_medium'),
  signup_utm_campaign: text('signup_utm_campaign'),
  signup_affiliate_id: text('signup_affiliate_id'),
  
  // Integrations & CRM
  stripe_customer_id: text('stripe_customer_id').unique(),
  crm_id: text('crm_id'),
  
  // Auditing
  last_login_at: text('last_login_at'),
  last_login_ip: text('last_login_ip'),
  note: text('note'),
  metafields_json: text('metafields_json').default('{}'),
  
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  parent_id: text('parent_id'), // Self-referencing FK done loosely, or .references(() => categories.id) if supported. SQLite supports it but Drizzle sometimes has circular type issues. Let's do raw text and enforce at app level or use explicit references.
  image_url: text('image_url'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
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
  primary_category_id: text('primary_category_id').references(() => categories.id, { onDelete: 'set null' }),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const productCategories = sqliteTable('product_categories', {
  id: text('id').primaryKey(),
  product_id: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  category_id: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
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
  guest_email: text('guest_email'),
  status: text('status').default('pending_payment'),
  payment_intent_id: text('payment_intent_id'),
  total_amount: real('total_amount').notNull(),
  shipping_fee: real('shipping_fee').default(0),
  affiliate_id: text('affiliate_id'),
  utm_source: text('utm_source'),
  shipping_address_json: text('shipping_address_json'),
  billing_address_json: text('billing_address_json'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  variation_id: text('variation_id').notNull().references(() => productVariations.id),
  quantity: integer('quantity').notNull(),
  price_at_purchase: real('price_at_purchase').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const customerAddresses = sqliteTable('customer_addresses', {
  id: text('id').primaryKey(),
  customer_id: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  alias: text('alias').default('Home'),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  company: text('company'),
  address_1: text('address_1').notNull(),
  address_2: text('address_2'),
  city: text('city').notNull(),
  state: text('state'),
  postcode: text('postcode').notNull(),
  country: text('country').notNull().default('VN'),
  phone: text('phone'),
  vat_id: text('vat_id'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  delivery_instructions: text('delivery_instructions'),
  is_default_shipping: integer('is_default_shipping').default(0),
  is_default_billing: integer('is_default_billing').default(0),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const inventoryReservations = sqliteTable('inventory_reservations', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  variation_id: text('variation_id').notNull().references(() => productVariations.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  expires_at: integer('expires_at').notNull(), // Unix timestamp for soft-lock expiration
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const idempotencyKeys = sqliteTable('idempotency_keys', {
  id: text('id').primaryKey(), // Stripe event ID
  event_type: text('event_type').notNull(),
  processed_at: text('processed_at').default(sql`CURRENT_TIMESTAMP`),
});
