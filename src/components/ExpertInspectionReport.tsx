 import React, { useState } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Separator } from '@/components/ui/separator';
 import { 
   AlertTriangle, CheckCircle, ChevronDown, ChevronUp, 
   FileText, Image, Lock, MessageSquare, Shield, Sparkles
 } from 'lucide-react';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 import { 
   SERVICE_CATEGORIES, 
   categorizeService, 
   getRiskDisclosure,
   type ServiceCategory 
 } from '@/lib/serviceCategories';
 import RugPhoto from '@/components/RugPhoto';
 
 interface Service {
   id: string;
   name: string;
   quantity: number;
   unitPrice: number;
   priority?: string;
 }
 
 interface RugData {
   id: string;
   rug_number: string;
   rug_type: string;
   length: number | null;
   width: number | null;
   photo_urls: string[] | null;
   analysis_report: string | null;
   estimate_id: string;
   services: Service[];
   total: number;
 }
 
 interface ExpertInspectionReportProps {
   rugs: RugData[];
   clientName: string;
   jobNumber: string;
   businessName: string | null;
   onApprove: () => void;
   onRequestClarification?: () => void;
   isProcessing?: boolean;
   totalAmount: number;
 }
 
 // Group services by category
 function groupServicesByCategory(services: Service[]): Record<ServiceCategory, Service[]> {
   const grouped: Record<ServiceCategory, Service[]> = {
     required: [],
     recommended: [],
     preventative: []
   };
   
   services.forEach(service => {
     const category = categorizeService(service.name);
     grouped[category].push(service);
   });
   
   return grouped;
 }
 
 // Calculate category totals
 function calculateCategoryTotal(services: Service[]): number {
   return services.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
 }
 
 const ExpertInspectionReport: React.FC<ExpertInspectionReportProps> = ({
   rugs,
   clientName,
   jobNumber,
   businessName,
   onApprove,
   onRequestClarification,
   isProcessing = false,
   totalAmount
 }) => {
   const [expandedRugs, setExpandedRugs] = useState<Set<string>>(new Set(rugs.map(r => r.id)));
   const [showReport, setShowReport] = useState<string | null>(null);
   
   // Aggregate services across all rugs
   const allServices = rugs.flatMap(r => r.services);
   const allGrouped = groupServicesByCategory(allServices);
   
   const requiredTotal = calculateCategoryTotal(allGrouped.required);
   const recommendedTotal = calculateCategoryTotal(allGrouped.recommended);
   const preventativeTotal = calculateCategoryTotal(allGrouped.preventative);
   
   const toggleRug = (rugId: string) => {
     setExpandedRugs(prev => {
       const newSet = new Set(prev);
       if (newSet.has(rugId)) {
         newSet.delete(rugId);
       } else {
         newSet.add(rugId);
       }
       return newSet;
     });
   };
 
   return (
     <div className="space-y-6">
       {/* Expert Assessment Header */}
       <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
         <CardHeader>
           <div className="flex items-start gap-3">
             <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
               <Sparkles className="h-6 w-6 text-primary" />
             </div>
             <div className="flex-1">
               <CardTitle className="text-xl">Expert Inspection Report</CardTitle>
               <CardDescription className="text-sm mt-1">
                 {businessName || 'Professional Rug Care'} • Job #{jobNumber}
               </CardDescription>
             </div>
           </div>
         </CardHeader>
         <CardContent>
           <p className="text-sm text-muted-foreground leading-relaxed">
             Dear {clientName},
           </p>
           <p className="text-sm text-muted-foreground leading-relaxed mt-2">
             Based on our professional inspection of your {rugs.length} rug{rugs.length !== 1 ? 's' : ''}, 
             we have prepared the following expert assessment and service recommendations. 
             Our analysis identifies required care, recommended enhancements, and optional 
             preventative treatments to ensure the longevity of your investment.
           </p>
         </CardContent>
       </Card>
 
       {/* Rug Assessments */}
       {rugs.map((rug) => {
         const groupedServices = groupServicesByCategory(rug.services);
         const isExpanded = expandedRugs.has(rug.id);
         const isShowingReport = showReport === rug.id;
         
         return (
           <Card key={rug.id}>
             <Collapsible
               open={isExpanded}
               onOpenChange={() => toggleRug(rug.id)}
             >
               <CollapsibleTrigger asChild>
                 <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       {rug.photo_urls && rug.photo_urls.length > 0 ? (
                         <RugPhoto
                           filePath={rug.photo_urls[0]}
                           alt={rug.rug_number}
                           className="w-14 h-14 object-cover rounded-lg border"
                           loadingClassName="w-14 h-14"
                         />
                       ) : (
                         <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                           <Image className="h-6 w-6 text-muted-foreground" />
                         </div>
                       )}
                       <div>
                         <CardTitle className="text-lg">{rug.rug_number}</CardTitle>
                         <CardDescription>
                           {rug.rug_type} • {rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : 'Dimensions TBD'}
                         </CardDescription>
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                       <div className="text-right">
                         <p className="font-semibold text-lg">${rug.total.toFixed(2)}</p>
                         <p className="text-xs text-muted-foreground">
                           {rug.services.length} services
                         </p>
                       </div>
                       {isExpanded ? (
                         <ChevronUp className="h-5 w-5 text-muted-foreground" />
                       ) : (
                         <ChevronDown className="h-5 w-5 text-muted-foreground" />
                       )}
                     </div>
                   </div>
                 </CardHeader>
               </CollapsibleTrigger>
               
               <CollapsibleContent>
                 <CardContent className="pt-0 space-y-4">
                   {/* Photos */}
                   {rug.photo_urls && rug.photo_urls.length > 0 && (
                     <div className="flex gap-2 overflow-x-auto pb-2">
                       {rug.photo_urls.slice(0, 4).map((url, idx) => (
                         <RugPhoto
                           key={idx}
                           filePath={url}
                           alt={`${rug.rug_number} photo ${idx + 1}`}
                           className="w-20 h-20 object-cover rounded-lg border flex-shrink-0"
                           loadingClassName="w-20 h-20"
                         />
                       ))}
                       {rug.photo_urls.length > 4 && (
                         <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground flex-shrink-0">
                           +{rug.photo_urls.length - 4}
                         </div>
                       )}
                     </div>
                   )}
                   
                   {/* View Report Toggle */}
                   {rug.analysis_report && (
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={(e) => {
                         e.stopPropagation();
                         setShowReport(isShowingReport ? null : rug.id);
                       }}
                       className="w-full justify-start gap-2 text-primary"
                     >
                       <FileText className="h-4 w-4" />
                       {isShowingReport ? 'Hide Detailed Assessment' : 'View Detailed Assessment'}
                     </Button>
                   )}
                   
                   {/* Analysis Report */}
                   {isShowingReport && rug.analysis_report && (
                     <div className="bg-muted/30 rounded-lg p-4 text-sm">
                       <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                         {rug.analysis_report}
                       </pre>
                     </div>
                   )}
                   
                   <Separator />
                   
                   {/* Required Services */}
                   {groupedServices.required.length > 0 && (
                     <div className="space-y-3">
                       <div className="flex items-center gap-2">
                         <Lock className="h-4 w-4 text-destructive" />
                         <p className="text-sm font-semibold text-destructive">
                           {SERVICE_CATEGORIES.required.label}
                         </p>
                       </div>
                       <p className="text-xs text-muted-foreground">
                         {SERVICE_CATEGORIES.required.description}
                       </p>
                       <div className="space-y-2 bg-destructive/5 rounded-lg p-3">
                         {groupedServices.required.map((service, idx) => (
                           <div key={service.id || idx} className="flex items-center justify-between text-sm">
                             <div className="flex items-center gap-2">
                               <CheckCircle className="h-4 w-4 text-destructive" />
                               <span className="font-medium">{service.name}</span>
                             </div>
                             <span className="font-semibold">
                               ${(service.quantity * service.unitPrice).toFixed(2)}
                             </span>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                   
                   {/* Recommended Services */}
                   {groupedServices.recommended.length > 0 && (
                     <div className="space-y-3">
                       <div className="flex items-center gap-2">
                         <AlertTriangle className="h-4 w-4 text-amber-600" />
                         <p className="text-sm font-semibold text-amber-600">
                           {SERVICE_CATEGORIES.recommended.label}
                         </p>
                       </div>
                       <p className="text-xs text-muted-foreground">
                         {SERVICE_CATEGORIES.recommended.description}
                       </p>
                       <div className="space-y-2 bg-amber-500/5 rounded-lg p-3">
                         {groupedServices.recommended.map((service, idx) => (
                           <div key={service.id || idx} className="flex items-center justify-between text-sm">
                             <div className="flex items-center gap-2">
                               <CheckCircle className="h-4 w-4 text-amber-600" />
                               <span>{service.name}</span>
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
                     <div className="space-y-3">
                       <div className="flex items-center gap-2">
                         <Shield className="h-4 w-4 text-muted-foreground" />
                         <p className="text-sm font-semibold text-muted-foreground">
                           {SERVICE_CATEGORIES.preventative.label}
                         </p>
                       </div>
                       <p className="text-xs text-muted-foreground">
                         {SERVICE_CATEGORIES.preventative.description}
                       </p>
                       <div className="space-y-2 bg-muted/30 rounded-lg p-3">
                         {groupedServices.preventative.map((service, idx) => (
                           <div key={service.id || idx} className="flex items-center justify-between text-sm text-muted-foreground">
                             <div className="flex items-center gap-2">
                               <CheckCircle className="h-4 w-4" />
                               <span>{service.name}</span>
                             </div>
                             <span className="font-medium">
                               ${(service.quantity * service.unitPrice).toFixed(2)}
                             </span>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                   
                   {/* Rug Total */}
                   <div className="flex justify-between items-center pt-2 border-t">
                     <span className="text-sm font-medium">Subtotal for {rug.rug_number}</span>
                     <span className="font-bold text-lg">${rug.total.toFixed(2)}</span>
                   </div>
                 </CardContent>
               </CollapsibleContent>
             </Collapsible>
           </Card>
         );
       })}
 
       {/* Summary Card */}
       <Card className="border-primary/30">
         <CardHeader className="pb-3">
           <CardTitle className="text-lg">Investment Summary</CardTitle>
         </CardHeader>
         <CardContent className="space-y-3">
           {requiredTotal > 0 && (
             <div className="flex justify-between text-sm">
               <span className="flex items-center gap-2">
                 <Lock className="h-4 w-4 text-destructive" />
                 Required Services
               </span>
               <span className="font-medium">${requiredTotal.toFixed(2)}</span>
             </div>
           )}
           {recommendedTotal > 0 && (
             <div className="flex justify-between text-sm">
               <span className="flex items-center gap-2">
                 <AlertTriangle className="h-4 w-4 text-amber-600" />
                 Recommended Enhancements
               </span>
               <span className="font-medium">${recommendedTotal.toFixed(2)}</span>
             </div>
           )}
           {preventativeTotal > 0 && (
             <div className="flex justify-between text-sm">
               <span className="flex items-center gap-2">
                 <Shield className="h-4 w-4 text-muted-foreground" />
                 Preventative Services
               </span>
               <span className="font-medium">${preventativeTotal.toFixed(2)}</span>
             </div>
           )}
           
           <Separator />
           
           <div className="flex justify-between items-center">
             <span className="font-semibold">Total Investment</span>
             <span className="text-2xl font-bold text-primary">${totalAmount.toFixed(2)}</span>
           </div>
           
           {/* Risk Disclosure */}
           <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
             <p className="font-medium text-foreground mb-1">Important Notice</p>
             <p>
               Approval authorizes work exactly as outlined above. Required services are 
               essential for proper care and cannot be declined. By proceeding, you confirm 
               your understanding of and consent to the recommended restoration work.
             </p>
           </div>
         </CardContent>
       </Card>
 
       {/* Action Buttons */}
       <div className="space-y-3">
         <Button 
           onClick={onApprove}
           disabled={isProcessing}
           className="w-full h-14 text-lg font-semibold gap-2"
           size="lg"
         >
           {isProcessing ? (
             <span className="animate-pulse">Processing...</span>
           ) : (
             <>
               <CheckCircle className="h-5 w-5" />
               Approve & Proceed with Work
             </>
           )}
         </Button>
         
         {onRequestClarification && (
           <Button 
             variant="ghost"
             onClick={onRequestClarification}
             className="w-full text-muted-foreground"
             size="sm"
           >
             <MessageSquare className="h-4 w-4 mr-2" />
             Request Clarification
           </Button>
         )}
       </div>
     </div>
   );
 };
 
 export default ExpertInspectionReport;