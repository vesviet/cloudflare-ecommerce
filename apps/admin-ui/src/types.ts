export interface ProductVariation {
  id?: string;
  sku: string;
  regular_price: number | string;
  sale_price: number | string | null;
  stock: number | string;
  attributes: Record<string, string>;
  is_purchasable?: number;
}

export interface ProductData {
  id: string;
  title: string;
  sku?: string;
  slug: string;
  status: string;
  type: 'simple' | 'configurable' | 'virtual';
  description: string | null;
  images?: string[];
  regular_price: number;
  sale_price: number | null;
  manage_stock?: number;
  stock_quantity?: number;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  primary_category_id?: string | null;
  secondary_categories?: string[];
  variations: ProductVariation[];
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  image_url: string | null;
}

export interface CustomerData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  created_at: string;
  total_spent: number;
  total_orders: number;
  status?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

export interface CmsEntry {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  type: 'post' | 'article' | 'event' | 'banner' | 'landing_page';
  status: 'draft' | 'published' | 'archived';
  featured_image_url: string | null;
  published_at: number | null;
  metadata_json: string;
  placement?: string | null;
  expires_at?: number | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemData {
  id: string;
  order_id: string;
  variation_id: string;
  quantity: number;
  price_at_purchase: number;
  sku: string | null;
  product_title: string | null;
}

export interface OrderData {
  id: string;
  customer_id: string | null;
  guest_email: string | null;
  status: 'pending' | 'pending_payment' | 'confirmed' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'refunded' | 'failed';
  payment_intent_id: string | null;
  total_amount: number;
  shipping_fee: number;
  affiliate_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  shipping_address_json: string | null;
  billing_address_json: string | null;
  tracking_number: string | null;
  carrier_name: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItemData[];
  discounts?: { id: string; coupon_id: string | null; discount_amount: number; coupon_code: string | null; }[];
}

export interface CouponData {
  id: string;
  code: string;
  type: string;
  value: number;
  ends_at: number | null;
  usage_limit: number | null;
  times_used: number;
  status: string;
  description: string | null;
  min_order_amount: number;
  starts_at: number | null;
  created_by: string | null;
  updated_at: string;
  created_at: string;
  applied_orders_count?: number;
}
