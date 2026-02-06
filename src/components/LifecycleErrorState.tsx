import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, ShieldX, Building2, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { LifecycleError, LIFECYCLE_ERRORS } from '@/lib/lifecycleStateMachine';

interface LifecycleErrorStateProps {
  error: LifecycleError | string;
  title?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  onBack?: () => void;
  className?: string;
}

const ERROR_ICONS: Record<LifecycleError, React.ElementType> = {
  INVALID_TOKEN: ShieldX,
  NO_PERMISSION: Lock,
  JOB_LOCKED: Lock,
  NOT_READY_FOR_APPROVAL: AlertCircle,
  CROSS_TENANT_ACCESS: Building2,
  MISSING_COMPANY_CONTEXT: Building2,
  MISSING_ESTIMATE: AlertCircle,
  PAYMENT_REQUIRED: AlertCircle,
  APPROVAL_REQUIRED: AlertCircle,
};

const ERROR_TITLES: Record<LifecycleError, string> = {
  INVALID_TOKEN: 'Invalid Access Link',
  NO_PERMISSION: 'Access Denied',
  JOB_LOCKED: 'Job Locked',
  NOT_READY_FOR_APPROVAL: 'Not Ready',
  CROSS_TENANT_ACCESS: 'Access Denied',
  MISSING_COMPANY_CONTEXT: 'Company Required',
  MISSING_ESTIMATE: 'Estimate Required',
  PAYMENT_REQUIRED: 'Payment Required',
  APPROVAL_REQUIRED: 'Approval Required',
};

/**
 * Full-page error state for lifecycle/permission errors
 */
export const LifecycleErrorState: React.FC<LifecycleErrorStateProps> = ({
  error,
  title,
  showBackButton = true,
  showHomeButton = true,
  onBack,
  className,
}) => {
  const navigate = useNavigate();

  // Determine if error is a known lifecycle error
  const isLifecycleError = Object.keys(LIFECYCLE_ERRORS).includes(error);
  const errorKey = error as LifecycleError;
  
  const Icon = isLifecycleError ? ERROR_ICONS[errorKey] : AlertCircle;
  const displayTitle = title || (isLifecycleError ? ERROR_TITLES[errorKey] : 'Error');
  const displayMessage = isLifecycleError ? LIFECYCLE_ERRORS[errorKey] : error;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className={cn(
      "min-h-[400px] flex items-center justify-center p-4",
      className
    )}>
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">{displayTitle}</CardTitle>
          <CardDescription className="text-base mt-2">
            {displayMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-3 pt-4">
          {showBackButton && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
          {showHomeButton && (
            <Button onClick={handleHome}>
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Inline error alert for permission denials within a page
 */
interface LifecycleAlertProps {
  error: string;
  variant?: 'default' | 'destructive';
  className?: string;
}

export const LifecycleAlert: React.FC<LifecycleAlertProps> = ({
  error,
  variant = 'destructive',
  className,
}) => {
  return (
    <Alert variant={variant} className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
};

/**
 * Locked state indicator for job detail pages
 */
interface LockedIndicatorProps {
  message?: string;
  className?: string;
}

export const LockedIndicator: React.FC<LockedIndicatorProps> = ({
  message = 'This job is locked. Scope and pricing cannot be modified.',
  className,
}) => {
  return (
    <Alert className={cn("bg-muted/50 border-muted-foreground/20", className)}>
      <Lock className="h-4 w-4 text-muted-foreground" />
      <AlertDescription className="text-muted-foreground">
        {message}
      </AlertDescription>
    </Alert>
  );
};

export default LifecycleErrorState;
