 // Staff Pricing Review Component
 // Shows final prices with optional override capability
 // Never exposes multiplier formulas to clients
 
 import { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import { Label } from '@/components/ui/label';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Textarea } from '@/components/ui/textarea';
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
 import { AlertTriangle, Check, DollarSign, Edit3, Lock, Info } from 'lucide-react';
 import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
 import { 
   PricedService, 
   PricingResult, 
   OVERRIDE_REASONS, 
   OverrideReason,
   PriceOverride,
   validateOverride 
 } from '@/lib/pricingEngine';
 import { SERVICE_CATEGORIES } from '@/lib/serviceCategories';
 import { cn } from '@/lib/utils';
 
 interface PricingReviewProps {
   pricing: PricingResult;
   onOverride?: (override: PriceOverride) => void;
   readOnly?: boolean;
   showFactors?: boolean; // Staff view shows factors, client view doesn't
 }
 
 export function PricingReview({ 
   pricing, 
   onOverride, 
   readOnly = false,
   showFactors = true 
 }: PricingReviewProps) {
   const [overrideDialog, setOverrideDialog] = useState<PricedService | null>(null);
   const [overridePrice, setOverridePrice] = useState('');
   const [overrideReason, setOverrideReason] = useState<OverrideReason | ''>('');
   const [overrideNotes, setOverrideNotes] = useState('');
   const [overrideError, setOverrideError] = useState<string | null>(null);
 
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
     
     onOverride?.(override);
     setOverrideDialog(null);
   };
 
   // Group services by category
   const groupedServices = pricing.services.reduce((acc, service) => {
     if (!acc[service.category]) acc[service.category] = [];
     acc[service.category].push(service);
     return acc;
   }, {} as Record<string, PricedService[]>);
 
   const categoryOrder = ['required', 'high_cost', 'recommended', 'preventative'];
 
   return (
     <TooltipProvider>
       <div className="space-y-6">
         {/* Pricing Statement - Always shown */}
         <Card className="border-muted">
           <CardContent className="pt-4">
             <p className="text-sm text-muted-foreground italic">
               {pricing.pricingStatement}
             </p>
           </CardContent>
         </Card>
 
         {/* Services by Category */}
         {categoryOrder.map(category => {
           const services = groupedServices[category];
           if (!services || services.length === 0) return null;
           
           const categoryConfig = SERVICE_CATEGORIES[category as keyof typeof SERVICE_CATEGORIES];
           
           return (
             <Card key={category} className={cn(
               "border",
               category === 'required' && "border-primary/30",
               category === 'high_cost' && "border-primary/40",
             )}>
               <CardHeader className="pb-3">
                 <div className="flex items-center justify-between">
                   <CardTitle className="text-base flex items-center gap-2">
                     {categoryConfig?.label || category}
                     {category === 'required' && (
                       <Lock className="h-4 w-4 text-muted-foreground" />
                     )}
                   </CardTitle>
                   {showFactors && (
                     <Badge variant="outline" className="text-xs">
                       {services.length} service{services.length !== 1 ? 's' : ''}
                     </Badge>
                   )}
                 </div>
               </CardHeader>
               <CardContent className="space-y-3">
                 {services.map(service => (
                   <ServicePriceRow
                     key={service.id}
                     service={service}
                     showFactors={showFactors}
                     readOnly={readOnly || category === 'required'}
                     onEdit={() => handleOpenOverride(service)}
                   />
                 ))}
               </CardContent>
             </Card>
           );
         })}
 
         {/* Totals */}
         <Card className="bg-muted/30">
           <CardContent className="pt-4">
             <div className="space-y-2">
               {showFactors && pricing.totalBeforeAdjustments !== pricing.totalAfterAdjustments && (
                 <div className="flex justify-between text-sm text-muted-foreground">
                   <span>Base total</span>
                   <span>${pricing.totalBeforeAdjustments.toFixed(2)}</span>
                 </div>
               )}
               <div className="flex justify-between text-lg font-semibold">
                 <span>Total</span>
                 <span>${pricing.totalAfterAdjustments.toFixed(2)}</span>
               </div>
             </div>
           </CardContent>
         </Card>
 
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
                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input
                     id="override-price"
                     type="number"
                     step="0.01"
                     min="0"
                     value={overridePrice}
                     onChange={(e) => setOverridePrice(e.target.value)}
                     className="pl-9"
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
                 <Check className="h-4 w-4 mr-2" />
                 Apply Override
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
       </div>
     </TooltipProvider>
   );
 }
 
 // ============================================
 // Service Price Row Component
 // ============================================
 
 interface ServicePriceRowProps {
   service: PricedService;
   showFactors: boolean;
   readOnly: boolean;
   onEdit: () => void;
 }
 
 function ServicePriceRow({ service, showFactors, readOnly, onEdit }: ServicePriceRowProps) {
   return (
     <div className="flex items-start justify-between py-2 border-b border-border/50 last:border-0">
       <div className="flex-1 min-w-0">
         <div className="flex items-center gap-2">
           <span className="font-medium text-sm">{service.name}</span>
           {service.isOverridden && (
             <Badge variant="outline" className="text-xs bg-accent/50">
               Adjusted
             </Badge>
           )}
         </div>
         
         {/* Quantity info */}
         <p className="text-xs text-muted-foreground mt-0.5">
           {service.quantity > 1 
             ? `${service.quantity} units × $${service.baseUnitPrice.toFixed(2)}`
             : `$${service.baseUnitPrice.toFixed(2)} base`
           }
         </p>
         
         {/* Staff-only: Pricing factors */}
         {showFactors && service.pricingFactors.length > 0 && (
           <div className="flex flex-wrap gap-1 mt-1">
             {service.pricingFactors.map(factor => (
               <Badge key={factor} variant="secondary" className="text-xs">
                 {factor}
               </Badge>
             ))}
           </div>
         )}
       </div>
       
       <div className="flex items-center gap-2 ml-4">
         <div className="text-right">
           <span className="font-semibold">${service.adjustedTotal.toFixed(2)}</span>
           {showFactors && service.riskMultiplier !== 1 && (
             <Tooltip>
               <TooltipTrigger asChild>
                 <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                   <Info className="h-3 w-3" />
                   {service.riskMultiplier.toFixed(2)}×
                 </div>
               </TooltipTrigger>
               <TooltipContent>
                 Risk-adjusted multiplier (internal only)
               </TooltipContent>
             </Tooltip>
           )}
         </div>
         
         {!readOnly && showFactors && (
           <Button 
             variant="ghost" 
             size="icon" 
             className="h-8 w-8"
             onClick={onEdit}
           >
             <Edit3 className="h-4 w-4" />
           </Button>
         )}
       </div>
     </div>
   );
 }