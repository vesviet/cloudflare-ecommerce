import { describe, it, expect } from 'vitest';
import { fulfillSchema } from '../index';

describe('Contract: Order Schema', () => {
  it('validates a correct fulfillment payload', () => {
    const validData = {
      tracking_number: '1Z9999999999999999',
      carrier_name: 'UPS',
      tracking_url: 'https://www.ups.com/track?loc=en_US&tracknum=1Z9999999999999999',
      items: [
        {
          order_item_id: 'item_1',
          quantity: 2
        }
      ]
    };

    const result = fulfillSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('allows items to be undefined for full fulfillment', () => {
    const validData = {
      tracking_number: '123',
      carrier_name: 'UPS'
    };

    const result = fulfillSchema.safeParse(validData);
    if (!result.success) console.log('ORDER_ERR:', result.error.flatten());
    expect(result.success).toBe(true);
  });

  it('rejects missing tracking_number', () => {
    const invalidData = {
      carrier_name: 'UPS'
    };

    const result = fulfillSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
