import React from 'react';
import type { ProductData, ProductVariation } from '../../../types';
import { DynamicAttributeBuilder } from '../DynamicAttributeBuilder';
import { SkuAutocomplete } from '../SkuAutocomplete';

interface ProductVariationsConfigProps {
  productType: ProductData['type'];
  productVariations: ProductVariation[];
  API_BASE_URL: string;
  onAddVariation: () => void;
  onVariationChange: (index: number, field: keyof ProductVariation, value: any) => void;
  onRemoveVariation: (index: number) => void;
}

export const ProductVariationsConfig: React.FC<ProductVariationsConfigProps> = ({
  productType, productVariations, API_BASE_URL,
  onAddVariation, onVariationChange, onRemoveVariation
}) => {
  if (productType !== 'configurable') return null;

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Variations</h3>
        <button type="button" onClick={onAddVariation} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>+ Add Row</button>
      </div>
      
      {productVariations.length === 0 ? (
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No variations added yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {productVariations.map((v, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'start', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
              <DynamicAttributeBuilder 
                attributes={v.attributes || {}} 
                onChange={attrs => onVariationChange(idx, 'attributes', attrs)} 
              />
              <SkuAutocomplete
                value={v.sku}
                onChange={val => onVariationChange(idx, 'sku', val)}
                API_BASE_URL={API_BASE_URL}
                onSelect={item => {
                  onVariationChange(idx, 'id', item.id);
                  onVariationChange(idx, 'sku', item.sku);
                  onVariationChange(idx, 'regular_price', (item.regular_price / 100).toString());
                  onVariationChange(idx, 'sale_price', item.sale_price ? (item.sale_price / 100).toString() : '');
                  onVariationChange(idx, 'stock', item.stock.toString());
                }}
              />
              <input type="number" placeholder="Price" className="input-control" style={{ padding: '8px 10px', fontSize: '13px' }} value={v.regular_price} onChange={e => onVariationChange(idx, 'regular_price', e.target.value)} required />
              <input type="number" placeholder="Sale" className="input-control" style={{ padding: '8px 10px', fontSize: '13px' }} value={v.sale_price || ''} onChange={e => onVariationChange(idx, 'sale_price', e.target.value)} />
              <input type="number" placeholder="Stock" className="input-control" style={{ padding: '8px 10px', fontSize: '13px' }} value={v.stock} onChange={e => onVariationChange(idx, 'stock', e.target.value)} required />
              <button type="button" onClick={() => onRemoveVariation(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
