import React from 'react';
import type { ProductData } from '../../../types';

interface ProductSimpleDetailsProps {
  productType: ProductData['type'];
  productRegularPrice: string;
  productSalePrice: string;
  productStock: string;
  productWeight: string;
  productLength: string;
  productWidth: string;
  productHeight: string;
  onChangeProductRegularPrice: (value: string) => void;
  onChangeProductSalePrice: (value: string) => void;
  onChangeProductStock: (value: string) => void;
  onChangeProductWeight: (value: string) => void;
  onChangeProductLength: (value: string) => void;
  onChangeProductWidth: (value: string) => void;
  onChangeProductHeight: (value: string) => void;
}

export const ProductSimpleDetails: React.FC<ProductSimpleDetailsProps> = ({
  productType, productRegularPrice, productSalePrice, productStock,
  productWeight, productLength, productWidth, productHeight,
  onChangeProductRegularPrice, onChangeProductSalePrice, onChangeProductStock,
  onChangeProductWeight, onChangeProductLength, onChangeProductWidth, onChangeProductHeight
}) => {
  if (productType === 'configurable') return null;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
        <div className="form-group">
          <label>Regular Price ($) *</label>
          <input type="number" step="0.01" className="input-control" value={productRegularPrice} onChange={e => onChangeProductRegularPrice(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Sale Price ($)</label>
          <input type="number" step="0.01" className="input-control" value={productSalePrice} onChange={e => onChangeProductSalePrice(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Stock Quantity *</label>
          <input type="number" className="input-control" value={productStock} onChange={e => onChangeProductStock(e.target.value)} required />
        </div>
      </div>

      {productType === 'simple' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '24px', marginTop: '16px' }}>
          <div className="form-group">
            <label>Weight (kg)</label>
            <input type="number" step="0.01" className="input-control" value={productWeight} onChange={e => onChangeProductWeight(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Length (cm)</label>
            <input type="number" step="0.01" className="input-control" value={productLength} onChange={e => onChangeProductLength(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Width (cm)</label>
            <input type="number" step="0.01" className="input-control" value={productWidth} onChange={e => onChangeProductWidth(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Height (cm)</label>
            <input type="number" step="0.01" className="input-control" value={productHeight} onChange={e => onChangeProductHeight(e.target.value)} />
          </div>
        </div>
      )}
    </>
  );
};
