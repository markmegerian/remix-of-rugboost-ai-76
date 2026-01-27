import React, { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type AppRole = 'staff' | 'client' | 'admin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
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

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [],
  redirectTo = '/auth'
}) => {
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo);
    }
  }, [user, loading, navigate, redirectTo]);

  // Show loading state
  if (loading) {
    return <PageLoader />;
  }

  // No user - handled by useEffect redirect
  if (!user) {
    return null;
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !requiredRoles.some(r => roles.includes(r))) {
    // User doesn't have required role - redirect to appropriate page
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Admin-only route
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRoles={['admin']}>{children}</ProtectedRoute>
);

// Staff-only route
export const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRoles={['staff', 'admin']}>{children}</ProtectedRoute>
);

// Client-only route
export const ClientRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRoles={['client']} redirectTo="/client/auth">{children}</ProtectedRoute>
);

export default ProtectedRoute;
