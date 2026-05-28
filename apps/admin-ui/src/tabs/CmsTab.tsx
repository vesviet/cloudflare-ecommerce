import { useState, useEffect } from 'react';
import type { CmsEntry } from '../types';
import { CmsList } from '../components/cms/CmsList';
import { CmsForm } from '../components/cms/CmsForm';

interface CmsTabProps {
  API_BASE_URL: string;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export function CmsTab({ API_BASE_URL, addToast }: CmsTabProps) {
  const [entries, setEntries] = useState<CmsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  // View routing state
  const [currentView, setCurrentView] = useState<'list' | 'form'>('list');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/cms`);
      const data = await res.json();
      if (data.success) setEntries(data.data);
      else addToast(data.error || 'Failed to load CMS entries', 'error');
    } catch {
      addToast('Error fetching CMS entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    
    // Read URL params for initial state
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const id = params.get('id');
    
    if (action === 'new') {
      setCurrentView('form');
      setEditingEntryId(null);
    } else if (id) {
      setCurrentView('form');
      setEditingEntryId(id);
    } else {
      setCurrentView('list');
    }
    
    const handlePopState = () => {
      const currentParams = new URLSearchParams(window.location.search);
      const currentAction = currentParams.get('action');
      const currentId = currentParams.get('id');
      
      if (currentAction === 'new') {
        setCurrentView('form');
        setEditingEntryId(null);
      } else if (currentId) {
        setCurrentView('form');
        setEditingEntryId(currentId);
      } else {
        setCurrentView('list');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToList = () => {
    setCurrentView('list');
    setEditingEntryId(null);
    
    const url = new URL(window.location.href);
    url.searchParams.delete('action');
    url.searchParams.delete('id');
    window.history.pushState({}, '', url.toString());
  };

  const navigateToNew = () => {
    setCurrentView('form');
    setEditingEntryId(null);
    
    const url = new URL(window.location.href);
    url.searchParams.set('action', 'new');
    url.searchParams.delete('id');
    window.history.pushState({}, '', url.toString());
  };

  const navigateToEdit = (entry: CmsEntry) => {
    setCurrentView('form');
    setEditingEntryId(entry.id);
    
    const url = new URL(window.location.href);
    url.searchParams.delete('action');
    url.searchParams.set('id', entry.id);
    window.history.pushState({}, '', url.toString());
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry? This action cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/cms/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { 
        addToast('Entry deleted', 'success'); 
        await fetchEntries(); 
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
        await fetchEntries(); 
      }
    } catch {
      addToast('Failed to update status', 'error');
    }
  };

  const handleSaveSuccess = () => {
    fetchEntries();
    navigateToList();
  };

  const editingEntryData = editingEntryId ? entries.find(e => e.id === editingEntryId) || null : null;

  return (
    <div>
      {loading && entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading entries...</div>
      ) : (
        <>
          {currentView === 'list' && (
            <CmsList
              entries={entries}
              loading={loading}
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
        </>
      )}
    </div>
  );
}
