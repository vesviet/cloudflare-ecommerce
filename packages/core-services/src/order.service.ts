import { OrderRepository } from './order.repository';
import { InventoryRepository } from './inventory.repository';

export class OrderService {
  /**
   * Two-Phase Commit Orchestrator for processing a new checkout.
   */
  static async processCheckout(drizzleDb: any, rawD1Db: any, orderData: {
    orderId: string;
    customerId?: string;
    email?: string;
    totalAmount: number;
    shippingFeeCents: number;
    affiliateId?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    shippingAddressJson?: any;
    billingAddressJson?: any;
    validItems: any[];
    discountAmount: number;
    appliedCouponId?: string | null;
  }): Promise<{ success: boolean; message?: string }> {
    // Phase 1: Create Order in 'pending_payment'
    await OrderRepository.createOrder(drizzleDb, orderData);

    // Phase 2: Atomic Inventory Deduction
    const itemsToDeduct = orderData.validItems.map(i => ({ productId: i.variation_id, quantity: i.quantity }));
    const deductionSuccess = await InventoryRepository.deductStock(rawD1Db, itemsToDeduct);

    if (!deductionSuccess) {
      // Phase 3 (Rollback): Mark Order as Failed
      await OrderRepository.updateOrderStatus(drizzleDb, orderData.orderId, 'pending_payment', 'failed');
      throw new Error('Out of stock or inventory lock failed');
    }

    return { success: true };
  }

  /**
   * Cancels an unpaid order and restocks inventory via Optimistic Lock.
   */
  static async cancelOrderAndRestock(drizzleDb: any, rawD1Db: any, orderId: string): Promise<boolean> {
    // Try to acquire lock and transition state
    const lockedAndUpdated = await OrderRepository.updateOrderStatus(drizzleDb, orderId, 'pending_payment', 'cancelled');
    
    if (lockedAndUpdated) {
      // Fetch items and restock
      const items = await OrderRepository.getOrderItems(drizzleDb, orderId);
      const itemsToRestock = items.map(i => ({ productId: i.product_id, quantity: i.quantity }));
      await InventoryRepository.restock(rawD1Db, itemsToRestock);
      return true;
    }

    return false; // Already processing/shipped/cancelled
  }

  /**
   * Marks a processing/completed order as refunded and restocks inventory.
   */
  static async refundOrderAndRestock(drizzleDb: any, rawD1Db: any, orderId: string, oldStatus: string): Promise<boolean> {
    const lockedAndUpdated = await OrderRepository.updateOrderStatus(drizzleDb, orderId, oldStatus, 'refunded');
    
    if (lockedAndUpdated) {
      const items = await OrderRepository.getOrderItems(drizzleDb, orderId);
      const itemsToRestock = items.map(i => ({ productId: i.product_id, quantity: i.quantity }));
      await InventoryRepository.restock(rawD1Db, itemsToRestock);
      return true;
    }

    return false;
  }

  /**
   * Marks a pending order as processing after successful payment via Optimistic Lock.
   */
  static async processPaymentSuccess(drizzleDb: any, orderId: string): Promise<boolean> {
    return OrderRepository.updateOrderStatus(drizzleDb, orderId, 'pending_payment', 'processing');
  }

  /**
   * Marks a shipped order as completed after Carrier webhook.
   */
  static async completeOrder(drizzleDb: any, orderId: string): Promise<boolean> {
    return OrderRepository.updateOrderStatus(drizzleDb, orderId, 'shipped', 'completed');
  }
}
