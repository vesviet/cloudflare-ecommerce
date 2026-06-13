import React, { useState, useEffect } from 'react';
import type { ProductData, ProductVariation, CategoryData } from '../../types';
import { ProductBasicInfo } from './form/ProductBasicInfo';
import { ProductSimpleDetails } from './form/ProductSimpleDetails';
import { ProductVariationsConfig } from './form/ProductVariationsConfig';
import { ProductMedia } from './form/ProductMedia';

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
  const [productSku, setProductSku] = useState('');
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false);
  const [productType, setProductType] = useState<ProductData['type']>('simple');
  const [productRegularPrice, setProductRegularPrice] = useState('');
  const [productSalePrice, setProductSalePrice] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productWeight, setProductWeight] = useState('');
  const [productLength, setProductLength] = useState('');
  const [productWidth, setProductWidth] = useState('');
  const [productHeight, setProductHeight] = useState('');
  const [productPrimaryCategory, setProductPrimaryCategory] = useState('');
  const [productSecondaryCategories, setProductSecondaryCategories] = useState<string[]>([]);
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  const editingProductId = initialData?.id || null;

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const headers: Record<string, string> = {};
        if (import.meta.env.DEV) {
          const localEmail = localStorage.getItem('admin_email');
          if (localEmail) headers['X-Local-Admin-Email'] = localEmail;
        }
        const res = await fetch(`${API_BASE_URL}/categories`, { 
          headers,
          credentials: 'include' 
        });
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
      setProductSku(p.sku || '');
      setIsSkuManuallyEdited(!!p.sku);
      setProductType(p.type);
      setProductRegularPrice(p.regular_price ? (p.regular_price / 100).toString() : '');
      setProductSalePrice(p.sale_price ? (p.sale_price / 100).toString() : '');
      const simpleStock = p.variations?.[0]?.stock !== undefined ? p.variations[0].stock.toString() : '';
      setProductStock(simpleStock);
      setProductWeight(p.weight?.toString() || '');
      setProductLength(p.length?.toString() || '');
      setProductWidth(p.width?.toString() || '');
      setProductHeight(p.height?.toString() || '');
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
      setProductSku('');
      setIsSkuManuallyEdited(false);
      setProductType('simple');
      setProductRegularPrice('');
      setProductSalePrice('');
      setProductStock('');
      setProductWeight('');
      setProductLength('');
      setProductWidth('');
      setProductHeight('');
      setProductPrimaryCategory('');
      setProductSecondaryCategories([]);
      setProductVariations([]);
      setExistingImages([]);
    }
    setNewImageFiles([]);
    setPreviewUrls([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initialData]);

  // Cleanup object URLs when component unmounts or previewUrls change
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  // Auto-generate SKU based on Product Name if not manually edited
  useEffect(() => {
    if (!editingProductId && !isSkuManuallyEdited && productName) {
      const baseSlug = productName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (baseSlug) {
        setProductSku(`SKU-${baseSlug}`);
      }
    }
  }, [productName, editingProductId, isSkuManuallyEdited]);

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
      if (productSku) formData.append('sku', productSku);
      formData.append('type', productType);
      formData.append('regular_price', minorRegularPrice.toString());
      if (minorSalePrice) formData.append('sale_price', minorSalePrice.toString());
      formData.append('stock', productStock);
      if (productWeight) formData.append('weight', productWeight);
      if (productLength) formData.append('length', productLength);
      if (productWidth) formData.append('width', productWidth);
      if (productHeight) formData.append('height', productHeight);
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
          
          <ProductBasicInfo 
            productName={productName} productSku={productSku} productType={productType}
            productPrimaryCategory={productPrimaryCategory} productSecondaryCategories={productSecondaryCategories}
            categories={categories}
            onChangeProductName={setProductName} onChangeProductSku={setProductSku} onChangeProductType={setProductType}
            onChangeProductPrimaryCategory={setProductPrimaryCategory} onChangeProductSecondaryCategories={setProductSecondaryCategories}
            onSkuEdited={() => setIsSkuManuallyEdited(true)}
          />

          <ProductSimpleDetails 
            productType={productType} productRegularPrice={productRegularPrice} productSalePrice={productSalePrice}
            productStock={productStock} productWeight={productWeight} productLength={productLength}
            productWidth={productWidth} productHeight={productHeight}
            onChangeProductRegularPrice={setProductRegularPrice} onChangeProductSalePrice={setProductSalePrice}
            onChangeProductStock={setProductStock} onChangeProductWeight={setProductWeight}
            onChangeProductLength={setProductLength} onChangeProductWidth={setProductWidth}
            onChangeProductHeight={setProductHeight}
          />

          <ProductVariationsConfig 
            productType={productType} productVariations={productVariations} API_BASE_URL={API_BASE_URL}
            onAddVariation={handleAddVariation} onVariationChange={handleVariationChange} onRemoveVariation={handleRemoveVariation}
          />

          <ProductMedia 
            API_BASE_URL={API_BASE_URL} existingImages={existingImages} previewUrls={previewUrls}
            onFileChange={handleFileChange} onRemoveExistingImage={handleRemoveExistingImage} onRemoveNewImage={handleRemoveNewImage}
          />

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
