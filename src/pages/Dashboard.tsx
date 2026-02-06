import React, { useState, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Settings, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { useJobsWithFilters } from '@/hooks/useJobsWithFilters';
import rugboostLogo from '@/assets/rugboost-logo.svg';
import NotificationBell from '@/components/NotificationBell';
import { DashboardSkeleton, DashboardJobTableSkeleton } from '@/components/skeletons/DashboardSkeleton';
import MobileNav from '@/components/MobileNav';
import JobsFilter, { JobFilters } from '@/components/JobsFilter';
import { BillingStatusBanner } from '@/components/BillingStatusBanner';
import StatsCards from '@/components/dashboard/StatsCards';
import JobsTable from '@/components/dashboard/JobsTable';
import { useEffect } from 'react';

const DEFAULT_FILTERS: JobFilters = {
  search: '',
  status: 'all',
  paymentStatus: 'all',
  dateRange: 'all',
  client: 'all',
};

// Memoized header component
const DashboardHeader = memo(({ 
  displayName, 
  logoUrl, 
  canCreateJobs, 
  isAdmin, 
  onNewJob, 
  onAdminUsers, 
  onSettings, 
  onSignOut 
}: {
  displayName: string;
  logoUrl: string | null;
  canCreateJobs: boolean;
  isAdmin: boolean;
  onNewJob: () => void;
  onAdminUsers: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}) => (
  <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
    <div className="container mx-auto flex items-center justify-between px-4 py-4">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt={displayName} className="h-10 w-10 object-contain" />
        ) : (
          <img src={rugboostLogo} alt="RugBoost" className="h-10 w-10 border-0" />
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground font-sans">{displayName}</h1>
          <p className="text-xs text-muted-foreground">Jobs</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          onClick={onNewJob} 
          size="sm" 
          className="gap-2"
          disabled={!canCreateJobs}
          title={!canCreateJobs ? 'Subscription required to create new jobs' : undefined}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden xs:inline">New Job</span>
        </Button>
        {isAdmin && (
          <Button onClick={onAdminUsers} variant="outline" size="sm" className="gap-2 hidden sm:flex">
            <Users className="h-4 w-4" />
            Users
          </Button>
        )}
        <NotificationBell />
        <Button onClick={onSettings} variant="ghost" size="icon" className="hidden sm:flex">
          <Settings className="h-4 w-4" />
        </Button>
        <Button onClick={onSignOut} variant="ghost" size="icon" className="hidden sm:flex">
          <LogOut className="h-4 w-4" />
        </Button>
        <MobileNav isAdmin={isAdmin} onSignOut={onSignOut} />
      </div>
    </div>
  </header>
));
DashboardHeader.displayName = 'DashboardHeader';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut, isStaff } = useAuth();
  const { company, branding, hasCompany, loading: companyLoading, isCompanyAdmin } = useCompany();
  const { isAdmin } = useAdminAuth();
  const { canCreateJobs } = usePlanFeatures();
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  
  const { 
    jobs: filteredJobs, 
    uniqueClients, 
    isLoading, 
    stats, 
    activeFilterCount 
  } = useJobsWithFilters(filters);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    // Redirect staff/admin users without a company to setup
    if (!authLoading && !companyLoading && user && isStaff && !hasCompany) {
      navigate('/company/setup');
    }
  }, [user, authLoading, companyLoading, hasCompany, isStaff, navigate]);

  // Memoized callbacks
  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/auth');
  }, [signOut, navigate]);

  const handleNewJob = useCallback(() => {
    navigate('/jobs/new');
  }, [navigate]);

  const handleAdminUsers = useCallback(() => {
    navigate('/admin/users');
  }, [navigate]);

  const handleSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  // Memoized filter change handler
  const handleFiltersChange = useCallback((newFilters: JobFilters) => {
    setFilters(newFilters);
  }, []);

  // Memoized display name
  const displayName = useMemo(() => 
    branding?.business_name || company?.name || 'RugBoost',
    [branding?.business_name, company?.name]
  );

  if (authLoading || companyLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        displayName={displayName}
        logoUrl={branding?.logo_url || null}
        canCreateJobs={canCreateJobs}
        isAdmin={isAdmin}
        onNewJob={handleNewJob}
        onAdminUsers={handleAdminUsers}
        onSettings={handleSettings}
        onSignOut={handleSignOut}
      />

      <main className="container mx-auto px-4 py-8">
        <BillingStatusBanner />
        
        <div className="space-y-6">
          <StatsCards
            totalJobs={stats.totalJobs}
            completedJobs={stats.completedJobs}
            pendingPayments={stats.pendingPayments}
            collectedRevenue={stats.collectedRevenue}
          />

          <JobsFilter 
            filters={filters}
            onFiltersChange={handleFiltersChange}
            isAdmin={isAdmin}
            clients={uniqueClients}
            activeFilterCount={activeFilterCount}
          />

          {isLoading ? (
            <DashboardJobTableSkeleton />
          ) : (
            <JobsTable
              jobs={filteredJobs}
              activeFilterCount={activeFilterCount}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
