import React from 'react';
import { 
  Calendar, Truck, Search, FileText, ThumbsUp, CreditCard, 
  Wrench, CheckCircle2, Package, Home, Lock,
  ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Job workflow statuses in order
export const JOB_STATUSES = [
  { value: 'intake_scheduled', label: 'Intake Scheduled', icon: Calendar, description: 'Pickup appointment set' },
  { value: 'picked_up', label: 'Picked Up', icon: Truck, description: 'Rugs collected from client' },
  { value: 'inspected', label: 'Inspected', icon: Search, description: 'AI analysis complete' },
  { value: 'estimate_sent', label: 'Estimate Sent', icon: FileText, description: 'Client portal link shared' },
  { value: 'approved_unpaid', label: 'Approved', icon: ThumbsUp, description: 'Client approved services' },
  { value: 'paid', label: 'Paid', icon: CreditCard, description: 'Payment received' },
  { value: 'in_service', label: 'In Service', icon: Wrench, description: 'Work in progress' },
  { value: 'ready', label: 'Ready', icon: CheckCircle2, description: 'Services complete' },
  { value: 'delivery_scheduled', label: 'Delivery Scheduled', icon: Package, description: 'Return appointment set' },
  { value: 'delivered', label: 'Delivered', icon: Home, description: 'Returned to client' },
  { value: 'closed', label: 'Closed', icon: Lock, description: 'Job complete' },
] as const;

export type JobStatus = typeof JOB_STATUSES[number]['value'];

// Map legacy statuses to new workflow statuses
export function mapLegacyStatus(status: string, paymentStatus?: string | null, hasAnalysis?: boolean, hasPortalLink?: boolean): JobStatus {
  // If paid
  if (paymentStatus === 'paid' || paymentStatus === 'completed') {
    if (status === 'completed') return 'closed';
    if (status === 'in-progress') return 'in_service';
    return 'paid';
  }
  
  // Map legacy statuses
  switch (status) {
    case 'completed':
      return 'closed';
    case 'in-progress':
      return hasPortalLink ? 'approved_unpaid' : 'inspected';
    case 'active':
    default:
      if (hasPortalLink) return 'estimate_sent';
      if (hasAnalysis) return 'inspected';
      return 'picked_up';
  }
}

// Get the next actionable step based on current status
export function getNextAction(status: JobStatus): { label: string; action: string } | null {
  switch (status) {
    case 'intake_scheduled':
      return { label: 'Mark as Picked Up', action: 'pickup' };
    case 'picked_up':
      return { label: 'Analyze Rugs', action: 'analyze' };
    case 'inspected':
      return { label: 'Send to Client', action: 'send_estimate' };
    case 'estimate_sent':
      return { label: 'Awaiting Client Approval', action: 'waiting' };
    case 'approved_unpaid':
      return { label: 'Awaiting Payment', action: 'waiting' };
    case 'paid':
      return { label: 'Begin Work', action: 'start_service' };
    case 'in_service':
      return { label: 'Mark as Ready', action: 'complete_service' };
    case 'ready':
      return { label: 'Schedule Delivery', action: 'schedule_delivery' };
    case 'delivery_scheduled':
      return { label: 'Mark as Delivered', action: 'deliver' };
    case 'delivered':
      return { label: 'Close Job', action: 'close' };
    case 'closed':
      return null;
    default:
      return null;
  }
}

interface JobTimelineProps {
  currentStatus: JobStatus;
  onStatusChange?: (newStatus: JobStatus) => void;
  onAction?: (action: string) => void;
  className?: string;
  compact?: boolean;
}

const JobTimeline: React.FC<JobTimelineProps> = ({
  currentStatus,
  onStatusChange,
  onAction,
  className,
  compact = false,
}) => {
  const currentIndex = JOB_STATUSES.findIndex(s => s.value === currentStatus);
  const nextAction = getNextAction(currentStatus);

  if (compact) {
    // Compact horizontal view showing current + next
    const currentStatusConfig = JOB_STATUSES.find(s => s.value === currentStatus);
    const CurrentIcon = currentStatusConfig?.icon || CheckCircle2;
    
    return (
      <div className={cn("flex items-center gap-4", className)}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CurrentIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{currentStatusConfig?.label}</p>
            <p className="text-xs text-muted-foreground">{currentStatusConfig?.description}</p>
          </div>
        </div>
        {nextAction && nextAction.action !== 'waiting' && onAction && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Button 
              size="sm" 
              onClick={() => onAction(nextAction.action)}
              className="gap-1"
            >
              {nextAction.label}
              <ChevronRight className="h-3 w-3" />
            </Button>
          </>
        )}
        {nextAction && nextAction.action === 'waiting' && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-muted-foreground">
              {nextAction.label}
            </Badge>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {/* Timeline */}
      <div className="relative flex items-start gap-1 overflow-x-auto pb-2">
        {JOB_STATUSES.map((status, index) => {
          const Icon = status.icon;
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          
          return (
            <div 
              key={status.value} 
              className={cn(
                "flex flex-col items-center min-w-[72px] relative",
                isFuture && "opacity-40"
              )}
            >
              {/* Connector line */}
              {index > 0 && (
                <div 
                  className={cn(
                    "absolute left-0 top-4 h-0.5 -translate-x-1/2 w-full",
                    isComplete || isCurrent ? "bg-primary" : "bg-border"
                  )}
                  style={{ width: 'calc(100% - 24px)', left: '-50%', marginLeft: '12px' }}
                />
              )}
              
              {/* Status circle */}
              <button
                onClick={() => onStatusChange?.(status.value)}
                disabled={!onStatusChange}
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all",
                  isComplete && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isFuture && "bg-muted text-muted-foreground border-2 border-dashed border-border",
                  onStatusChange && "cursor-pointer hover:scale-110",
                  !onStatusChange && "cursor-default"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
              
              {/* Label */}
              <span className={cn(
                "mt-1.5 text-[10px] text-center leading-tight font-medium",
                isCurrent ? "text-primary" : "text-muted-foreground"
              )}>
                {status.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current status description + CTA */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div>
          <p className="text-sm font-medium">
            {JOB_STATUSES[currentIndex]?.description}
          </p>
        </div>
        {nextAction && nextAction.action !== 'waiting' && onAction && (
          <Button 
            size="sm" 
            onClick={() => onAction(nextAction.action)}
            className="gap-1"
          >
            {nextAction.label}
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
        {nextAction && nextAction.action === 'waiting' && (
          <Badge variant="secondary">
            {nextAction.label}
          </Badge>
        )}
      </div>
    </div>
  );
};

export default JobTimeline;
