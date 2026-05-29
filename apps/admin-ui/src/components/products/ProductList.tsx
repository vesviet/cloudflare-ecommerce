import React from 'react';
import type { ProductData } from '../../types';

interface ProductListProps {
  products: ProductData[];
  API_BASE_URL: string;
  onCreateNew: () => void;
  onEdit: (product: ProductData) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ products, API_BASE_URL, onCreateNew, onEdit }) => {
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Products Catalog</h1>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0 0' }}>Manage your inventory and variations.</p>
        </div>
        <button className="btn-submit" onClick={onCreateNew}>
          + Create New Product
        </button>
      </div>

      <div className="table-container">
        <table className="glass-table" style={{ fontSize: '14px' }}>
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Image</th>
              <th>Name / SKU</th>
              <th>Type / Price</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const isVariable = p.type === 'variable';
              const minPrice = isVariable && p.variations.length > 0 
                ? Math.min(...p.variations.map((v: any) => Number(v.sale_price || v.regular_price))) / 100 
                : (p.sale_price || p.regular_price || 0) / 100;
              
              return (
                <tr key={p.id} className="hoverable-row">
                  <td>
                    {p.images && p.images.length > 0 ? (
                      <div style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={p.images[0].startsWith('http') ? p.images[0] : `${API_BASE_URL}${p.images[0]}`} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '14px' }}>{p.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{isVariable ? `${p.variations.length} variations` : p.variations?.[0]?.sku || 'No SKU'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-blue)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '4px' }}>{p.type}</div>
                    <div style={{ fontWeight: 500 }}>{isVariable ? `From ${formatCurrency(minPrice)}` : formatCurrency(minPrice)}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-secondary" style={{ padding: '6px 16px', fontSize: '13px' }} onClick={() => onEdit(p)}>Edit</button>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '1.1rem', margin: 0 }}>No products yet.</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>Click "Create New Product" to add your first item.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
