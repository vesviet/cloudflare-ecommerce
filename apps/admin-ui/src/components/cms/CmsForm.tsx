import { useState, useRef, useEffect } from 'react';
import type { CmsEntry } from '../../types';
import MDEditor from '@uiw/react-md-editor';

// ── Media Manager Component ──────────────────────────────────────────────────
function MediaManager({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'url' | 'upload'>('url');
  const [urlInput, setUrlInput] = useState(value);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUrlApply = () => onChange(urlInput);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    // In production this would upload to R2. For now create an object URL for preview.
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUrlInput(dataUrl);
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="media-manager">
      <div className="media-tabs">
        <button type="button" className={`media-tab ${activeTab === 'url' ? 'active' : ''}`} onClick={() => setActiveTab('url')}>
          URL
        </button>
        <button type="button" className={`media-tab ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
          Upload
        </button>
      </div>

      {activeTab === 'url' && (
        <div className="media-url-row">
          <input
            className="field-input"
            type="text"
            placeholder="https://example.com/image.jpg"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={handleUrlApply}
            onKeyDown={(e) => e.key === 'Enter' && handleUrlApply()}
          />
          <button type="button" className="btn-ghost" style={{ whiteSpace: 'nowrap' }} onClick={handleUrlApply}>
            Apply
          </button>
        </div>
      )}

      {activeTab === 'upload' && (
        <div
          className={`media-dropzone ${dragging ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="media-dropzone-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p>Drop image here or click to browse</p>
          <small>PNG, JPG, GIF, WebP — max 5MB</small>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {value && (
        <div className="media-preview">
          <img src={value} alt="Featured" />
          <button
            type="button"
            className="media-preview-remove"
            title="Remove image"
            onClick={() => { onChange(''); setUrlInput(''); }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main CmsForm ──────────────────────────────────────────────────────────────

interface CmsFormProps {
  initialData: Partial<CmsEntry> | null;
  API_BASE_URL: string;
  onSaveSuccess: () => void;
  onCancel: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export function CmsForm({ initialData, API_BASE_URL, onSaveSuccess, onCancel, addToast }: CmsFormProps) {
  const [editingEntry, setEditingEntry] = useState<Partial<CmsEntry>>({
    title: '', slug: '', excerpt: '', content: '', type: 'post', status: 'draft', metadata_json: '{}'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setEditingEntry(initialData);
    } else {
      setEditingEntry({ title: '', slug: '', excerpt: '', content: '', type: 'post', status: 'draft', metadata_json: '{}' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [initialData]);

  const parseMeta = (entry: Partial<CmsEntry>): Record<string, string> => {
    try { return JSON.parse(entry.metadata_json || '{}'); } catch { return {}; }
  };
  
  const setMeta = (entry: Partial<CmsEntry>, key: string, val: string): Partial<CmsEntry> => {
    const prev = parseMeta(entry);
    return { ...entry, metadata_json: JSON.stringify({ ...prev, [key]: val }) };
  };

  const setField = (key: keyof CmsEntry, val: string) => {
    setEditingEntry((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry.title) {
      addToast('Please provide a title', 'error');
      return;
    }

    setIsSubmitting(true);
    const isNew = !editingEntry.id;
    const url = isNew ? `${API_BASE_URL}/cms` : `${API_BASE_URL}/cms/${editingEntry.id}`;
    const method = isNew ? 'POST' : 'PUT';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEntry),
      });
      const data = await res.json();
      if (data.success) {
        addToast(isNew ? 'Entry created successfully' : 'Entry updated', 'success');
        onSaveSuccess();
      } else {
        addToast(data.error || 'Failed to save', 'error');
      }
    } catch {
      addToast('Network error saving entry', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const meta = parseMeta(editingEntry);
  const isEditing = !!editingEntry.id;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={onCancel} className="btn-secondary" style={{ padding: '6px 12px' }}>← Back</button>
        <div>
          <h1 style={{ margin: 0 }}>{isEditing ? 'Edit Entry' : 'Create New Entry'}</h1>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0 0' }}>{isEditing ? `Updating ${editingEntry.title}` : 'Add new content to your site'}</p>
        </div>
      </div>

      <div className="form-card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <form onSubmit={handleSave} className="form-inputs">
          
          <div className="form-group">
            <label>Title *</label>
            <input
              className="input-control"
              type="text"
              required
              placeholder="Entry title"
              value={editingEntry.title || ''}
              onChange={(e) => setField('title', e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
            <div className="form-group">
              <label>Slug (auto)</label>
              <input
                className="input-control"
                type="text"
                placeholder="auto-generated"
                value={editingEntry.slug || ''}
                onChange={(e) => setField('slug', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                className="input-control"
                value={editingEntry.type || 'post'}
                onChange={(e) => setField('type', e.target.value)}
              >
                <option value="post">📝 Blog Post</option>
                <option value="article">📄 Article</option>
                <option value="event">📅 Event</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                className="input-control"
                value={editingEntry.status || 'draft'}
                onChange={(e) => setField('status', e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Excerpt</label>
            <textarea
              className="input-control"
              rows={2}
              style={{ resize: 'vertical' }}
              placeholder="Short description shown in listings..."
              value={editingEntry.excerpt || ''}
              onChange={(e) => setField('excerpt', e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>Content</label>
            <div data-color-mode="dark">
              <MDEditor
                value={editingEntry.content || ''}
                onChange={(v) => setField('content', v || '')}
                height={500}
                style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
              />
            </div>
          </div>

          {/* Author (Posts & Articles only) */}
          {(editingEntry.type === 'post' || editingEntry.type === 'article') && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px', fontWeight: 600 }}>Author Details</div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Author Name</label>
                <input
                  className="input-control"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={meta.author_name || ''}
                  onChange={(e) => setEditingEntry(setMeta(editingEntry, 'author_name', e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Event-specific fields */}
          {editingEntry.type === 'event' && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px', fontWeight: 600 }}>📅 Event Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Event Date</label>
                  <input
                    className="input-control"
                    type="date"
                    value={meta.event_date || ''}
                    onChange={(e) => setEditingEntry(setMeta(editingEntry, 'event_date', e.target.value))}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Location</label>
                  <input
                    className="input-control"
                    type="text"
                    placeholder="City or online"
                    value={meta.location || ''}
                    onChange={(e) => setEditingEntry(setMeta(editingEntry, 'location', e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Featured Image</label>
            <MediaManager
              value={editingEntry.featured_image_url || ''}
              onChange={(url) => setField('featured_image_url', url)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--glass-border)' }}>
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" style={{ margin: 0 }} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Entry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
