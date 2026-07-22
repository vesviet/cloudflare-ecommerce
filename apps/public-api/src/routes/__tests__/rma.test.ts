import { describe, it, expect, vi, beforeEach } from 'vitest';
import rma from '../rma';
import { RmaService } from '@ecommerce/core-services';

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
  };
});

describe('Public API: RMA Route (POST /)', () => {
  const mockEnv = {
    DB: {} as any,
    STRIPE_SECRET_KEY: 'sk_test_mock',
  };

  const mockCtx = {
    waitUntil: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-RMA-API-01: POST / - Success 200 for Valid Payload', async () => {
    (RmaService.createReturnRequest as any).mockResolvedValue({
      returnId: 'rma_12345',
      status: 'approved',
    });

    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        customer_id: '123e4567-e89b-12d3-a456-426614174001',
        reason: 'Defective product received',
      }),
    });

    const res = await rma.fetch(req, mockEnv, mockCtx as any);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toEqual({
      success: true,
      rma_id: 'rma_12345',
      status: 'approved',
    });
    expect(RmaService.createReturnRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: '123e4567-e89b-12d3-a456-426614174000',
        customerId: '123e4567-e89b-12d3-a456-426614174001',
        reason: 'Defective product received',
        stripeSecretKey: 'sk_test_mock',
      })
    );
  });

  it('TC-RMA-API-02: POST / - Error 400 for Zod Validation Failure', async () => {
    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: 'not-a-uuid',
        customer_id: 'not-a-uuid',
        reason: 'bad',
      }),
    });

    const res = await rma.fetch(req, mockEnv, mockCtx as any);
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(RmaService.createReturnRequest).not.toHaveBeenCalled();
  });

  it('TC-RMA-API-03: POST / - Error 404 for Order Not Found / Access Denied', async () => {
    (RmaService.createReturnRequest as any).mockRejectedValue(
      new Error('Order not found or access denied')
    );

    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        customer_id: '123e4567-e89b-12d3-a456-426614174001',
        reason: 'Valid reason for missing order',
      }),
    });

    const res = await rma.fetch(req, mockEnv, mockCtx as any);
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

    const req = new Request('http://localhost/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        customer_id: '123e4567-e89b-12d3-a456-426614174001',
        reason: 'Duplicate return request test',
      }),
    });

    const res = await rma.fetch(req, mockEnv, mockCtx as any);
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body).toEqual({
      success: false,
      error: 'A return request already exists for this order',
    });
  });
});
