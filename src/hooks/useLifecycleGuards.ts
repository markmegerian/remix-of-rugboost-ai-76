import { useMemo } from 'react';
import { useCompany } from './useCompany';
import { useAuth } from './useAuth';
import { useAdminAuth } from './useAdminAuth';
import {
  LifecycleStatus,
  JobAction,
  canPerformAction,
  ActionPermission,
  isStatusLocked,
  isEstimateSent,
  isApproved,
  isPaid,
  LIFECYCLE_ERRORS,
  TransitionContext,
  validateTransition,
  getNextStatus,
} from '@/lib/lifecycleStateMachine';

export type UserRole = 'staff' | 'client' | 'admin';

interface LifecycleGuardResult {
  // Current user role
  role: UserRole;
  
  // Company context
  companyId: string | null;
  hasCompanyContext: boolean;
  
  // Status flags
  isLocked: boolean;
  isEstimateSent: boolean;
  isApproved: boolean;
  isPaid: boolean;
  
  // Permission checks
  canPerform: (action: JobAction) => ActionPermission;
  
  // Transition validation
  canTransitionTo: (targetStatus: LifecycleStatus, context: TransitionContext) => { allowed: boolean; error?: string };
  nextStatus: LifecycleStatus | null;
  
  // Admin override state
  isAdminOverride: boolean;
  setAdminOverride: (enabled: boolean) => void;
}

/**
 * Hook to check lifecycle permissions for the current user
 */
export function useLifecycleGuards(
  currentStatus: LifecycleStatus,
  isAdminOverride: boolean = false,
  setAdminOverride?: (enabled: boolean) => void
): LifecycleGuardResult {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { companyId, loading: companyLoading } = useCompany();

  // Determine user role
  const role = useMemo<UserRole>(() => {
    if (isAdmin) return 'admin';
    // Check if user has client role (from their user metadata or roles)
    // For now, staff is default for authenticated users
    return 'staff';
  }, [isAdmin]);

  // Compute status flags
  const statusFlags = useMemo(() => ({
    isLocked: isStatusLocked(currentStatus),
    isEstimateSent: isEstimateSent(currentStatus),
    isApproved: isApproved(currentStatus),
    isPaid: isPaid(currentStatus),
  }), [currentStatus]);

  // Permission check function
  const canPerform = useMemo(() => {
    return (action: JobAction): ActionPermission => {
      // Check company context for data-modifying actions
      const dataActions: JobAction[] = [
        'edit_job', 'add_rug', 'edit_rug', 'delete_rug', 
        'upload_photos', 'analyze_rug', 'approve_estimate',
        'send_to_client', 'client_approve', 'process_payment',
        'mark_service_complete', 'schedule_delivery', 'advance_status',
        'delete_job', 'edit_pricing', 'override_status'
      ];

      if (dataActions.includes(action) && !companyId && !companyLoading) {
        return { 
          allowed: false, 
          reason: LIFECYCLE_ERRORS.MISSING_COMPANY_CONTEXT 
        };
      }

      // Use admin role if override is enabled
      const effectiveRole = isAdminOverride ? 'admin' : role;
      
      return canPerformAction(action, effectiveRole, currentStatus);
    };
  }, [currentStatus, role, isAdminOverride, companyId, companyLoading]);

  // Transition validation
  const canTransitionTo = useMemo(() => {
    return (targetStatus: LifecycleStatus, context: TransitionContext) => {
      return validateTransition(currentStatus, targetStatus, context, isAdminOverride);
    };
  }, [currentStatus, isAdminOverride]);

  const nextStatus = useMemo(() => getNextStatus(currentStatus), [currentStatus]);

  return {
    role: isAdminOverride ? 'admin' : role,
    companyId,
    hasCompanyContext: !!companyId,
    ...statusFlags,
    canPerform,
    canTransitionTo,
    nextStatus,
    isAdminOverride,
    setAdminOverride: setAdminOverride || (() => {}),
  };
}

/**
 * Hook specifically for client portal access
 * Validates that the client has proper access to the job
 */
export function useClientPortalGuards(
  jobId: string | undefined,
  accessToken: string | undefined,
  jobStatus: LifecycleStatus | undefined,
  jobCompanyId: string | undefined
) {
  const { user } = useAuth();

  const guards = useMemo(() => {
    // No access without token
    if (!accessToken) {
      return {
        hasAccess: false,
        error: LIFECYCLE_ERRORS.INVALID_TOKEN,
        canView: false,
        canApprove: false,
        canPay: false,
        canDeclineServices: false,
      };
    }

    // No access without user
    if (!user) {
      return {
        hasAccess: false,
        error: 'Please log in to access this portal.',
        canView: false,
        canApprove: false,
        canPay: false,
        canDeclineServices: false,
      };
    }

    // No status means job not loaded yet
    if (!jobStatus) {
      return {
        hasAccess: true, // Assume access while loading
        error: undefined,
        canView: false,
        canApprove: false,
        canPay: false,
        canDeclineServices: false,
      };
    }

    const estimateSent = isEstimateSent(jobStatus);
    const approved = isApproved(jobStatus);
    const paid = isPaid(jobStatus);
    const locked = isStatusLocked(jobStatus);

    return {
      hasAccess: true,
      error: undefined,
      canView: estimateSent,
      canApprove: jobStatus === 'estimate_sent',
      canPay: jobStatus === 'approved_unpaid',
      canDeclineServices: jobStatus === 'estimate_sent',
      isApproved: approved,
      isPaid: paid,
      isLocked: locked,
    };
  }, [accessToken, user, jobStatus]);

  return guards;
}

/**
 * Validate that a record belongs to the current company
 */
export function validateTenantAccess(
  recordCompanyId: string | null | undefined,
  userCompanyId: string | null | undefined
): { valid: boolean; error?: string } {
  if (!userCompanyId) {
    return { valid: false, error: LIFECYCLE_ERRORS.MISSING_COMPANY_CONTEXT };
  }

  if (!recordCompanyId) {
    // Legacy record without company_id - allow for now but log
    console.warn('Record missing company_id - legacy data access');
    return { valid: true };
  }

  if (recordCompanyId !== userCompanyId) {
    return { valid: false, error: LIFECYCLE_ERRORS.CROSS_TENANT_ACCESS };
  }

  return { valid: true };
}
