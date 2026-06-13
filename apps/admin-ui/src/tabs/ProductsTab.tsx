import React, { useEffect } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'react-router-dom';
import type { ProductData } from '../types';
import { ProductList } from '../components/products/ProductList';
import { ProductForm } from '../components/products/ProductForm';
import { GlassCard } from '../components/ui/GlassCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';

interface ProductsTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({ API_BASE_URL, addToast }) => {
  const { data: result, error, isLoading, mutate } = useSWR<{ success: boolean, data: ProductData[] }>('/products');
  const [searchParams, setSearchParams] = useSearchParams();

  const action = searchParams.get('action');
  const id = searchParams.get('id');

  const products = result?.data || [];

  const navigateToList = () => {
    setSearchParams({});
  };

  const navigateToNew = () => {
    setSearchParams({ action: 'new' });
  };

  const navigateToEdit = (product: ProductData) => {
    setSearchParams({ id: product.id });
  };

  const handleSaveSuccess = () => {
    mutate(); // Refresh SWR cache
    navigateToList();
  };

  const editingProductData = id ? products.find(p => p.id === id) || null : null;

  useEffect(() => {
    if (error) addToast(error.message || 'Failed to fetch products', 'error');
  }, [error, addToast]);

  return (
    <div className="w-full">
      {isLoading ? (
        <GlassCard className="p-6">
          <div className="flex justify-between mb-6">
            <SkeletonLoader width="200px" height="32px" />
            <SkeletonLoader width="120px" height="40px" />
          </div>
          <div className="space-y-4">
            <SkeletonLoader height="64px" />
            <SkeletonLoader height="64px" />
            <SkeletonLoader height="64px" />
          </div>
        </GlassCard>
      ) : (
        <>
          {(!action && !id) && (
            <ProductList
              products={products}
              API_BASE_URL={API_BASE_URL}
              onCreateNew={navigateToNew}
              onEdit={navigateToEdit}
            />
          )}
          
          {(action === 'new' || id) && (
            <ProductForm
              initialData={editingProductData}
              API_BASE_URL={API_BASE_URL}
              onSaveSuccess={handleSaveSuccess}
              onCancel={navigateToList}
              addToast={addToast}
            />
          )}
        </>
      )}
    </div>
  );
};
