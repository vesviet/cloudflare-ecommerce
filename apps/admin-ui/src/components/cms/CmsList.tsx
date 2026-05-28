import { useState, useRef, useEffect } from 'react';
import type { CmsEntry } from '../../types';

const FILTER_TYPES = ['all', 'post', 'article', 'event'] as const;
type FilterType = typeof FILTER_TYPES[number];
const TYPE_ICONS: Record<string, string> = { post: '📝', article: '📄', event: '📅' };

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
    <div className="tab-pane active">
      {/* Page Header */}
      <div className="tab-header">
        <div>
          <h2>Content (CMS)</h2>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0 0' }}>Manage your posts, articles, and events.</p>
        </div>
        <button className="btn-submit" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={onCreateNew}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Entry
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="toolbar">
        <div className="filter-tabs">
          {FILTER_TYPES.map((t) => (
            <button
              key={t}
              className={`filter-tab ${filter === t ? 'active' : ''}`}
              onClick={() => setFilter(t)}
            >
              {t === 'all' ? 'All' : `${TYPE_ICONS[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}s`}
            </button>
          ))}
        </div>
        <div className="search-input-wrapper">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="table-container">
          {[1,2,3].map((i) => (
            <div key={i} className="shimmer" style={{ height: '60px', margin: '1px 0' }} />
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Entry</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ width: '48px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                      </div>
                      <h4>No entries found</h4>
                      <p>{search ? `No results for "${search}"` : 'Create your first content entry to get started.'}</p>
                      {!search && <button className="btn-primary" onClick={onCreateNew}>Create First Entry</button>}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => (
                  <tr key={entry.id} style={{ cursor: 'pointer' }} onClick={() => onEdit(entry)} className="hoverable-row">
                    <td>
                      <div className="cms-title-cell">
                        {entry.featured_image_url ? (
                          <img className="cms-table-thumbnail" src={entry.featured_image_url} alt="" />
                        ) : (
                          <div className="cms-table-thumbnail-placeholder">
                            {TYPE_ICONS[entry.type] || '📄'}
                          </div>
                        )}
                        <div className="cms-title-text">
                          <strong>{entry.title}</strong>
                          <small>/{entry.slug}</small>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px', textTransform: 'capitalize' }}>
                      {TYPE_ICONS[entry.type]} {entry.type}
                    </td>
                    <td onClick={(e) => { e.stopPropagation(); onQuickPublish(entry); }}>
                      <span className={`badge badge-${entry.status}`} title="Click to toggle">
                        {entry.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="action-menu-wrapper" ref={openMenuId === entry.id ? menuRef : undefined}>
                        <button
                          className="btn-action-menu"
                          title="Actions"
                          onClick={() => setOpenMenuId(openMenuId === entry.id ? null : entry.id)}
                        >
                          ···
                        </button>
                        {openMenuId === entry.id && (
                          <div className="action-dropdown">
                            <button onClick={() => onEdit(entry)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                              Edit
                            </button>
                            <button onClick={() => { setOpenMenuId(null); onQuickPublish(entry); }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                              {entry.status === 'published' ? 'Unpublish' : 'Publish'}
                            </button>
                            <div className="action-dropdown-divider" />
                            <button className="danger" onClick={() => { setOpenMenuId(null); onDelete(entry.id); }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>
                              Delete
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
    </div>
  );
}
