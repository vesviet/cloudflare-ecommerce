import { useEffect, useState } from 'react';

import useSWR from 'swr';
import { useSearchParams } from 'react-router-dom';
import type { CmsEntry } from '../types';
import { apiFetch } from '../lib/apiFetch';
import { CmsList } from '../components/cms/CmsList';
import { CmsForm } from '../components/cms/CmsForm';
import { Pagination, type PaginationMeta } from '../components/ui/Pagination';

interface CmsTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export function CmsTab({ addToast }: CmsTabProps) {
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const { data: result, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data: CmsEntry[];
    pagination?: PaginationMeta;
  }>(`/cms?limit=${limit}&offset=${offset}`);
  const [searchParams, setSearchParams] = useSearchParams();

  const action = searchParams.get('action');
  const id = searchParams.get('id');

  let currentView: 'list' | 'form' = 'list';
  if (action === 'new' || id) {
    currentView = 'form';
  }

  const entries = result?.data || [];

  const navigateToList = () => {
    setSearchParams(new URLSearchParams());
  };

  const navigateToNew = () => {
    setSearchParams({ action: 'new' });
  };

  const navigateToEdit = (entry: CmsEntry) => {
    setSearchParams({ id: entry.id });
  };

  const handleDelete = async (entryId: string) => {
    if (!window.confirm('Delete this entry? This action cannot be undone.')) return;
    try {
      const res = await apiFetch(`/cms/${entryId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { 
        addToast('Entry deleted', 'success'); 
        mutate();
      } else {
        addToast(data.error || 'Failed to delete', 'error');
      }
    } catch {
      addToast('Network error deleting entry', 'error');
    }
  };

  const handleQuickPublish = async (entry: CmsEntry) => {
    const nextStatus = entry.status === 'published' ? 'draft' : 'published';
    try {
      const res = await apiFetch(`/cms/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...entry, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) { 
        addToast(`Entry ${nextStatus}`, 'success'); 
        mutate();
      }
    } catch {
      addToast('Failed to update status', 'error');
    }
  };

  const handleSaveSuccess = () => {
    mutate();
    navigateToList();
  };

  const editingEntryData = id ? entries.find(e => e.id === id) || null : null;

  useEffect(() => {
    if (error) addToast(error.message || 'Failed to load CMS entries', 'error');
  }, [error, addToast]);

  return (
    <div className="w-full">
      {currentView === 'list' && (
        <>
          <CmsList
            entries={entries}
            loading={isLoading}
            onCreateNew={navigateToNew}
            onEdit={navigateToEdit}
            onDelete={handleDelete}
            onQuickPublish={handleQuickPublish}
          />
          <Pagination pagination={result?.pagination} onPageChange={setOffset} itemLabel="entries" />
        </>
      )}
      
      {currentView === 'form' && (
        <CmsForm
          initialData={editingEntryData}
          onSaveSuccess={handleSaveSuccess}
          onCancel={navigateToList}
          addToast={addToast}
        />
      )}
    </div>
  );
}

