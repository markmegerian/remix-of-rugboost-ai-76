import React from 'react';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard } from 'lucide-react';

interface BillingStatusBannerProps {
  /** Whether to show the banner on read-only mode (past_due, canceled) */
  showReadOnlyWarning?: boolean;
}

/**
 * Shows a banner when billing status requires attention
 */
export function BillingStatusBanner({ showReadOnlyWarning = true }: BillingStatusBannerProps) {
  const { billingStatus, billingMessage, canCreateJobs } = usePlanFeatures();
  
  // Don't show for healthy billing states
  if (billingStatus === 'active' || billingStatus === 'trialing') {
    return null;
  }
  
  if (!showReadOnlyWarning) {
    return null;
  }
  
  const isPastDue = billingStatus === 'past_due';
  const isCanceled = billingStatus === 'canceled';
  
  return (
    <Alert variant={isPastDue ? 'destructive' : 'default'} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <span>
          {isPastDue 
            ? 'Your payment is past due. Please update your billing information to continue creating jobs.'
            : 'Your subscription has been canceled. You can view existing data but cannot create new jobs.'}
        </span>
        <Button variant={isPastDue ? 'destructive' : 'outline'} size="sm">
          <CreditCard className="h-4 w-4 mr-2" />
          {isPastDue ? 'Update Payment' : 'Reactivate'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Component that blocks actions when billing doesn't allow writes
 */
interface BillingGateProps {
  children: React.ReactNode;
  /** Fallback content when billing blocks writes */
  fallback?: React.ReactNode;
}

export function BillingGate({ children, fallback }: BillingGateProps) {
  const { canCreateJobs } = usePlanFeatures();
  
  if (canCreateJobs) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <div className="opacity-50 pointer-events-none" title="Subscription required to create new items">
      {children}
    </div>
  );
}
