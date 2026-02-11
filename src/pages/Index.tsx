import React, { useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import rugboostLogo from '@/assets/rugboost-logo.svg';

const Index = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isClient, isStaff, isAdmin } = useAuth();
  const { hasCompany, loading: companyLoading } = useCompany();

  useEffect(() => {
    // Wait for both auth and company context to load
    if (authLoading || (user && (isStaff || isAdmin) && companyLoading)) {
      return;
    }
    
    if (user) {
      // Route based on user role — staff/admin take priority over client
      if (isAdmin || isStaff) {
        // Staff and Admin - check if they have a company
        if (hasCompany) {
          navigate('/dashboard');
        } else {
          navigate('/company/setup');
        }
      } else if (isClient) {
        navigate('/client/dashboard');
      } else {
        // User has no roles yet - might be new staff signup
        navigate('/company/setup');
      }
    } else {
      navigate('/auth');
    }
  }, [user, authLoading, companyLoading, isClient, isStaff, isAdmin, hasCompany, navigate]);

  return (
    <div ref={ref} className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <img src={rugboostLogo} alt="RugBoost" className="h-16 w-16 mx-auto" />
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Loading RugBoost...</p>
      </div>
    </div>
  );
});

Index.displayName = 'Index';

export default Index;
