export interface LandingPageImage {
  url: string;
  alt_text?: string;
}

export interface LandingPageVariant {
  id: string;
  sku?: string;
  title?: string;
  stock?: number;
  images?: LandingPageImage[];
}

export interface LandingPageProduct {
  id: string;
  title: string;
  regular_price?: number | null; // Stored in minor units (VNĐ × 100)
  price?: number | null;        // Stored in minor units (VNĐ × 100)
  stock?: number;
  status?: string;
  images?: LandingPageImage[];
}

export interface ComboRule {
  id: string;
  name: string;
  price: number; // Stored in display VNĐ (e.g. 299000)
}

export interface LandingPageData {
  id: string;
  title: string;
  slug: string;
  product_id?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  status?: string | null;
  facebook_pixel_id?: string | null;
  tiktok_pixel_id?: string | null;
  urgency_end_time?: string | number | null;
  urgency_fake_views?: number | null;
  combo_rules_json?: string | ComboRule[] | null;
  features_json?: string | string[] | null;
  header_logo_url?: string | null;
  header_cta_text?: string | null;
  footer_content?: string | null;
  product?: LandingPageProduct | null;
  variants?: LandingPageVariant[];
}

export interface SuccessData {
  order_reference: string;
  payment_method: string;
  order_status: string;
  estimated_delivery: string;
}

export interface LandingFormData {
  name: string;
  phone: string;
  address: string;
  note: string;
  comboId: string;
  selectedVariantId: string;
}
