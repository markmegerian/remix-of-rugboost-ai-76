import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type AppRole = 'staff' | 'client' | 'admin';

interface ProtectedRouteProps {
  requiredRole?: AppRole;
  redirectTo?: string;
}

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  requiredRole,
  redirectTo = '/auth'
}) => {
  const { user, loading, roles } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (requiredRole && !roles.includes(requiredRole)) {
    // Authenticated but wrong role — redirect appropriately
    if (roles.includes('client')) {
      return <Navigate to="/client/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
