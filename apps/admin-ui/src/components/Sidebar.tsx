import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Tags, 
  Users, 
  FileText, 
  Shield, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Gift,
  Zap,
  MonitorPlay
} from 'lucide-react';
import { cn } from './ui/GlassCard';

interface SidebarProps {
  userRole?: string;
  onLogout?: () => void;
}

const NAV_ITEMS = [
  { id: 'overview', path: '/overview', label: 'Overview', roles: ['superadmin', 'manager'], icon: LayoutDashboard },
  { id: 'orders', path: '/orders', label: 'Orders', roles: ['superadmin', 'manager', 'support'], icon: ShoppingCart },
  { id: 'products', path: '/products', label: 'Products', roles: ['superadmin', 'manager'], icon: Package },
  { id: 'categories', path: '/categories', label: 'Categories', roles: ['superadmin', 'manager', 'editor'], icon: Tags },
  { id: 'customers', path: '/customers', label: 'Customers', roles: ['superadmin', 'manager', 'support'], icon: Users },
  { id: 'cms', path: '/cms', label: 'Content (CMS)', roles: ['superadmin', 'manager', 'editor'], icon: FileText },
  { id: 'promotions', path: '/promotions', label: 'Promotions', roles: ['superadmin', 'manager'], icon: Gift },
  { id: 'promotion-rules', path: '/promotion-rules', label: 'Promotion Rules', roles: ['superadmin', 'manager'], icon: Sparkles },
  { id: 'flash-sales', path: '/flash-sales', label: 'Flash Sales', roles: ['superadmin', 'manager'], icon: Zap },
  { id: 'landing-pages', path: '/landing-pages', label: 'Landing Pages', roles: ['superadmin', 'manager', 'editor'], icon: MonitorPlay },
  { id: 'landing-leads', path: '/landing-leads', label: 'Landing Leads', roles: ['superadmin', 'manager', 'support', 'editor'], icon: Users },
  { id: 'team', path: '/team', label: 'Team', roles: ['superadmin'], icon: Shield },
  { id: 'settings', path: '/settings', label: 'Settings', roles: ['superadmin', 'manager'], icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ userRole, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const filteredItems = userRole ? NAV_ITEMS.filter(item => item.roles.includes(userRole)) : [];

  return (
    <aside className={cn('sidebar', collapsed ? 'collapsed' : '')}>
      {/* Brand + Toggle */}
      <div className="brand-row">
        {!collapsed && (
          <div className="brand">
            <h2>
              <Sparkles className="w-6 h-6 text-primary-accent" />
              Aura
            </h2>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <ul className="nav-links">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <NavLink
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => cn(
                  "nav-item",
                  isActive ? "active" : ""
                )}
                style={{ textDecoration: 'none' }}
              >
                <Icon className="nav-item-icon" />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
      
      {/* Logout Button */}
      {onLogout && (
        <div style={{ marginTop: 'auto', padding: '20px 0 0' }}>
          <button 
            onClick={onLogout}
            className="btn-refund"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      )}
    </aside>
  );
};
