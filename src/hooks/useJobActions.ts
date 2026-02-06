import { useMemo } from 'react';
import { JobStatus } from '@/components/JobTimeline';
import {
  LifecycleStatus,
  isStatusLocked,
  isEstimateSent,
  canPerformAction,
  LIFECYCLE_ERRORS,
} from '@/lib/lifecycleStateMachine';
import { useCompany } from './useCompany';

/**
 * Defines which actions are allowed at each job status
 * Action IDs map to UI buttons/features
 */

export interface JobActionState {
  enabled: boolean;
  reason?: string;
}

export interface JobActions {
  // Rug management
  addRug: JobActionState;
  editRug: JobActionState;
  deleteRug: JobActionState;
  uploadPhotos: JobActionState;
  
  // Analysis
  analyzeRug: JobActionState;
  reanalyzeRug: JobActionState;
  
  // Estimates
  approveEstimate: JobActionState;
  editEstimate: JobActionState;
  
  // Client portal
  sendToClient: JobActionState;
  resendInvite: JobActionState;
  
  // Service work
  markServiceComplete: JobActionState;
  
  // Delivery
  scheduleDelivery: JobActionState;
  
  // Admin
  editJobDetails: JobActionState;
  deleteJob: JobActionState;
}

// Status-based action rules (consolidated with lifecycle state machine)
const ACTION_RULES: Record<keyof JobActions, { 
  allowedStatuses: JobStatus[];
  blockedReason: string;
}> = {
  addRug: {
    allowedStatuses: ['intake_scheduled', 'picked_up', 'inspected'],
    blockedReason: 'Cannot add rugs after estimate is sent to client',
  },
  editRug: {
    allowedStatuses: ['intake_scheduled', 'picked_up', 'inspected'],
    blockedReason: 'Cannot edit rug details after estimate is sent',
  },
  deleteRug: {
    allowedStatuses: ['intake_scheduled', 'picked_up', 'inspected'],
    blockedReason: 'Cannot delete rugs after estimate is sent',
  },
  uploadPhotos: {
    allowedStatuses: ['intake_scheduled', 'picked_up', 'inspected'],
    blockedReason: 'Photo uploads locked after estimate is sent',
  },
  analyzeRug: {
    allowedStatuses: ['picked_up', 'inspected'],
    blockedReason: 'Rugs must be picked up before analysis. After estimate is sent, use re-analyze.',
  },
  reanalyzeRug: {
    allowedStatuses: ['picked_up', 'inspected'],
    blockedReason: 'Cannot re-analyze after estimate is sent to client',
  },
  approveEstimate: {
    allowedStatuses: ['inspected'],
    blockedReason: 'Analyze rugs first, then approve estimates before sending to client',
  },
  editEstimate: {
    allowedStatuses: ['inspected'],
    blockedReason: 'Estimates cannot be edited after being sent to client',
  },
  sendToClient: {
    allowedStatuses: ['inspected'],
    blockedReason: 'Complete rug analysis and approve estimates first',
  },
  resendInvite: {
    allowedStatuses: ['estimate_sent', 'approved_unpaid'],
    blockedReason: 'Client portal link not yet generated',
  },
  markServiceComplete: {
    allowedStatuses: ['paid', 'in_service'],
    blockedReason: 'Payment must be received before starting service work',
  },
  scheduleDelivery: {
    allowedStatuses: ['ready'],
    blockedReason: 'Complete all services before scheduling delivery',
  },
  editJobDetails: {
    allowedStatuses: ['intake_scheduled', 'picked_up', 'inspected', 'estimate_sent', 'approved_unpaid', 'paid', 'in_service', 'ready', 'delivery_scheduled'],
    blockedReason: 'Job details locked after delivery',
  },
  deleteJob: {
    allowedStatuses: ['intake_scheduled', 'picked_up'],
    blockedReason: 'Cannot delete job after analysis has begun',
  },
};

export function getActionState(
  action: keyof JobActions,
  currentStatus: JobStatus,
  isAdminOverride: boolean = false,
  hasCompanyContext: boolean = true
): JobActionState {
  // Block all mutations if no company context
  if (!hasCompanyContext && action !== 'editJobDetails') {
    return { 
      enabled: false, 
      reason: LIFECYCLE_ERRORS.MISSING_COMPANY_CONTEXT 
    };
  }

  if (isAdminOverride) {
    return { enabled: true };
  }
  
  const rule = ACTION_RULES[action];
  if (!rule) {
    return { enabled: true };
  }
  
  const isAllowed = rule.allowedStatuses.includes(currentStatus);
  return {
    enabled: isAllowed,
    reason: isAllowed ? undefined : rule.blockedReason,
  };
}

export function useJobActions(
  currentStatus: JobStatus,
  isAdminOverride: boolean = false
): JobActions {
  const { companyId, loading: companyLoading } = useCompany();
  const hasCompanyContext = !!companyId || companyLoading;

  return useMemo(() => {
    const actions: JobActions = {
      addRug: getActionState('addRug', currentStatus, isAdminOverride, hasCompanyContext),
      editRug: getActionState('editRug', currentStatus, isAdminOverride, hasCompanyContext),
      deleteRug: getActionState('deleteRug', currentStatus, isAdminOverride, hasCompanyContext),
      uploadPhotos: getActionState('uploadPhotos', currentStatus, isAdminOverride, hasCompanyContext),
      analyzeRug: getActionState('analyzeRug', currentStatus, isAdminOverride, hasCompanyContext),
      reanalyzeRug: getActionState('reanalyzeRug', currentStatus, isAdminOverride, hasCompanyContext),
      approveEstimate: getActionState('approveEstimate', currentStatus, isAdminOverride, hasCompanyContext),
      editEstimate: getActionState('editEstimate', currentStatus, isAdminOverride, hasCompanyContext),
      sendToClient: getActionState('sendToClient', currentStatus, isAdminOverride, hasCompanyContext),
      resendInvite: getActionState('resendInvite', currentStatus, isAdminOverride, hasCompanyContext),
      markServiceComplete: getActionState('markServiceComplete', currentStatus, isAdminOverride, hasCompanyContext),
      scheduleDelivery: getActionState('scheduleDelivery', currentStatus, isAdminOverride, hasCompanyContext),
      editJobDetails: getActionState('editJobDetails', currentStatus, isAdminOverride, hasCompanyContext),
      deleteJob: getActionState('deleteJob', currentStatus, isAdminOverride, hasCompanyContext),
    };
    return actions;
  }, [currentStatus, isAdminOverride, hasCompanyContext]);
}

// Helper to get a human-readable status requirement
export function getStatusRequirement(action: keyof JobActions): string {
  const rule = ACTION_RULES[action];
  if (!rule) return '';
  
  const statusLabels: Record<JobStatus, string> = {
    'intake_scheduled': 'Intake Scheduled',
    'picked_up': 'Picked Up',
    'inspected': 'Inspected',
    'estimate_sent': 'Estimate Sent',
    'approved_unpaid': 'Approved',
    'paid': 'Paid',
    'in_service': 'In Service',
    'ready': 'Ready',
    'delivery_scheduled': 'Delivery Scheduled',
    'delivered': 'Delivered',
    'closed': 'Closed',
  };
  
  const labels = rule.allowedStatuses.map(s => statusLabels[s]);
  if (labels.length === 1) {
    return `Requires status: ${labels[0]}`;
  }
  return `Allowed when: ${labels.join(', ')}`;
}

/**
 * Check if a job status is "locked" (no scope/pricing changes allowed)
 */
export function isJobLocked(status: JobStatus): boolean {
  return isStatusLocked(status as LifecycleStatus);
}

/**
 * Check if estimate has been sent to client
 */
export function hasEstimateBeenSent(status: JobStatus): boolean {
  return isEstimateSent(status as LifecycleStatus);
}
