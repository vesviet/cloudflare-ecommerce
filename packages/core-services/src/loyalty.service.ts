import { and, eq, sql } from 'drizzle-orm';
import * as localSchema from './local-schema';

export class LoyaltyService {
  /**
   * Applies a signed points delta with the balance guard evaluated by the database.
   * Reading the balance and writing back an absolute value would let two concurrent
   * redemptions both pass the check and spend the same points twice.
   */
  static async updateCustomerPoints(db: any, customerId: string, pointsDiff: number): Promise<void> {
    const result = await db.update(localSchema.customers)
      .set({
        loyalty_points_balance: sql`COALESCE(loyalty_points_balance, 0) + ${pointsDiff}`,
        updated_at: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(
        eq(localSchema.customers.id, customerId),
        sql`COALESCE(loyalty_points_balance, 0) + ${pointsDiff} >= 0`,
      ))
      .run();

    const changes = result?.meta?.changes ?? result?.changes ?? 0;
    if (changes !== 0) {
      return;
    }

    const customer = await db.select({ id: localSchema.customers.id })
      .from(localSchema.customers)
      .where(eq(localSchema.customers.id, customerId))
      .get();

    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    throw new Error('Insufficient Loyalty Points');
  }

  /**
   * Lock (redeem) points during Phase 0 checkout.
   */
  static async redeemPoints(db: any, customer_id: string, order_id: string, points: number): Promise<void> {
    if (points <= 0) return;

    try {
      await this.updateCustomerPoints(db, customer_id, -points);

      await db.insert(localSchema.loyaltyLedgers).values({
        id: crypto.randomUUID(),
        customer_id,
        transaction_type: 'redeemed',
        points: -points, // Negative for redemption
        order_id,
        description: `Redeemed for order ${order_id}`,
      }).run();
    } catch (err: any) {
      if (err.message && err.message.includes('Insufficient Loyalty Points')) {
        throw new Error('Insufficient Loyalty Points');
      }
      throw err;
    }
  }

  /**
   * Earn points after a successful payment (e.g. 1% of total_amount)
   * Called by Stripe Webhook.
   */
  static async earnPoints(db: any, customer_id: string, order_id: string, total_amount_cents: number): Promise<void> {
    // 1 point per 100 VND spent (1% cashback essentially)
    const pointsToEarn = Math.floor(total_amount_cents / 100);
    if (pointsToEarn <= 0) return;

    await this.updateCustomerPoints(db, customer_id, pointsToEarn);

    await db.insert(localSchema.loyaltyLedgers).values({
      id: crypto.randomUUID(),
      customer_id,
      transaction_type: 'earned',
      points: pointsToEarn,
      order_id,
      description: `Earned from order ${order_id}`,
    }).run();
  }

  /**
   * Refund points if order is cancelled or payment fails.
   */
  static async refundPoints(db: any, customer_id: string, order_id: string, pointsToRefund: number): Promise<void> {
    if (pointsToRefund <= 0) return;

    await this.updateCustomerPoints(db, customer_id, pointsToRefund);

    await db.insert(localSchema.loyaltyLedgers).values({
      id: crypto.randomUUID(),
      customer_id,
      transaction_type: 'adjusted',
      points: pointsToRefund, // Positive to give back
      order_id,
      description: `Refunded points for cancelled order ${order_id}`,
    }).run();
  }
}
