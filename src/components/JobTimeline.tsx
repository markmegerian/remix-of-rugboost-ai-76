import React, { useState } from 'react';
import { 
  Calendar, Truck, Search, FileText, ThumbsUp, CreditCard, 
  Wrench, CheckCircle2, Package, Home, Lock,
  ChevronRight, AlertCircle, ShieldAlert
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

// Strict state machine: each status can only transition to the next one
export const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus | null> = {
  'intake_scheduled': 'picked_up',
  'picked_up': 'inspected',
  'inspected': 'estimate_sent',
  'estimate_sent': 'approved_unpaid',
  'approved_unpaid': 'paid',
  'paid': 'in_service',
  'in_service': 'ready',
  'ready': 'delivery_scheduled',
  'delivery_scheduled': 'delivered',
  'delivered': 'closed',
  'closed': null, // Terminal state
};

// Validation requirements for specific transitions
export interface TransitionValidation {
  targetStatus: JobStatus;
  validate: (context: TransitionContext) => { valid: boolean; error?: string };
}

export interface TransitionContext {
  hasPortalLink: boolean;
  hasDeliveryAddress: boolean;
  hasDeliveryWindow: boolean;
  hasAnalyzedRugs: boolean;
  hasApprovedEstimates: boolean;
  hasPaidPayment: boolean;
  allServicesComplete: boolean;
}

// Define validation rules for transitions
export const TRANSITION_VALIDATIONS: Partial<Record<JobStatus, (ctx: TransitionContext) => { valid: boolean; error?: string }>> = {
  'inspected': (ctx) => {
    if (!ctx.hasAnalyzedRugs) {
      return { valid: false, error: 'Analyze at least one rug before marking as inspected' };
    }
    return { valid: true };
  },
  'estimate_sent': (ctx) => {
    if (!ctx.hasPortalLink) {
      return { valid: false, error: 'Generate and send client portal link before proceeding' };
    }
    return { valid: true };
  },
  'approved_unpaid': (ctx) => {
    if (!ctx.hasApprovedEstimates) {
      return { valid: false, error: 'Client must approve services before proceeding' };
    }
    return { valid: true };
  },
  'paid': (ctx) => {
    if (!ctx.hasPaidPayment) {
      return { valid: false, error: 'Payment must be received before proceeding' };
    }
    return { valid: true };
  },
  'ready': (ctx) => {
    if (!ctx.allServicesComplete) {
      return { valid: false, error: 'Complete all services before marking as ready' };
    }
    return { valid: true };
  },
  'delivery_scheduled': (ctx) => {
    if (!ctx.hasDeliveryAddress) {
      return { valid: false, error: 'Add delivery address to proceed' };
    }
    return { valid: true };
  },
};

// Map legacy statuses to new workflow statuses
export function mapLegacyStatus(status: string, paymentStatus?: string | null, hasAnalysis?: boolean, hasPortalLink?: boolean): JobStatus {
  // Check if it's already a valid new status
  if (JOB_STATUSES.some(s => s.value === status)) {
    return status as JobStatus;
  }
  
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

// Get the next allowed status
export function getNextStatus(currentStatus: JobStatus): JobStatus | null {
  return ALLOWED_TRANSITIONS[currentStatus];
}

// Check if a transition is allowed (without override)
export function isTransitionAllowed(currentStatus: JobStatus, targetStatus: JobStatus): boolean {
  return ALLOWED_TRANSITIONS[currentStatus] === targetStatus;
}

// Validate a transition with context
export function validateTransition(
  targetStatus: JobStatus, 
  context: TransitionContext
): { valid: boolean; error?: string } {
  const validator = TRANSITION_VALIDATIONS[targetStatus];
  if (!validator) {
    return { valid: true };
  }
  return validator(context);
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
  isAdmin?: boolean;
  validationContext?: TransitionContext;
}

const JobTimeline: React.FC<JobTimelineProps> = ({
  currentStatus,
  onStatusChange,
  onAction,
  className,
  compact = false,
  isAdmin = false,
  validationContext,
}) => {
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const currentIndex = JOB_STATUSES.findIndex(s => s.value === currentStatus);
  const nextStatus = getNextStatus(currentStatus);
  const nextAction = getNextAction(currentStatus);

  const handleStatusClick = (targetStatus: JobStatus) => {
    if (!onStatusChange) return;
    
    const targetIndex = JOB_STATUSES.findIndex(s => s.value === targetStatus);
    
    // Can't go backwards without override
    if (targetIndex < currentIndex && !overrideEnabled) {
      setValidationError('Cannot move backwards without admin override');
      return;
    }
    
    // Can't skip steps without override
    if (targetIndex > currentIndex + 1 && !overrideEnabled) {
      setValidationError('Cannot skip steps without admin override');
      return;
    }
    
    // If moving forward by one step, validate the transition
    if (targetIndex === currentIndex + 1 && validationContext) {
      const validation = validateTransition(targetStatus, validationContext);
      if (!validation.valid && !overrideEnabled) {
        setValidationError(validation.error || 'Transition requirements not met');
        return;
      }
    }
    
    setValidationError(null);
    onStatusChange(targetStatus);
  };

  const handleNextAction = () => {
    if (!onAction || !nextAction) return;
    
    // For transitions that should advance status, validate first
    if (nextStatus && validationContext && nextAction.action !== 'waiting') {
      const validation = validateTransition(nextStatus, validationContext);
      if (!validation.valid && !overrideEnabled) {
        setValidationError(validation.error || 'Transition requirements not met');
        return;
      }
    }
    
    setValidationError(null);
    onAction(nextAction.action);
  };

  if (compact) {
    // Compact horizontal view showing current + next
    const currentStatusConfig = JOB_STATUSES.find(s => s.value === currentStatus);
    const CurrentIcon = currentStatusConfig?.icon || CheckCircle2;
    
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-4">
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
                onClick={handleNextAction}
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
        {validationError && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{validationError}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Admin Override Toggle */}
      {isAdmin && onStatusChange && (
        <div className="flex items-center justify-end gap-2 pb-2">
          <ShieldAlert className={cn(
            "h-4 w-4 transition-colors",
            overrideEnabled ? "text-destructive" : "text-muted-foreground"
          )} />
          <Label 
            htmlFor="admin-override" 
            className={cn(
              "text-sm cursor-pointer",
              overrideEnabled ? "text-destructive font-medium" : "text-muted-foreground"
            )}
          >
            Admin Override
          </Label>
          <Switch
            id="admin-override"
            checked={overrideEnabled}
            onCheckedChange={(checked) => {
              setOverrideEnabled(checked);
              if (!checked) setValidationError(null);
            }}
          />
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Timeline */}
      <div className="relative flex items-start gap-1 overflow-x-auto pb-2">
        {JOB_STATUSES.map((status, index) => {
          const Icon = status.icon;
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const isNextStep = index === currentIndex + 1;
          
          // Determine if this status is clickable
          const canClick = onStatusChange && (
            overrideEnabled || // Admin override allows any click
            isNextStep || // Can always click next step (validation happens on click)
            (index <= currentIndex) // Can click current or past (with override check)
          );
          
          return (
            <div 
              key={status.value} 
              className={cn(
                "flex flex-col items-center min-w-[72px] relative",
                isFuture && !isNextStep && "opacity-40"
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
                onClick={() => canClick && handleStatusClick(status.value)}
                disabled={!canClick}
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all",
                  isComplete && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isFuture && !isNextStep && "bg-muted text-muted-foreground border-2 border-dashed border-border",
                  isNextStep && !overrideEnabled && "bg-muted text-muted-foreground border-2 border-primary border-dashed",
                  isNextStep && overrideEnabled && "bg-muted text-primary border-2 border-primary",
                  canClick && "cursor-pointer hover:scale-110",
                  !canClick && "cursor-default"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
              
              {/* Label */}
              <span className={cn(
                "mt-1.5 text-[10px] text-center leading-tight font-medium",
                isCurrent ? "text-primary" : "text-muted-foreground",
                isNextStep && "text-primary/70"
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
          {nextStatus && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Next: {JOB_STATUSES.find(s => s.value === nextStatus)?.label}
            </p>
          )}
        </div>
        {nextAction && nextAction.action !== 'waiting' && onAction && (
          <Button 
            size="sm" 
            onClick={handleNextAction}
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
