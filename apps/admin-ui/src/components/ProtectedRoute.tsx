import React from 'react';
import { Navigate } from 'react-router-dom';

export const ROLE_ROUTES: Record<string, string[]> = {
  editor: ['/cms', '/categories', '/landing-pages', '/landing-leads'],
  support: ['/orders', '/customers', '/landing-leads'],
  manager: ['/overview', '/orders', '/products', '/categories', '/customers', '/cms', '/promotions', '/landing-pages', '/landing-leads'],
};

interface ProtectedRouteProps {
  userRole?: string;
  path: string;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ userRole, path, children }) => {
  if (!userRole || userRole === 'superadmin') {
    return <>{children}</>;
  }

  const allowedRoutes = ROLE_ROUTES[userRole];
  if (allowedRoutes) {
    if (!allowedRoutes.includes(path)) {
      const fallback = allowedRoutes[0] || '/overview';
      return <Navigate to={fallback} replace />;
    }
  }

  return <>{children}</>;
};
