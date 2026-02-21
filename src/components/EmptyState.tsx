import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}
    role="status"
    aria-live="polite"
  >
    <div className="rounded-full bg-muted/50 p-4 mb-4">
      <Icon className="h-12 w-12 text-muted-foreground" aria-hidden />
    </div>
    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
    {description && (
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>
    )}
    {(action || secondaryAction) && (
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {action && (
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    )}
  </div>
);

export default EmptyState;
