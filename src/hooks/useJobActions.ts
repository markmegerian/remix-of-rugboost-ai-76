import { useMemo } from 'react';
import { JobStatus } from '@/components/JobTimeline';

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

// Status-based action rules
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
  isAdminOverride: boolean = false
): JobActionState {
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
  return useMemo(() => {
    const actions: JobActions = {
      addRug: getActionState('addRug', currentStatus, isAdminOverride),
      editRug: getActionState('editRug', currentStatus, isAdminOverride),
      deleteRug: getActionState('deleteRug', currentStatus, isAdminOverride),
      uploadPhotos: getActionState('uploadPhotos', currentStatus, isAdminOverride),
      analyzeRug: getActionState('analyzeRug', currentStatus, isAdminOverride),
      reanalyzeRug: getActionState('reanalyzeRug', currentStatus, isAdminOverride),
      approveEstimate: getActionState('approveEstimate', currentStatus, isAdminOverride),
      editEstimate: getActionState('editEstimate', currentStatus, isAdminOverride),
      sendToClient: getActionState('sendToClient', currentStatus, isAdminOverride),
      resendInvite: getActionState('resendInvite', currentStatus, isAdminOverride),
      markServiceComplete: getActionState('markServiceComplete', currentStatus, isAdminOverride),
      scheduleDelivery: getActionState('scheduleDelivery', currentStatus, isAdminOverride),
      editJobDetails: getActionState('editJobDetails', currentStatus, isAdminOverride),
      deleteJob: getActionState('deleteJob', currentStatus, isAdminOverride),
    };
    return actions;
  }, [currentStatus, isAdminOverride]);
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
