import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isThisWeek, isThisMonth, isToday, parseISO, subDays } from 'date-fns';
import { useCompany } from './useCompany';
import { tenantQueryKeys } from '@/lib/tenantQueries';
import type { JobFilters } from '@/components/JobsFilter';

export interface JobWithDetails {
  id: string;
  job_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  payment_status: string | null;
  rug_count: number;
  total_amount: number;
}

interface JobsResponse {
  id: string;
  job_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  payment_status: string | null;
  inspections: { count: number }[];
  approved_estimates: { total_amount: number }[];
}

export const useJobsWithFilters = (filters: JobFilters) => {
  const { companyId, loading: companyLoading } = useCompany();
  
  // Fetch all jobs with related data - scoped to company
  const { data: jobs = [], isLoading, isError, refetch } = useQuery({
    queryKey: [...tenantQueryKeys.jobs.list(companyId), 'with-details'],
    queryFn: async (): Promise<JobWithDetails[]> => {
      let query = supabase
        .from('jobs')
        .select(`
          id,
          job_number,
          client_name,
          client_email,
          client_phone,
          notes,
          status,
          created_at,
          payment_status,
          inspections:inspections(count),
          approved_estimates:approved_estimates(total_amount)
        `)
        .order('created_at', { ascending: false });

      // RLS will handle the scoping, but we can be explicit for company context
      // The database trigger auto-sets company_id, so RLS policies do the filtering

      const { data, error } = await query;

      if (error) throw error;

      return (data as unknown as JobsResponse[] || []).map(job => ({
        id: job.id,
        job_number: job.job_number,
        client_name: job.client_name,
        client_email: job.client_email,
        client_phone: job.client_phone,
        notes: job.notes,
        status: job.status,
        created_at: job.created_at,
        payment_status: job.payment_status,
        rug_count: job.inspections?.[0]?.count || 0,
        total_amount: (job.approved_estimates || []).reduce(
          (sum, est) => sum + (est.total_amount || 0), 0
        ),
      }));
    },
    staleTime: 30000,
    enabled: !companyLoading, // Wait for company context to load
  });

  // Extract unique client names for the filter dropdown
  const uniqueClients = useMemo(() => {
    const clients = new Set(jobs.map(job => job.client_name));
    return Array.from(clients).sort();
  }, [jobs]);

  // Apply filters client-side for instant feedback
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search filter
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = !filters.search || 
        job.client_name.toLowerCase().includes(searchLower) ||
        job.job_number.toLowerCase().includes(searchLower) ||
        (job.client_email?.toLowerCase().includes(searchLower) ?? false);

      // Status filter
      const matchesStatus = filters.status === 'all' || job.status === filters.status;

      // Payment status filter
      let matchesPayment = true;
      if (filters.paymentStatus !== 'all') {
        if (filters.paymentStatus === 'pending') {
          matchesPayment = !job.payment_status || job.payment_status === 'pending';
        } else if (filters.paymentStatus === 'paid') {
          matchesPayment = job.payment_status === 'paid';
        } else if (filters.paymentStatus === 'overdue') {
          // Jobs older than 30 days without payment
          const jobDate = parseISO(job.created_at);
          const thirtyDaysAgo = subDays(new Date(), 30);
          matchesPayment = (!job.payment_status || job.payment_status === 'pending') && 
                           jobDate < thirtyDaysAgo;
        }
      }

      // Date range filter
      let matchesDate = true;
      if (filters.dateRange !== 'all') {
        const jobDate = parseISO(job.created_at);
        switch (filters.dateRange) {
          case 'today':
            matchesDate = isToday(jobDate);
            break;
          case 'week':
            matchesDate = isThisWeek(jobDate);
            break;
          case 'month':
            matchesDate = isThisMonth(jobDate);
            break;
          case 'quarter':
            const threeMonthsAgo = subDays(new Date(), 90);
            matchesDate = jobDate >= threeMonthsAgo;
            break;
        }
      }

      // Client filter
      const matchesClient = filters.client === 'all' || job.client_name === filters.client;

      return matchesSearch && matchesStatus && matchesPayment && matchesDate && matchesClient;
    });
  }, [jobs, filters]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalJobs = filteredJobs.length;
    const completedJobs = filteredJobs.filter(j => j.status === 'completed').length;
    const pendingPayments = filteredJobs.filter(j => 
      !j.payment_status || j.payment_status === 'pending'
    ).length;
    const paidJobs = filteredJobs.filter(j => j.payment_status === 'paid').length;
    const totalRevenue = filteredJobs.reduce((sum, j) => sum + j.total_amount, 0);
    const collectedRevenue = filteredJobs
      .filter(j => j.payment_status === 'paid')
      .reduce((sum, j) => sum + j.total_amount, 0);

    return {
      totalJobs,
      completedJobs,
      pendingPayments,
      paidJobs,
      totalRevenue,
      collectedRevenue,
    };
  }, [filteredJobs]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.paymentStatus !== 'all') count++;
    if (filters.dateRange !== 'all') count++;
    if (filters.client !== 'all') count++;
    return count;
  }, [filters]);

  return {
    jobs: filteredJobs,
    allJobs: jobs,
    uniqueClients,
    isLoading,
    isError,
    refetch,
    stats,
    activeFilterCount,
  };
};
