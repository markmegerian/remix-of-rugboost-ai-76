import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; 
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { 
  ChevronDown, ChevronUp, 
  FileText, ImageIcon, Lock, MessageSquare, Shield, ClipboardCheck,
  AlertTriangle, Check
 } from 'lucide-react';
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
 import { 
   SERVICE_CATEGORIES, 
   categorizeService, 
  type ServiceCategory,
  getServiceDeclineConsequence
 } from '@/lib/serviceCategories';
 import RugPhoto from '@/components/RugPhoto';
 import LazyPhotoGallery from '@/components/LazyPhotoGallery';
 import { ServiceLineItem, type Service } from '@/components/inspection/ServiceLineItem';
 import { PhotoLightbox } from '@/components/inspection/PhotoLightbox';
 import { DeclineConfirmDialog } from '@/components/inspection/DeclineConfirmDialog';

// Check if service is significant value (threshold: $100)
function isSignificantValue(service: Service): boolean {
  return service.adjustedTotal >= 100;
}
 
 interface PhotoAnnotations {
   photoIndex: number;
   annotations: Array<{
     label: string;
     location: string;
     x: number;
     y: number;
   }>;
 }

 interface RugData {
   id: string;
   rug_number: string;
   rug_type: string;
   length: number | null;
   width: number | null;
   photo_urls: string[] | null;
   analysis_report: string | null;
   image_annotations: PhotoAnnotations[] | null;
   estimate_id: string;
   services: Service[];
   total: number;
 }
 
 interface ExpertInspectionReportProps {
   rugs: RugData[];
   clientName: string;
   jobNumber: string;
   businessName: string | null;
  onApprove: (declinedServiceIds: Set<string>) => void;
   onRequestClarification?: () => void;
   isProcessing?: boolean;
   totalAmount: number;
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
 
 // Calculate category totals
function calculateCategoryTotal(services: Service[], useAdjusted = true): number {
  return services.reduce((sum, s) => sum + (useAdjusted ? s.adjustedTotal : s.quantity * s.unitPrice), 0);
 }

// Generate condition summary based on services
function generateConditionSummary(services: Service[]): string {
  const hasStainRemoval = services.some(s => s.name.toLowerCase().includes('stain'));
  const hasOdorTreatment = services.some(s => s.name.toLowerCase().includes('odor') || s.name.toLowerCase().includes('urine'));
  const hasRepair = services.some(s => s.name.toLowerCase().includes('repair') || s.name.toLowerCase().includes('fringe'));
  const hasProtection = services.some(s => s.name.toLowerCase().includes('protection') || s.name.toLowerCase().includes('scotchgard'));
  
  const conditions: string[] = [];
  if (hasStainRemoval) conditions.push('visible staining');
  if (hasOdorTreatment) conditions.push('odor contamination');
  if (hasRepair) conditions.push('structural concerns');
  if (hasProtection) conditions.push('fiber vulnerability');
  
  if (conditions.length === 0) {
    return 'Standard cleaning and care recommended based on material type and general condition.';
  }
  
  return `Assessment indicates ${conditions.join(', ')}. Services outlined below address identified conditions.`;
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
  const [declinedServices, setDeclinedServices] = useState<Set<string>>(new Set());
  const [confirmDecline, setConfirmDecline] = useState<Service | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxAnnotations, setLightboxAnnotations] = useState<PhotoAnnotations[] | null>(null);
   
   // Aggregate services across all rugs, adding rug identification
   const allServices = rugs.flatMap(r => 
     r.services.map(s => ({ ...s, rugNumber: r.rug_number }))
   );
   const allGrouped = groupServicesByCategory(allServices);
   
  const requiredTotal = calculateCategoryTotal(allGrouped.required, true);
  
  // Calculate totals based on declined services
  const { finalTotal, declinedTotal, acceptedRecommended, acceptedHighCost, acceptedPreventative } = useMemo(() => {
    let accepted = requiredTotal;
    let declined = 0;
    let recAccepted: Service[] = [];
    let highCostAccepted: Service[] = [];
    let prevAccepted: Service[] = [];
    
    allGrouped.recommended.forEach(s => {
      const cost = s.adjustedTotal;
      if (declinedServices.has(s.id)) {
        declined += cost;
      } else {
        accepted += cost;
        recAccepted.push(s);
      }
    });
    
    allGrouped.high_cost.forEach(s => {
      const cost = s.adjustedTotal;
      if (declinedServices.has(s.id)) {
        declined += cost;
      } else {
        accepted += cost;
        highCostAccepted.push(s);
      }
    });
    
    allGrouped.preventative.forEach(s => {
      const cost = s.adjustedTotal;
      if (declinedServices.has(s.id)) {
        declined += cost;
      } else {
        accepted += cost;
        prevAccepted.push(s);
      }
    });
    
    return {
      finalTotal: accepted,
      declinedTotal: declined,
      acceptedRecommended: recAccepted,
      acceptedHighCost: highCostAccepted,
      acceptedPreventative: prevAccepted,
    };
  }, [requiredTotal, allGrouped, declinedServices]);
  
  const handleDeclineService = useCallback((service: Service) => {
    setConfirmDecline(service);
  }, []);
  
  const confirmDeclineService = useCallback(() => {
    if (confirmDecline) {
      setDeclinedServices(prev => new Set([...prev, confirmDecline.id]));
      setConfirmDecline(null);
    }
  }, [confirmDecline]);
  
  const restoreService = useCallback((serviceId: string) => {
    setDeclinedServices(prev => {
      const next = new Set(prev);
      next.delete(serviceId);
      return next;
    });
  }, []);
   
  const openLightbox = (photos: string[], index: number, annotations?: PhotoAnnotations[] | null) => {
    setLightboxImages(photos);
    setLightboxIndex(index);
    setLightboxAnnotations(annotations || null);
  };
  
  const closeLightbox = () => {
    setLightboxImages(null);
    setLightboxIndex(0);
    setLightboxAnnotations(null);
  };
   
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
 
    const paymentButtonRef = useRef<HTMLButtonElement>(null);
    const [showStickyBar, setShowStickyBar] = useState(false);

    useEffect(() => {
      const el = paymentButtonRef.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => setShowStickyBar(!entry.isIntersecting),
        { threshold: 0 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    return (
      <div className="space-y-6 pb-20 md:pb-0">
      {/* 1. Header Section */}
      <Card className="border-border bg-card">
         <CardHeader>
           <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6 text-foreground" />
             </div>
             <div className="flex-1">
               <CardTitle className="text-xl">Expert Inspection Report</CardTitle>
               <CardDescription className="text-sm mt-1">
                Prepared following professional inspection and industry-standard care guidelines
               </CardDescription>
             </div>
           </div>
         </CardHeader>
         <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-muted pl-4">
            This report outlines the services required to safely clean and preserve your {rugs.length === 1 ? 'rug' : `${rugs.length} rugs`}. 
            All recommendations are based on observed condition, material characteristics, and established industry protocols.
           </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{businessName || 'Professional Rug Care'}</span>
            <span>•</span>
            <span>Report #{jobNumber}</span>
            <span>•</span>
            <span>Prepared for {clientName}</span>
          </div>
         </CardContent>
       </Card>
 
      {/* 2. Rug Assessments */}
       {rugs.map((rug) => {
         const isExpanded = expandedRugs.has(rug.id);
         const isShowingReport = showReport === rug.id;
        const conditionSummary = generateConditionSummary(rug.services);
         
         return (
          <Card key={rug.id} className="overflow-hidden">
             <Collapsible open={isExpanded} onOpenChange={() => toggleRug(rug.id)}>
               <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
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
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                         </div>
                       )}
                       <div>
                         <CardTitle className="text-lg">{rug.rug_number}</CardTitle>
                         <CardDescription>
                           {rug.rug_type} • {rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : 'Dimensions TBD'}
                         </CardDescription>
                       </div>
                     </div>
                    <div className="flex items-center gap-2">
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
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground italic">{conditionSummary}</p>
                  </div>

                   {rug.photo_urls && rug.photo_urls.length > 0 && (
                     <LazyPhotoGallery
                       photoUrls={rug.photo_urls}
                       rugNumber={rug.rug_number}
                       initialCount={3}
                       annotations={rug.image_annotations}
                       onOpenLightbox={openLightbox}
                     />
                   )}
                   
                   {rug.analysis_report && (
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={(e) => {
                         e.stopPropagation();
                         setShowReport(isShowingReport ? null : rug.id);
                       }}
                      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                     >
                       <FileText className="h-4 w-4" />
                       {isShowingReport ? 'Hide Detailed Assessment' : 'View Detailed Assessment'}
                     </Button>
                   )}
                   
                   {isShowingReport && rug.analysis_report && (
                     <div className="bg-muted/30 rounded-lg p-4 text-sm">
                       <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                         {rug.analysis_report}
                       </pre>
                     </div>
                   )}
                 </CardContent>
               </CollapsibleContent>
             </Collapsible>
           </Card>
         );
       })}
 
      {/* 3. Required Services */}
      {allGrouped.required.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-foreground" />
              <CardTitle className="text-base">Services Required for Proper Care</CardTitle>
            </div>
            <CardDescription className="text-xs">
              These services are required to safely clean and handle the rug based on its material and condition.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allGrouped.required.map((service, idx) => (
                <div key={service.id || idx} className="flex items-start gap-3 py-2">
                  <Lock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{service.name}</p>
                    {rugs.length > 1 && service.rugNumber && (
                      <p className="text-[10px] text-muted-foreground font-medium">{service.rugNumber}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      ${(service.quantity * service.unitPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Recommended Services */}
      {allGrouped.recommended.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Expert-Recommended Services</CardTitle>
            <CardDescription className="text-xs mt-1">
              Recommended based on professional inspection findings. Included in your assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allGrouped.recommended.map((service, idx) => (
                <ServiceLineItem
                  key={service.id || idx}
                  service={service}
                  category="recommended"
                  isDeclined={declinedServices.has(service.id)}
                  onDecline={() => handleDeclineService(service)}
                  onRestore={() => restoreService(service.id)}
                  isSignificant={isSignificantValue(service)}
                  showRugLabel={rugs.length > 1}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Structural / High-Impact Services */}
      {allGrouped.high_cost.length > 0 && (
        <Card className="border-2 border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Structural / High-Impact Services</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Significant restoration work addressing structural integrity or severe condition issues. 
              Each service requires explicit confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allGrouped.high_cost.map((service, idx) => (
                <ServiceLineItem
                  key={service.id || idx}
                  service={service}
                  category="high_cost"
                  isDeclined={declinedServices.has(service.id)}
                  onDecline={() => handleDeclineService(service)}
                  onRestore={() => restoreService(service.id)}
                  isSignificant={true}
                  showRugLabel={rugs.length > 1}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-dashed">
              <strong>Note:</strong> Declining structural services may affect long-term rug integrity and value.
            </p>
          </CardContent>
        </Card>
      )}

      {/* 6. Preventative Care */}
      {allGrouped.preventative.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Preventative Care</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Optional treatments to extend rug longevity. Included in your assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allGrouped.preventative.map((service, idx) => (
                <ServiceLineItem
                  key={service.id || idx}
                  service={service}
                  category="preventative"
                  isDeclined={declinedServices.has(service.id)}
                  onDecline={() => handleDeclineService(service)}
                  onRestore={() => restoreService(service.id)}
                  isSignificant={isSignificantValue(service)}
                  showRugLabel={rugs.length > 1}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Declined Services Summary */}
      {declinedServices.size > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <CardTitle className="text-sm text-destructive">Declined Services</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...allGrouped.recommended, ...allGrouped.high_cost, ...allGrouped.preventative]
                .filter(s => declinedServices.has(s.id))
                .map((service) => (
                  <div key={service.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground line-through">{service.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-primary"
                      onClick={() => restoreService(service.id)}
                    >
                      Restore
                    </Button>
                  </div>
                ))}
            </div>
            <p className="text-xs text-destructive/80 mt-3">
              These services will not be performed. Associated risks have been acknowledged.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Risk & Disclosure */}
      <div className="bg-muted/30 rounded-lg p-4 border border-dashed">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Professional Notice:</span>{' '}
          Rugs of varying age and condition may exhibit pre-existing weaknesses that cannot be fully 
          corrected through cleaning alone. The services outlined represent our professional assessment 
          of appropriate care based on current condition. Authorization confirms understanding that 
          results depend on material condition at time of service.
        </p>
      </div>

      {/* Pricing Context */}
      <div className="bg-muted/30 rounded-lg p-4 border border-dashed mb-4">
        <p className="text-xs text-muted-foreground italic leading-relaxed">
          Pricing reflects the material, condition, and recommended care identified during professional inspection.
        </p>
      </div>

      {/* Total Investment */}
      <Card className="border-foreground/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Investment for Authorized Work
          </CardTitle>
         </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight">
            ${finalTotal.toFixed(2)}
           </div>
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            <p>Required: ${requiredTotal.toFixed(2)}</p>
            {acceptedRecommended.length > 0 && (
              <p>Recommended ({acceptedRecommended.length}): ${calculateCategoryTotal(acceptedRecommended).toFixed(2)}</p>
            )}
            {acceptedHighCost.length > 0 && (
              <p>Structural ({acceptedHighCost.length}): ${calculateCategoryTotal(acceptedHighCost).toFixed(2)}</p>
            )}
            {acceptedPreventative.length > 0 && (
              <p>Preventative ({acceptedPreventative.length}): ${calculateCategoryTotal(acceptedPreventative).toFixed(2)}</p>
            )}
            {declinedTotal > 0 && (
              <p className="text-destructive">Declined: -${declinedTotal.toFixed(2)}</p>
            )}
           </div>
         </CardContent>
       </Card>
 
       {/* Primary CTA */}
       <div className="space-y-4">
          <Button
            ref={paymentButtonRef}
            onClick={() => onApprove(declinedServices)}
            disabled={isProcessing}
           className="w-full h-14 text-lg font-medium"
            size="lg"
          >
            {isProcessing ? (
             <span className="animate-pulse">Processing Authorization...</span>
            ) : (
             'Approve & Authorize Work'
            )}
          </Button>
         
        <p className="text-xs text-center text-muted-foreground">
          {declinedServices.size > 0 
            ? `Approval authorizes ${allServices.length - declinedServices.size} services with ${declinedServices.size} declined.`
            : 'Approval authorizes all services outlined above and initiates payment.'
          }
        </p>
        
         {onRequestClarification && (
           <Button 
             variant="ghost"
             onClick={onRequestClarification}
            className="w-full text-muted-foreground hover:text-foreground"
             size="sm"
           >
             <MessageSquare className="h-4 w-4 mr-2" />
             Request Clarification
           </Button>
         )}
       </div>

      {/* Decline Confirmation Dialog */}
      <DeclineConfirmDialog
        isOpen={!!confirmDecline}
        onClose={() => setConfirmDecline(null)}
        onConfirm={confirmDeclineService}
        serviceName={confirmDecline?.name || ''}
      />

      {/* Photo Lightbox */}
      <PhotoLightbox
        photos={lightboxImages || []}
        initialIndex={lightboxIndex}
        isOpen={!!lightboxImages}
        onClose={closeLightbox}
        annotations={lightboxAnnotations}
      />

       {/* Sticky bottom payment bar - mobile only */}
       {showStickyBar && (
         <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 pb-safe-bottom">
           <div className="space-y-1">
             {declinedServices.size > 0 && (
               <p className="text-xs text-muted-foreground text-center">
                 {declinedServices.size} service{declinedServices.size > 1 ? 's' : ''} declined
               </p>
             )}
             <div className="flex items-center gap-3">
               <div className="text-lg font-bold">${finalTotal.toFixed(2)}</div>
               <Button
                 onClick={() => onApprove(declinedServices)}
                 disabled={isProcessing}
                 className="flex-1 h-12"
                 size="lg"
               >
                 {isProcessing ? 'Processing...' : 'Approve & Pay'}
               </Button>
             </div>
           </div>
         </div>
       )}
      </div>
    );
  };
 
 export default ExpertInspectionReport;
