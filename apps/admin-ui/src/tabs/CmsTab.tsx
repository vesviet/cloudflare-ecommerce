import { useEffect } from 'react';

import useSWR from 'swr';
import { useSearchParams } from 'react-router-dom';
import type { CmsEntry } from '../types';
import { CmsList } from '../components/cms/CmsList';
import { CmsForm } from '../components/cms/CmsForm';

interface CmsTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export function CmsTab({ API_BASE_URL, addToast }: CmsTabProps) {
  const { data: result, error, isLoading, mutate } = useSWR<{ success: boolean, data: CmsEntry[] }>('/cms');
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
      const res = await fetch(`${API_BASE_URL}/cms/${entryId}`, { method: 'DELETE' });
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
      const res = await fetch(`${API_BASE_URL}/cms/${entry.id}`, {
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
        <CmsList
          entries={entries}
          loading={isLoading}
          onCreateNew={navigateToNew}
          onEdit={navigateToEdit}
          onDelete={handleDelete}
          onQuickPublish={handleQuickPublish}
        />
      )}
      
      {currentView === 'form' && (
        <CmsForm
          initialData={editingEntryData}
          API_BASE_URL={API_BASE_URL}
          onSaveSuccess={handleSaveSuccess}
          onCancel={navigateToList}
          addToast={addToast}
        />
      )}
    </div>
  );
}

