import { useState, useRef, useEffect } from 'react';
import type { CmsEntry } from '../../types';
import MDEditor from '@uiw/react-md-editor';
import { GlassCard } from '../ui/GlassCard';
import { ArrowLeft, UploadCloud, Link as LinkIcon, X } from 'lucide-react';

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
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      <div className="flex border-b border-white/10 bg-white/5">
        <button 
          type="button" 
          className={`flex-1 py-2 text-sm font-medium transition-colors flex justify-center items-center gap-2 ${activeTab === 'url' ? 'bg-primary-accent/20 text-primary-accent border-b-2 border-primary-accent' : 'text-text-muted hover:bg-white/5'}`} 
          onClick={() => setActiveTab('url')}
        >
          <LinkIcon className="w-4 h-4" /> URL
        </button>
        <button 
          type="button" 
          className={`flex-1 py-2 text-sm font-medium transition-colors flex justify-center items-center gap-2 ${activeTab === 'upload' ? 'bg-primary-accent/20 text-primary-accent border-b-2 border-primary-accent' : 'text-text-muted hover:bg-white/5'}`} 
          onClick={() => setActiveTab('upload')}
        >
          <UploadCloud className="w-4 h-4" /> Upload
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'url' && (
          <div className="flex gap-2">
            <input
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-white/10 text-sm focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-all text-text-main"
              type="text"
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onBlur={handleUrlApply}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlApply()}
            />
            <button 
              type="button" 
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium" 
              onClick={handleUrlApply}
            >
              Apply
            </button>
          </div>
        )}

        {activeTab === 'upload' && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 ${dragging ? 'border-primary-accent bg-primary-accent/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <UploadCloud className="w-8 h-8 text-text-muted mb-2" />
            <p className="text-sm font-medium">Drop image here or click to browse</p>
            <small className="text-xs text-text-muted">PNG, JPG, GIF, WebP — max 5MB</small>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        )}

        {value && (
          <div className="mt-4 relative group rounded-lg overflow-hidden border border-white/10">
            <img src={value} alt="Featured preview" className="w-full h-auto max-h-[300px] object-cover" />
            <button
              type="button"
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger-accent"
              title="Remove image"
              onClick={() => { onChange(''); setUrlInput(''); }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
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
    <div className="w-full">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onCancel} 
          className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-text-muted hover:text-text-main"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-text-main m-0">{isEditing ? 'Edit Entry' : 'Create New Entry'}</h1>
          <p className="text-text-muted mt-1">{isEditing ? `Updating ${editingEntry.title}` : 'Add new content to your site'}</p>
        </div>
      </div>

      <GlassCard className="max-w-4xl mx-auto p-8">
        <form onSubmit={handleSave} className="space-y-6">
          
          <div>
            <label className="block text-sm text-text-muted mb-1">Title <span className="text-danger-accent">*</span></label>
            <input
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--glass-bg)] border border-white/10 text-lg focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-all text-text-main"
              type="text"
              required
              placeholder="Entry title"
              value={editingEntry.title || ''}
              onChange={(e) => setField('title', e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm text-text-muted mb-1">Slug (auto)</label>
              <input
                className="w-full px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-white/10 text-sm focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-all text-text-main"
                type="text"
                placeholder="auto-generated"
                value={editingEntry.slug || ''}
                onChange={(e) => setField('slug', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Type</label>
              <select
                className="w-full px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-white/10 text-sm focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-all text-text-main appearance-none"
                value={editingEntry.type || 'post'}
                onChange={(e) => setField('type', e.target.value)}
              >
                <option value="post">📝 Blog Post</option>
                <option value="article">📄 Article</option>
                <option value="event">📅 Event</option>
                <option value="banner">🖼️ Banner</option>
                <option value="landing_page">🚀 Landing Page</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Status</label>
              <select
                className="w-full px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-white/10 text-sm focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-all text-text-main appearance-none"
                value={editingEntry.status || 'draft'}
                onChange={(e) => setField('status', e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Excerpt</label>
            <textarea
              className="w-full px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-white/10 text-sm focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-all text-text-main min-h-[80px] resize-y"
              placeholder="Short description shown in listings..."
              value={editingEntry.excerpt || ''}
              onChange={(e) => setField('excerpt', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Content</label>
            <div data-color-mode="dark" className="rounded-lg overflow-hidden border border-white/10">
              <MDEditor
                value={editingEntry.content || ''}
                onChange={(v) => setField('content', v || '')}
                height={500}
                style={{ backgroundColor: 'var(--glass-bg)' }}
              />
            </div>
          </div>

          {/* Author (Posts & Articles only) */}
          {(editingEntry.type === 'post' || editingEntry.type === 'article') && (
            <div className="p-5 rounded-lg bg-white/5 border border-white/10">
              <div className="font-semibold mb-4 flex items-center gap-2">
                <span className="text-lg">✍️</span> Author Details
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Author Name</label>
                <input
                  className="w-full px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-white/10 text-sm focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-all text-text-main"
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
            <div className="p-5 rounded-lg bg-white/5 border border-white/10">
              <div className="font-semibold mb-4 flex items-center gap-2">
                <span className="text-lg">📅</span> Event Details
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Event Date</label>
                  <input
                    className="w-full px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-white/10 text-sm focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-all text-text-main"
                    type="date"
                    value={meta.event_date || ''}
                    onChange={(e) => setEditingEntry(setMeta(editingEntry, 'event_date', e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Location</label>
                  <input
                    className="w-full px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-white/10 text-sm focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-all text-text-main"
                    type="text"
                    placeholder="City or online"
                    value={meta.location || ''}
                    onChange={(e) => setEditingEntry(setMeta(editingEntry, 'location', e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Banner & Landing Page specific fields */}
          {(editingEntry.type === 'banner' || editingEntry.type === 'landing_page') && (
            <div className="p-5 rounded-lg bg-white/5 border border-white/10">
              <div className="font-semibold mb-4 flex items-center gap-2">
                <span className="text-lg">🎯</span> Placement Details
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Placement ID</label>
                  <input
                    className="w-full px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-white/10 text-sm focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-all text-text-main"
                    type="text"
                    placeholder="e.g. home_hero_slider"
                    value={editingEntry.placement || ''}
                    onChange={(e) => setField('placement', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Expires At (Optional)</label>
                  <input
                    className="w-full px-4 py-2 rounded-lg bg-[var(--glass-bg)] border border-white/10 text-sm focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-all text-text-main"
                    type="datetime-local"
                    value={editingEntry.expires_at ? new Date(editingEntry.expires_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setEditingEntry((prev) => ({ ...prev, expires_at: null }));
                      } else {
                        setEditingEntry((prev) => ({ ...prev, expires_at: new Date(val).getTime() }));
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-text-muted mb-1">Featured Image</label>
            <MediaManager
              value={editingEntry.featured_image_url || ''}
              onChange={(url) => setField('featured_image_url', url)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
            <button type="button" className="px-6 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors font-medium" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="px-6 py-2.5 rounded-lg bg-primary-accent hover:bg-primary-accent/80 text-white font-medium transition-colors shadow-[0_0_15px_var(--primary-glow)] disabled:opacity-50" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Entry')}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
