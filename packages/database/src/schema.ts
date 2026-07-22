import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

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
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  parent_id: text('parent_id'),
  image_url: text('image_url'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  parent_id: text('parent_id'), // For variations. References products.id
  slug: text('slug').notNull().unique(),
  sku: text('sku').unique(),
  title: text('title').notNull(),
  short_description: text('short_description'),
  description: text('description'),
  type: text('type').notNull().default('simple'), // simple, configurable, virtual
  
  weight: real('weight'),
  length: real('length'),
  width: real('width'),
  height: real('height'),
  
  attributes_json: text('attributes_json'), // Flat variations JSON
  tags_json: text('tags_json').default('[]'),
  metafields_json: text('metafields_json').default('{}'),
  
  is_purchasable: integer('is_purchasable').notNull().default(1),
  status: text('status').default('draft'), // draft, published, archived
  primary_category_id: text('primary_category_id').references(() => categories.id, { onDelete: 'set null' }),
  ai_sync_status: text('ai_sync_status').default('pending'), // pending, synced, failed
  
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  deleted_at: text('deleted_at'), // Soft delete
}, (table) => {
  return {
    statusIdx: index('idx_products_status').on(table.status),
    parentIdIdx: index('idx_products_parent_id').on(table.parent_id),
    categoryIdIdx: index('idx_products_category_id').on(table.primary_category_id),
  };
});

// --- PIM REFACTOR MODELS ---

export const priceLists = sqliteTable('price_lists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().default('base'), // base, b2b, sale
  currency: text('currency').notNull().default('USD'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const priceListItems = sqliteTable('price_list_items', {
  id: text('id').primaryKey(),
  price_list_id: text('price_list_id').notNull().references(() => priceLists.id, { onDelete: 'cascade' }),
  product_id: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  price: integer('price').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    priceListProductIdx: index('idx_price_list_product').on(table.price_list_id, table.product_id),
  };
});

export const locations = sqliteTable('locations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  type: text('type').notNull().default('warehouse'), // warehouse, store
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const inventoryLevels = sqliteTable('inventory_levels', {
  id: text('id').primaryKey(),
  location_id: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  product_id: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  stock_quantity: integer('stock_quantity').notNull().default(0),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    locationProductIdx: index('idx_inventory_location_product').on(table.location_id, table.product_id),
  };
});

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const collectionRules = sqliteTable('collection_rules', {
  id: text('id').primaryKey(),
  collection_id: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  field: text('field').notNull(), // e.g., 'price', 'category_id', 'tags'
  operator: text('operator').notNull(), // 'equals', 'greater_than', 'contains'
  value: text('value').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const collectionProducts = sqliteTable('collection_products', {
  id: text('id').primaryKey(),
  collection_id: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  product_id: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  r2_key: text('r2_key').notNull().unique(),
  url: text('url').notNull(),
  alt_text: text('alt_text').notNull(),
  mime_type: text('mime_type'),
  size: integer('size'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const productAssets = sqliteTable('product_assets', {
  id: text('id').primaryKey(),
  product_id: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  asset_id: text('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  position: integer('position').default(0),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const carts = sqliteTable('carts', {
  id: text('id').primaryKey(),
  customer_id: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  guest_session_id: text('guest_session_id'),
  status: text('status').default('active'), // active, converted, abandoned
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    customerIdIdx: index('idx_carts_customer_id').on(table.customer_id),
    guestSessionIdIdx: index('idx_carts_guest_session_id').on(table.guest_session_id),
  };
});

export const cartItems = sqliteTable('cart_items', {
  id: text('id').primaryKey(),
  cart_id: text('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  product_id: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  customer_id: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  refresh_token: text('refresh_token').notNull(),
  expires_at: integer('expires_at').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    customerIdIdx: index('idx_sessions_customer_id').on(table.customer_id),
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
}, (table) => {
  return {
    statusIdx: index('idx_orders_status').on(table.status),
    createdAtIdx: index('idx_orders_created_at').on(table.created_at),
    customerIdIdx: index('idx_orders_customer_id').on(table.customer_id),
    sessionIdIdx: index('idx_orders_session_id').on(table.session_id),
  };
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id),
  product_id: text('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  price_at_purchase: integer('price_at_purchase').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    orderIdIdx: index('idx_order_items_order_id').on(table.order_id),
    productIdIdx: index('idx_order_items_product_id').on(table.product_id),
  };
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id),
  payment_intent_id: text('payment_intent_id'),
  amount: integer('amount').notNull(),
  status: text('status').notNull(), // success, failed, pending
  provider: text('provider').notNull(), // stripe, vnpay
  error_message: text('error_message'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    orderIdIdx: index('idx_transactions_order_id').on(table.order_id),
  };
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
}, (table) => {
  return {
    customerIdIdx: index('idx_customer_addresses_customer_id').on(table.customer_id),
  };
});

export const inventoryReservations = sqliteTable('inventory_reservations', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  product_id: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  location_id: text('location_id').notNull().references(() => locations.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  expires_at: integer('expires_at').notNull(), // Unix timestamp for soft-lock expiration
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    productIdIdx: index('idx_inventory_reservations_product_id').on(table.product_id),
    locationProductIdx: index('idx_inventory_reservations_location_product').on(table.location_id, table.product_id),
    expiresAtIdx: index('idx_inventory_reservations_expires_at').on(table.expires_at),
  };
});

export const idempotencyKeys = sqliteTable('idempotency_keys', {
  id: text('id').primaryKey(),
  event_type: text('event_type').notNull(),
  expires_at: integer('expires_at'),
  processed_at: text('processed_at').default(sql`CURRENT_TIMESTAMP`),
});

export const cmsEntries = sqliteTable('cms_entries', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  content: text('content'),
  type: text('type').notNull().default('post'),
  status: text('status').notNull().default('draft'),
  featured_image_url: text('featured_image_url'),
  published_at: integer('published_at'),
  metadata_json: text('metadata_json').default('{}'),
  placement: text('placement'),
  expires_at: integer('expires_at'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    placementIdx: index('idx_cms_entries_placement').on(table.placement),
  };
});

export const adminUsers = sqliteTable('admin_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('editor'),
  status: text('status').notNull().default('active'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  admin_id: text('admin_id').references(() => adminUsers.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entity_type: text('entity_type').notNull(),
  entity_id: text('entity_id').notNull(),
  payload_json: text('payload_json'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// --- E-COMMERCE STANDARDIZATION ADDITIONS ---

export const coupons = sqliteTable('coupons', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  type: text('type').notNull(), // percent, fixed, freeship
  value: real('value').notNull(),
  max_uses: integer('max_uses'),
  uses: integer('uses').default(0),
  expires_at: integer('expires_at'),
  is_active: integer('is_active').default(1),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const orderDiscounts = sqliteTable('order_discounts', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  coupon_id: text('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
  discount_amount: integer('discount_amount').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const productReviews = sqliteTable('product_reviews', {
  id: text('id').primaryKey(),
  product_id: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  customer_id: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  rating: integer('rating').notNull(), // 1 to 5
  comment: text('comment'),
  status: text('status').default('pending'), // pending, approved, rejected
  verified_purchase: integer('verified_purchase').default(0),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const wishlists = sqliteTable('wishlists', {
  id: text('id').primaryKey(),
  customer_id: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  product_id: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    customerProductIdx: index('idx_wishlists_customer_product').on(table.customer_id, table.product_id),
  };
});

export const shipments = sqliteTable('shipments', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  status: text('status').default('pending'),
  tracking_number: text('tracking_number'),
  carrier_name: text('carrier_name'),
  label_r2_key: text('label_r2_key'),
  shipped_at: text('shipped_at'),
  delivered_at: text('delivered_at'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    orderIdIdx: index('idx_shipments_order_id').on(table.order_id),
  };
});

export const shipmentItems = sqliteTable('shipment_items', {
  id: text('id').primaryKey(),
  shipment_id: text('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  order_item_id: text('order_item_id').notNull().references(() => orderItems.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    shipmentIdIdx: index('idx_shipment_items_shipment_id').on(table.shipment_id),
    orderItemIdIdx: index('idx_shipment_items_order_item_id').on(table.order_item_id),
  };
});

export const rmaRequests = sqliteTable('rma_requests', {
  id: text('id').primaryKey(),
  order_id: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  customer_id: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  status: text('status').default('requested'), // requested, approved, refunded, rejected
  reason: text('reason').notNull(),
  refund_amount: integer('refund_amount'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => {
  return {
    orderIdIdx: index('idx_rma_requests_order_id').on(table.order_id),
    customerIdIdx: index('idx_rma_requests_customer_id').on(table.customer_id),
  };
});

export const failedJobs = sqliteTable('failed_jobs', {
  id: text('id').primaryKey(),
  queue_name: text('queue_name').notNull(),
  payload_json: text('payload_json'),
  error_message: text('error_message'),
  status: text('status').default('failed'), // failed, retried
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(), // JSON or string
  type: text('type').default('string').notNull(), // 'boolean', 'number', 'string'
  description: text('description'),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// --- LANDING PAGES ---

export const landingPages = sqliteTable('landing_pages', {
  id: text('id').primaryKey(),
  title: text('title').notNull().default(''),
  slug: text('slug').notNull().unique(),
  product_id: text('product_id').references(() => products.id),
  seo_title: text('seo_title'),
  seo_description: text('seo_description'),
  status: text('status').default('published'),
  facebook_pixel_id: text('facebook_pixel_id'),
  tiktok_pixel_id: text('tiktok_pixel_id'),
  urgency_end_time: text('urgency_end_time'), // ISO String
  urgency_fake_views: integer('urgency_fake_views').default(0),
  combo_rules_json: text('combo_rules_json'), // JSON string
  
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const landingPageLeads = sqliteTable('landing_page_leads', {
  id: text('id').primaryKey(),
  landing_page_id: text('landing_page_id').references(() => landingPages.id),
  
  customer_name: text('customer_name').notNull(),
  customer_phone: text('customer_phone').notNull(),
  customer_address: text('customer_address'),
  customer_note: text('customer_note'),
  
  selected_combo_id: text('selected_combo_id'),
  selected_colors_json: text('selected_colors_json'),
  selected_sizes_json: text('selected_sizes_json'),
  
  total_amount: integer('total_amount').notNull(),
  
  // Tracking
  utm_source: text('utm_source'),
  utm_campaign: text('utm_campaign'),
  utm_content: text('utm_content'),
  
  // Webhook Sync
  sync_status: text('sync_status').default('pending'), // pending, synced, failed
  
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
