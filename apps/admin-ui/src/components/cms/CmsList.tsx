import { useState, useRef, useEffect } from 'react';
import type { CmsEntry } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { SkeletonLoader } from '../ui/SkeletonLoader';
import { FileText, File, Calendar, Plus, Search, MoreHorizontal, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';

const FILTER_TYPES = ['all', 'post', 'article', 'event'] as const;
type FilterType = typeof FILTER_TYPES[number];
const TYPE_ICONS: Record<string, React.ReactNode> = { 
  post: <FileText className="w-4 h-4" />, 
  article: <File className="w-4 h-4" />, 
  event: <Calendar className="w-4 h-4" /> 
};

interface CmsListProps {
  entries: CmsEntry[];
  loading: boolean;
  onCreateNew: () => void;
  onEdit: (entry: CmsEntry) => void;
  onDelete: (id: string) => Promise<void>;
  onQuickPublish: (entry: CmsEntry) => Promise<void>;
}

export function CmsList({ entries, loading, onCreateNew, onEdit, onDelete, onQuickPublish }: CmsListProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  
  // Contextual menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = entries.filter((e) => {
    const matchType = filter === 'all' || e.type === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-main m-0">Content (CMS)</h1>
          <p className="text-text-muted mt-1">Manage your posts, articles, and events.</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-accent hover:bg-primary-accent/80 text-white font-medium transition-colors shadow-[0_0_15px_var(--primary-glow)]"
          onClick={onCreateNew}
        >
          <Plus className="w-4 h-4" />
          <span>New Entry</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2 p-1 rounded-lg bg-white/5 border border-white/10 w-fit">
          {FILTER_TYPES.map((t) => (
            <button
              key={t}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${filter === t ? 'bg-primary-accent text-white' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
              onClick={() => setFilter(t)}
            >
              {t !== 'all' && TYPE_ICONS[t]}
              {t === 'all' ? 'All Content' : `${t.charAt(0).toUpperCase() + t.slice(1)}s`}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-primary-accent focus:ring-1 focus:ring-primary-accent transition-all text-text-main"
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <GlassCard className="overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="p-6 space-y-4">
            <SkeletonLoader height="64px" />
            <SkeletonLoader height="64px" />
            <SkeletonLoader height="64px" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-text-muted bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium">Entry</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                  <th className="px-6 py-4 font-medium w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="text-center py-16 flex flex-col items-center">
                        <FileText className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                        <h4 className="text-lg font-medium text-text-main mb-2">No entries found</h4>
                        <p className="text-sm text-text-muted mb-6">{search ? `No results for "${search}"` : 'Create your first content entry to get started.'}</p>
                        {!search && <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium" onClick={onCreateNew}>Create First Entry</button>}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((entry) => (
                    <tr key={entry.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onEdit(entry)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          {entry.featured_image_url ? (
                            <img className="w-12 h-12 object-cover rounded-lg border border-white/10" src={entry.featured_image_url} alt="" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-text-muted">
                              {TYPE_ICONS[entry.type] || <FileText className="w-5 h-5" />}
                            </div>
                          )}
                          <div>
                            <strong className="block text-text-main text-sm mb-0.5">{entry.title}</strong>
                            <span className="text-xs text-text-muted font-mono bg-white/5 px-1.5 py-0.5 rounded">/{entry.slug}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-text-muted capitalize">
                          {TYPE_ICONS[entry.type]} {entry.type}
                        </div>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => { e.stopPropagation(); onQuickPublish(entry); }}>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:opacity-80 transition-opacity ${
                          entry.status === 'published' 
                            ? 'bg-success-accent/15 text-success-accent border border-success-accent/30' 
                            : entry.status === 'draft'
                            ? 'bg-warning-accent/15 text-warning-accent border border-warning-accent/30'
                            : 'bg-white/10 text-text-muted border border-white/20'
                        }`} title="Click to toggle status">
                          {entry.status === 'published' ? <CheckCircle className="w-3 h-3" /> : null}
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-muted">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center relative" onClick={(e) => e.stopPropagation()}>
                        <div ref={openMenuId === entry.id ? menuRef : undefined}>
                          <button
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-white/10 transition-colors"
                            onClick={() => setOpenMenuId(openMenuId === entry.id ? null : entry.id)}
                          >
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                          {openMenuId === entry.id && (
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 w-40 bg-[var(--glass-bg)] backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-10 py-1">
                              <button 
                                className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-white/10 flex items-center gap-2"
                                onClick={() => { setOpenMenuId(null); onEdit(entry); }}
                              >
                                <Edit2 className="w-4 h-4" /> Edit
                              </button>
                              <button 
                                className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-white/10 flex items-center gap-2"
                                onClick={() => { setOpenMenuId(null); onQuickPublish(entry); }}
                              >
                                {entry.status === 'published' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                {entry.status === 'published' ? 'Unpublish' : 'Publish'}
                              </button>
                              <div className="h-px bg-white/10 my-1" />
                              <button 
                                className="w-full text-left px-4 py-2 text-sm text-danger-accent hover:bg-danger-accent/10 flex items-center gap-2"
                                onClick={() => { setOpenMenuId(null); onDelete(entry.id); }}
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
