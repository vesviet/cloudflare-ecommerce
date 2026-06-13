import React from 'react';
import type { CategoryData, ProductData } from '../../../types';

interface ProductBasicInfoProps {
  productName: string;
  productSku: string;
  productType: ProductData['type'];
  productPrimaryCategory: string;
  productSecondaryCategories: string[];
  categories: CategoryData[];
  onChangeProductName: (value: string) => void;
  onChangeProductSku: (value: string) => void;
  onChangeProductType: (value: ProductData['type']) => void;
  onChangeProductPrimaryCategory: (value: string) => void;
  onChangeProductSecondaryCategories: (value: string[]) => void;
  onSkuEdited: () => void;
}

export const ProductBasicInfo: React.FC<ProductBasicInfoProps> = ({
  productName, productSku, productType, productPrimaryCategory, productSecondaryCategories, categories,
  onChangeProductName, onChangeProductSku, onChangeProductType, onChangeProductPrimaryCategory, onChangeProductSecondaryCategories, onSkuEdited
}) => {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="form-group">
          <label>Product Name *</label>
          <input type="text" className="input-control" value={productName} onChange={e => onChangeProductName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>SKU *</label>
          <input type="text" className="input-control" value={productSku} onChange={e => {
            onChangeProductSku(e.target.value);
            onSkuEdited();
          }} required placeholder="Auto-generated if empty" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="form-group">
          <label>Product Type</label>
          <select className="input-control" value={productType} onChange={e => onChangeProductType(e.target.value as ProductData['type'])}>
            <option value="simple">Simple Product</option>
            <option value="configurable">Configurable Product</option>
            <option value="virtual">Virtual Product</option>
          </select>
        </div>
        <div className="form-group">
          <label>Primary Category</label>
          <select className="input-control" value={productPrimaryCategory} onChange={e => onChangeProductPrimaryCategory(e.target.value)}>
            <option value="">No Primary Category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Secondary Categories</label>
        <select multiple className="input-control" style={{ height: '100px' }} value={productSecondaryCategories} onChange={e => {
          const options = Array.from(e.target.selectedOptions, option => option.value);
          onChangeProductSecondaryCategories(options);
        }}>
          {categories.filter(c => c.id !== productPrimaryCategory).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    </>
  );
};
