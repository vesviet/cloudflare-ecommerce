import { z } from 'zod';

export const adminUserSchema = z.object({
  email: z.string().email("Invalid email").max(255),
  name: z.string().min(1, "Name is required").max(255),
  role: z.enum(['superadmin', 'manager', 'support', 'editor']),
});

export const adminUserStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255),
  description: z.string().optional().nullable(),
  parent_id: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
});

export const updateCategorySchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  parent_id: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
});

export const checkoutSchema = z.object({
  email: z.string().email("Invalid email"),
  items: z.array(z.object({
    variation_id: z.string(),
    quantity: z.number().int().positive()
  })).min(1, "Items are required"),
  customer_id: z.string().optional().nullable(),
  shipping_address_json: z.any().optional().nullable(),
  billing_address_json: z.any().optional().nullable(),
  utm_source: z.string().optional().nullable(),
  utm_medium: z.string().optional().nullable(),
  utm_campaign: z.string().optional().nullable(),
  affiliate_id: z.string().optional().nullable(),
});

export const cmsSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255),
  type: z.enum(['post', 'page', 'block', 'banner', 'landing_page']),
  status: z.enum(['published', 'draft', 'archived']).optional(),
  content_json: z.string().optional(),
  excerpt: z.string().optional().nullable(),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  featured_image: z.string().optional().nullable(),
  placement: z.string().optional().nullable(),
  expires_at: z.number().optional().nullable(),
});

export const updateCmsSchema = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  type: z.enum(['post', 'page', 'block', 'banner', 'landing_page']).optional(),
  status: z.enum(['published', 'draft', 'archived']).optional(),
  content_json: z.string().optional(),
  excerpt: z.string().optional().nullable(),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  featured_image: z.string().optional().nullable(),
  placement: z.string().optional().nullable(),
  expires_at: z.number().optional().nullable(),
});

export const customerSchema = z.object({
  email: z.string().email("Invalid email format").max(255).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(255).optional(),
  first_name: z.string().max(100).optional().nullable(),
  last_name: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  status: z.string().optional(),
  dob: z.string().optional().nullable(),
  gender: z.string().optional(),
  company_name: z.string().optional().nullable(),
  vat_tax_id: z.string().optional().nullable(),
  accepts_marketing: z.boolean().optional(),
  tags_json: z.string().optional(),
  note: z.string().optional().nullable(),
});

export const resetPasswordSchema = z.object({
  new_password: z.string().min(8, "new_password must be at least 8 characters"),
});

export const fulfillSchema = z.object({
  tracking_number: z.string().min(1, "Tracking number is required"),
  carrier_name: z.string().min(1, "Carrier name is required"),
  items: z.array(z.object({
    order_item_id: z.string(),
    quantity: z.number().int().positive()
  })).optional(),
});

export const productFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  sku: z.string().min(3, "SKU is required and must be at least 3 characters").max(100),
  type: z.enum(['simple', 'configurable', 'virtual']).optional(),
  regular_price: z.string().optional(),
  sale_price: z.string().optional().nullable(),
  stock: z.string().optional(),
  weight: z.string().optional(),
  length: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  primary_category_id: z.string().optional().nullable(),
  secondary_categories: z.string().optional(),
  variations: z.string().optional(),
  existing_images: z.string().optional(),
  images: z.any().optional(),
  image: z.any().optional(),
});
