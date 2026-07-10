import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { schema as baseSchema } from '@ecommerce/database';

// Re-export original schema entities so that we can have a complete schema export
export const categories = baseSchema.categories;
export const products = baseSchema.products;
export const priceLists = baseSchema.priceLists;
export const priceListItems = baseSchema.priceListItems;
export const locations = baseSchema.locations;
export const inventoryLevels = baseSchema.inventoryLevels;
export const collections = baseSchema.collections;
export const collectionRules = baseSchema.collectionRules;
export const collectionProducts = baseSchema.collectionProducts;
export const assets = baseSchema.assets;
export const productAssets = baseSchema.productAssets;
export const cartItems = baseSchema.cartItems;
export const sessions = baseSchema.sessions;
export const orderItems = baseSchema.orderItems;
export const transactions = baseSchema.transactions;
export const customerAddresses = baseSchema.customerAddresses;
export const inventoryReservations = baseSchema.inventoryReservations;
export const idempotencyKeys = baseSchema.idempotencyKeys;
export const cmsEntries = baseSchema.cmsEntries;
export const adminUsers = baseSchema.adminUsers;
export const auditLogs = baseSchema.auditLogs;
export const failedJobs = baseSchema.failedJobs;
export const settings = baseSchema.settings;

// Overridden/Extended tables
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash'),
  status: text('status').notNull().default('active'),
  first_name: text('first_name'),
  last_name: text('last_name'),
  phone: text('phone'),
  dob: text('dob'),
  gender: text('gender'),
  company_name: text('company_name'),
  vat_tax_id: text('vat_tax_id'),
  avatar_url: text('avatar_url'),
  
  email_verified: integer('email_verified').default(0),
  email_verification_token: text('email_verification_token'),
  password_reset_token: text('password_reset_token'),
  password_reset_expires_at: integer('password_reset_expires_at'),
  
  accepts_marketing: integer('accepts_marketing').default(0),
  accepts_marketing_updated_at: text('accepts_marketing_updated_at'),
  tags_json: text('tags_json').default('[]'),
  signup_utm_source: text('signup_utm_source'),
  signup_utm_medium: text('signup_utm_medium'),
  signup_utm_campaign: text('signup_utm_campaign'),
  signup_affiliate_id: text('signup_affiliate_id'),
  
  stripe_customer_id: text('stripe_customer_id').unique(),
  crm_id: text('crm_id'),
  
  last_login_at: text('last_login_at'),
  last_login_ip: text('last_login_ip'),
  note: text('note'),
  metafields_json: text('metafields_json').default('{}'),
  
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deleted_at: text('deleted_at'), // Soft delete

  loyalty_points_balance: integer('loyalty_points_balance').default(0),
});

export const carts = sqliteTable('carts', {
  id: text('id').primaryKey(),
  customer_id: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  guest_session_id: text('guest_session_id'),
  status: text('status').default('active'), // active, converted, abandoned
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),

  discount_amount: integer('discount_amount').default(0),
  applied_promotions_json: text('applied_promotions_json').default('[]'),
  last_active_at: integer('last_active_at'),
  abandoned_email_sent_at: integer('abandoned_email_sent_at'),
}, (table) => {
  return {
    customerIdIdx: index('idx_carts_customer_id').on(table.customer_id),
    guestSessionIdIdx: index('idx_carts_guest_session_id').on(table.guest_session_id),
  };
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  customer_id: text('customer_id').references(() => customers.id),
  guest_email: text('guest_email'),
  status: text('status').default('pending_payment'),
  location_id: text('location_id').references(() => locations.id),
  total_amount: integer('total_amount').notNull(),
  shipping_fee: integer('shipping_fee').default(0),
  affiliate_id: text('affiliate_id'),
  utm_source: text('utm_source'),
  utm_medium: text('utm_medium'),
  utm_campaign: text('utm_campaign'),
  shipping_address_json: text('shipping_address_json'),
  billing_address_json: text('billing_address_json'),
  tracking_number: text('tracking_number'),
  session_id: text('session_id'),
  payment_intent_id: text('payment_intent_id'),
  carrier_name: text('carrier_name'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),

  discount_amount: integer('discount_amount').default(0),
  tax_amount: integer('tax_amount').default(0),
  applied_promotions_json: text('applied_promotions_json').default('[]'),
  shipping_lines_json: text('shipping_lines_json'),
  tax_lines_json: text('tax_lines_json'),
}, (table) => {
  return {
    statusIdx: index('idx_orders_status').on(table.status),
    createdAtIdx: index('idx_orders_created_at').on(table.created_at),
    customerIdIdx: index('idx_orders_customer_id').on(table.customer_id),
    sessionIdIdx: index('idx_orders_session_id').on(table.session_id),
  };
});

export const promotions = sqliteTable('promotions', {
  id: text('id').primaryKey(),
  code: text('code').unique(),
  type: text('type').notNull(),
  value: real('value').notNull(),
  min_order_amount: integer('min_order_amount').default(0),
  starts_at: integer('starts_at'),
  ends_at: integer('ends_at'),
  usage_limit: integer('usage_limit'),
  times_used: integer('times_used').default(0),
  status: text('status').default('active'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const promotionRules = sqliteTable('promotion_rules', {
  id: text('id').primaryKey(),
  promotion_id: text('promotion_id').notNull().references(() => promotions.id, { onDelete: 'cascade' }),
  target_type: text('target_type').notNull(),
  target_id: text('target_id').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const shipments = baseSchema.shipments;

export const shipmentItems = baseSchema.shipmentItems;

export const returns = sqliteTable('returns', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  customer_id: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  status: text('status').default('pending'),
  reason: text('reason').notNull(),
  refund_amount: integer('refund_amount'),
  tracking_number: text('tracking_number'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const returnItems = sqliteTable('return_items', {
  id: text('id').primaryKey(),
  return_id: text('return_id').notNull().references(() => returns.id, { onDelete: 'cascade' }),
  order_item_id: text('order_item_id').notNull().references(() => orderItems.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  restock_condition: text('restock_condition').default('sellable'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const refunds = sqliteTable('refunds', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  return_id: text('return_id').references(() => returns.id, { onDelete: 'set null' }),
  transaction_id: text('transaction_id').references(() => transactions.id),
  amount: integer('amount').notNull(),
  status: text('status').default('pending'),
  gateway_refund_id: text('gateway_refund_id'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const loyaltyLedgers = sqliteTable('loyalty_ledgers', {
  id: text('id').primaryKey(),
  customer_id: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  transaction_type: text('transaction_type').notNull(),
  points: integer('points').notNull(),
  order_id: text('order_id').references(() => orders.id, { onDelete: 'set null' }),
  description: text('description'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
