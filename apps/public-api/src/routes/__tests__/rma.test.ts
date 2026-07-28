import { describe, it, expect, vi, beforeEach } from 'vitest';
import rma from '../rma';
import { RmaService } from '@ecommerce/core-services';

const { mockVerifyJWT } = vi.hoisted(() => ({
  mockVerifyJWT: vi.fn(),
}));

vi.mock('@ecommerce/core-services', async () => {
  return {
    RmaService: {
      createReturnRequest: vi.fn(),
    },
  };
});

vi.mock('@ecommerce/database', () => {
  return {
    createDb: vi.fn().mockReturnValue({}),
    verifyJWT: mockVerifyJWT,
  };
});

const CUSTOMER_ID = '123e4567-e89b-12d3-a456-426614174001';
const ORDER_ID = '123e4567-e89b-12d3-a456-426614174000';

describe('Public API: RMA Route (POST /)', () => {
  const mockEnv = {
    DB: {} as any,
    STRIPE_SECRET_KEY: 'sk_test_mock',
    JWT_SECRET: 'test_secret',
  };

  const mockCtx = {
    waitUntil: vi.fn(),
  };

  const authedPost = (body: any) =>
    new Request('http://localhost/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'aura_token=valid_token',
      },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyJWT.mockResolvedValue({ customer_id: CUSTOMER_ID });
  });

  it('TC-RMA-API-01: POST / - Success 200 for Valid Payload', async () => {
    (RmaService.createReturnRequest as any).mockResolvedValue({
      returnId: 'rma_12345',
      status: 'approved',
    });

    const res = await rma.fetch(
      authedPost({ order_id: ORDER_ID, reason: 'Defective product received' }),
      mockEnv,
      mockCtx as any
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toEqual({
      success: true,
      rma_id: 'rma_12345',
      status: 'approved',
    });
    expect(RmaService.createReturnRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: ORDER_ID,
        customerId: CUSTOMER_ID,
        reason: 'Defective product received',
        stripeSecretKey: 'sk_test_mock',
      })
    );
  });

  it('TC-RMA-API-01b: POST / - Rejects Unauthenticated Request', async () => {
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: ORDER_ID, reason: 'No session at all' }),
    });

    const res = await rma.fetch(req, mockEnv, mockCtx as any);

    expect(res.status).toBe(401);
    expect(RmaService.createReturnRequest).not.toHaveBeenCalled();
  });

  it('TC-RMA-API-01c: POST / - Ignores customer_id Supplied In Body', async () => {
    (RmaService.createReturnRequest as any).mockResolvedValue({
      returnId: 'rma_12345',
      status: 'requested',
    });

    const res = await rma.fetch(
      authedPost({
        order_id: ORDER_ID,
        reason: 'Trying to act as another customer',
        customer_id: 'aaaaaaaa-e89b-12d3-a456-426614174999',
      }),
      mockEnv,
      mockCtx as any
    );

    expect(res.status).toBe(200);
    expect(RmaService.createReturnRequest).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: CUSTOMER_ID })
    );
  });

  it('TC-RMA-API-02: POST / - Error 400 for Zod Validation Failure', async () => {
    const res = await rma.fetch(
      authedPost({ order_id: 'not-a-uuid', reason: 'bad' }),
      mockEnv,
      mockCtx as any
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(RmaService.createReturnRequest).not.toHaveBeenCalled();
  });

  it('TC-RMA-API-03: POST / - Error 404 for Order Not Found / Access Denied', async () => {
    (RmaService.createReturnRequest as any).mockRejectedValue(
      new Error('Order not found or access denied')
    );

    const res = await rma.fetch(
      authedPost({ order_id: ORDER_ID, reason: 'Valid reason for missing order' }),
      mockEnv,
      mockCtx as any
    );

    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body).toEqual({
      success: false,
      error: 'Order not found or access denied',
    });
  });

  it('TC-RMA-API-04: POST / - Error 400 for Business Logic Error (Duplicate Return)', async () => {
    (RmaService.createReturnRequest as any).mockRejectedValue(
      new Error('A return request already exists for this order')
    );

    const res = await rma.fetch(
      authedPost({ order_id: ORDER_ID, reason: 'Duplicate return request test' }),
      mockEnv,
      mockCtx as any
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body).toEqual({
      success: false,
      error: 'A return request already exists for this order',
    });
  });
});
