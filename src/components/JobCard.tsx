import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { getStatusBadge, getPaymentBadge } from '@/lib/jobBadges';
import { format } from 'date-fns';
import type { JobWithDetails } from '@/hooks/useJobsWithFilters';

interface JobCardProps {
  job: JobWithDetails;
}

const JobCard = ({ job }: JobCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      className="rounded-lg border border-border bg-card p-4 active:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/jobs/${job.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/jobs/${job.id}`)}
    >
      {/* Row 1: Client name + status */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground truncate">{job.client_name}</span>
        {getStatusBadge(job.status)}
      </div>

      {/* Row 2: Job number + date */}
      <div className="flex items-center justify-between gap-2 mt-1.5 text-sm text-muted-foreground">
        <span className="font-mono">{job.job_number}</span>
        <span>{format(new Date(job.created_at), 'MMM d, yyyy')}</span>
      </div>

      {/* Row 3: Rug count + payment */}
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <Badge variant="secondary">{job.rug_count} rugs</Badge>
        <div className="flex items-center gap-2">
          {job.total_amount > 0 && (
            <span className="text-sm font-medium text-foreground">${job.total_amount.toFixed(2)}</span>
          )}
          {getPaymentBadge(job.payment_status, job.total_amount)}
        </div>
      </div>
    </div>
  );
};

export default JobCard;
