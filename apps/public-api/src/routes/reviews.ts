import { Hono } from 'hono';
import { createDb } from '@ecommerce/database';
import { localSchema } from '@ecommerce/core-services';
import { eq, desc, and } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const reviews = new Hono<{ Bindings: { DB: D1Database } }>();

const PostReviewSchema = z.object({
  product_id: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  customer_id: z.string().optional(),
});

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
      
    const mappedReviews = data.map((r) => {
      let metadata: any = {};
      if (r.metadata_json) {
        try {
          metadata = JSON.parse(r.metadata_json);
        } catch {}
      }
      return {
        id: r.id,
        product_id: r.placement || "",
        customer_id: metadata.customer_id || null,
        rating: metadata.rating || 5,
        comment: metadata.comment || "",
        status: metadata.status || 'approved',
        verified_purchase: metadata.verified_purchase !== undefined ? metadata.verified_purchase : 1,
        created_at: r.created_at,
      };
    });

    // Filter to only approved reviews, but if using auto-approve, all might be 'approved'
    const approvedReviews = mappedReviews.filter((r) => r.status === 'approved' || r.status === 'pending');

    return c.json({ success: true, data: approvedReviews });
  } catch (err: any) {
    console.error('Get reviews error:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

// POST a new review
reviews.post('/', zValidator('json', PostReviewSchema), async (c) => {
  try {
    const { product_id, rating, comment, customer_id } = c.req.valid('json');
    const db = createDb(c.env.DB);
    
    const reviewId = `rev_${crypto.randomUUID()}`;

    await db.insert(localSchema.cmsEntries).values({
      id: reviewId,
      slug: `review-${reviewId}`,
      title: `Product Review for ${product_id}`,
      type: 'review',
      status: 'published',
      placement: product_id,
      metadata_json: JSON.stringify({
        customer_id: customer_id || null,
        rating,
        comment: comment || "",
        status: 'approved',
        verified_purchase: 1,
      }),
    }).run();

    const createdReview = {
      id: reviewId,
      product_id,
      customer_id: customer_id || null,
      rating,
      comment: comment || "",
      status: 'approved',
      verified_purchase: 1,
      created_at: new Date().toISOString(),
    };

    return c.json({ success: true, data: createdReview });
  } catch (err: any) {
    console.error('Post review error:', err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default reviews;
