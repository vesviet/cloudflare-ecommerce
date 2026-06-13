import { inArray, sql } from 'drizzle-orm';
import { schema } from '@ecommerce/database';

export const validateAndReserveInventory = async (db: any, items: { variation_id: string; quantity: number }[]) => {
  const validItems: { variation_id: string; quantity: number; price: number; name: string }[] = [];
  const variationIds = items.map((i) => i.variation_id);
  
  const variations = await db
    .select()
    .from(schema.products)
    .where(inArray(schema.products.id, variationIds))
    .all();

  const now = Math.floor(Date.now() / 1000);
  const allReservations = await db
    .select()
    .from(schema.inventoryReservations)
    .where(sql`product_id IN (${sql.join(variationIds, sql`, `)}) AND expires_at > ${now}`)
    .all();

  const reservationMap = new Map<string, number>();
  for (const res of allReservations) {
    reservationMap.set(res.product_id, (reservationMap.get(res.product_id) || 0) + res.quantity);
  }

  const parentIds = variations.map((v: any) => v.parent_id).filter((id: string | null) => id !== null) as string[];
  let productMap = new Map<string, string>();
  if (parentIds.length > 0) {
    const products = await db
      .select({ id: schema.products.id, title: schema.products.title })
      .from(schema.products)
      .where(inArray(schema.products.id, parentIds))
      .all();
    productMap = new Map(products.map((p: any) => [p.id, p.title]));
  }

  let subTotal = 0; // cents

  for (const item of items) {
    const variation = variations.find((v: any) => v.id === item.variation_id);

    if (!variation || variation.is_purchasable === 0) {
      throw new Error(`Product variation ${item.variation_id} is invalid or unavailable`);
    }

    const reservedQuantity = reservationMap.get(item.variation_id) || 0;
    const availableStock = variation.stock_quantity - reservedQuantity;

    if (availableStock < item.quantity) {
      throw new Error(`Product variation ${item.variation_id} is out of stock (Available: ${availableStock})`);
    }

    const price = variation.sale_price ?? variation.regular_price;
    subTotal += price * item.quantity;

    validItems.push({
      variation_id: item.variation_id,
      quantity: item.quantity,
      price,
      name: variation.parent_id ? (productMap.get(variation.parent_id) ?? `Product ${item.variation_id.slice(0, 8)}`) : variation.title,
    });
  }

  return { validItems, subTotal };
};
