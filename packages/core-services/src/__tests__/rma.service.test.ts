import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RmaService } from '../rma.service';
import { OrderService } from '../order.service';
import * as localSchema from '../local-schema';
import Stripe from 'stripe';

const mockRetrieve = vi.fn();
const mockCreateRefund = vi.fn();

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          retrieve: mockRetrieve,
        },
      },
      refunds: {
        create: mockCreateRefund,
      },
    })),
  };
});

vi.mock('../order.service', () => ({
  OrderService: {
    refundOrderAndRestock: vi.fn().mockResolvedValue(true),
  },
}));

function createMockDrizzleDb(options: {
  order?: any;
  existingReturn?: any;
  customer?: any;
  returnReq?: any;
}) {
  const insertedReturns: any[] = [];
  const insertedRefunds: any[] = [];
  const updatedReturns: any[] = [];

  const mockDb: any = {
    select: vi.fn(() => ({
      from: vi.fn((table: any) => ({
        where: vi.fn((cond: any) => ({
          get: vi.fn(async () => {
            if (table === localSchema.orders) return options.order ?? null;
            if (table === localSchema.returns) {
              return options.returnReq ?? options.existingReturn ?? null;
            }
            if (table === localSchema.customers) return options.customer ?? null;
            return null;
          }),
          all: vi.fn(async () => []),
        })),
      })),
    })),
    insert: vi.fn((table: any) => ({
      values: vi.fn((vals: any) => {
        if (table === localSchema.returns) insertedReturns.push(vals);
        if (table === localSchema.refunds) insertedRefunds.push(vals);
        return {
          run: vi.fn().mockResolvedValue({ success: true }),
        };
      }),
    })),
    update: vi.fn((table: any) => ({
      set: vi.fn((vals: any) => ({
        where: vi.fn((_cond: any) => {
          if (table === localSchema.returns) updatedReturns.push(vals);
          return {
            run: vi.fn().mockResolvedValue({ success: true }),
          };
        }),
      })),
    })),
  };

  return { mockDb, insertedReturns, insertedRefunds, updatedReturns };
}

describe('RmaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRetrieve.mockResolvedValue({ payment_intent: 'pi_extracted_001' });
    mockCreateRefund.mockResolvedValue({ id: 're_999' });
  });

  describe('createReturnRequest', () => {
    it('TC-RMA-SVC-01: Manual Approval Flow (Order amount >= 500,000 threshold & non-VIP)', async () => {
      const order = {
        id: 'ord_1',
        customer_id: 'cust_1',
        status: 'completed',
        total_amount: 600000,
      };
      const customer = {
        id: 'cust_1',
        tags_json: JSON.stringify(['REGULAR']),
      };
      const { mockDb, insertedReturns } = createMockDrizzleDb({ order, customer });

      const result = await RmaService.createReturnRequest({
        drizzleDb: mockDb,
        rawD1Db: {},
        orderId: 'ord_1',
        customerId: 'cust_1',
        reason: 'Wrong size',
      });

      expect(result.returnId).toMatch(/^rma_/);
      expect(result.status).toBe('requested');
      expect(insertedReturns.length).toBe(1);
      expect(insertedReturns[0].status).toBe('requested');
      expect(mockCreateRefund).not.toHaveBeenCalled();
    });

    it('TC-RMA-SVC-02: Auto-Approval & Refund Flow (Order amount < 500,000 threshold)', async () => {
      const order = {
        id: 'ord_2',
        customer_id: 'cust_1',
        status: 'delivered',
        total_amount: 150000,
        payment_intent_id: 'pi_123',
      };
      const customer = { id: 'cust_1' };
      const { mockDb, insertedRefunds, updatedReturns } = createMockDrizzleDb({ order, customer });

      const result = await RmaService.createReturnRequest({
        drizzleDb: mockDb,
        rawD1Db: {},
        orderId: 'ord_2',
        customerId: 'cust_1',
        reason: 'Defective item',
        stripeSecretKey: 'sk_test_123',
      });

      expect(result.returnId).toMatch(/^rma_/);
      expect(result.status).toBe('approved');
      expect(mockCreateRefund).toHaveBeenCalledWith({ payment_intent: 'pi_123' });
      expect(insertedRefunds.length).toBe(1);
      expect(insertedRefunds[0].gateway_refund_id).toBe('re_999');
      expect(updatedReturns.some((u) => u.status === 'refunded')).toBe(true);
      expect(OrderService.refundOrderAndRestock).toHaveBeenCalledWith(mockDb, {}, 'ord_2', 'delivered');
    });

    it('TC-RMA-SVC-03: Auto-Approval Flow (VIP tag override on high amount)', async () => {
      const order = {
        id: 'ord_3',
        customer_id: 'cust_vip',
        status: 'completed',
        total_amount: 1000000,
      };
      const customer = {
        id: 'cust_vip',
        tags_json: JSON.stringify(['VIP']),
      };
      const { mockDb } = createMockDrizzleDb({ order, customer });

      const result = await RmaService.createReturnRequest({
        drizzleDb: mockDb,
        rawD1Db: {},
        orderId: 'ord_3',
        customerId: 'cust_vip',
        reason: 'VIP return',
      });

      expect(result.status).toBe('approved');
    });

    it('TC-RMA-SVC-04: Checkout Session Payment Intent Resolution (cs_...)', async () => {
      const order = {
        id: 'ord_4',
        customer_id: 'cust_1',
        status: 'completed',
        total_amount: 100000,
        payment_intent_id: 'cs_session_001',
      };
      const customer = { id: 'cust_1' };
      const { mockDb } = createMockDrizzleDb({ order, customer });

      await RmaService.createReturnRequest({
        drizzleDb: mockDb,
        rawD1Db: {},
        orderId: 'ord_4',
        customerId: 'cust_1',
        reason: 'Size exchange',
        stripeSecretKey: 'sk_test_123',
      });

      expect(mockRetrieve).toHaveBeenCalledWith('cs_session_001');
      expect(mockCreateRefund).toHaveBeenCalledWith({ payment_intent: 'pi_extracted_001' });
    });

    it('TC-RMA-SVC-05: Rejection on Non-Existent Order or Customer Mismatch', async () => {
      const { mockDb } = createMockDrizzleDb({ order: null });

      await expect(
        RmaService.createReturnRequest({
          drizzleDb: mockDb,
          rawD1Db: {},
          orderId: 'ord_missing',
          customerId: 'cust_1',
          reason: 'Test',
        })
      ).rejects.toThrow('Order not found or access denied');
    });

    it('TC-RMA-SVC-06: Rejection on Invalid Order Status (e.g. status = pending)', async () => {
      const order = {
        id: 'ord_pending',
        customer_id: 'cust_1',
        status: 'pending',
        total_amount: 100000,
      };
      const { mockDb } = createMockDrizzleDb({ order });

      await expect(
        RmaService.createReturnRequest({
          drizzleDb: mockDb,
          rawD1Db: {},
          orderId: 'ord_pending',
          customerId: 'cust_1',
          reason: 'Test',
        })
      ).rejects.toThrow('Can only request RMA for completed or delivered orders');
    });

    it('TC-RMA-SVC-07: Rejection on Duplicate Active Return Request', async () => {
      const order = {
        id: 'ord_dup',
        customer_id: 'cust_1',
        status: 'completed',
        total_amount: 100000,
      };
      const existingReturn = { id: 'rma_existing', status: 'requested' };
      const { mockDb } = createMockDrizzleDb({ order, existingReturn });

      await expect(
        RmaService.createReturnRequest({
          drizzleDb: mockDb,
          rawD1Db: {},
          orderId: 'ord_dup',
          customerId: 'cust_1',
          reason: 'Test',
        })
      ).rejects.toThrow('A return request already exists for this order');
    });
  });

  describe('processRMA', () => {
    it('TC-RMA-SVC-08: processRMA Admin Action reject', async () => {
      const returnReq = { id: 'rma_100', order_id: 'ord_1', status: 'requested' };
      const { mockDb, updatedReturns } = createMockDrizzleDb({ returnReq });

      const result = await RmaService.processRMA(mockDb, {}, 'rma_100', 'reject');

      expect(result).toEqual({ success: true, status: 'rejected' });
      expect(updatedReturns.some((u) => u.status === 'rejected')).toBe(true);
    });

    it('TC-RMA-SVC-09: processRMA Admin Action approve', async () => {
      const returnReq = { id: 'rma_101', order_id: 'ord_1', status: 'requested' };
      const order = { id: 'ord_1', total_amount: 200000, payment_intent_id: 'pi_101', status: 'completed' };
      const { mockDb, insertedRefunds, updatedReturns } = createMockDrizzleDb({ returnReq, order });

      mockCreateRefund.mockResolvedValueOnce({ id: 're_888' });

      const result = await RmaService.processRMA(mockDb, {}, 'rma_101', 'approve', 'sk_test_123');

      expect(result).toEqual({ success: true, status: 'refunded' });
      expect(mockCreateRefund).toHaveBeenCalledWith({ payment_intent: 'pi_101' });
      expect(insertedRefunds.length).toBe(1);
      expect(insertedRefunds[0].gateway_refund_id).toBe('re_888');
      expect(updatedReturns.some((u) => u.status === 'refunded')).toBe(true);
      expect(OrderService.refundOrderAndRestock).toHaveBeenCalledWith(mockDb, {}, 'ord_1', 'completed');
    });

    it('TC-RMA-SVC-10: processRMA Error on Already Processed Return', async () => {
      const returnReq = { id: 'rma_proc', status: 'approved' };
      const { mockDb } = createMockDrizzleDb({ returnReq });

      await expect(
        RmaService.processRMA(mockDb, {}, 'rma_proc', 'approve')
      ).rejects.toThrow('Invalid return request or already processed');
    });
  });
});
