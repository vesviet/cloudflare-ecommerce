import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { apiFetch } from '../lib/apiFetch';
import type { CategoryData } from '../types';
import { GlassCard } from '../components/ui/GlassCard';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { FolderTree, Edit2, Trash2 } from 'lucide-react';

interface CategoriesTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ API_BASE_URL, addToast }) => {
  const { data: result, error, isLoading, mutate } = useSWR<{ success: boolean, data: CategoryData[] }>('/categories');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryParentId, setCategoryParentId] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  const categories = result?.data || [];

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
      const res = await apiFetch(`/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        addToast('Category deleted', 'success');
        mutate();
      } else {
        addToast(data.error || 'Failed to delete category', 'error');
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
      const url = editingCategoryId ? `/categories/${editingCategoryId}` : '/categories';
      const res = await apiFetch(url, {
        method: editingCategoryId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName,
          slug: categorySlug || undefined,
          parent_id: categoryParentId || null,
          description: categoryDesc || null
        })
      });
      const data = await res.json();
      if (data.success) {
        addToast(editingCategoryId ? 'Category updated' : 'Category created', 'success');
        resetCategoryForm();
        mutate();
      } else {
        const errorMsg = typeof data.error === 'string'
          ? data.error
          : (data.error?.issues ? data.error.issues.map((i: any) => `${i.path?.join('.') || 'field'}: ${i.message}`).join(', ') : 'Failed to save category');
        addToast(errorMsg, 'error');
      }
    } catch (err: any) {
      addToast(err.message || 'An unexpected error occurred', 'error');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  useEffect(() => {
    if (error) addToast(error.message || 'Failed to fetch categories', 'error');
  }, [error, addToast]);

  const excludedParentIds = new Set<string>();
  if (editingCategoryId) {
    excludedParentIds.add(editingCategoryId);
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of categories) {
        if (c.parent_id && excludedParentIds.has(c.parent_id) && !excludedParentIds.has(c.id)) {
          excludedParentIds.add(c.id);
          changed = true;
        }
      }
    }
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-text-main m-0">Category Manager</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <GlassCard className="p-6">
            <form onSubmit={handleSubmitCategory} className="space-y-4">
              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-primary-accent" />
                  {editingCategoryId ? 'Edit Category' : 'New Category'}
                </h3>
                {editingCategoryId && (
                  <button 
                    type="button" 
                    onClick={resetCategoryForm} 
                    className="text-xs text-text-muted hover:text-text-main transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
              
              <div>
                <label className="block text-sm text-text-muted mb-1">Category Name <span className="text-danger-accent">*</span></label>
                <input type="text" className="w-full" value={categoryName} onChange={e => setCategoryName(e.target.value)} required />
              </div>

              <div>
                <label className="block text-sm text-text-muted mb-1">Slug</label>
                <input type="text" className="w-full" placeholder="Leave blank to auto-generate" value={categorySlug} onChange={e => setCategorySlug(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm text-text-muted mb-1">Parent Category</label>
                <select className="w-full" value={categoryParentId} onChange={e => setCategoryParentId(e.target.value)}>
                  <option value="">None (Top Level)</option>
                  {categories.filter((c: CategoryData) => !excludedParentIds.has(c.id)).map((c: CategoryData) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-text-muted mb-1">Description</label>
                <textarea className="w-full min-h-[80px] resize-y" value={categoryDesc} onChange={e => setCategoryDesc(e.target.value)} />
              </div>

              <div className="pt-4 border-t border-white/5">
                <button type="submit" className="w-full px-4 py-2.5 rounded-lg bg-primary-accent hover:bg-primary-accent/80 text-white font-medium transition-colors disabled:opacity-50 shadow-[0_0_15px_var(--primary-glow)]" disabled={isSubmittingCategory}>
                  {isSubmittingCategory ? 'Saving...' : (editingCategoryId ? 'Update Category' : 'Create Category')}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>

        <div className="lg:col-span-3">
          <GlassCard className="p-6">
            <h3 className="text-xl font-bold mb-6">Category List</h3>
            
            {isLoading ? (
              <div className="space-y-4">
                <SkeletonLoader height="48px" />
                <SkeletonLoader height="48px" />
                <SkeletonLoader height="48px" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 text-text-muted border border-white/5 rounded-lg bg-white/5">
                No categories found. Create one to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-text-muted bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Slug</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {categories.map((c: CategoryData) => {
                      const isSubcategory = !!c.parent_id;
                      return (
                        <tr key={c.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center" style={{ paddingLeft: isSubcategory ? '1.5rem' : '0' }}>
                              {isSubcategory && <span className="text-text-muted mr-2">↳</span>} 
                              <span className="font-medium text-text-main">{c.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-text-muted font-mono text-xs">{c.slug}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                className="p-1.5 rounded-md text-text-muted hover:text-text-main hover:bg-white/10 transition-colors" 
                                onClick={() => handleEditCategory(c)}
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-1.5 rounded-md text-danger-accent/70 hover:text-danger-accent hover:bg-danger-accent/10 transition-colors" 
                                onClick={() => handleDeleteCategory(c.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
