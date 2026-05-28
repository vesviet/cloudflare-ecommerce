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
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles
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
  { id: 'team', path: '/team', label: 'Team', roles: ['superadmin'], icon: Shield },
];

export const Sidebar: React.FC<SidebarProps> = ({ userRole, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const filteredItems = NAV_ITEMS.filter(item => !userRole || item.roles.includes(userRole));

  return (
    <aside className={cn('glass-panel sidebar', collapsed ? 'w-20' : 'w-64')} style={{ transition: 'width 0.3s ease', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
      {/* Brand + Toggle */}
      <div className="flex items-center justify-between p-6 mb-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-accent" />
            <h2 className="text-xl font-bold tracking-tight text-text-main m-0" style={{ fontFamily: 'var(--header-font)' }}>
              Aura
            </h2>
          </div>
        )}
        <button
          className={cn("p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-white/5 transition-colors", collapsed && "mx-auto")}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <ul className="flex-1 px-4 space-y-2 overflow-y-auto" style={{ listStyle: 'none' }}>
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <NavLink
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200",
                  "hover:bg-white/5",
                  isActive ? "bg-primary-glow text-primary-accent shadow-[0_0_15px_var(--primary-glow)]" : "text-text-muted",
                  collapsed && "justify-center"
                )}
                style={{ textDecoration: 'none' }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
              </NavLink>
            </li>
          );
        })}
      </ul>
      
      {/* Logout Button */}
      {onLogout && (
        <div className="p-4 mt-auto">
          <button 
            onClick={onLogout}
            className={cn(
              "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-200",
              "text-danger-accent bg-danger-glow/20 border border-danger-accent/20 hover:bg-danger-glow/40",
              collapsed && "justify-center"
            )}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium text-sm">Logout</span>}
          </button>
        </div>
      )}
    </aside>
  );
};
