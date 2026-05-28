import React, { useState, useEffect } from 'react';
import type { ProductData } from '../types';
import { ProductList } from '../components/products/ProductList';
import { ProductForm } from '../components/products/ProductForm';

interface ProductsTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({ API_BASE_URL, addToast }) => {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(false);
  
  // View routing state
  const [currentView, setCurrentView] = useState<'list' | 'form'>('list');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      const result = await res.json();
      if (result.success) setProducts(result.data || []);
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    
    // Read URL params for initial state
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const id = params.get('id');
    
    if (action === 'new') {
      setCurrentView('form');
      setEditingProductId(null);
    } else if (id) {
      setCurrentView('form');
      setEditingProductId(id);
    } else {
      setCurrentView('list');
    }
    
    // Listen to popstate to handle browser back/forward buttons
    const handlePopState = () => {
      const currentParams = new URLSearchParams(window.location.search);
      const currentAction = currentParams.get('action');
      const currentId = currentParams.get('id');
      
      if (currentAction === 'new') {
        setCurrentView('form');
        setEditingProductId(null);
      } else if (currentId) {
        setCurrentView('form');
        setEditingProductId(currentId);
      } else {
        setCurrentView('list');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToList = () => {
    setCurrentView('list');
    setEditingProductId(null);
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.delete('action');
    url.searchParams.delete('id');
    window.history.pushState({}, '', url.toString());
  };

  const navigateToNew = () => {
    setCurrentView('form');
    setEditingProductId(null);
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('action', 'new');
    url.searchParams.delete('id');
    window.history.pushState({}, '', url.toString());
  };

  const navigateToEdit = (product: ProductData) => {
    setCurrentView('form');
    setEditingProductId(product.id);
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.delete('action');
    url.searchParams.set('id', product.id);
    window.history.pushState({}, '', url.toString());
  };

  const handleSaveSuccess = () => {
    fetchProducts(); // Refresh list
    navigateToList();
  };

  const editingProductData = editingProductId ? products.find(p => p.id === editingProductId) || null : null;

  return (
    <div>
      {loading && products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading products...</div>
      ) : (
        <>
          {currentView === 'list' && (
            <ProductList
              products={products}
              API_BASE_URL={API_BASE_URL}
              onCreateNew={navigateToNew}
              onEdit={navigateToEdit}
            />
          )}
          
          {currentView === 'form' && (
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
