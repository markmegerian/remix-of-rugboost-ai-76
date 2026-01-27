import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
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
}

export const useJobs = () => {
  return useQuery({
    queryKey: queryKeys.jobs.list(),
    queryFn: async (): Promise<Job[]> => {
      // Use a single query with nested count to avoid N+1
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
    staleTime: 30000, // 30 seconds
  });
};

export const useUpdateJobStatus = () => {
  const queryClient = useQueryClient();
  
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
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.list() });
      await queryClient.cancelQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      
      // Snapshot previous values
      const previousJobs = queryClient.getQueryData<Job[]>(queryKeys.jobs.list());
      const previousJobDetail = queryClient.getQueryData(queryKeys.jobs.detail(jobId));
      
      // Optimistically update jobs list
      queryClient.setQueryData<Job[]>(queryKeys.jobs.list(), (old) => 
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
        queryClient.setQueryData(queryKeys.jobs.list(), context.previousJobs);
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
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(variables.jobId) });
    },
  });
};
