// System-Determined Services Display
// Shows auto-generated services based on condition inspection
// Staff reviews but does not freely build scope

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Lock, AlertTriangle, Shield, CheckCircle2, 
  Info, Eye, ClipboardCheck 
} from 'lucide-react';
import { 
  ServiceDetermination, 
  DeterminedService 
} from '@/lib/serviceRulesEngine';
import { SERVICE_CATEGORIES, ServiceCategory } from '@/lib/serviceCategories';

interface SystemDeterminedServicesProps {
  determination: ServiceDetermination;
  squareFootage: number;
  onPriceOverride?: (serviceId: string, newPrice: number) => void;
  showPrices?: boolean;
}

const CATEGORY_ICONS: Record<ServiceCategory, React.ReactNode> = {
  required: <Lock className="h-4 w-4" />,
  recommended: <CheckCircle2 className="h-4 w-4" />,
  high_cost: <AlertTriangle className="h-4 w-4" />,
  preventative: <Shield className="h-4 w-4" />,
};

const ServiceRow: React.FC<{
  service: DeterminedService;
  showPrices: boolean;
}> = ({ service, showPrices }) => {
  const categoryConfig = SERVICE_CATEGORIES[service.category];
  const total = service.quantity * service.baseUnitPrice;
  
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
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{service.rationale}</p>
      </div>
      {showPrices && (
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-medium">${total.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">
            {service.quantity > 1 ? `${service.quantity} × $${service.baseUnitPrice.toFixed(2)}` : ''}
          </p>
        </div>
      )}
    </div>
  );
};

const CategorySection: React.FC<{
  category: ServiceCategory;
  services: DeterminedService[];
  showPrices: boolean;
}> = ({ category, services, showPrices }) => {
  if (services.length === 0) return null;
  
  const config = SERVICE_CATEGORIES[category];
  const total = services.reduce((sum, s) => sum + s.quantity * s.baseUnitPrice, 0);
  
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
            <ServiceRow key={service.id} service={service} showPrices={showPrices} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const SystemDeterminedServices: React.FC<SystemDeterminedServicesProps> = ({
  determination,
  squareFootage,
  showPrices = true,
}) => {
  const { services, conditionSummary, riskDisclosure, requiresStaffReview, reviewReasons } = determination;
  
  // Group services by category
  const groupedServices: Record<ServiceCategory, DeterminedService[]> = {
    required: services.filter(s => s.category === 'required'),
    high_cost: services.filter(s => s.category === 'high_cost'),
    recommended: services.filter(s => s.category === 'recommended'),
    preventative: services.filter(s => s.category === 'preventative'),
  };
  
  const totalEstimate = services.reduce((sum, s) => sum + s.quantity * s.baseUnitPrice, 0);
  
  return (
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
        <CardContent>
          <p className="text-sm text-muted-foreground">{conditionSummary}</p>
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
      />
      <CategorySection 
        category="high_cost" 
        services={groupedServices.high_cost} 
        showPrices={showPrices} 
      />
      <CategorySection 
        category="recommended" 
        services={groupedServices.recommended} 
        showPrices={showPrices} 
      />
      <CategorySection 
        category="preventative" 
        services={groupedServices.preventative} 
        showPrices={showPrices} 
      />
      
      {/* Totals */}
      {showPrices && (
        <Card className="border-foreground/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Estimated Investment</p>
                <p className="text-xs text-muted-foreground">
                  {services.length} services • {squareFootage} sq ft
                </p>
              </div>
              <p className="text-2xl font-bold">${totalEstimate.toFixed(2)}</p>
            </div>
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
    </div>
  );
};

export default SystemDeterminedServices;