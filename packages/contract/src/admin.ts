import { z } from 'zod';

export const adminUserSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(['superadmin', 'manager', 'support', 'editor']),
});

export const adminUserStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
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
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  type: z.enum(['post', 'page', 'block']),
  status: z.enum(['published', 'draft', 'archived']).optional(),
  content_json: z.string().optional(),
  excerpt: z.string().optional().nullable(),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  featured_image: z.string().optional().nullable(),
});

export const updateCmsSchema = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  type: z.enum(['post', 'page', 'block']).optional(),
  status: z.enum(['published', 'draft', 'archived']).optional(),
  content_json: z.string().optional(),
  excerpt: z.string().optional().nullable(),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  featured_image: z.string().optional().nullable(),
});

export const customerSchema = z.object({
  email: z.string().email("Invalid email format").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
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
});

export const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().optional(),
  regular_price: z.string().optional(),
  sale_price: z.string().optional().nullable(),
  stock: z.string().optional(),
  primary_category_id: z.string().optional().nullable(),
  secondary_categories: z.string().optional(),
  variations: z.string().optional(),
  existing_images: z.string().optional(),
  images: z.any().optional(),
  image: z.any().optional(),
});
