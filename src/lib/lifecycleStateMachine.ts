/**
 * Job Lifecycle State Machine
 * 
 * Enforces strict sequential transitions with validation guards.
 * No skipping steps, no backward movement (except admin override).
 * 
 * State flow:
 * intake_scheduled → picked_up → inspected → estimate_sent → 
 * approved_unpaid → paid → in_service → ready → 
 * delivery_scheduled → delivered → closed
 */

export type LifecycleStatus = 
  | 'intake_scheduled'
  | 'picked_up'
  | 'inspected'
  | 'estimate_sent'
  | 'approved_unpaid'
  | 'paid'
  | 'in_service'
  | 'ready'
  | 'delivery_scheduled'
  | 'delivered'
  | 'closed';

// Ordered list of statuses for index-based comparison
export const LIFECYCLE_ORDER: LifecycleStatus[] = [
  'intake_scheduled',
  'picked_up',
  'inspected',
  'estimate_sent',
  'approved_unpaid',
  'paid',
  'in_service',
  'ready',
  'delivery_scheduled',
  'delivered',
  'closed',
];

// Status index lookup for fast comparison
export function getStatusIndex(status: LifecycleStatus): number {
  return LIFECYCLE_ORDER.indexOf(status);
}

// Check if a status is "locked" (no financial changes allowed)
export function isStatusLocked(status: LifecycleStatus): boolean {
  const lockedStatuses: LifecycleStatus[] = ['paid', 'in_service', 'ready', 'delivery_scheduled', 'delivered', 'closed'];
  return lockedStatuses.includes(status);
}

// Check if estimate has been sent (client can view)
export function isEstimateSent(status: LifecycleStatus): boolean {
  return getStatusIndex(status) >= getStatusIndex('estimate_sent');
}

// Check if job is approved (client approved services)
export function isApproved(status: LifecycleStatus): boolean {
  return getStatusIndex(status) >= getStatusIndex('approved_unpaid');
}

// Check if payment is received
export function isPaid(status: LifecycleStatus): boolean {
  return getStatusIndex(status) >= getStatusIndex('paid');
}

// Check if job is in terminal state
export function isTerminal(status: LifecycleStatus): boolean {
  return status === 'closed';
}

/**
 * Transition validation context
 */
export interface TransitionContext {
  hasAnalyzedRugs: boolean;
  hasApprovedEstimates: boolean;
  hasPortalLink: boolean;
  hasPaidPayment: boolean;
  allServicesComplete: boolean;
  hasDeliveryAddress: boolean;
  hasDeliveryWindow: boolean;
}

/**
 * Transition validation result
 */
export interface TransitionResult {
  allowed: boolean;
  error?: string;
}

/**
 * Status-specific transition validators
 */
const TRANSITION_VALIDATORS: Partial<Record<LifecycleStatus, (ctx: TransitionContext) => TransitionResult>> = {
  inspected: (ctx) => {
    if (!ctx.hasAnalyzedRugs) {
      return { allowed: false, error: 'At least one rug must be analyzed before marking as inspected.' };
    }
    return { allowed: true };
  },
  estimate_sent: (ctx) => {
    if (!ctx.hasApprovedEstimates) {
      return { allowed: false, error: 'All rug estimates must be approved before sending to client.' };
    }
    if (!ctx.hasPortalLink) {
      return { allowed: false, error: 'Client portal link must be generated before proceeding.' };
    }
    return { allowed: true };
  },
  approved_unpaid: (ctx) => {
    // This transition happens when client approves
    return { allowed: true };
  },
  paid: (ctx) => {
    if (!ctx.hasPaidPayment) {
      return { allowed: false, error: 'Payment must be received before proceeding.' };
    }
    return { allowed: true };
  },
  ready: (ctx) => {
    if (!ctx.allServicesComplete) {
      return { allowed: false, error: 'All approved services must be completed before marking as ready.' };
    }
    return { allowed: true };
  },
  delivery_scheduled: (ctx) => {
    if (!ctx.hasDeliveryAddress) {
      return { allowed: false, error: 'Delivery address is required to schedule delivery.' };
    }
    return { allowed: true };
  },
};

/**
 * Validate a proposed status transition
 */
export function validateTransition(
  currentStatus: LifecycleStatus,
  targetStatus: LifecycleStatus,
  context: TransitionContext,
  isAdminOverride: boolean = false
): TransitionResult {
  const currentIndex = getStatusIndex(currentStatus);
  const targetIndex = getStatusIndex(targetStatus);

  // Terminal state - no further transitions
  if (currentStatus === 'closed') {
    return { allowed: false, error: 'Job is closed. No further status changes are allowed.' };
  }

  // Same status - no change needed
  if (currentIndex === targetIndex) {
    return { allowed: true };
  }

  // Backward transition check
  if (targetIndex < currentIndex) {
    if (!isAdminOverride) {
      return { allowed: false, error: 'Cannot move to a previous status without admin override.' };
    }
    // Admin override allows backward, but still can't go back from closed
    return { allowed: true };
  }

  // Skip check - must move exactly one step (unless admin override)
  if (targetIndex > currentIndex + 1 && !isAdminOverride) {
    return { allowed: false, error: 'Cannot skip workflow steps. Complete each step in sequence.' };
  }

  // Run target-specific validation
  const validator = TRANSITION_VALIDATORS[targetStatus];
  if (validator && !isAdminOverride) {
    const result = validator(context);
    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

/**
 * Get the next allowed status in the workflow
 */
export function getNextStatus(currentStatus: LifecycleStatus): LifecycleStatus | null {
  const currentIndex = getStatusIndex(currentStatus);
  if (currentIndex === -1 || currentIndex >= LIFECYCLE_ORDER.length - 1) {
    return null;
  }
  return LIFECYCLE_ORDER[currentIndex + 1];
}

/**
 * Role-based action permissions
 */
export type UserRole = 'staff' | 'client' | 'admin';

export interface ActionPermission {
  allowed: boolean;
  reason?: string;
}

/**
 * Actions that can be performed on a job
 */
export type JobAction = 
  | 'view_job'
  | 'edit_job'
  | 'add_rug'
  | 'edit_rug'
  | 'delete_rug'
  | 'upload_photos'
  | 'analyze_rug'
  | 'approve_estimate'
  | 'send_to_client'
  | 'view_report'
  | 'decline_services'
  | 'client_approve'
  | 'process_payment'
  | 'mark_service_complete'
  | 'schedule_delivery'
  | 'advance_status'
  | 'delete_job'
  | 'edit_pricing'
  | 'override_status';

/**
 * Check if a role can perform an action at a given status
 */
export function canPerformAction(
  action: JobAction,
  role: UserRole,
  status: LifecycleStatus
): ActionPermission {
  const locked = isStatusLocked(status);
  const estimateSent = isEstimateSent(status);
  
  // Universal denials
  if (isTerminal(status) && action !== 'view_job' && action !== 'view_report') {
    return { allowed: false, reason: 'Job is closed. No modifications allowed.' };
  }

  // Role-based rules
  switch (role) {
    case 'client':
      return getClientPermission(action, status, locked, estimateSent);
    case 'staff':
      return getStaffPermission(action, status, locked, estimateSent);
    case 'admin':
      return getAdminPermission(action, status, locked);
    default:
      return { allowed: false, reason: 'Unknown role.' };
  }
}

function getClientPermission(
  action: JobAction,
  status: LifecycleStatus,
  locked: boolean,
  estimateSent: boolean
): ActionPermission {
  // Client can only perform limited actions
  const clientAllowedActions: JobAction[] = [
    'view_job',
    'view_report',
    'decline_services',
    'client_approve',
    'process_payment',
  ];

  if (!clientAllowedActions.includes(action)) {
    return { allowed: false, reason: 'Clients cannot perform this action.' };
  }

  // Client can only view after estimate is sent
  if (!estimateSent && (action === 'view_job' || action === 'view_report')) {
    return { allowed: false, reason: 'This job is not ready for client viewing yet.' };
  }

  // Client can only decline/approve before payment
  if (action === 'decline_services' || action === 'client_approve') {
    if (status !== 'estimate_sent') {
      return { allowed: false, reason: 'Services can only be modified when estimate is pending approval.' };
    }
  }

  // Client can only pay when in approved_unpaid status
  if (action === 'process_payment') {
    if (status !== 'approved_unpaid') {
      return { 
        allowed: false, 
        reason: status === 'estimate_sent' 
          ? 'Please approve the services before proceeding to payment.' 
          : 'Payment has already been processed or is not available.'
      };
    }
  }

  return { allowed: true };
}

function getStaffPermission(
  action: JobAction,
  status: LifecycleStatus,
  locked: boolean,
  estimateSent: boolean
): ActionPermission {
  // Staff can view everything
  if (action === 'view_job' || action === 'view_report') {
    return { allowed: true };
  }

  // Staff cannot perform client-only actions
  if (action === 'client_approve' || action === 'decline_services') {
    return { allowed: false, reason: 'Only clients can perform this action.' };
  }

  // Staff cannot override status without admin
  if (action === 'override_status') {
    return { allowed: false, reason: 'Admin access required for status override.' };
  }

  // Locked state restrictions
  if (locked) {
    const lockedBlockedActions: JobAction[] = [
      'edit_rug', 'delete_rug', 'add_rug', 'upload_photos',
      'analyze_rug', 'approve_estimate', 'edit_pricing', 'delete_job'
    ];
    if (lockedBlockedActions.includes(action)) {
      return { allowed: false, reason: 'This job is locked. No modifications to scope or pricing allowed.' };
    }
  }

  // Pre-estimate restrictions
  if (estimateSent) {
    const preEstimateActions: JobAction[] = [
      'add_rug', 'edit_rug', 'delete_rug', 'upload_photos', 
      'analyze_rug', 'approve_estimate', 'edit_pricing'
    ];
    if (preEstimateActions.includes(action)) {
      return { allowed: false, reason: 'Cannot modify rugs or estimates after sending to client.' };
    }
  }

  // Status-specific rules
  if (action === 'send_to_client' && status !== 'inspected') {
    return { allowed: false, reason: 'Complete inspection and approve all estimates before sending to client.' };
  }

  if (action === 'mark_service_complete') {
    if (!isPaid(status)) {
      return { allowed: false, reason: 'Payment must be received before marking services complete.' };
    }
  }

  if (action === 'schedule_delivery') {
    if (status !== 'ready') {
      return { allowed: false, reason: 'All services must be complete before scheduling delivery.' };
    }
  }

  if (action === 'delete_job') {
    if (getStatusIndex(status) > getStatusIndex('picked_up')) {
      return { allowed: false, reason: 'Cannot delete job after analysis has begun.' };
    }
  }

  return { allowed: true };
}

function getAdminPermission(
  action: JobAction,
  status: LifecycleStatus,
  locked: boolean
): ActionPermission {
  // Admin can view everything
  if (action === 'view_job' || action === 'view_report') {
    return { allowed: true };
  }

  // Admin can override and perform most actions
  if (action === 'override_status') {
    return { allowed: true };
  }

  // Admin can edit pricing even after locked (with warning shown in UI)
  if (action === 'edit_pricing' && locked) {
    return { allowed: true }; // UI should show warning
  }

  // Terminal state is truly terminal
  if (isTerminal(status)) {
    return { allowed: false, reason: 'Job is closed. Reopen not supported.' };
  }

  return { allowed: true };
}

/**
 * Error messages for common failure states
 */
export const LIFECYCLE_ERRORS = {
  INVALID_TOKEN: 'This access link is invalid, expired, or already used.',
  NO_PERMISSION: 'You do not have permission to perform this action.',
  JOB_LOCKED: 'This report is no longer editable.',
  NOT_READY_FOR_APPROVAL: 'This job is not in a state that allows approval yet.',
  CROSS_TENANT_ACCESS: 'Access denied. This record belongs to a different company.',
  MISSING_COMPANY_CONTEXT: 'Company context is required for this operation.',
  MISSING_ESTIMATE: 'Estimates must be generated before proceeding.',
  PAYMENT_REQUIRED: 'Payment must be completed before proceeding.',
  APPROVAL_REQUIRED: 'Client approval is required before proceeding.',
} as const;

export type LifecycleError = keyof typeof LIFECYCLE_ERRORS;

/**
 * Create a user-friendly error from a lifecycle error code
 */
export function getLifecycleErrorMessage(error: LifecycleError): string {
  return LIFECYCLE_ERRORS[error];
}
