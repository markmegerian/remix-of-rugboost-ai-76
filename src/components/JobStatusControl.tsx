import React, { useState } from 'react';
import { 
  ChevronRight, Lock, ShieldAlert, AlertCircle, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  JOB_STATUSES, 
  JobStatus, 
  getNextStatus, 
  validateTransition,
  TransitionContext 
} from '@/components/JobTimeline';

interface JobStatusControlProps {
  currentStatus: JobStatus;
  validationContext: TransitionContext;
  onAdvanceStatus: (newStatus: JobStatus) => void;
  isAdmin?: boolean;
  onOverrideChange?: (enabled: boolean) => void;
  className?: string;
}

const JobStatusControl: React.FC<JobStatusControlProps> = ({
  currentStatus,
  validationContext,
  onAdvanceStatus,
  isAdmin = false,
  onOverrideChange,
  className,
}) => {
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const currentStatusConfig = JOB_STATUSES.find(s => s.value === currentStatus);
  const nextStatus = getNextStatus(currentStatus);
  const nextStatusConfig = nextStatus ? JOB_STATUSES.find(s => s.value === nextStatus) : null;
  const CurrentIcon = currentStatusConfig?.icon || CheckCircle2;
  const NextIcon = nextStatusConfig?.icon || ChevronRight;
  
  // Check if transition is valid
  const transitionValidation = nextStatus 
    ? validateTransition(nextStatus, validationContext)
    : { valid: false, error: 'Job is complete' };

  const canAdvance = nextStatus && (overrideEnabled || transitionValidation.valid);
  
  const handleOverrideChange = (enabled: boolean) => {
    setOverrideEnabled(enabled);
    setValidationError(null);
    onOverrideChange?.(enabled);
  };

  const handleAdvance = () => {
    if (!nextStatus) return;
    
    if (!overrideEnabled && !transitionValidation.valid) {
      setValidationError(transitionValidation.error || 'Cannot advance status');
      return;
    }
    
    setValidationError(null);
    onAdvanceStatus(nextStatus);
  };

  return (
    <Card className={cn("border-2", className)}>
      <CardContent className="pt-4 pb-4 space-y-4">
        {/* Current Status Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CurrentIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Status</p>
              <p className="font-semibold">{currentStatusConfig?.label}</p>
            </div>
          </div>
          
          {/* Admin Override - Hidden by default */}
          {isAdmin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={cn(
                      "h-4 w-4 transition-colors",
                      overrideEnabled ? "text-destructive" : "text-muted-foreground/50"
                    )} />
                    <Switch
                      id="admin-override"
                      checked={overrideEnabled}
                      onCheckedChange={handleOverrideChange}
                      className="data-[state=checked]:bg-destructive"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="font-medium">Admin Override</p>
                  <p className="text-xs text-muted-foreground">
                    Bypass validation requirements
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Advance Status Section */}
        {nextStatus ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 pt-2 border-t">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed",
                  canAdvance ? "border-primary text-primary" : "border-muted-foreground/50 text-muted-foreground"
                )}>
                  <NextIcon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{nextStatusConfig?.label}</p>
                  <p className="text-xs text-muted-foreground">{nextStatusConfig?.description}</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleAdvance}
                disabled={!canAdvance && !overrideEnabled}
                className="gap-1"
              >
                Advance
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Validation Error or Requirement */}
            {validationError && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{validationError}</AlertDescription>
              </Alert>
            )}
            
            {!transitionValidation.valid && !validationError && !overrideEnabled && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{transitionValidation.error}</span>
              </div>
            )}
            
            {overrideEnabled && !transitionValidation.valid && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Override active: {transitionValidation.error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-2 border-t text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span className="text-sm">Job complete - no further status changes</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobStatusControl;
