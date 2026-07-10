import { eq, sql } from 'drizzle-orm';
import * as localSchema from './local-schema';

export class FulfillmentService {
  static async createFulfillment(drizzleDb: any, orderId: string, items: { orderItemId: string, quantity: number }[], trackingNumber?: string, carrier?: string) {
    const id = `ful_${crypto.randomUUID()}`;
    await drizzleDb.insert(localSchema.shipments).values({
      id,
      order_id: orderId,
      status: 'processing',
      tracking_number: trackingNumber || null,
      carrier_name: carrier || null,
    }).run();

    if (items && items.length > 0) {
      const itemsToInsert = items.map(item => ({
        id: `fuli_${crypto.randomUUID()}`,
        shipment_id: id,
        order_item_id: item.orderItemId,
        quantity: item.quantity,
      }));
      await drizzleDb.insert(localSchema.shipmentItems).values(itemsToInsert).run();
    }

    return id;
  }

  static async updateStatus(drizzleDb: any, shipmentId: string, status: string) {
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid fulfillment status: ${status}`);
    }

    const updates: any = {
      status,
      updated_at: sql`CURRENT_TIMESTAMP`,
    };

    if (status === 'shipped') {
      updates.shipped_at = new Date().toISOString();
    } else if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
    }

    await drizzleDb.update(localSchema.shipments)
      .set(updates)
      .where(eq(localSchema.shipments.id, shipmentId))
      .run();

    return true;
  }
}
