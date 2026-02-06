import React, { forwardRef, memo } from 'react';
import { Lock } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { JobActionState } from '@/hooks/useJobActions';

interface StatusGatedButtonProps extends Omit<ButtonProps, 'disabled'> {
  actionState: JobActionState;
  children: React.ReactNode;
  showLockIcon?: boolean;
  disabled?: boolean; // Additional disabled state (e.g., loading)
}

/**
 * A button that respects job status restrictions.
 * When disabled by status, shows a tooltip explaining why.
 */
const StatusGatedButtonComponent = forwardRef<HTMLButtonElement, StatusGatedButtonProps>(({
  actionState,
  children,
  showLockIcon = true,
  disabled = false,
  className,
  ...buttonProps
}, ref) => {
  // If action is enabled and not otherwise disabled, render normal button
  if (actionState.enabled && !disabled) {
    return (
      <Button ref={ref} className={className} {...buttonProps}>
        {children}
      </Button>
    );
  }

  // If disabled due to loading or other reason (but action is allowed)
  if (actionState.enabled && disabled) {
    return (
      <Button ref={ref} className={className} disabled {...buttonProps}>
        {children}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block">
            <Button
              ref={ref}
              className={cn(className, "pointer-events-none")}
              disabled
              {...buttonProps}
            >
              {showLockIcon && <Lock className="h-3 w-3 mr-1 opacity-50" />}
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{actionState.reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

StatusGatedButtonComponent.displayName = 'StatusGatedButton';

const StatusGatedButton = memo(StatusGatedButtonComponent);

export default StatusGatedButton;
