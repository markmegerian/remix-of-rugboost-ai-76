// System-Determined Services Display
// Shows auto-generated services based on condition inspection
// Staff reviews pricing with optional override capability
// Never exposes multiplier formulas to clients

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Lock, AlertTriangle, Shield, CheckCircle2,
  Info, Eye, ClipboardCheck, Edit3
} from 'lucide-react';
import { 
  ServiceDetermination, 
  DeterminedService,
  InspectionInput
} from '@/lib/serviceRulesEngine';
import { 
  calculatePricing, 
  PricedService, 
  PriceOverride, 
  OVERRIDE_REASONS, 
  OverrideReason, 
  validateOverride 
} from '@/lib/pricingEngine';
import { SERVICE_CATEGORIES, ServiceCategory } from '@/lib/serviceCategories';

interface SystemDeterminedServicesProps {
  determination: ServiceDetermination;
  squareFootage: number;
  inspectionInput?: InspectionInput;
  onPriceOverride?: (serviceId: string, newPrice: number) => void;
  showPrices?: boolean;
  showPricingFactors?: boolean; // Staff view shows factors, client view doesn't
  readOnly?: boolean;
}

const CATEGORY_ICONS: Record<ServiceCategory, React.ReactNode> = {
  required: <Lock className="h-4 w-4" />,
  recommended: <CheckCircle2 className="h-4 w-4" />,
  high_cost: <AlertTriangle className="h-4 w-4" />,
  preventative: <Shield className="h-4 w-4" />,
};

const ServiceRow: React.FC<{
  service: PricedService;
  showPrices: boolean;
  showPricingFactors: boolean;
  readOnly: boolean;
  onEdit?: () => void;
}> = ({ service, showPrices, showPricingFactors, readOnly, onEdit }) => {
  const categoryConfig = SERVICE_CATEGORIES[service.category];
  const total = service.adjustedTotal;
  
  return (
    <div className="flex items-start justify-between py-3 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{service.name}</span>
          {!service.canDecline && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              Required
            </Badge>
          )}
          {service.category === 'high_cost' && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">
              Structural
            </Badge>
          )}
          {service.isOverridden && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-accent/50">
              Adjusted
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{service.rationale}</p>
        {/* Staff-only: Pricing factors */}
        {showPricingFactors && service.pricingFactors && service.pricingFactors.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {service.pricingFactors.map(factor => (
              <Badge key={factor} variant="secondary" className="text-[10px]">
                {factor}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {showPrices && (
        <div className="flex items-center gap-2">
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-medium">${total.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              {service.quantity > 1 ? `${service.quantity} × $${service.baseUnitPrice.toFixed(2)}` : ''}
            </p>
            {/* Staff-only: Show multiplier */}
            {showPricingFactors && service.riskMultiplier !== 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end cursor-help">
                    <Info className="h-2.5 w-2.5" />
                    {service.riskMultiplier.toFixed(2)}×
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Risk-adjusted multiplier based on condition and material
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {/* Override button (staff only, not for required services) */}
          {!readOnly && showPricingFactors && service.canDecline && onEdit && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 flex-shrink-0"
              onClick={onEdit}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

const CategorySection: React.FC<{
  category: ServiceCategory;
  services: PricedService[];
  showPrices: boolean;
  showPricingFactors: boolean;
  readOnly: boolean;
  onEditService?: (service: PricedService) => void;
}> = ({ category, services, showPrices, showPricingFactors, readOnly, onEditService }) => {
  if (services.length === 0) return null;
  
  const config = SERVICE_CATEGORIES[category];
  const total = services.reduce((sum, s) => sum + s.adjustedTotal, 0);
  
  return (
    <Card className={category === 'required' ? 'border-destructive/30' : category === 'high_cost' ? 'border-primary/30' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={config.color}>{CATEGORY_ICONS[category]}</span>
            <CardTitle className="text-sm">{config.label}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {services.length}
            </Badge>
          </div>
          {showPrices && (
            <span className="text-sm font-medium">${total.toFixed(2)}</span>
          )}
        </div>
        <CardDescription className="text-xs">{config.helpText}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y">
          {services.map((service) => (
            <ServiceRow 
              key={service.id} 
              service={service} 
              showPrices={showPrices}
              showPricingFactors={showPricingFactors}
              readOnly={readOnly}
              onEdit={() => onEditService?.(service)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const SystemDeterminedServices: React.FC<SystemDeterminedServicesProps> = ({
  determination,
  squareFootage,
  inspectionInput,
  onPriceOverride,
  showPrices = true,
  showPricingFactors = true,
  readOnly = false,
}) => {
  const { services, conditionSummary, riskDisclosure, requiresStaffReview, reviewReasons } = determination;
  
  const [overrides, setOverrides] = useState<Map<string, number>>(new Map());
  const [overrideDialog, setOverrideDialog] = useState<PricedService | null>(null);
  const [overridePrice, setOverridePrice] = useState('');
  const [overrideReason, setOverrideReason] = useState<OverrideReason | ''>('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);
  
  // Calculate pricing if inspection input is provided
  const pricing = inspectionInput 
    ? calculatePricing(services, inspectionInput, overrides)
    : null;
  
  // Use priced services if available, otherwise create basic priced services
  const pricedServices: PricedService[] = pricing?.services || services.map(s => ({
    ...s,
    baseTotal: s.baseUnitPrice * s.quantity,
    riskMultiplier: 1,
    adjustedTotal: s.baseUnitPrice * s.quantity,
    riskLevel: 'low' as const,
    pricingFactors: [],
    isOverridden: false,
  }));
  
  // Group services by category
  const groupedServices: Record<ServiceCategory, PricedService[]> = {
    required: pricedServices.filter(s => s.category === 'required'),
    high_cost: pricedServices.filter(s => s.category === 'high_cost'),
    recommended: pricedServices.filter(s => s.category === 'recommended'),
    preventative: pricedServices.filter(s => s.category === 'preventative'),
  };
  
  const totalEstimate = pricing?.totalAfterAdjustments || 
    pricedServices.reduce((sum, s) => sum + s.adjustedTotal, 0);
  
  const handleOpenOverride = (service: PricedService) => {
    setOverrideDialog(service);
    setOverridePrice(service.adjustedTotal.toFixed(2));
    setOverrideReason('');
    setOverrideNotes('');
    setOverrideError(null);
  };

  const handleSubmitOverride = () => {
    if (!overrideDialog || !overrideReason) return;
    
    const newPrice = parseFloat(overridePrice);
    if (isNaN(newPrice)) {
      setOverrideError('Invalid price');
      return;
    }
    
    const override: PriceOverride = {
      serviceId: overrideDialog.id,
      serviceName: overrideDialog.name,
      originalPrice: overrideDialog.adjustedTotal,
      adjustedPrice: newPrice,
      reason: overrideReason,
      notes: overrideNotes || undefined,
    };
    
    const validation = validateOverride(override);
    if (!validation.valid) {
      setOverrideError(validation.error || 'Invalid override');
      return;
    }
    
    // Update local overrides
    setOverrides(prev => new Map(prev).set(overrideDialog.id, newPrice));
    
    // Notify parent
    onPriceOverride?.(overrideDialog.id, newPrice);
    setOverrideDialog(null);
  };
  
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">System-Determined Services</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Services automatically assigned based on inspection findings. Review for accuracy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">{conditionSummary}</p>
            {pricing && (
              <p className="text-xs text-muted-foreground border-t pt-2 mt-2 italic">
                {pricing.pricingStatement}
              </p>
            )}
          </CardContent>
        </Card>
        
        {/* Staff Review Alert */}
        {requiresStaffReview && (
          <Alert className="border-primary/50 bg-primary/5">
            <Eye className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>Staff Review Required:</strong>
              <ul className="list-disc list-inside mt-1 text-xs text-muted-foreground">
                {reviewReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Service Categories */}
        <CategorySection 
          category="required" 
          services={groupedServices.required} 
          showPrices={showPrices}
          showPricingFactors={showPricingFactors}
          readOnly={true} // Required services cannot be overridden
          onEditService={handleOpenOverride}
        />
        <CategorySection 
          category="high_cost" 
          services={groupedServices.high_cost} 
          showPrices={showPrices}
          showPricingFactors={showPricingFactors}
          readOnly={readOnly}
          onEditService={handleOpenOverride}
        />
        <CategorySection 
          category="recommended" 
          services={groupedServices.recommended} 
          showPrices={showPrices}
          showPricingFactors={showPricingFactors}
          readOnly={readOnly}
          onEditService={handleOpenOverride}
        />
        <CategorySection 
          category="preventative" 
          services={groupedServices.preventative} 
          showPrices={showPrices}
          showPricingFactors={showPricingFactors}
          readOnly={readOnly}
          onEditService={handleOpenOverride}
        />
        
        {/* Totals */}
        {showPrices && (
          <Card className="border-foreground/20">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Estimated Investment</p>
                  <p className="text-xs text-muted-foreground">
                    {pricedServices.length} services • {squareFootage} sq ft
                  </p>
                </div>
                <p className="text-2xl font-bold">${totalEstimate.toFixed(2)}</p>
              </div>
              {pricing && pricing.totalBeforeAdjustments !== pricing.totalAfterAdjustments && showPricingFactors && (
                <p className="text-xs text-muted-foreground mt-1">
                  Base: ${pricing.totalBeforeAdjustments.toFixed(2)} • Avg multiplier: {pricing.averageRiskMultiplier.toFixed(2)}×
                </p>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Risk Disclosure */}
        <div className="bg-muted/30 rounded-lg p-3 border border-dashed">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">{riskDisclosure}</p>
          </div>
        </div>

        {/* Override Dialog */}
        <Dialog open={!!overrideDialog} onOpenChange={() => setOverrideDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Override Price
              </DialogTitle>
              <DialogDescription>
                Adjusting price for: {overrideDialog?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Price</span>
                <span className="font-medium">${overrideDialog?.adjustedTotal.toFixed(2)}</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="override-price">New Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="override-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={overridePrice}
                    onChange={(e) => setOverridePrice(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="override-reason">Reason (Required)</Label>
                <Select value={overrideReason} onValueChange={(v) => setOverrideReason(v as OverrideReason)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {OVERRIDE_REASONS.map(reason => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="override-notes">Additional Notes</Label>
                <Textarea
                  id="override-notes"
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="Optional details..."
                  rows={2}
                />
              </div>
              
              {overrideError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  {overrideError}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setOverrideDialog(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitOverride}
                disabled={!overrideReason}
              >
                Apply Override
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default SystemDeterminedServices;