import { Hono } from 'hono';
import { createDb } from '@ecommerce/database';
import { localSchema } from '@ecommerce/core-services';
import { rateLimit, requireCustomer, type RateLimiter } from '@ecommerce/shared-routes';
import { eq, desc, and, or, inArray } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { PostReviewSchema } from '@ecommerce/contract';

type Bindings = {
  DB: D1Database;
  JWT_SECRET?: string;
  REVIEW_RATE_LIMITER?: RateLimiter;
};

type Variables = {
  customerId: string;
};

type Env = { Bindings: Bindings; Variables: Variables };

// Only orders that are actually paid for count as a verified purchase.
const PAID_ORDER_STATUSES = ['processing', 'shipped', 'completed'];

const reviews = new Hono<Env>();

const customerAuth = requireCustomer({ message: 'Unauthorized: Sign in to post a review' });

/**
 * Checks whether the customer has a paid order containing the product,
 * matching either the product itself or one of its variations.
 */
const hasPurchasedProduct = async (db: any, customerId: string, productId: string): Promise<boolean> => {
  const purchase = await db
    .select({ id: localSchema.orderItems.id })
    .from(localSchema.orderItems)
    .innerJoin(localSchema.orders, eq(localSchema.orderItems.order_id, localSchema.orders.id))
    .leftJoin(localSchema.products, eq(localSchema.orderItems.product_id, localSchema.products.id))
    .where(
      and(
        eq(localSchema.orders.customer_id, customerId),
        inArray(localSchema.orders.status, PAID_ORDER_STATUSES),
        or(
          eq(localSchema.orderItems.product_id, productId),
          eq(localSchema.products.parent_id, productId)
        )
      )
    )
    .get();

  return !!purchase;
};

// GET reviews for a product
reviews.get('/:product_id', async (c) => {
  try {
    const product_id = c.req.param('product_id');
    const db = createDb(c.env.DB);

    const data = await db
      .select()
      .from(localSchema.cmsEntries)
      .where(
        and(
          eq(localSchema.cmsEntries.type, 'review'),
          eq(localSchema.cmsEntries.placement, product_id)
        )
      )
      .orderBy(desc(localSchema.cmsEntries.created_at))
      .all();

    const publishedReviews = [];
    for (const r of data) {
      let metadata: any = null;
      if (r.metadata_json) {
        try {
          metadata = JSON.parse(r.metadata_json);
        } catch {
          metadata = null;
        }
      }

      // Skip entries we cannot trust rather than inventing a rating or an approval state.
      const rating = metadata?.rating;
      if (!metadata || typeof rating !== 'number' || rating < 1 || rating > 5) {
        console.warn(`[Reviews] Skipping review ${r.id}: missing or invalid metadata`);
        continue;
      }

      if (metadata.status !== 'approved') {
        continue;
      }

      publishedReviews.push({
        id: r.id,
        product_id: r.placement || '',
        customer_id: metadata.customer_id || null,
        rating,
        comment: metadata.comment || '',
        status: 'approved',
        verified_purchase: metadata.verified_purchase === 1 ? 1 : 0,
        created_at: r.created_at,
      });
    }

    return c.json({ success: true, data: publishedReviews });
  } catch (err: any) {
    console.error('Get reviews error:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

const limitReviews = rateLimit({
  binding: 'REVIEW_RATE_LIMITER',
  scope: 'review-post',
  key: (c) => c.get('customerId'),
  message: 'Too many reviews submitted. Please try again later.',
});

// POST a new review
reviews.post('/', customerAuth, limitReviews, zValidator('json', PostReviewSchema), async (c) => {
  try {
    const { product_id, rating, comment } = c.req.valid('json');
    const customerId = c.get('customerId');
    const db = createDb(c.env.DB);

    const verifiedPurchase = await hasPurchasedProduct(db, customerId, product_id);

    // Verified buyers publish immediately; everyone else waits for moderation.
    const status = verifiedPurchase ? 'approved' : 'pending';
    const reviewId = `rev_${crypto.randomUUID()}`;

    await db.insert(localSchema.cmsEntries).values({
      id: reviewId,
      slug: `review-${reviewId}`,
      title: `Product Review for ${product_id}`,
      type: 'review',
      status: 'published',
      placement: product_id,
      metadata_json: JSON.stringify({
        customer_id: customerId,
        rating,
        comment: comment || '',
        status,
        verified_purchase: verifiedPurchase ? 1 : 0,
      }),
    }).run();

    const createdReview = {
      id: reviewId,
      product_id,
      customer_id: customerId,
      rating,
      comment: comment || '',
      status,
      verified_purchase: verifiedPurchase ? 1 : 0,
      created_at: new Date().toISOString(),
    };

    return c.json({ success: true, data: createdReview });
  } catch (err: any) {
    console.error('Post review error:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default reviews;
