import { useCompany } from './useCompany';
import { 
  PlanTier, 
  BillingStatus, 
  FeatureKey, 
  planHasFeature, 
  billingAllowsWrites,
  getBillingStatusMessage,
  getUpgradePrompt,
  planMaxStaffUsers,
} from '@/lib/planFeatures';

interface UsePlanFeaturesReturn {
  // Plan info
  planTier: PlanTier;
  planName: string;
  billingStatus: BillingStatus;
  
  // Feature checks
  hasFeature: (feature: FeatureKey) => boolean;
  canCreateJobs: boolean;
  maxStaffUsers: number;
  
  // UI helpers
  billingMessage: string;
  getUpgradeMessage: (feature: FeatureKey) => string;
  
  // Loading state
  loading: boolean;
}

/**
 * Hook to check plan features and billing status for the current company
 */
export function usePlanFeatures(): UsePlanFeaturesReturn {
  const { company, loading } = useCompany();
  
  // Default to starter plan if no company or not loaded
  const planTier = (company?.plan_tier as PlanTier) || 'starter';
  const billingStatus = (company?.billing_status as BillingStatus) || 'trialing';
  
  const planNames: Record<PlanTier, string> = {
    starter: 'Starter',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };
  
  return {
    planTier,
    planName: planNames[planTier],
    billingStatus,
    
    hasFeature: (feature: FeatureKey) => planHasFeature(planTier, feature),
    canCreateJobs: billingAllowsWrites(billingStatus),
    maxStaffUsers: planMaxStaffUsers(planTier),
    
    billingMessage: getBillingStatusMessage(billingStatus),
    getUpgradeMessage: getUpgradePrompt,
    
    loading,
  };
}
