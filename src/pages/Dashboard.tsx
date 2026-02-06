import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Eye, Plus, LogOut, ChevronRight, PlayCircle, Clock, CheckCircle, Settings, Users, DollarSign, TrendingUp, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { useJobsWithFilters, JobWithDetails } from '@/hooks/useJobsWithFilters';
import { format } from 'date-fns';
import rugboostLogo from '@/assets/rugboost-logo.svg';
import NotificationBell from '@/components/NotificationBell';
import { DashboardSkeleton, DashboardJobTableSkeleton } from '@/components/skeletons/DashboardSkeleton';
import MobileNav from '@/components/MobileNav';
import JobsFilter, { JobFilters } from '@/components/JobsFilter';
import { BillingStatusBanner } from '@/components/BillingStatusBanner';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>;
    case 'in-progress':
      return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
          <Clock className="h-3 w-3" />
          In Progress
        </Badge>;
    default:
      return <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
          <PlayCircle className="h-3 w-3" />
          Active
        </Badge>;
  }
};

const getPaymentBadge = (paymentStatus: string | null, totalAmount: number) => {
  if (!totalAmount || totalAmount === 0) {
    return null;
  }
  
  if (paymentStatus === 'paid') {
    return (
      <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
        <CheckCircle className="h-3 w-3" />
        Paid
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
      <DollarSign className="h-3 w-3" />
      Pending
    </Badge>
  );
};

const DEFAULT_FILTERS: JobFilters = {
  search: '',
  status: 'all',
  paymentStatus: 'all',
  dateRange: 'all',
  client: 'all',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut, isStaff } = useAuth();
  const { company, branding, hasCompany, loading: companyLoading, isCompanyAdmin } = useCompany();
  const { isAdmin } = useAdminAuth();
  const { canCreateJobs, billingStatus } = usePlanFeatures();
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || companyLoading) {
    return <DashboardSkeleton />;
  }

  // Get display name from branding or company name
  const displayName = branding?.business_name || company?.name || 'RugBoost';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={displayName} className="h-10 w-10 object-contain" />
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
              onClick={() => navigate('/jobs/new')} 
              size="sm" 
              className="gap-2"
              disabled={!canCreateJobs}
              title={!canCreateJobs ? 'Subscription required to create new jobs' : undefined}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">New Job</span>
            </Button>
            {isAdmin && (
              <Button onClick={() => navigate('/admin/users')} variant="outline" size="sm" className="gap-2 hidden sm:flex">
                <Users className="h-4 w-4" />
                Users
              </Button>
            )}
            <NotificationBell />
            <Button onClick={() => navigate('/settings')} variant="ghost" size="icon" className="hidden sm:flex">
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={handleSignOut} variant="ghost" size="icon" className="hidden sm:flex">
              <LogOut className="h-4 w-4" />
            </Button>
            {/* Mobile Navigation */}
            <MobileNav isAdmin={isAdmin} onSignOut={handleSignOut} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Billing Status Banner */}
        <BillingStatusBanner />
        
        <div className="space-y-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalJobs}</p>
                    <p className="text-xs text-muted-foreground">Total Jobs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completedJobs}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <DollarSign className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.pendingPayments}</p>
                    <p className="text-xs text-muted-foreground">Pending Payment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">${stats.collectedRevenue.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Collected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <JobsFilter 
            filters={filters}
            onFiltersChange={setFilters}
            isAdmin={isAdmin}
            clients={uniqueClients}
            activeFilterCount={activeFilterCount}
          />

          {/* Jobs Table */}
          {isLoading ? (
            <DashboardJobTableSkeleton />
          ) : (
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Jobs
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredJobs.length} {activeFilterCount > 0 ? 'matching' : 'total'})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredJobs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{activeFilterCount > 0 ? 'No jobs match your filters' : 'No jobs found'}</p>
                    {activeFilterCount === 0 && (
                      <Button onClick={() => navigate('/jobs/new')} className="mt-4">
                        Create Your First Job
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Job #</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Rugs</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJobs.map((job: JobWithDetails) => (
                          <TableRow key={job.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/jobs/${job.id}`)}>
                            <TableCell className="font-medium">
                              {format(new Date(job.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="font-mono">{job.job_number}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{job.client_name}</div>
                                {job.client_email && (
                                  <div className="text-xs text-muted-foreground">{job.client_email}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{job.rug_count} rugs</Badge>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(job.status)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {getPaymentBadge(job.payment_status, job.total_amount)}
                                {job.total_amount > 0 && (
                                  <span className="text-sm font-medium">${job.total_amount.toFixed(2)}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Eye className="h-4 w-4" />
                                View
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
