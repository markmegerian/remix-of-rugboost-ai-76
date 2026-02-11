import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useCompany } from '@/hooks/useCompany';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface CompanyGuardProps {
  children?: React.ReactNode;
  requireCompanyAdmin?: boolean;
  fallback?: React.ReactNode;
}

const LoadingState = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      <p className="text-sm text-muted-foreground">Loading company data...</p>
    </div>
  </div>
);

const NoCompanyState = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="max-w-md w-full">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Welcome to RugBoost</CardTitle>
        <CardDescription>
          Your account is not yet associated with a company. Please contact your administrator
          or create a new company to get started.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button className="w-full" asChild>
          <a href="/company/setup">Create Company</a>
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          If you were invited to join a company, please check your email for the invitation link.
        </p>
      </CardContent>
    </Card>
  </div>
);

const NotCompanyAdminState = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <Card className="max-w-md w-full">
      <CardHeader className="text-center">
        <CardTitle>Access Restricted</CardTitle>
        <CardDescription>
          This section requires company administrator privileges.
          Please contact your company admin for access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" variant="outline" asChild>
          <a href="/dashboard">Return to Dashboard</a>
        </Button>
      </CardContent>
    </Card>
  </div>
);

/**
 * CompanyGuard - Route protection for company-scoped pages
 * 
 * Ensures user has:
 * 1. Valid authentication
 * 2. Company membership
 * 3. Optionally: Company admin role
 */
export const CompanyGuard: React.FC<CompanyGuardProps> = ({
  children,
  requireCompanyAdmin = false,
  fallback,
}) => {
  const { user, loading: authLoading, isClient } = useAuth();
  const { hasCompany, isCompanyAdmin, loading: companyLoading } = useCompany();

  // Still loading
  if (authLoading || companyLoading) {
    return fallback || <LoadingState />;
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Client users don't need company access
  if (isClient) {
    return <Navigate to="/client/dashboard" replace />;
  }

  // No company membership
  if (!hasCompany) {
    return <NoCompanyState />;
  }

  // Requires company admin but user is not
  if (requireCompanyAdmin && !isCompanyAdmin) {
    return <NotCompanyAdminState />;
  }

  return children ? <>{children}</> : <Outlet />;
};

/**
 * CompanyAdminGuard - Shorthand for requireCompanyAdmin
 */
export const CompanyAdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <CompanyGuard requireCompanyAdmin>{children}</CompanyGuard>
);

export default CompanyGuard;
