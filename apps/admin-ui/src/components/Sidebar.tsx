import React from 'react';

interface SidebarProps {
  tab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ tab, onTabChange }) => {
  return (
    <aside className="sidebar">
      <div className="brand">
        <h2>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          {" "}Aura Admin
        </h2>
      </div>
      <ul className="nav-links">
        <li className={`nav-item ${tab === 'overview' ? 'active' : ''}`} onClick={() => onTabChange('overview')}>Overview</li>
        <li className={`nav-item ${tab === 'orders' ? 'active' : ''}`} onClick={() => onTabChange('orders')}>Orders</li>
        <li className={`nav-item ${tab === 'products' ? 'active' : ''}`} onClick={() => onTabChange('products')}>Products</li>
        <li className={`nav-item ${tab === 'categories' ? 'active' : ''}`} onClick={() => onTabChange('categories')}>Categories</li>
        <li className={`nav-item ${tab === 'customers' ? 'active' : ''}`} onClick={() => onTabChange('customers')}>Customers</li>
      </ul>
    </aside>
  );
};
