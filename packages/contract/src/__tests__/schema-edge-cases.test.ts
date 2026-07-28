import { describe, it, expect } from 'vitest';
import {
  cmsSchema,
  customerSchema,
  CheckoutSchema,
  checkoutSchema,
  ProductSchema,
  productFormSchema,
  categorySchema,
  updateCategorySchema,
  CartSchema,
  CartItemSchema,
  AddToCartSchema,
  ReviewSchema,
  PostReviewSchema,
  CouponSchema,
  couponSchema,
  updateCouponSchema,
} from '../index';

describe('Empirical Edge-Case & Robustness Suite: @ecommerce/contract', () => {
  // -------------------------------------------------------------
  // 1. cmsSchema Tests
  // -------------------------------------------------------------
  describe('cmsSchema', () => {
    it('accepts valid article payload', () => {
      const payload = {
        title: 'Empirical Article Title',
        slug: 'empirical-article',
        type: 'article',
        status: 'published',
        content_json: '{"body": "content"}',
        excerpt: 'Short summary',
        meta_title: 'SEO Title',
        meta_description: 'SEO Description',
        featured_image: 'https://example.com/img.jpg',
        placement: 'header',
        expires_at: 1735689600,
      };
      const res = cmsSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('accepts valid event payload', () => {
      const payload = {
        title: 'Black Friday 2026 Event',
        type: 'event',
        status: 'draft',
      };
      const res = cmsSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('accepts all other valid types (post, page, block, banner, landing_page)', () => {
      const validTypes = ['post', 'page', 'block', 'banner', 'landing_page'] as const;
      for (const type of validTypes) {
        const res = cmsSchema.safeParse({ title: `Title ${type}`, type });
        expect(res.success).toBe(true);
      }
    });

    it('rejects invalid types with informative Zod issues', () => {
      const invalidPayload = {
        title: 'Invalid Type CMS Item',
        type: 'blog_post', // invalid enum
      };
      const res = cmsSchema.safeParse(invalidPayload);
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues[0];
        expect(issue.code).toBe('invalid_enum_value');
        expect(issue.path).toEqual(['type']);
        expect(issue.message).toContain("Invalid enum value");
      }
    });

    it('rejects missing required title', () => {
      const invalidPayload = {
        type: 'article',
      };
      const res = cmsSchema.safeParse(invalidPayload);
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find(i => i.path.includes('title'));
        expect(issue).toBeDefined();
        expect(issue?.code).toBe('invalid_type');
      }
    });

    it('rejects empty string title', () => {
      const invalidPayload = {
        title: '',
        type: 'article',
      };
      const res = cmsSchema.safeParse(invalidPayload);
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find(i => i.path.includes('title'));
        expect(issue?.message).toBe('Title is required');
      }
    });

    it('rejects title exceeding 255 characters', () => {
      const invalidPayload = {
        title: 'a'.repeat(256),
        type: 'article',
      };
      const res = cmsSchema.safeParse(invalidPayload);
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find(i => i.path.includes('title'));
        expect(issue?.code).toBe('too_big');
      }
    });

    it('handles nullable/optional fields properly', () => {
      const payload = {
        title: 'Nullable Fields Test',
        type: 'page',
        slug: null,
        excerpt: null,
        meta_title: null,
        meta_description: null,
        featured_image: null,
        placement: null,
        expires_at: null,
      };
      const res = cmsSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 2. customerSchema Tests
  // -------------------------------------------------------------
  describe('customerSchema', () => {
    it('handles accepts_marketing as boolean true and false', () => {
      const resTrue = customerSchema.safeParse({ accepts_marketing: true });
      const resFalse = customerSchema.safeParse({ accepts_marketing: false });
      expect(resTrue.success).toBe(true);
      expect(resFalse.success).toBe(true);
      if (resTrue.success) expect(resTrue.data.accepts_marketing).toBe(true);
      if (resFalse.success) expect(resFalse.data.accepts_marketing).toBe(false);
    });

    it('coerces numeric accepts_marketing 1 to true and 0 to false', () => {
      const res1 = customerSchema.safeParse({ accepts_marketing: 1 });
      const res0 = customerSchema.safeParse({ accepts_marketing: 0 });
      expect(res1.success).toBe(true);
      expect(res0.success).toBe(true);
      if (res1.success) expect(res1.data.accepts_marketing).toBe(true);
      if (res0.success) expect(res0.data.accepts_marketing).toBe(false);
    });

    it('handles other non-zero numbers in accepts_marketing', () => {
      const res2 = customerSchema.safeParse({ accepts_marketing: 2 });
      const resNeg = customerSchema.safeParse({ accepts_marketing: -1 });
      expect(res2.success).toBe(true);
      expect(resNeg.success).toBe(true);
      if (res2.success) expect(res2.data.accepts_marketing).toBe(true);
      if (resNeg.success) expect(resNeg.data.accepts_marketing).toBe(true);
    });

    it('rejects string representation of accepts_marketing like "true", "false", "1", "0"', () => {
      const resStringTrue = customerSchema.safeParse({ accepts_marketing: 'true' });
      const resStringOne = customerSchema.safeParse({ accepts_marketing: '1' });
      expect(resStringTrue.success).toBe(false);
      expect(resStringOne.success).toBe(false);

      if (!resStringTrue.success) {
        const issue = resStringTrue.error.issues[0];
        expect(issue.code).toBe('invalid_union');
        expect(issue.message).toBe('Invalid input');
      }
    });

    it('rejects invalid numbers like NaN or Infinity for accepts_marketing', () => {
      const resNaN = customerSchema.safeParse({ accepts_marketing: NaN });
      expect(resNaN.success).toBe(false);
    });

    it('validates email format and error message', () => {
      const res = customerSchema.safeParse({ email: 'not-an-email' });
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find(i => i.path.includes('email'));
        expect(issue?.message).toBe('Invalid email format');
      }
    });

    it('validates password min length and error message', () => {
      const res = customerSchema.safeParse({ password: 'short' });
      expect(res.success).toBe(false);
      if (!res.success) {
        const issue = res.error.issues.find(i => i.path.includes('password'));
        expect(issue?.message).toBe('Password must be at least 8 characters');
      }
    });
  });

  // -------------------------------------------------------------
  // 3. CheckoutSchema / checkoutSchema Tests
  // -------------------------------------------------------------
  describe('CheckoutSchema / checkoutSchema', () => {
    it('ensures checkoutSchema is identical to CheckoutSchema', () => {
      expect(checkoutSchema).toBe(CheckoutSchema);
    });

    it('accepts valid checkout payload with items', () => {
      const validPayload = {
        email: 'customer@example.com',
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        coupon_code: 'SAVE10',
        location_id: 'loc_01',
        address: {
          fullname: 'Jane Doe',
          address: '123 Main St',
          zipcode: '90210',
        },
        items: [
          { variation_id: 'var_abc', quantity: 2 },
          { variation_id: 'var_def', quantity: 1 },
        ],
        accepts_marketing: 1,
        redeem_points: 100,
        b2b_company: 'Acme Inc',
        b2b_vat_id: 'US123456789',
      };
      const res = CheckoutSchema.safeParse(validPayload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.accepts_marketing).toBe(true);
      }
    });

    it('rejects invalid item quantity (0, negative, decimal, string)', () => {
      const itemZero = { items: [{ variation_id: 'v1', quantity: 0 }] };
      const itemNeg = { items: [{ variation_id: 'v1', quantity: -1 }] };
      const itemFloat = { items: [{ variation_id: 'v1', quantity: 2.5 }] };
      const itemStr = { items: [{ variation_id: 'v1', quantity: '2' }] };

      expect(CheckoutSchema.safeParse(itemZero).success).toBe(false);
      expect(CheckoutSchema.safeParse(itemNeg).success).toBe(false);
      expect(CheckoutSchema.safeParse(itemFloat).success).toBe(false);
      expect(CheckoutSchema.safeParse(itemStr).success).toBe(false);

      const resZero = CheckoutSchema.safeParse(itemZero);
      if (!resZero.success) {
        const issue = resZero.error.issues[0];
        expect(issue.path).toEqual(['items', 0, 'quantity']);
        expect(issue.code).toBe('too_small');
      }
    });

    it('rejects missing or invalid variation_id in items', () => {
      const missingVar = { items: [{ quantity: 1 }] };
      const nonStrVar = { items: [{ variation_id: 123, quantity: 1 }] };

      expect(CheckoutSchema.safeParse(missingVar).success).toBe(false);
      expect(CheckoutSchema.safeParse(nonStrVar).success).toBe(false);
    });

    it('rejects invalid customer_id (not UUID)', () => {
      const res = CheckoutSchema.safeParse({
        items: [{ variation_id: 'v1', quantity: 1 }],
        customer_id: 'not-a-uuid',
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].path).toEqual(['customer_id']);
        expect(res.error.issues[0].code).toBe('invalid_string');
      }
    });

    it('rejects negative redeem_points', () => {
      const res = CheckoutSchema.safeParse({
        items: [{ variation_id: 'v1', quantity: 1 }],
        redeem_points: -10,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].path).toEqual(['redeem_points']);
      }
    });
  });

  // -------------------------------------------------------------
  // 4. productSchema & productFormSchema Tests
  // -------------------------------------------------------------
  describe('ProductSchema & productFormSchema', () => {
    it('validates catalog ProductSchema with UUID, slug, status, ISO datetimes', () => {
      const validProduct = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slug: 'flagship-phone',
        title: 'Flagship Phone',
        description: 'Latest model',
        status: 'published',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T12:00:00Z',
      };
      const res = ProductSchema.safeParse(validProduct);
      expect(res.success).toBe(true);
    });

    it('rejects non-UUID id or invalid ISO datetime in ProductSchema', () => {
      const invalidId = {
        id: 'invalid-id',
        slug: 'phone',
        title: 'Phone',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T12:00:00Z',
      };
      const invalidDate = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slug: 'phone',
        title: 'Phone',
        created_at: '2026-01-01', // not ISO datetime string with T and time
        updated_at: '2026-01-02T12:00:00Z',
      };
      expect(ProductSchema.safeParse(invalidId).success).toBe(false);
      expect(ProductSchema.safeParse(invalidDate).success).toBe(false);
    });

    it('validates productFormSchema for simple product form submission', () => {
      const validForm = {
        name: 'T-Shirt Red',
        sku: 'TSHIRT-RED-M',
        type: 'simple',
        regular_price: '29.99',
        sale_price: '19.99',
        stock_quantity: '50',
        status: 'published',
        is_purchasable: 1,
      };
      const res = productFormSchema.safeParse(validForm);
      expect(res.success).toBe(true);
    });

    it('rejects productFormSchema when sku < 3 characters or missing name', () => {
      const shortSku = { name: 'Item', sku: 'AB' };
      const missingName = { sku: 'SKU123' };

      expect(productFormSchema.safeParse(shortSku).success).toBe(false);
      expect(productFormSchema.safeParse(missingName).success).toBe(false);

      const resSku = productFormSchema.safeParse(shortSku);
      if (!resSku.success) {
        expect(resSku.error.issues[0].message).toBe('SKU is required and must be at least 3 characters');
      }
    });
  });

  // -------------------------------------------------------------
  // 5. categorySchema Tests
  // -------------------------------------------------------------
  describe('categorySchema & updateCategorySchema', () => {
    it('accepts valid category payload with all optional nullable fields', () => {
      const payload = {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices',
        parent_id: null,
        image_url: 'https://example.com/cat.png',
      };
      const res = categorySchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('rejects empty name or missing name in categorySchema', () => {
      expect(categorySchema.safeParse({ name: '' }).success).toBe(false);
      expect(categorySchema.safeParse({ slug: 'test' }).success).toBe(false);

      const resEmpty = categorySchema.safeParse({ name: '' });
      if (!resEmpty.success) {
        expect(resEmpty.error.issues[0].message).toBe('Name is required');
      }
    });

    it('validates updateCategorySchema allows optional name', () => {
      const res = updateCategorySchema.safeParse({ slug: 'new-slug' });
      expect(res.success).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 6. cartSchema Tests (CartSchema, CartItemSchema, AddToCartSchema)
  // -------------------------------------------------------------
  describe('cartSchema (CartSchema & CartItemSchema)', () => {
    it('accepts valid cart payload', () => {
      const payload = {
        id: 'cart-123',
        customer_id: 'cust-456',
        items: [
          {
            id: 'item-1',
            variation_id: 'var-100',
            product_id: 'prod-200',
            quantity: 3,
            price: 49.99,
            title: 'Cool Product',
          },
        ],
        updated_at: '2026-07-28T10:00:00Z',
      };
      const res = CartSchema.safeParse(payload);
      expect(res.success).toBe(true);
    });

    it('rejects invalid item formats in CartSchema (invalid price, non-int quantity)', () => {
      const invalidPrice = {
        items: [
          { variation_id: 'var-1', quantity: 1, price: 'invalid-price' as any },
        ],
      };
      const invalidQty = {
        items: [
          { variation_id: 'var-1', quantity: 0 },
        ],
      };

      expect(CartSchema.safeParse(invalidPrice).success).toBe(false);
      expect(CartSchema.safeParse(invalidQty).success).toBe(false);
    });

    it('validates AddToCartSchema defaults quantity to 1', () => {
      const res = AddToCartSchema.safeParse({ variation_id: 'var-99' });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.quantity).toBe(1);
      }
    });
  });

  // -------------------------------------------------------------
  // 7. reviewSchema Tests (ReviewSchema & PostReviewSchema)
  // -------------------------------------------------------------
  describe('reviewSchema (ReviewSchema & PostReviewSchema)', () => {
    it('validates boundary values for rating (1 to 5)', () => {
      for (let rating = 1; rating <= 5; rating++) {
        expect(PostReviewSchema.safeParse({ product_id: 'p1', rating }).success).toBe(true);
      }
    });

    it('rejects ratings out of bounds (0, 6, decimal 3.5, string "5")', () => {
      expect(PostReviewSchema.safeParse({ product_id: 'p1', rating: 0 }).success).toBe(false);
      expect(PostReviewSchema.safeParse({ product_id: 'p1', rating: 6 }).success).toBe(false);
      expect(PostReviewSchema.safeParse({ product_id: 'p1', rating: 3.5 }).success).toBe(false);
      expect(PostReviewSchema.safeParse({ product_id: 'p1', rating: '5' as any }).success).toBe(false);

      const resZero = PostReviewSchema.safeParse({ product_id: 'p1', rating: 0 });
      if (!resZero.success) {
        expect(resZero.error.issues[0].code).toBe('too_small');
      }

      const resSix = PostReviewSchema.safeParse({ product_id: 'p1', rating: 6 });
      if (!resSix.success) {
        expect(resSix.error.issues[0].code).toBe('too_big');
      }
    });

    it('rejects comment exceeding 2000 characters in PostReviewSchema', () => {
      const longComment = 'a'.repeat(2001);
      const res = PostReviewSchema.safeParse({ product_id: 'p1', rating: 5, comment: longComment });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].code).toBe('too_big');
      }
    });

    it('validates full ReviewSchema with UUIDs and datetime', () => {
      const fullReview = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        customer_id: '123e4567-e89b-12d3-a456-426614174002',
        rating: 4,
        comment: 'Great item!',
        status: 'approved',
        verified_purchase: true,
        created_at: '2026-07-28T12:00:00Z',
      };
      const res = ReviewSchema.safeParse(fullReview);
      expect(res.success).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 8. couponSchema Tests (CouponSchema, admin couponSchema, updateCouponSchema)
  // -------------------------------------------------------------
  describe('couponSchema (CouponSchema, admin couponSchema, updateCouponSchema)', () => {
    it('validates all accepted type enums in CouponSchema and admin couponSchema', () => {
      const types = ['percent', 'fixed', 'freeship', 'percentage', 'free_shipping'] as const;
      for (const type of types) {
        const resAdmin = couponSchema.safeParse({ code: 'DISCOUNT10', type, value: 10 });
        expect(resAdmin.success).toBe(true);
      }
    });

    it('rejects invalid type enum for coupons', () => {
      const res = couponSchema.safeParse({ code: 'DISCOUNT10', type: 'bogo' as any, value: 10 });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].code).toBe('invalid_enum_value');
      }
    });

    it('rejects code shorter than 4 characters in admin couponSchema', () => {
      const res = couponSchema.safeParse({ code: 'ABC', type: 'fixed', value: 10 });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].code).toBe('too_small');
      }
    });

    it('rejects negative value in admin couponSchema', () => {
      const res = couponSchema.safeParse({ code: 'SAVE', type: 'fixed', value: -5 });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].code).toBe('too_small');
      }
    });

    it('coerces is_active numeric 1/0 in admin couponSchema', () => {
      const res1 = couponSchema.safeParse({ code: 'SAVE10', type: 'fixed', value: 10, is_active: 1 });
      const res0 = couponSchema.safeParse({ code: 'SAVE10', type: 'fixed', value: 10, is_active: 0 });
      expect(res1.success).toBe(true);
      expect(res0.success).toBe(true);
      if (res1.success) expect(res1.data.is_active).toBe(true);
      if (res0.success) expect(res0.data.is_active).toBe(false);
    });

    it('validates updateCouponSchema is a partial schema of couponSchema', () => {
      const res = updateCouponSchema.safeParse({ value: 15 });
      expect(res.success).toBe(true);
    });
  });
});
