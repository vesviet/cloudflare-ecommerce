import React, { useState, useEffect, useRef } from 'react';
import type { ProductData, ProductVariation, CategoryData } from '../../types';

interface ProductFormProps {
  initialData: ProductData | null;
  API_BASE_URL: string;
  onSaveSuccess: () => void;
  onCancel: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ initialData, API_BASE_URL, onSaveSuccess, onCancel, addToast }) => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState('simple');
  const [productRegularPrice, setProductRegularPrice] = useState('');
  const [productSalePrice, setProductSalePrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productPrimaryCategory, setProductPrimaryCategory] = useState('');
  const [productSecondaryCategories, setProductSecondaryCategories] = useState<string[]>([]);
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editingProductId = initialData?.id || null;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/categories`);
        const result = await res.json();
        if (result.success) setCategories(result.data || []);
      } catch (err: any) {
        addToast(err.message, 'error');
      }
    };
    fetchCategories();
  }, [API_BASE_URL, addToast]);

  useEffect(() => {
    if (initialData) {
      const p = initialData;
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
      setExistingImages(p.images || []);
    } else {
      setProductName('');
      setProductType('simple');
      setProductRegularPrice('');
      setProductSalePrice('');
      setProductStock('');
      setProductPrimaryCategory('');
      setProductSecondaryCategories([]);
      setProductVariations([]);
      setExistingImages([]);
    }
    setNewImageFiles([]);
    setPreviewUrls([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initialData]);

  // Cleanup object URLs when component unmounts or previewUrls change
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setNewImageFiles(prev => [...prev, ...files]);
      setPreviewUrls(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    }
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
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
      
      formData.append('existing_images', JSON.stringify(existingImages));
      newImageFiles.forEach(file => formData.append('images', file));

      const url = editingProductId ? `${API_BASE_URL}/products/${editingProductId}` : `${API_BASE_URL}/products`;
      const res = await fetch(url, {
        method: editingProductId ? 'PUT' : 'POST',
        body: formData
      });
      const result = await res.json();

      if (result.success) {
        addToast(editingProductId ? 'Product updated successfully' : 'Product created successfully', 'success');
        onSaveSuccess();
      } else {
        addToast(result.error || 'Failed to save product', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={onCancel} className="btn-secondary" style={{ padding: '6px 12px' }}>← Back</button>
        <div>
          <h1 style={{ margin: 0 }}>{editingProductId ? 'Edit Product' : 'Create New Product'}</h1>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0 0' }}>{editingProductId ? `Updating ${productName}` : 'Add a new item to your inventory'}</p>
        </div>
      </div>

      <div className="form-card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <form onSubmit={handleSubmitProduct} className="form-inputs">
          
          <div className="form-group">
            <label>Product Name *</label>
            <input type="text" className="input-control" value={productName} onChange={e => setProductName(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
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
          </div>

          <div className="form-group">
            <label>Secondary Categories</label>
            <select multiple className="input-control" style={{ height: '100px' }} value={productSecondaryCategories} onChange={e => {
              const options = Array.from(e.target.selectedOptions, option => option.value);
              setProductSecondaryCategories(options);
            }}>
              {categories.filter(c => c.id !== productPrimaryCategory).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {productType === 'simple' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
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
            </div>
          )}

          {productType === 'variable' && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Variations</h3>
                <button type="button" onClick={handleAddVariation} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>+ Add Row</button>
              </div>
              
              {productVariations.length === 0 ? (
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No variations added yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {productVariations.map((v, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                      <input type="text" placeholder="Variant (e.g. Red - S)" className="input-control" style={{ padding: '8px 10px', fontSize: '13px' }} value={v.attributes?.name || ''} onChange={e => handleVariationChange(idx, 'attributes', { ...v.attributes, name: e.target.value })} required />
                      <input type="text" placeholder="SKU" className="input-control" style={{ padding: '8px 10px', fontSize: '13px' }} value={v.sku} onChange={e => handleVariationChange(idx, 'sku', e.target.value)} />
                      <input type="number" placeholder="Price" className="input-control" style={{ padding: '8px 10px', fontSize: '13px' }} value={v.regular_price} onChange={e => handleVariationChange(idx, 'regular_price', e.target.value)} required />
                      <input type="number" placeholder="Sale" className="input-control" style={{ padding: '8px 10px', fontSize: '13px' }} value={v.sale_price || ''} onChange={e => handleVariationChange(idx, 'sale_price', e.target.value)} />
                      <input type="number" placeholder="Stock" className="input-control" style={{ padding: '8px 10px', fontSize: '13px' }} value={v.stock} onChange={e => handleVariationChange(idx, 'stock', e.target.value)} required />
                      <button type="button" onClick={() => handleRemoveVariation(idx)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '20px' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="file-upload-container" style={{ marginTop: '10px' }}>
            <label>Product Images</label>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="input-control" style={{ padding: '10px' }} />
            
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px' }}>
              {existingImages.map((url, idx) => (
                <div key={`existing-${idx}`} style={{ position: 'relative', width: '100px', height: '100px' }}>
                  <img src={url.startsWith('http') ? url : `${API_BASE_URL}${url}`} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: idx === 0 ? '2px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.1)' }} />
                  {idx === 0 && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--accent-blue)', color: '#fff', fontSize: '11px', textAlign: 'center', padding: '4px 0', borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px', fontWeight: 600 }}>COVER</div>}
                  <button type="button" onClick={() => handleRemoveExistingImage(idx)} style={{ position: 'absolute', top: -8, right: -8, background: 'var(--accent-red)', color: 'white', borderRadius: '50%', border: 'none', width: '24px', height: '24px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>×</button>
                </div>
              ))}
              {previewUrls.map((url, idx) => {
                const isCover = existingImages.length === 0 && idx === 0;
                return (
                  <div key={`new-${idx}`} style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <img src={url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: isCover ? '2px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.1)' }} />
                    {isCover && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'var(--accent-blue)', color: '#fff', fontSize: '11px', textAlign: 'center', padding: '4px 0', borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px', fontWeight: 600 }}>COVER</div>}
                    <button type="button" onClick={() => handleRemoveNewImage(idx)} style={{ position: 'absolute', top: -8, right: -8, background: 'var(--accent-red)', color: 'white', borderRadius: '50%', border: 'none', width: '24px', height: '24px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>×</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)' }}>
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSubmittingProduct}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" style={{ margin: 0 }} disabled={isSubmittingProduct}>
              {isSubmittingProduct ? 'Saving...' : (editingProductId ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
