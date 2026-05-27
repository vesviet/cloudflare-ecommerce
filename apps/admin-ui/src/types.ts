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
  slug: string;
  status: string;
  type: string;
  description: string | null;
  regular_price: number;
  sale_price: number | null;
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
