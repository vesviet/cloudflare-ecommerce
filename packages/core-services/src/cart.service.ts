import { and, eq, sql } from 'drizzle-orm';
import { schema } from '@ecommerce/database';
import { D1Database } from '@cloudflare/workers-types';

export class CartService {
  /**
   * Syncs the cart from the client to the database.
   */
  static async syncCart(
    drizzleDb: any, 
    items: Array<{ productId: string, quantity: number }>, 
    customerId?: string, 
    guestSessionId?: string
  ) {
    if (!customerId && !guestSessionId) {
      throw new Error('Must provide either customerId or guestSessionId to sync cart');
    }

    // Find existing cart
    let cart: any = null;
    if (customerId) {
      cart = await drizzleDb.select().from(schema.carts)
        .where(eq(schema.carts.customer_id, customerId)).get();
    } else if (guestSessionId) {
      cart = await drizzleDb.select().from(schema.carts)
        .where(eq(schema.carts.guest_session_id, guestSessionId)).get();
    }

    const now = Math.floor(Date.now() / 1000);

    // If no cart, create one
    if (!cart) {
      const newCart = {
        id: `cart_${crypto.randomUUID()}`,
        customer_id: customerId || null,
        guest_session_id: guestSessionId || null,
        status: 'active',
        last_active_at: now,
      };
      await drizzleDb.insert(schema.carts).values(newCart).run();
      cart = newCart;
    } else {
      // Update last active
      await drizzleDb.update(schema.carts)
        .set({ last_active_at: now, updated_at: sql`CURRENT_TIMESTAMP`, abandoned_email_sent_at: null })
        .where(eq(schema.carts.id, cart.id)).run();
    }

    // Replace items
    await drizzleDb.delete(schema.cartItems).where(eq(schema.cartItems.cart_id, cart.id)).run();

    if (items.length > 0) {
      const newItems = items.map(item => ({
        id: `ci_${crypto.randomUUID()}`,
        cart_id: cart.id,
        product_id: item.productId,
        quantity: item.quantity,
      }));
      await drizzleDb.insert(schema.cartItems).values(newItems).run();
    }

    return { success: true, cartId: cart.id };
  }
}
