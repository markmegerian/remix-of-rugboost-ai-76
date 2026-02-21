import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Eye, Plus, LogOut, ChevronRight, ChevronDown, Settings, Users, TrendingUp, CheckCircle, Clock, DollarSign, Search } from 'lucide-react';
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
import { getStatusBadge, getPaymentBadge } from '@/lib/jobBadges';
import JobCard from '@/components/JobCard';
import PullToRefresh from '@/components/PullToRefresh';
import EmptyState from '@/components/EmptyState';
import { useSearchContext } from '@/contexts/SearchContext';
import QuickCreateJobSheet from '@/components/QuickCreateJobSheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const searchContext = useSearchContext();
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  
  const { 
    jobs: filteredJobs, 
    uniqueClients, 
    isLoading, 
    stats, 
    activeFilterCount,
    refetch,
  } = useJobsWithFilters(filters);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
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

  const displayName = branding?.business_name || company?.name || 'RugBoost';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md pt-safe-top">
        <div className="container mx-auto flex items-center justify-between px-4 py-2.5 md:py-4">
          <div className="flex items-center gap-2 md:gap-3">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt={displayName} className="h-8 w-8 md:h-10 md:w-10 object-contain" />
            ) : (
              <img src={rugboostLogo} alt="RugBoost" className="h-8 w-8 md:h-10 md:w-10 border-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-foreground font-sans truncate">{displayName}</h1>
              <p className="text-xs text-muted-foreground hidden md:block">Jobs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex">
              <Button 
                onClick={() => navigate('/jobs/new')} 
                size="sm" 
                className="gap-2 min-h-[44px] rounded-r-none"
                disabled={!canCreateJobs}
                title={!canCreateJobs ? 'Subscription required to create new jobs' : undefined}
                aria-label="Create new job"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden md:inline">New Job</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="default"
                    className="min-h-[44px] rounded-l-none px-2 border-l border-primary-foreground/20"
                    disabled={!canCreateJobs}
                    aria-label="More create options"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setQuickCreateOpen(true)}>
                    Quick create (minimal form)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <QuickCreateJobSheet open={quickCreateOpen} onOpenChange={setQuickCreateOpen} />
            {isAdmin && (
              <Button onClick={() => navigate('/admin/users')} variant="outline" size="sm" className="gap-2 hidden md:flex">
                <Users className="h-4 w-4" />
                Users
              </Button>
            )}
            {searchContext && (
              <Button onClick={searchContext.openSearch} variant="ghost" size="icon" aria-label="Search jobs (⌘K)">
                <Search className="h-4 w-4" />
              </Button>
            )}
            <NotificationBell />
            <Button onClick={() => navigate('/settings')} variant="ghost" size="icon" className="hidden md:flex" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={handleSignOut} variant="ghost" size="icon" className="hidden md:flex" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
            <MobileNav isAdmin={isAdmin} onSignOut={handleSignOut} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <BillingStatusBanner />
        
        <div className="space-y-6">
          {/* Stats Summary - Mobile: horizontal scroll, Desktop: grid */}
          {(() => {
            const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
            const cards = [
              { icon: Briefcase, bg: 'bg-primary/10', color: 'text-primary', value: stats.totalJobs, label: 'Total Jobs' },
              { icon: CheckCircle, bg: 'bg-success/10', color: 'text-success', value: stats.completedJobs, label: 'Completed' },
              { icon: DollarSign, bg: 'bg-warning/10', color: 'text-warning', value: stats.pendingPayments, label: 'Pending Payment' },
              { icon: TrendingUp, bg: 'bg-info/10', color: 'text-info', value: currencyFmt.format(stats.collectedRevenue), label: 'Collected', raw: true },
            ];
            const renderCard = (c: typeof cards[number], i: number, extraClass?: string) => {
              const Icon = c.icon;
              const delay = i * 50;
              return (
                <Card
                  key={i}
                  className={`bg-card animate-fade-in-up ${extraClass ?? ''}`}
                  style={delay > 0 ? { animationDelay: `${delay}ms`, opacity: 0 } : undefined}
                  aria-label={`${c.label}: ${c.raw ? c.value : c.value}`}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${c.bg}`}>
                        <Icon className={`h-5 w-5 ${c.color}`} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{c.raw ? c.value : c.value}</p>
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            };
            return (
              <>
                {/* Mobile: horizontal scroll strip */}
                <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory md:hidden -mx-4 px-4" aria-label="Dashboard statistics">
                  {cards.map((c, i) => renderCard(c, i, 'min-w-[160px] flex-shrink-0 snap-start'))}
                </div>
                {/* Desktop: grid */}
                <div className="hidden md:grid md:grid-cols-4 gap-4" aria-label="Dashboard statistics">
                  {cards.map((c, i) => renderCard(c, i))}
                </div>
              </>
            );
          })()}

          {/* Filters */}
          <div className="animate-fade-in-up" style={{ animationDelay: '200ms', opacity: 0 }}>
            <JobsFilter 
              filters={filters}
              onFiltersChange={setFilters}
              isAdmin={isAdmin}
              clients={uniqueClients}
              activeFilterCount={activeFilterCount}
            />
          </div>

          {/* Jobs List */}
          {isLoading ? (
            <DashboardJobTableSkeleton />
          ) : (
            <Card className="shadow-medium animate-fade-in-up" style={{ animationDelay: '250ms', opacity: 0 }} aria-label="Job list">
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
                  <EmptyState
                    icon={Briefcase}
                    title={activeFilterCount > 0 ? 'No jobs match your filters' : 'No jobs yet'}
                    description={activeFilterCount > 0 ? 'Try adjusting your filters to see more jobs.' : 'Create your first job to get started.'}
                    action={
                      activeFilterCount === 0
                        ? { label: 'Create your first job', onClick: () => navigate('/jobs/new') }
                        : undefined
                    }
                    secondaryAction={
                      activeFilterCount > 0
                        ? { label: 'Clear filters', onClick: () => setFilters(DEFAULT_FILTERS) }
                        : undefined
                    }
                  />
                ) : (
                  <>
                    {/* Mobile card list with pull-to-refresh */}
                    <PullToRefresh onRefresh={refetch} className="md:hidden space-y-3">
                      <div role="list">
                        {filteredJobs.map((job: JobWithDetails) => (
                          <JobCard key={job.id} job={job} />
                        ))}
                      </div>
                    </PullToRefresh>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
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
                  </>
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
