import { describe, it, expect } from 'vitest';
import {
  CheckoutSchema,
  cmsSchema,
  customerSchema,
  couponSchema,
  updateCouponSchema,
  PostReviewSchema,
  CartSchema,
  CustomerRegisterSchema,
  CustomerLoginSchema,
  CustomerAddressSchema,
} from '../index';

describe('@ecommerce/contract Schema Suite', () => {
  it('validates CheckoutSchema with B2B fields and accepts_marketing coercion', () => {
    const payload = {
      email: 'buyer@b2b.com',
      items: [{ variation_id: 'var-123', quantity: 2 }],
      b2b_company: 'Acme Corp',
      b2b_vat_id: 'VAT-998877',
      accepts_marketing: 1,
    };
    const parsed = CheckoutSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.accepts_marketing).toBe(true);
      expect(parsed.data.b2b_company).toBe('Acme Corp');
    }
  });

  it('validates cmsSchema with article and event types', () => {
    const articlePayload = {
      title: 'Breaking News Article',
      type: 'article',
      status: 'published',
    };
    const eventPayload = {
      title: 'Summer Sale Event',
      type: 'event',
      status: 'draft',
    };
    expect(cmsSchema.safeParse(articlePayload).success).toBe(true);
    expect(cmsSchema.safeParse(eventPayload).success).toBe(true);
  });

  it('validates customerSchema accepting boolean or coerced numeric accepts_marketing', () => {
    const customerWithNumber = {
      email: 'john@example.com',
      accepts_marketing: 1,
    };
    const customerWithBool = {
      email: 'john@example.com',
      accepts_marketing: false,
    };
    const res1 = customerSchema.safeParse(customerWithNumber);
    const res2 = customerSchema.safeParse(customerWithBool);
    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    if (res1.success) expect(res1.data.accepts_marketing).toBe(true);
    if (res2.success) expect(res2.data.accepts_marketing).toBe(false);
  });

  it('validates couponSchema and updateCouponSchema', () => {
    const coupon = {
      code: 'SUMMER2026',
      type: 'percent',
      value: 20,
      is_active: 1,
    };
    const parsed = couponSchema.safeParse(coupon);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.is_active).toBe(true);

    const update = { is_active: 0 };
    const parsedUpdate = updateCouponSchema.safeParse(update);
    expect(parsedUpdate.success).toBe(true);
  });

  it('validates PostReviewSchema', () => {
    const review = {
      product_id: 'prod-123',
      rating: 5,
      comment: 'Awesome product!',
    };
    expect(PostReviewSchema.safeParse(review).success).toBe(true);
  });

  it('validates CartSchema and CartItemSchema', () => {
    const cart = {
      id: 'cart-1',
      items: [
        { variation_id: 'var-1', quantity: 1, price: 100 },
      ],
    };
    expect(CartSchema.safeParse(cart).success).toBe(true);
  });

  it('validates CustomerRegisterSchema, CustomerLoginSchema, CustomerAddressSchema', () => {
    const reg = {
      email: 'test@example.com',
      password: 'password123',
      acceptsMarketing: 1,
    };
    expect(CustomerRegisterSchema.safeParse(reg).success).toBe(true);

    const login = {
      email: 'test@example.com',
      password: 'password123',
    };
    expect(CustomerLoginSchema.safeParse(login).success).toBe(true);

    const addr = {
      first_name: 'Jane',
      last_name: 'Doe',
      address_1: '123 Main St',
      city: 'Hanoi',
      postcode: '100000',
    };
    expect(CustomerAddressSchema.safeParse(addr).success).toBe(true);
  });
});
