import { Hono } from 'hono';
import { createDb } from '@ecommerce/database';
import { localSchema } from '@ecommerce/core-services';
import { rateLimit, requireCustomer, type RateLimiter } from '@ecommerce/shared-routes';
import { eq, desc, and, or, inArray, sql } from 'drizzle-orm';
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

// GET reviews for a product (Phase 5 REV-02: dedicated product_reviews table)
reviews.get('/:product_id', async (c) => {
  try {
    const product_id = c.req.param('product_id');
    const db = createDb(c.env.DB);

    const rows = await db
      .select({
        id: localSchema.productReviews.id,
        product_id: localSchema.productReviews.product_id,
        customer_id: localSchema.productReviews.customer_id,
        rating: localSchema.productReviews.rating,
        comment: localSchema.productReviews.comment,
        status: localSchema.productReviews.status,
        verified_purchase: localSchema.productReviews.verified_purchase,
        helpful_count: localSchema.productReviews.helpful_count,
        seller_response: localSchema.productReviews.seller_response,
        created_at: localSchema.productReviews.created_at,
        reviewer_first_name: localSchema.customers.first_name,
        reviewer_last_name: localSchema.customers.last_name,
      })
      .from(localSchema.productReviews)
      .leftJoin(localSchema.customers, eq(localSchema.productReviews.customer_id, localSchema.customers.id))
      .where(and(
        eq(localSchema.productReviews.product_id, product_id),
        eq(localSchema.productReviews.status, 'approved')
      ))
      .orderBy(desc(localSchema.productReviews.created_at))
      .all();

    const aggRow = await db.select({
      count: sql`count(*)`,
      average: sql`coalesce(avg(rating), 0)`,
    })
      .from(localSchema.productReviews)
      .where(and(
        eq(localSchema.productReviews.product_id, product_id),
        eq(localSchema.productReviews.status, 'approved')
      ))
      .get();

    const distributionRows = await db.select({
      rating: localSchema.productReviews.rating,
      count: sql`count(*)`,
    })
      .from(localSchema.productReviews)
      .where(and(
        eq(localSchema.productReviews.product_id, product_id),
        eq(localSchema.productReviews.status, 'approved')
      ))
      .groupBy(localSchema.productReviews.rating)
      .all();

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of distributionRows) distribution[Number(d.rating)] = Number(d.count);

    return c.json({
      success: true,
      data: rows,
      summary: {
        count: Number(aggRow?.count || 0),
        average_rating: Math.round(Number(aggRow?.average || 0) * 10) / 10,
        distribution,
      },
    });
  } catch (err: any) {
    console.error('Get reviews error:', err);
    console.error('[public-api] reviews error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
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
    const reviewId = crypto.randomUUID();

    await db.insert(localSchema.productReviews).values({
      id: reviewId,
      product_id,
      customer_id: customerId,
      rating,
      comment: comment || null,
      status,
      verified_purchase: verifiedPurchase ? 1 : 0,
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
    console.error('[public-api] reviews error:', err);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default reviews;
