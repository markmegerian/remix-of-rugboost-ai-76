import React from 'react';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import type { FeatureKey } from '@/lib/planFeatures';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  /** Fallback content when feature is not available. If not provided, shows upgrade prompt. */
  fallback?: React.ReactNode;
  /** If true, hides the component entirely instead of showing upgrade prompt */
  hideIfUnavailable?: boolean;
}

/**
 * Conditionally renders children based on plan feature availability.
 * Shows an upgrade prompt when the feature is not available.
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  hideIfUnavailable = false,
}: FeatureGateProps) {
  const { hasFeature, getUpgradeMessage, planName } = usePlanFeatures();
  
  if (hasFeature(feature)) {
    return <>{children}</>;
  }
  
  if (hideIfUnavailable) {
    return null;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Default upgrade prompt
  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardContent className="py-6 text-center">
        <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground mb-3">
          {getUpgradeMessage(feature)}
        </p>
        <p className="text-xs text-muted-foreground/70 mb-4">
          Current plan: {planName}
        </p>
        <Button variant="outline" size="sm" disabled>
          Upgrade Plan
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Hook-based feature check for conditional logic (not rendering)
 */
export function useFeatureCheck(feature: FeatureKey): boolean {
  const { hasFeature } = usePlanFeatures();
  return hasFeature(feature);
}
