import {
  cmsSchema,
  customerSchema,
  CheckoutSchema,
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
} from '../src/index';

type ValidationResult = {
  schemaName: string;
  testCaseName: string;
  inputPayload: any;
  passed: boolean;
  zodIssues?: any[];
};

const results: ValidationResult[] = [];

function check(schemaName: string, testCaseName: string, schema: any, payload: any) {
  const parsed = schema.safeParse(payload);
  results.push({
    schemaName,
    testCaseName,
    inputPayload: payload,
    passed: parsed.success,
    zodIssues: parsed.success ? undefined : parsed.error.issues,
  });
}

console.log('=== RUNNING EMPIRICAL STRESS TEST SUITE ===\n');

// 1. cmsSchema
check('cmsSchema', 'Valid Article', cmsSchema, { title: 'Tech Post', type: 'article' });
check('cmsSchema', 'Valid Event', cmsSchema, { title: 'Tech Conference', type: 'event' });
check('cmsSchema', 'Invalid Type string ("blog")', cmsSchema, { title: 'Post', type: 'blog' });
check('cmsSchema', 'Missing title', cmsSchema, { type: 'article' });
check('cmsSchema', 'Empty title string', cmsSchema, { title: '', type: 'article' });
check('cmsSchema', 'Whitespace only title string', cmsSchema, { title: '   ', type: 'article' });

// 2. customerSchema
check('customerSchema', 'accepts_marketing boolean true', customerSchema, { accepts_marketing: true });
check('customerSchema', 'accepts_marketing boolean false', customerSchema, { accepts_marketing: false });
check('customerSchema', 'accepts_marketing number 1', customerSchema, { accepts_marketing: 1 });
check('customerSchema', 'accepts_marketing number 0', customerSchema, { accepts_marketing: 0 });
check('customerSchema', 'accepts_marketing string "true"', customerSchema, { accepts_marketing: 'true' });
check('customerSchema', 'accepts_marketing string "false"', customerSchema, { accepts_marketing: 'false' });
check('customerSchema', 'accepts_marketing string "1"', customerSchema, { accepts_marketing: '1' });
check('customerSchema', 'accepts_marketing invalid string "yes"', customerSchema, { accepts_marketing: 'yes' });
check('customerSchema', 'accepts_marketing null', customerSchema, { accepts_marketing: null });
check('customerSchema', 'Invalid Email format', customerSchema, { email: 'user@domain@com' });
check('customerSchema', 'Password too short (7 chars)', customerSchema, { password: '1234567' });

// 3. CheckoutSchema
check('CheckoutSchema', 'Valid full checkout', CheckoutSchema, {
  email: 'user@test.com',
  items: [{ variation_id: 'v1', quantity: 1 }],
  accepts_marketing: 1,
});
check('CheckoutSchema', 'accepts_marketing string "true"', CheckoutSchema, {
  items: [{ variation_id: 'v1', quantity: 1 }],
  accepts_marketing: 'true',
});
check('CheckoutSchema', 'Empty items array', CheckoutSchema, { items: [] });
check('CheckoutSchema', 'Item quantity 0', CheckoutSchema, { items: [{ variation_id: 'v1', quantity: 0 }] });
check('CheckoutSchema', 'Item quantity string "1"', CheckoutSchema, { items: [{ variation_id: 'v1', quantity: '1' }] });
check('CheckoutSchema', 'Item price in checkout item', CheckoutSchema, { items: [{ variation_id: 'v1', quantity: 1, price: 100 }] });
check('CheckoutSchema', 'redeem_points negative (-50)', CheckoutSchema, { items: [{ variation_id: 'v1', quantity: 1 }], redeem_points: -50 });
check('CheckoutSchema', 'redeem_points decimal (50.5)', CheckoutSchema, { items: [{ variation_id: 'v1', quantity: 1 }], redeem_points: 50.5 });
check('CheckoutSchema', 'invalid customer_id non-UUID', CheckoutSchema, { items: [{ variation_id: 'v1', quantity: 1 }], customer_id: '12345' });

// 4. ProductSchema & productFormSchema
check('ProductSchema', 'Valid Catalog Product', ProductSchema, {
  id: '123e4567-e89b-12d3-a456-426614174000',
  slug: 'p1',
  title: 'P1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});
check('ProductSchema', 'Invalid created_at format', ProductSchema, {
  id: '123e4567-e89b-12d3-a456-426614174000',
  slug: 'p1',
  title: 'P1',
  created_at: '2026-01-01 00:00:00',
  updated_at: '2026-01-01T00:00:00Z',
});
check('productFormSchema', 'SKU less than 3 chars', productFormSchema, { name: 'Item', sku: 'A' });

// 5. categorySchema
check('categorySchema', 'Valid category', categorySchema, { name: 'Category A' });
check('categorySchema', 'Missing name', categorySchema, { slug: 'cat-a' });
check('categorySchema', 'Empty string name', categorySchema, { name: '' });

// 6. CartSchema
check('CartSchema', 'Valid Cart', CartSchema, { items: [{ variation_id: 'v1', quantity: 2 }] });
check('CartSchema', 'Cart item negative quantity', CartSchema, { items: [{ variation_id: 'v1', quantity: -1 }] });
check('CartSchema', 'Cart item non-numeric price', CartSchema, { items: [{ variation_id: 'v1', quantity: 1, price: 'free' }] });

// 7. ReviewSchema & PostReviewSchema
check('PostReviewSchema', 'Valid rating 5', PostReviewSchema, { product_id: 'p1', rating: 5 });
check('PostReviewSchema', 'Rating 0 (below min 1)', PostReviewSchema, { product_id: 'p1', rating: 0 });
check('PostReviewSchema', 'Rating 6 (above max 5)', PostReviewSchema, { product_id: 'p1', rating: 6 });
check('PostReviewSchema', 'Rating 3.5 (non-integer)', PostReviewSchema, { product_id: 'p1', rating: 3.5 });
check('PostReviewSchema', 'Comment exceeding 2000 chars', PostReviewSchema, { product_id: 'p1', rating: 5, comment: 'a'.repeat(2001) });

// 8. CouponSchema & admin couponSchema
check('admin couponSchema', 'Valid coupon', couponSchema, { code: 'SAVE10', type: 'percent', value: 10 });
check('admin couponSchema', 'Code length < 4 chars ("SAV")', couponSchema, { code: 'SAV', type: 'percent', value: 10 });
check('admin couponSchema', 'Negative value (-10)', couponSchema, { code: 'SAVE10', type: 'percent', value: -10 });
check('admin couponSchema', 'is_active string "true"', couponSchema, { code: 'SAVE10', type: 'percent', value: 10, is_active: 'true' });

console.log('=== TEST RESULTS SUMMARY ===\n');
for (const r of results) {
  const status = r.passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] ${r.schemaName} :: ${r.testCaseName}`);
  if (!r.passed) {
    console.log('  Zod Issues:', JSON.stringify(r.zodIssues, null, 2));
  }
}
