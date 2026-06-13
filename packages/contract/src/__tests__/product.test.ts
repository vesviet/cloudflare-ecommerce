import { describe, it, expect } from 'vitest';
import { productFormSchema } from '../index';

describe('Contract: Product Schema', () => {
  it('validates a correct simple product', () => {
    const validData = {
      name: 'Test Product',
      sku: 'TEST-01',
      type: 'simple',
      regular_price: '1000',
      stock_quantity: '10',
      status: 'active',
      is_purchasable: 1,
      primary_category_id: 'cat_1',
      variations: '[]',
      images: ['mock-file']
    };

    const result = productFormSchema.safeParse(validData);
    if (!result.success) console.log('SIMPLE_ERR:', result.error.flatten());
    expect(result.success).toBe(true);
  });

  it('validates a correct variable product', () => {
    const validData = {
      name: 'Variable Product',
      sku: 'VAR-01',
      type: 'configurable',
      status: 'active',
      is_purchasable: 1,
      primary_category_id: 'cat_1',
      variations: '[{"sku":"V1","price":1000,"stock":5,"attributes":{"color":"red"}}]',
      images: ['mock-file']
    };

    const result = productFormSchema.safeParse(validData);
    if (!result.success) console.log('VAR_ERR:', result.error.flatten());
    expect(result.success).toBe(true);
  });

  it('rejects when missing required fields (sku, name)', () => {
    const invalidData = {
      type: 'simple',
      regular_price: 1000
    };

    const result = productFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.name).toBeDefined();
      expect(fieldErrors.sku).toBeDefined();
    }
  });

});
