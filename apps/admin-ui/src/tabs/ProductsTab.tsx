import React, { useState, useEffect, useRef } from 'react';
import type { ProductData, ProductVariation, CategoryData } from '../types';

interface ProductsTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({ API_BASE_URL, addToast }) => {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState('simple');
  const [productRegularPrice, setProductRegularPrice] = useState('');
  const [productSalePrice, setProductSalePrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productPrimaryCategory, setProductPrimaryCategory] = useState('');
  const [productSecondaryCategories, setProductSecondaryCategories] = useState<string[]>([]);
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      const result = await res.json();
      if (result.success) setProducts(result.data || []);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/categories`);
      const result = await res.json();
      if (result.success) setCategories(result.data || []);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAddVariation = () => {
    setProductVariations([...productVariations, { sku: '', regular_price: '', sale_price: '', stock: '', attributes: {} }]);
  };

  const handleVariationChange = (index: number, field: keyof ProductVariation, value: any) => {
    const newVars = [...productVariations];
    newVars[index] = { ...newVars[index], [field]: value };
    setProductVariations(newVars);
  };

  const handleRemoveVariation = (index: number) => {
    setProductVariations(productVariations.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setEditingProductId(null);
    setProductName('');
    setProductType('simple');
    setProductRegularPrice('');
    setProductSalePrice('');
    setProductStock('');
    setProductPrimaryCategory('');
    setProductSecondaryCategories([]);
    setProductVariations([]);
    setImageFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditClick = (p: ProductData) => {
    setEditingProductId(p.id);
    setProductName(p.title);
    setProductType(p.type);
    setProductRegularPrice(p.regular_price ? (p.regular_price / 100).toString() : '');
    setProductSalePrice(p.sale_price ? (p.sale_price / 100).toString() : '');
    const simpleStock = p.variations?.[0]?.stock !== undefined ? p.variations[0].stock.toString() : '';
    setProductStock(simpleStock);
    setProductPrimaryCategory(p.primary_category_id || '');
    setProductSecondaryCategories(p.secondary_categories || []);
    setProductVariations(
      (p.variations || []).map(v => ({
        id: v.id,
        sku: v.sku,
        regular_price: v.regular_price ? (Number(v.regular_price) / 100).toString() : '',
        sale_price: v.sale_price ? (Number(v.sale_price) / 100).toString() : '',
        stock: v.stock !== undefined ? v.stock.toString() : '0',
        attributes: v.attributes || {}
      }))
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName) {
      addToast('Please provide a product name', 'error');
      return;
    }

    const payloadVariations = productVariations.map(v => ({
      id: v.id,
      sku: v.sku,
      regular_price: Math.round(parseFloat(v.regular_price as string) * 100) || 0,
      sale_price: v.sale_price ? Math.round(parseFloat(v.sale_price as string) * 100) : null,
      stock: parseInt(v.stock as string, 10) || 0,
      attributes: v.attributes
    }));

    const minorRegularPrice = productRegularPrice ? Math.round(parseFloat(productRegularPrice) * 100) : 0;
    const minorSalePrice = productSalePrice ? Math.round(parseFloat(productSalePrice) * 100) : '';

    setIsSubmittingProduct(true);
    try {
      const formData = new FormData();
      formData.append('name', productName);
      formData.append('type', productType);
      formData.append('regular_price', minorRegularPrice.toString());
      if (minorSalePrice) formData.append('sale_price', minorSalePrice.toString());
      formData.append('stock', productStock);
      if (productPrimaryCategory) formData.append('primary_category_id', productPrimaryCategory);
      if (productSecondaryCategories.length > 0) formData.append('secondary_categories', JSON.stringify(productSecondaryCategories));
      formData.append('variations', JSON.stringify(payloadVariations));
      
      if (imageFile) formData.append('image', imageFile);

      const url = editingProductId ? `${API_BASE_URL}/products/${editingProductId}` : `${API_BASE_URL}/products`;
      const res = await fetch(url, {
        method: editingProductId ? 'PUT' : 'POST',
        body: formData
      });
      const result = await res.json();

      if (result.success) {
        addToast(editingProductId ? 'Product updated successfully' : 'Product created successfully', 'success');
        resetForm();
        fetchProducts();
      } else {
        addToast(result.error || 'Failed to save product', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div>
      <div className="page-header">
        <h1>Products Catalog</h1>
      </div>

      <div className="product-form-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px' }}>
        <div className="form-card">
          <form onSubmit={handleSubmitProduct} className="form-inputs">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{editingProductId ? 'Edit Product' : 'Create New Product'}</h3>
              {editingProductId && (
                <button type="button" onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>
                  Cancel Edit
                </button>
              )}
            </div>
            
            <div className="form-group">
              <label>Product Name *</label>
              <input type="text" className="input-control" value={productName} onChange={e => setProductName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Product Type</label>
              <select className="input-control" value={productType} onChange={e => setProductType(e.target.value)}>
                <option value="simple">Simple Product</option>
                <option value="variable">Variable Product</option>
              </select>
            </div>

            <div className="form-group">
              <label>Primary Category</label>
              <select className="input-control" value={productPrimaryCategory} onChange={e => setProductPrimaryCategory(e.target.value)}>
                <option value="">No Primary Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Secondary Categories</label>
              <select multiple className="input-control" style={{ height: '80px' }} value={productSecondaryCategories} onChange={e => {
                const options = Array.from(e.target.selectedOptions, option => option.value);
                setProductSecondaryCategories(options);
              }}>
                {categories.filter(c => c.id !== productPrimaryCategory).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {productType === 'simple' && (
              <>
                <div className="form-group">
                  <label>Regular Price ($) *</label>
                  <input type="number" step="0.01" className="input-control" value={productRegularPrice} onChange={e => setProductRegularPrice(e.target.value)} required={productType === 'simple'} />
                </div>
                <div className="form-group">
                  <label>Sale Price ($)</label>
                  <input type="number" step="0.01" className="input-control" value={productSalePrice} onChange={e => setProductSalePrice(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Stock Quantity *</label>
                  <input type="number" className="input-control" value={productStock} onChange={e => setProductStock(e.target.value)} required={productType === 'simple'} />
                </div>
              </>
            )}

            {productType === 'variable' && (
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ margin: 0 }}>Variations</label>
                  <button type="button" onClick={handleAddVariation} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>+ Add Row</button>
                </div>
                
                {productVariations.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No variations added yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {productVariations.map((v, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '4px' }}>
                        <input type="text" placeholder="Variant (e.g. Red - S)" className="input-control" style={{ padding: '6px 8px', fontSize: '12px' }} value={v.attributes?.name || ''} onChange={e => handleVariationChange(idx, 'attributes', { ...v.attributes, name: e.target.value })} required />
                        <input type="text" placeholder="SKU" className="input-control" style={{ padding: '6px 8px', fontSize: '12px' }} value={v.sku} onChange={e => handleVariationChange(idx, 'sku', e.target.value)} />
                        <input type="number" placeholder="Price" className="input-control" style={{ padding: '6px 8px', fontSize: '12px' }} value={v.regular_price} onChange={e => handleVariationChange(idx, 'regular_price', e.target.value)} required />
                        <input type="number" placeholder="Sale" className="input-control" style={{ padding: '6px 8px', fontSize: '12px' }} value={v.sale_price || ''} onChange={e => handleVariationChange(idx, 'sale_price', e.target.value)} />
                        <input type="number" placeholder="Stock" className="input-control" style={{ padding: '6px 8px', fontSize: '12px' }} value={v.stock} onChange={e => handleVariationChange(idx, 'stock', e.target.value)} required />
                        <button type="button" onClick={() => handleRemoveVariation(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '16px' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!editingProductId && (
              <div className="file-upload-container">
                <label>Product Image</label>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
              </div>
            )}

            <button type="submit" className="btn-submit" disabled={isSubmittingProduct}>
              {isSubmittingProduct ? 'Saving...' : (editingProductId ? 'Update Product' : 'Create Product')}
            </button>
          </form>
        </div>

        <div className="table-container" style={{ alignSelf: 'start' }}>
          <h3 style={{ padding: '20px 24px 10px', fontSize: '16px', fontWeight: 600 }}>Current Products</h3>
          <table className="glass-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Name / SKU</th>
                <th>Type / Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isVariable = p.type === 'variable';
                const minPrice = isVariable && p.variations.length > 0 ? Math.min(...p.variations.map((v: any) => Number(v.sale_price || v.regular_price))) / 100 : (p.sale_price || p.regular_price || 0) / 100;
                
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{isVariable ? `${p.variations.length} variations` : p.variations?.[0]?.sku || 'No SKU'}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-color)' }}>{p.type}</div>
                      <div>{isVariable ? `From ${formatCurrency(minPrice)}` : formatCurrency(minPrice)}</div>
                    </td>
                    <td>
                      <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => handleEditClick(p)}>Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
