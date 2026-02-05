 import React, { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { 
   AlertTriangle, ChevronDown, ChevronUp, DollarSign, FileText, 
   Lock, Shield, Sparkles, CheckCircle
 } from 'lucide-react';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 import { 
   SERVICE_CATEGORIES, 
   categorizeService, 
   getRiskDisclosure,
   type ServiceCategory 
 } from '@/lib/serviceCategories';
 
 interface Service {
   id: string;
   name: string;
   quantity: number;
   unitPrice: number;
   priority?: string;
 }
 
 interface RugEstimate {
   id: string;
   inspection_id: string;
   services: Service[];
   total_amount: number;
 }
 
 interface RugInfo {
   id: string;
   rug_number: string;
   rug_type: string;
   length: number | null;
   width: number | null;
 }
 
 interface ExpertEstimateCardProps {
   estimates: RugEstimate[];
   rugs: RugInfo[];
   onViewDetails?: (rugId: string) => void;
   onEditEstimate?: (rugId: string) => void;
   showEditButton?: boolean;
   isAdminOverride?: boolean;
 }
 
 // Group services by category
 function groupServicesByCategory(services: Service[]): Record<ServiceCategory, Service[]> {
   const grouped: Record<ServiceCategory, Service[]> = {
     required: [],
     recommended: [],
    high_cost: [],
     preventative: []
   };
   
   services.forEach(service => {
     const category = categorizeService(service.name);
     grouped[category].push(service);
   });
   
   return grouped;
 }
 
 const ExpertEstimateCard: React.FC<ExpertEstimateCardProps> = ({
   estimates,
   rugs,
   onViewDetails,
   onEditEstimate,
   showEditButton = false,
   isAdminOverride = false
 }) => {
   const [expandedRugs, setExpandedRugs] = useState<Set<string>>(new Set(estimates.map(e => e.id)));
 
   const toggleRug = (estimateId: string) => {
     setExpandedRugs(prev => {
       const newSet = new Set(prev);
       if (newSet.has(estimateId)) {
         newSet.delete(estimateId);
       } else {
         newSet.add(estimateId);
       }
       return newSet;
     });
   };
 
   const totalAmount = estimates.reduce((sum, e) => sum + e.total_amount, 0);
 
   return (
     <Card>
       <CardHeader className="pb-2 md:pb-3">
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
           <div>
             <CardTitle className="text-base md:text-lg flex items-center gap-2">
               <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
               Expert Service Recommendations
             </CardTitle>
             <CardDescription className="text-xs md:text-sm">
               Based on professional inspection
             </CardDescription>
           </div>
           <div className="flex items-center justify-between sm:justify-end sm:text-right gap-4">
             <div>
               <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">
                 Total Investment
               </p>
               <p className="text-xl md:text-2xl font-bold text-primary">
                 ${totalAmount.toFixed(2)}
               </p>
             </div>
           </div>
         </div>
       </CardHeader>
       
       <CardContent className="space-y-3 md:space-y-4 pt-0">
         {estimates.map((estimate) => {
           const rug = rugs.find(r => r.id === estimate.inspection_id);
           const groupedServices = groupServicesByCategory(estimate.services);
           const isExpanded = expandedRugs.has(estimate.id);
           
           return (
             <Collapsible
               key={estimate.id}
               open={isExpanded}
               onOpenChange={() => toggleRug(estimate.id)}
             >
               <div className="border rounded-lg overflow-hidden">
                 <CollapsibleTrigger asChild>
                   <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                         <FileText className="h-5 w-5 text-primary" />
                       </div>
                       <div>
                         <p className="font-medium">{rug?.rug_number || 'Unknown Rug'}</p>
                         <p className="text-sm text-muted-foreground">
                           {rug?.rug_type} • {rug?.length && rug?.width ? `${rug.length}' × ${rug.width}'` : 'Dimensions N/A'}
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                       <div className="text-right">
                         <p className="font-semibold">${estimate.total_amount.toFixed(2)}</p>
                         <p className="text-xs text-muted-foreground">
                           {estimate.services.length} services
                         </p>
                       </div>
                       {isExpanded ? (
                         <ChevronUp className="h-5 w-5 text-muted-foreground" />
                       ) : (
                         <ChevronDown className="h-5 w-5 text-muted-foreground" />
                       )}
                     </div>
                   </div>
                 </CollapsibleTrigger>
                 
                 <CollapsibleContent>
                   <div className="px-4 pb-4 space-y-4 border-t">
                     {/* Required Services */}
                     {groupedServices.required.length > 0 && (
                       <div className="pt-4">
                         <div className="flex items-center gap-2 mb-2">
                           <Lock className="h-4 w-4 text-destructive" />
                           <p className="text-sm font-semibold text-destructive">
                             {SERVICE_CATEGORIES.required.label}
                           </p>
                         </div>
                         <p className="text-xs text-muted-foreground mb-3">
                           {SERVICE_CATEGORIES.required.description}
                         </p>
                         <div className="space-y-2 pl-6">
                           {groupedServices.required.map((service, idx) => (
                             <div key={service.id || idx} className="flex items-center justify-between text-sm">
                               <div className="flex items-center gap-2">
                                 <span>{service.name}</span>
                                 <Badge variant="destructive" className="text-[10px] h-4">
                                   Required
                                 </Badge>
                               </div>
                               <span className="font-medium">
                                 ${(service.quantity * service.unitPrice).toFixed(2)}
                               </span>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                     
                     {/* Recommended Services */}
                     {groupedServices.recommended.length > 0 && (
                       <div className={groupedServices.required.length > 0 ? 'pt-3 border-t' : 'pt-4'}>
                         <div className="flex items-center gap-2 mb-2">
                           <AlertTriangle className="h-4 w-4 text-amber-600" />
                           <p className="text-sm font-semibold text-amber-600">
                             {SERVICE_CATEGORIES.recommended.label}
                           </p>
                         </div>
                         <p className="text-xs text-muted-foreground mb-3">
                           {SERVICE_CATEGORIES.recommended.description}
                         </p>
                         <div className="space-y-2 pl-6">
                           {groupedServices.recommended.map((service, idx) => (
                             <div key={service.id || idx} className="flex items-center justify-between text-sm">
                               <div className="flex items-center gap-2">
                                 <span>{service.name}</span>
                                 <Badge variant="secondary" className="text-[10px] h-4">
                                   Recommended
                                 </Badge>
                               </div>
                               <span className="font-medium">
                                 ${(service.quantity * service.unitPrice).toFixed(2)}
                               </span>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                     
                     {/* Preventative Services */}
                     {groupedServices.preventative.length > 0 && (
                       <div className={groupedServices.required.length > 0 || groupedServices.recommended.length > 0 ? 'pt-3 border-t' : 'pt-4'}>
                         <div className="flex items-center gap-2 mb-2">
                           <Shield className="h-4 w-4 text-muted-foreground" />
                           <p className="text-sm font-semibold text-muted-foreground">
                             {SERVICE_CATEGORIES.preventative.label}
                           </p>
                         </div>
                         <p className="text-xs text-muted-foreground mb-3">
                           {SERVICE_CATEGORIES.preventative.description}
                         </p>
                         <div className="space-y-2 pl-6">
                           {groupedServices.preventative.map((service, idx) => (
                             <div key={service.id || idx} className="flex items-center justify-between text-sm text-muted-foreground">
                               <div className="flex items-center gap-2">
                                 <span>{service.name}</span>
                                 <Badge variant="outline" className="text-[10px] h-4">
                                   Preventative
                                 </Badge>
                               </div>
                               <span className="font-medium">
                                 ${(service.quantity * service.unitPrice).toFixed(2)}
                               </span>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                     
                     {/* Actions */}
                     {(showEditButton || onViewDetails) && (
                       <div className="flex items-center gap-2 pt-3 border-t">
                         {onViewDetails && (
                           <Button 
                             variant="outline" 
                             size="sm" 
                             onClick={() => onViewDetails(estimate.inspection_id)}
                           >
                             View Full Report
                           </Button>
                         )}
                         {showEditButton && onEditEstimate && isAdminOverride && (
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             onClick={() => onEditEstimate(estimate.inspection_id)}
                             className="text-muted-foreground"
                           >
                             Override Expert Recommendation
                           </Button>
                         )}
                       </div>
                     )}
                   </div>
                 </CollapsibleContent>
               </div>
             </Collapsible>
           );
         })}
         
         {/* Summary Footer */}
         <div className="flex items-center justify-between pt-3 border-t">
           <div className="flex items-center gap-2 text-xs text-muted-foreground">
             <CheckCircle className="h-4 w-4 text-green-500" />
             <span>Expert assessment complete</span>
           </div>
           <p className="text-sm">
             <span className="text-muted-foreground">Total: </span>
             <span className="font-bold text-lg">${totalAmount.toFixed(2)}</span>
           </p>
         </div>
       </CardContent>
     </Card>
   );
 };
 
 export default ExpertEstimateCard;