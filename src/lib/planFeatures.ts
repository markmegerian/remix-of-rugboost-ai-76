/**
 * Plan feature gate utilities
 * 
 * This module defines plan tiers and feature access for the multi-tenant system.
 * Feature gates are enforced both client-side (UI hiding) and server-side (RLS/functions).
 */

export type PlanTier = 'starter' | 'pro' | 'enterprise';
export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface PlanConfig {
  name: string;
  maxStaffUsers: number;
  features: Record<FeatureKey, boolean>;
}

export type FeatureKey = 
  | 'advanced_pricing_multipliers'
  | 'white_label_branding'
  | 'analytics_dashboard'
  | 'custom_email_templates'
  | 'api_access'
  | 'priority_support'
  | 'batch_operations'
  | 'export_csv';

// Plan configurations
export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  starter: {
    name: 'Starter',
    maxStaffUsers: 2,
    features: {
      advanced_pricing_multipliers: false,
      white_label_branding: false,
      analytics_dashboard: false,
      custom_email_templates: false,
      api_access: false,
      priority_support: false,
      batch_operations: true,
      export_csv: true,
    },
  },
  pro: {
    name: 'Pro',
    maxStaffUsers: 10,
    features: {
      advanced_pricing_multipliers: true,
      white_label_branding: false,
      analytics_dashboard: true,
      custom_email_templates: true,
      api_access: false,
      priority_support: false,
      batch_operations: true,
      export_csv: true,
    },
  },
  enterprise: {
    name: 'Enterprise',
    maxStaffUsers: 999,
    features: {
      advanced_pricing_multipliers: true,
      white_label_branding: true,
      analytics_dashboard: true,
      custom_email_templates: true,
      api_access: true,
      priority_support: true,
      batch_operations: true,
      export_csv: true,
    },
  },
};

/**
 * Check if a plan has access to a specific feature
 */
export function planHasFeature(plan: PlanTier, feature: FeatureKey): boolean {
  return PLAN_CONFIGS[plan]?.features[feature] ?? false;
}

/**
 * Get the maximum staff users allowed for a plan
 */
export function planMaxStaffUsers(plan: PlanTier): number {
  return PLAN_CONFIGS[plan]?.maxStaffUsers ?? 2;
}

/**
 * Check if billing status allows creating new jobs
 */
export function billingAllowsWrites(status: BillingStatus): boolean {
  return status === 'trialing' || status === 'active';
}

/**
 * Get user-friendly billing status message
 */
export function getBillingStatusMessage(status: BillingStatus): string {
  switch (status) {
    case 'trialing':
      return 'Trial period active';
    case 'active':
      return 'Subscription active';
    case 'past_due':
      return 'Payment past due - please update your billing information';
    case 'canceled':
      return 'Subscription canceled - upgrade to continue creating jobs';
  }
}

/**
 * Get upgrade prompt for a feature
 */
export function getUpgradePrompt(feature: FeatureKey): string {
  const featureNames: Record<FeatureKey, string> = {
    advanced_pricing_multipliers: 'Advanced pricing multipliers',
    white_label_branding: 'White-label branding',
    analytics_dashboard: 'Analytics dashboard',
    custom_email_templates: 'Custom email templates',
    api_access: 'API access',
    priority_support: 'Priority support',
    batch_operations: 'Batch operations',
    export_csv: 'CSV export',
  };
  
  return `${featureNames[feature]} is available on Pro and Enterprise plans.`;
}

/**
 * Default service prices for new companies
 */
export const DEFAULT_SERVICE_PRICES = [
  { service_name: 'Basic Cleaning', unit_price: 4.50, is_additional: false },
  { service_name: 'Deep Cleaning', unit_price: 6.50, is_additional: false },
  { service_name: 'Stain Treatment', unit_price: 25.00, is_additional: true },
  { service_name: 'Odor Removal', unit_price: 35.00, is_additional: true },
  { service_name: 'Fringe Cleaning', unit_price: 15.00, is_additional: true },
  { service_name: 'Moth Treatment', unit_price: 45.00, is_additional: true },
  { service_name: 'Color Restoration', unit_price: 75.00, is_additional: true },
  { service_name: 'Repair - Minor', unit_price: 50.00, is_additional: true },
  { service_name: 'Repair - Major', unit_price: 150.00, is_additional: true },
  { service_name: 'Rug Padding', unit_price: 3.00, is_additional: true },
];

/**
 * Default enabled services for new companies
 */
export const DEFAULT_ENABLED_SERVICES = [
  'Basic Cleaning',
  'Deep Cleaning',
  'Stain Treatment',
  'Odor Removal',
  'Fringe Cleaning',
  'Moth Treatment',
];
