import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';

/**
 * Fetches the next suggested job number for the company.
 * Format: JOB-YYYY-NNN (e.g. JOB-2025-001)
 */
export function useNextJobNumber() {
  const { companyId } = useCompany();

  const { data: nextNumber, isLoading } = useQuery({
    queryKey: ['nextJobNumber', companyId],
    queryFn: async (): Promise<string> => {
      if (!companyId) return `JOB-${new Date().getFullYear()}-001`;

      const year = new Date().getFullYear();
      const prefix = `JOB-${year}-`;

      const { data, error } = await supabase
        .from('jobs')
        .select('job_number')
        .eq('company_id', companyId)
        .like('job_number', `${prefix}%`);

      if (error) throw error;

      let maxSeq = 0;
      const yearPrefix = `JOB-${year}-`;
      (data || []).forEach((row) => {
        const jn = row.job_number || '';
        if (jn.startsWith(yearPrefix)) {
          const suffix = jn.slice(yearPrefix.length);
          const seq = parseInt(suffix, 10);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      });

      const nextSeq = maxSeq + 1;
      return `${prefix}${String(nextSeq).padStart(3, '0')}`;
    },
    enabled: !!companyId,
    staleTime: 10000,
  });

  return { nextJobNumber: nextNumber ?? `JOB-${new Date().getFullYear()}-001`, isLoading };
}
