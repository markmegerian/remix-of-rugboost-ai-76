import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { tenantQueryKeys } from '@/lib/tenantQueries';
import { useCompany } from './useCompany';
import { toast } from 'sonner';

export interface Job {
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
  company_id: string | null;
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
  company_id: string | null;
  inspections: { count: number }[];
}

export const useJobs = () => {
  const { companyId, loading: companyLoading } = useCompany();
  
  return useQuery({
    queryKey: tenantQueryKeys.jobs.list(companyId),
    queryFn: async (): Promise<Job[]> => {
      // RLS handles company scoping via get_user_company_id()
      const { data, error } = await supabase
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
          company_id,
          inspections:inspections(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the nested count structure
      return (data as unknown as JobsResponse[] || []).map(job => ({
        ...job,
        rug_count: job.inspections?.[0]?.count || 0,
        inspections: undefined, // Remove the nested object
      })) as Job[];
    },
    staleTime: 60000, // 1 minute - reduced network calls
    gcTime: 300000, // 5 minutes in cache
    enabled: !companyLoading, // Wait for company context
  });
};

export const useUpdateJobStatus = () => {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  
  return useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const { error } = await supabase
        .from('jobs')
        .update({ status })
        .eq('id', jobId);
      
      if (error) throw error;
      return { jobId, status };
    },
    onMutate: async ({ jobId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: tenantQueryKeys.jobs.list(companyId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      
      // Snapshot previous values
      const previousJobs = queryClient.getQueryData<Job[]>(tenantQueryKeys.jobs.list(companyId));
      const previousJobDetail = queryClient.getQueryData(queryKeys.jobs.detail(jobId));
      
      // Optimistically update jobs list
      queryClient.setQueryData<Job[]>(tenantQueryKeys.jobs.list(companyId), (old) => 
        old?.map(job => job.id === jobId ? { ...job, status } : job)
      );
      
      // Optimistically update job detail if it exists
      queryClient.setQueryData(queryKeys.jobs.detail(jobId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          job: old.job ? { ...old.job, status } : old.job,
        };
      });
      
      return { previousJobs, previousJobDetail, jobId };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousJobs) {
        queryClient.setQueryData(tenantQueryKeys.jobs.list(companyId), context.previousJobs);
      }
      if (context?.previousJobDetail && context?.jobId) {
        queryClient.setQueryData(queryKeys.jobs.detail(context.jobId), context.previousJobDetail);
      }
      toast.error('Failed to update status');
    },
    onSuccess: () => {
      toast.success('Status updated');
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: tenantQueryKeys.jobs.list(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(variables.jobId) });
    },
  });
};
