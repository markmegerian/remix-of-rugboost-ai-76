import React, { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Eye, ChevronRight, PlayCircle, Clock, CheckCircle, DollarSign, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { JobWithDetails } from '@/hooks/useJobsWithFilters';

interface JobsTableProps {
  jobs: JobWithDetails[];
  activeFilterCount: number;
}

// Memoized badge components to prevent re-renders
const StatusBadge = memo(({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      );
    case 'in-progress':
      return (
        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
          <Clock className="h-3 w-3" />
          In Progress
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
          <PlayCircle className="h-3 w-3" />
          Active
        </Badge>
      );
  }
});
StatusBadge.displayName = 'StatusBadge';

const PaymentBadge = memo(({ paymentStatus, totalAmount }: { paymentStatus: string | null; totalAmount: number }) => {
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
});
PaymentBadge.displayName = 'PaymentBadge';

// Memoized table row
const JobRow = memo(({ job, onClick }: { job: JobWithDetails; onClick: () => void }) => (
  <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onClick}>
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
      <StatusBadge status={job.status} />
    </TableCell>
    <TableCell>
      <div className="flex flex-col gap-1">
        <PaymentBadge paymentStatus={job.payment_status} totalAmount={job.total_amount} />
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
));
JobRow.displayName = 'JobRow';

const JobsTable = memo(({ jobs, activeFilterCount }: JobsTableProps) => {
  const navigate = useNavigate();

  const handleRowClick = useCallback((jobId: string) => {
    navigate(`/jobs/${jobId}`);
  }, [navigate]);

  const handleNewJob = useCallback(() => {
    navigate('/jobs/new');
  }, [navigate]);

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Jobs
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({jobs.length} {activeFilterCount > 0 ? 'matching' : 'total'})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{activeFilterCount > 0 ? 'No jobs match your filters' : 'No jobs found'}</p>
            {activeFilterCount === 0 && (
              <Button onClick={handleNewJob} className="mt-4">
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
                {jobs.map((job) => (
                  <JobRow 
                    key={job.id} 
                    job={job} 
                    onClick={() => handleRowClick(job.id)} 
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

JobsTable.displayName = 'JobsTable';

export default JobsTable;
