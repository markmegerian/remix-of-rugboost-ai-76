import React, { memo } from 'react';
import { ChevronRight, Plus, Sparkles, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusGatedButton from '@/components/StatusGatedButton';
import type { JobActions } from '@/hooks/useJobActions';
import { cn } from '@/lib/utils';

interface MobileJobActionBarProps {
  actions: JobActions;
  rugsCount: number;
  hasUnanalyzedRugs: boolean;
  hasApprovedEstimates: boolean;
  hasClientPortalLink: boolean;
  isAnalyzing: boolean;
  isGeneratingLink: boolean;
  onAddRug: () => void;
  onAnalyzeAll: () => void;
  onSendToClient: () => void;
  onAdvanceStatus: () => void;
  nextStatusLabel?: string;
  className?: string;
}

/**
 * Bottom-fixed action bar for mobile devices.
 * Shows the most relevant action based on current job state.
 * Designed for one-thumb operation.
 */
const MobileJobActionBarComponent: React.FC<MobileJobActionBarProps> = ({
  actions,
  rugsCount,
  hasUnanalyzedRugs,
  hasApprovedEstimates,
  hasClientPortalLink,
  isAnalyzing,
  isGeneratingLink,
  onAddRug,
  onAnalyzeAll,
  onSendToClient,
  onAdvanceStatus,
  nextStatusLabel,
  className,
}) => {
  // Determine primary action based on job state
  const getPrimaryAction = () => {
    // 1. If no rugs, add rug is primary
    if (rugsCount === 0) {
      return {
        label: 'Add First Rug',
        icon: Plus,
        action: onAddRug,
        variant: 'default' as const,
        actionState: actions.addRug,
        loading: false,
      };
    }
    
    // 2. If rugs need analysis
    if (hasUnanalyzedRugs && actions.analyzeRug.enabled) {
      return {
        label: isAnalyzing ? 'Analyzing...' : 'Analyze All Rugs',
        icon: isAnalyzing ? Loader2 : Sparkles,
        action: onAnalyzeAll,
        variant: 'warm' as const,
        actionState: actions.analyzeRug,
        loading: isAnalyzing,
      };
    }
    
    // 3. If estimates approved but no client link
    if (hasApprovedEstimates && !hasClientPortalLink && actions.sendToClient.enabled) {
      return {
        label: isGeneratingLink ? 'Generating...' : 'Send to Client',
        icon: isGeneratingLink ? Loader2 : Send,
        action: onSendToClient,
        variant: 'default' as const,
        actionState: actions.sendToClient,
        loading: isGeneratingLink,
      };
    }
    
    // 4. Default to advance status if there's a next step
    if (nextStatusLabel) {
      return {
        label: `Advance: ${nextStatusLabel}`,
        icon: ChevronRight,
        action: onAdvanceStatus,
        variant: 'default' as const,
        actionState: { enabled: true },
        loading: false,
      };
    }
    
    return null;
  };

  const primaryAction = getPrimaryAction();

  if (!primaryAction) return null;

  const IconComponent = primaryAction.icon;

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-40 md:hidden",
      "bg-background/95 backdrop-blur-md border-t border-border",
      "px-4 py-3 pb-safe-bottom",
      className
    )}>
      <div className="flex items-center gap-3">
        {/* Secondary: Add Rug (if not the primary action) */}
        {rugsCount > 0 && actions.addRug.enabled && (
          <StatusGatedButton
            actionState={actions.addRug}
            variant="outline"
            size="lg"
            className="h-12 w-12 p-0 shrink-0"
            onClick={onAddRug}
          >
            <Plus className="h-5 w-5" />
          </StatusGatedButton>
        )}
        
        {/* Primary Action - Full Width */}
        <StatusGatedButton
          actionState={primaryAction.actionState}
          variant={primaryAction.variant}
          size="lg"
          className="flex-1 h-12 gap-2 text-base font-medium"
          onClick={primaryAction.action}
          disabled={primaryAction.loading}
        >
          <IconComponent className={cn(
            "h-5 w-5",
            primaryAction.loading && "animate-spin"
          )} />
          {primaryAction.label}
        </StatusGatedButton>
      </div>
    </div>
  );
};

const MobileJobActionBar = memo(MobileJobActionBarComponent);
MobileJobActionBar.displayName = 'MobileJobActionBar';

export default MobileJobActionBar;
