import React, { useState } from 'react';

interface SidebarProps {
  tab: string;
  onTabChange: (tab: string) => void;
  userRole?: string;
  onLogout?: () => void;
}


const NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Overview',
    roles: ['superadmin', 'manager'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'orders',
    label: 'Orders',
    roles: ['superadmin', 'manager', 'support'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
  },
  {
    id: 'products',
    label: 'Products',
    roles: ['superadmin', 'manager'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      </svg>
    ),
  },
  {
    id: 'categories',
    label: 'Categories',
    roles: ['superadmin', 'manager', 'editor'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    id: 'customers',
    label: 'Customers',
    roles: ['superadmin', 'manager', 'support'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    id: 'cms',
    label: 'Content (CMS)',
    roles: ['superadmin', 'manager', 'editor'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    id: 'team',
    label: 'Team',
    roles: ['superadmin'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ tab, onTabChange, userRole, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = NAV_ITEMS.filter(item => !userRole || item.roles.includes(userRole));

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`} style={{ transition: 'width 0.25s ease, padding 0.25s ease', display: 'flex', flexDirection: 'column' }}>
      {/* Brand + Toggle */}
      <div className="brand-row">
        {!collapsed && (
          <div className="brand" style={{ margin: 0 }}>
            <h2>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span className="brand-text"> Aura</span>
            </h2>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={collapsed ? { margin: '0 auto 24px' } : {}}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {collapsed
              ? <><path d="M9 18l6-6-6-6" /></>
              : <><path d="M15 18l-6-6 6-6" /></>
            }
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <ul className="nav-links" style={{ flex: 1 }}>
        {filteredItems.map((item) => (
          <li
            key={item.id}
            className={`nav-item ${tab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <span className="nav-item-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </li>
        ))}
      </ul>
      
      {/* Logout Button */}
      {onLogout && (
        <div style={{ padding: '0 16px', marginBottom: '24px' }}>
          <button 
            onClick={onLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '12px',
              padding: collapsed ? '12px' : '12px 16px',
              background: 'rgba(255, 88, 88, 0.1)',
              border: '1px solid rgba(255, 88, 88, 0.2)',
              color: '#ff5858',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title={collapsed ? 'Logout' : undefined}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 88, 88, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 88, 88, 0.1)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {!collapsed && <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Logout</span>}
          </button>
        </div>
      )}
    </aside>
  );
};
