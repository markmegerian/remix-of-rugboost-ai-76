import React from 'react';
import { Check, X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type ServiceCategory, getServiceDeclineConsequence } from '@/lib/serviceCategories';

export interface Service {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priority?: string;
  adjustedTotal: number;
  pricingFactors?: string[];
  rugNumber?: string;
  source?: 'ai' | 'staff';
  addedBy?: string;
  addedByName?: string;
  addedAt?: string;
  reasonNote?: string;
}

export interface ServiceLineItemProps {
  service: Service;
  category: ServiceCategory;
  isDeclined: boolean;
  onDecline: () => void;
  onRestore: () => void;
  isSignificant: boolean;
  showRugLabel?: boolean;
}

const ServiceLineItemInner: React.FC<ServiceLineItemProps> = ({
  service,
  category,
  isDeclined,
  onDecline,
  onRestore,
  isSignificant,
  showRugLabel = false,
}) => {
  const cost = service.adjustedTotal;

  if (isDeclined) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 opacity-60">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm text-muted-foreground line-through">{service.name}</span>
          </div>
          {showRugLabel && service.rugNumber && (
            <p className="text-xs text-muted-foreground ml-6 mt-0.5">
              {service.rugNumber}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-primary"
          onClick={onRestore}
          aria-label="Restore declined service"
        >
          <Check className="h-3 w-3 mr-1" aria-hidden="true" />
          Restore
        </Button>
      </div>
    );
  }

  return (
    <div className={`py-2 px-3 rounded-lg border ${
      category === 'high_cost'
        ? 'border-primary/40 bg-primary/5'
        : isSignificant
          ? 'border-primary/20 bg-muted/30'
          : 'border-border bg-background'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Check className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium">{service.name}</span>
            {category === 'high_cost' && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
                Structural
              </span>
            )}
            {category !== 'high_cost' && isSignificant && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                High Value
              </span>
            )}
            {service.source === 'staff' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs gap-1 border-primary/50">
                      <UserPlus className="h-3 w-3" />
                      Added after review
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {service.reasonNote ? (
                      <p className="text-xs">{service.reasonNote}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Added by staff after initial assessment</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {showRugLabel && service.rugNumber && (
            <p className="text-xs text-muted-foreground ml-6 mt-0.5 font-medium">
              {service.rugNumber}
            </p>
          )}
          <p className="text-xs text-muted-foreground ml-6">
            ${cost.toFixed(2)}
          </p>
          {(category === 'high_cost' || isSignificant) && (
            <p className="text-xs text-muted-foreground ml-6 mt-1 italic">
              {getServiceDeclineConsequence(service.name, category).split('.')[0]}.
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-destructive"
          onClick={onDecline}
          aria-label="Decline this service"
        >
          Decline
        </Button>
      </div>
    </div>
  );
};

export const ServiceLineItem = React.memo(ServiceLineItemInner);
