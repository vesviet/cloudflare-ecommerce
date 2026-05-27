import React, { useState, useEffect } from 'react';
import type { CategoryData } from '../types';

interface CategoriesTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ API_BASE_URL, addToast }) => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryParentId, setCategoryParentId] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

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
    fetchCategories();
  }, []);

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryName('');
    setCategorySlug('');
    setCategoryParentId('');
    setCategoryDesc('');
  };

  const handleEditCategory = (c: CategoryData) => {
    setEditingCategoryId(c.id);
    setCategoryName(c.name);
    setCategorySlug(c.slug);
    setCategoryParentId(c.parent_id || '');
    setCategoryDesc(c.description || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category? Subcategories will be moved to root.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/categories/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        addToast('Category deleted', 'success');
        fetchCategories();
      } else {
        addToast(result.error || 'Failed to delete category', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return addToast('Name is required', 'error');

    setIsSubmittingCategory(true);
    try {
      const url = editingCategoryId ? `${API_BASE_URL}/categories/${editingCategoryId}` : `${API_BASE_URL}/categories`;
      const res = await fetch(url, {
        method: editingCategoryId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName,
          slug: categorySlug || undefined,
          parent_id: categoryParentId || null,
          description: categoryDesc || null
        })
      });
      const result = await res.json();
      if (result.success) {
        addToast(editingCategoryId ? 'Category updated' : 'Category created', 'success');
        resetCategoryForm();
        fetchCategories();
      } else {
        addToast(result.error || 'Failed to save category', 'error');
      }
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Category Manager</h1>
      </div>

      <div className="product-form-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px' }}>
        <div className="form-card">
          <form onSubmit={handleSubmitCategory} className="form-inputs">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{editingCategoryId ? 'Edit Category' : 'Create New Category'}</h3>
              {editingCategoryId && (
                <button type="button" onClick={resetCategoryForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>
                  Cancel Edit
                </button>
              )}
            </div>
            
            <div className="form-group">
              <label>Category Name *</label>
              <input type="text" className="input-control" value={categoryName} onChange={e => setCategoryName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Slug</label>
              <input type="text" className="input-control" placeholder="Leave blank to auto-generate" value={categorySlug} onChange={e => setCategorySlug(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Parent Category</label>
              <select className="input-control" value={categoryParentId} onChange={e => setCategoryParentId(e.target.value)}>
                <option value="">None (Top Level)</option>
                {categories.filter(c => c.id !== editingCategoryId).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea className="input-control" style={{ height: '80px', resize: 'vertical' }} value={categoryDesc} onChange={e => setCategoryDesc(e.target.value)} />
            </div>

            <button type="submit" className="btn-submit" disabled={isSubmittingCategory}>
              {isSubmittingCategory ? 'Saving...' : (editingCategoryId ? 'Update Category' : 'Create Category')}
            </button>
          </form>
        </div>

        <div className="table-container" style={{ alignSelf: 'start' }}>
          <h3 style={{ padding: '20px 24px 10px', fontSize: '16px', fontWeight: 600 }}>Category List</h3>
          <table className="glass-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const isSubcategory = !!c.parent_id;
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', paddingLeft: isSubcategory ? '20px' : '0' }}>
                        {isSubcategory && '↳ '} {c.name}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.slug}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '11px' }} onClick={() => handleEditCategory(c)}>Edit</button>
                        <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '11px', color: '#ff6b6b', borderColor: 'rgba(255,100,100,0.3)' }} onClick={() => handleDeleteCategory(c.id)}>Delete</button>
                      </div>
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
