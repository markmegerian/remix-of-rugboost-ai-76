import React, { useState, useEffect, useRef } from 'react';
import type { RugDimensions } from '@/lib/rugDimensions';
import { calculateSquareFeet, calculateLinearFeet, type EdgeSuggestion, parseEdgeSuggestions, getSuggestedEdgesForService } from '@/lib/rugDimensions';
import { getServiceUnit } from '@/lib/serviceUnits';
import { ArrowLeft, Plus, Trash2, Save, Check, Edit2, DollarSign, Loader2, Lightbulb, Lock, AlertTriangle, Shield, AlertCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import TeachAIDialog from './TeachAIDialog';
import { categorizeService, SERVICE_CATEGORIES, canStaffEditService, type ServiceCategory } from '@/lib/serviceCategories';
import { LockedIndicator } from '@/components/LifecycleErrorState';
import { LIFECYCLE_ERRORS } from '@/lib/lifecycleStateMachine';
import AddStaffServiceModal, { type StaffAddedService } from './AddStaffServiceModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  priority: 'high' | 'medium' | 'low';
  // Staff addition tracking
  source?: 'ai' | 'staff';
  addedBy?: string;
  addedByName?: string;
  addedAt?: string;
  reasonNote?: string;
}

interface EstimateReviewProps {
  report: string;
  rugInfo: {
    rugNumber: string;
    rugType: string;
    dimensions: string;
    squareFootage: number | null;
  };
  inspectionId: string;
  jobId: string;
  onBack: () => void;
  onApprove: (services: ServiceItem[], totalCost: number) => void;
  availableServices?: { name: string; unitPrice: number }[];
  existingApprovedEstimate?: {
    id: string;
    services: ServiceItem[];
    total_amount: number;
  } | null;
  /** If true, estimate is locked and cannot be modified */
  isLocked?: boolean;
  /** Parsed rug dimensions for auto-calculating service quantities */
  rugDimensions?: RugDimensions | null;
  /** AI edge suggestions from analysis */
  edgeSuggestions?: any[] | null;
}

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700 border-red-300',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low: 'bg-green-100 text-green-700 border-green-300',
};

const EstimateReview: React.FC<EstimateReviewProps> = ({
  report,
  rugInfo,
  inspectionId,
  jobId,
  onBack,
  onApprove,
  availableServices = [],
  existingApprovedEstimate,
  isLocked = false,
  rugDimensions = null,
  edgeSuggestions: rawEdgeSuggestions = null,
}) => {
  const parsedEdgeSuggestions = React.useMemo(
    () => parseEdgeSuggestions(rawEdgeSuggestions || []),
    [rawEdgeSuggestions],
  );
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showTeachAI, setShowTeachAI] = useState(false);
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);
  const [isAdminOverride, setIsAdminOverride] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState<{
    originalService: string;
    originalPrice: number;
    correctedService: string;
    correctedPrice: number;
  } | null>(null);
  
  // Track original AI-parsed values for comparison
  const originalServicesRef = useRef<ServiceItem[]>([]);
  
  // Track if services have been modified for unsaved changes warning
  const [hasModifications, setHasModifications] = useState(false);
  

  // Load existing approved estimate or parse from report
  useEffect(() => {
    if (existingApprovedEstimate && existingApprovedEstimate.services.length > 0) {
      // Use existing approved services
      setServices(existingApprovedEstimate.services);
      originalServicesRef.current = existingApprovedEstimate.services;
    } else {
      // Parse from AI report
      const extractedServices = parseReportForServices(report);
      setServices(extractedServices);
      originalServicesRef.current = extractedServices;
    }
  }, [report, existingApprovedEstimate]);

  // Determine priority based on service type
  const getServicePriority = (serviceName: string): 'high' | 'medium' | 'low' => {
    const lowerName = serviceName.toLowerCase();
    
    // High priority - essential cleaning and structural repairs
    if (lowerName.includes('cleaning') || 
        lowerName.includes('wash') ||
        lowerName.includes('stain removal') ||
        lowerName.includes('repair') ||
        lowerName.includes('reweaving') ||
        lowerName.includes('hole') ||
        lowerName.includes('tear') ||
        lowerName.includes('foundation') ||
        lowerName.includes('dry rot') ||
        lowerName.includes('soaking')) {
      return 'high';
    }
    
    // Medium priority - structural maintenance and edge work
    if (lowerName.includes('binding') ||
        lowerName.includes('overcast') ||
        lowerName.includes('fringe') ||
        lowerName.includes('edge') ||
        lowerName.includes('selvedge') ||
        lowerName.includes('blocking') ||
        lowerName.includes('stretching') ||
        lowerName.includes('shearing') ||
        lowerName.includes('zenjireh')) {
      return 'medium';
    }
    
    // Low priority - protection and optional services
    if (lowerName.includes('protection') ||
        lowerName.includes('moth proof') ||
        lowerName.includes('padding') ||
        lowerName.includes('fiber protect') ||
        lowerName.includes('scotchgard') ||
        lowerName.includes('storage')) {
      return 'low';
    }
    
    // Default to medium
    return 'medium';
  };

  const parseReportForServices = (reportText: string): ServiceItem[] => {
    const services: ServiceItem[] = [];
    const lines = reportText.split('\n');
    
    let inBreakdownSection = false;
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      const trimmedLine = line.trim();
      
      if (lowerLine.includes('rug breakdown') || 
          lowerLine.includes('estimate of services') ||
          lowerLine.includes('services and costs') ||
          lowerLine.includes('itemized list')) {
        inBreakdownSection = true;
        continue;
      }
      
      if (lowerLine.includes('total estimate') || 
          lowerLine.includes('total investment') ||
          lowerLine.includes('next steps') ||
          lowerLine.includes('sincerely') ||
          lowerLine.includes('additional protection')) {
        inBreakdownSection = false;
        continue;
      }
      
      if (lowerLine.startsWith('rug #') || lowerLine.startsWith('rug:')) continue;
      if (lowerLine.includes('subtotal')) continue;
      
      if (inBreakdownSection && trimmedLine.length > 0) {
        const serviceMatch = trimmedLine.match(/^[-*]?\s*(.+?):\s*\$([0-9,]+(?:\.[0-9]{2})?)/);
        
        if (serviceMatch) {
          const serviceName = serviceMatch[1].trim()
            // Strip parenthetical details like "(80 sq ft × $3.50/sq ft)"
            .replace(/\s*\([^)]*\)\s*$/, '');
          const price = parseFloat(serviceMatch[2].replace(',', ''));
          
          if (serviceName.length < 3) continue;
          
          const existingIndex = services.findIndex(
            s => s.name.toLowerCase() === serviceName.toLowerCase()
          );
          
          if (existingIndex >= 0) {
            services[existingIndex].quantity += 1;
            if (price > 0 && services[existingIndex].unitPrice === 0) {
              services[existingIndex].unitPrice = price;
            }
          } else {
            services.push({
              id: crypto.randomUUID(),
              name: serviceName,
              quantity: 1,
              unitPrice: price,
              priority: getServicePriority(serviceName),
              source: 'ai',
            });
          }
        }
      }
    }
    
    // Fallback: look for any line with a dollar amount
    if (services.length === 0) {
      for (const line of lines) {
        const trimmedLine = line.trim();
        const priceMatch = trimmedLine.match(/^(.+?):\s*\$([0-9,]+(?:\.[0-9]{2})?)/);
        
        if (priceMatch) {
          const serviceName = priceMatch[1].trim()
            .replace(/^[-*]\s*/, '')
            .replace(/\*\*/g, '')
            .replace(/\s*\([^)]*\)\s*$/, '');
          const price = parseFloat(priceMatch[2].replace(',', ''));
          
          const lowerName = serviceName.toLowerCase();
          if (lowerName.includes('subtotal') || 
              lowerName.includes('total') ||
              lowerName.includes('rug #') ||
              serviceName.length < 3) continue;
          
          const existingIndex = services.findIndex(
            s => s.name.toLowerCase() === serviceName.toLowerCase()
          );
          
          if (existingIndex < 0) {
            services.push({
              id: crypto.randomUUID(),
              name: serviceName,
              quantity: 1,
              unitPrice: price,
              priority: getServicePriority(serviceName),
              source: 'ai',
            });
          }
        }
      }
    }
    
    // ── Auto-recalculate quantities using unit types + dimensions ──
    const hasDims = rugDimensions && rugDimensions.lengthFt > 0 && rugDimensions.widthFt > 0;
    
    for (const svc of services) {
      const unitConfig = getServiceUnit(svc.name);
      
      if (hasDims && unitConfig.unit === 'sqft') {
        const sqft = calculateSquareFeet(rugDimensions!);
        // Derive unit price from total ÷ sqft if AI gave a lump total
        if (svc.quantity === 1 && svc.unitPrice > 0) {
          // Check if the AI price looks like a total (much larger than a per-sqft rate)
          const catalogEntry = availableServices.find(
            a => a.name.toLowerCase() === svc.name.toLowerCase()
          );
          if (catalogEntry && catalogEntry.unitPrice > 0) {
            svc.unitPrice = catalogEntry.unitPrice;
          } else if (svc.unitPrice > sqft) {
            // AI gave total price – derive unit price
            svc.unitPrice = Math.round((svc.unitPrice / sqft) * 100) / 100;
          }
        }
        svc.quantity = Math.round(sqft * 100) / 100;
      } else if (hasDims && unitConfig.unit === 'linear_ft') {
        // Use AI edge suggestions if available
        const suggestion = getSuggestedEdgesForService(svc.name, parsedEdgeSuggestions);
        if (suggestion && suggestion.suggestedEdges.length > 0) {
          const linFt = calculateLinearFeet(rugDimensions!, suggestion.suggestedEdges);
          // Derive unit price from total if AI gave a lump
          const catalogEntry = availableServices.find(
            a => a.name.toLowerCase() === svc.name.toLowerCase()
          );
          if (catalogEntry && catalogEntry.unitPrice > 0) {
            svc.unitPrice = catalogEntry.unitPrice;
          } else if (svc.quantity === 1 && svc.unitPrice > linFt) {
            svc.unitPrice = Math.round((svc.unitPrice / linFt) * 100) / 100;
          }
          svc.quantity = Math.round(linFt * 100) / 100;
        } else {
          // No edge suggestions – use full perimeter as fallback
          const perimeter = 2 * (rugDimensions!.lengthFt + rugDimensions!.widthFt);
          const catalogEntry = availableServices.find(
            a => a.name.toLowerCase() === svc.name.toLowerCase()
          );
          if (catalogEntry && catalogEntry.unitPrice > 0) {
            svc.unitPrice = catalogEntry.unitPrice;
          } else if (svc.quantity === 1 && svc.unitPrice > perimeter) {
            svc.unitPrice = Math.round((svc.unitPrice / perimeter) * 100) / 100;
          }
          svc.quantity = Math.round(perimeter * 100) / 100;
        }
      } else if (unitConfig.unit !== 'variable') {
        // 'each' type or no dims – try to use catalog price
        const catalogEntry = availableServices.find(
          a => a.name.toLowerCase() === svc.name.toLowerCase()
        );
        if (catalogEntry && catalogEntry.unitPrice > 0 && svc.unitPrice === 0) {
          svc.unitPrice = catalogEntry.unitPrice;
        }
      }
    }
    
    return services;
  };

  const handleUpdateService = (id: string, updates: Partial<ServiceItem>) => {
    if (isLocked) {
      toast.error(LIFECYCLE_ERRORS.JOB_LOCKED);
      return;
    }
    const originalService = originalServicesRef.current.find(s => s.id === id);
    
    setServices(prev =>
      prev.map(s => {
        if (s.id !== id) return s;
        const updated = { ...s, ...updates };
        
        // Check for significant changes that warrant teaching the AI
        if (originalService) {
          const priceChange = Math.abs(updated.unitPrice - originalService.unitPrice);
          const pricePctChange = originalService.unitPrice > 0 
            ? priceChange / originalService.unitPrice 
            : (updated.unitPrice > 0 ? 1 : 0);
          const nameChanged = updated.name.toLowerCase() !== originalService.name.toLowerCase();
          
          // If >20% price change or name changed, prompt for feedback
          if (pricePctChange > 0.2 || nameChanged) {
            setPendingFeedback({
              originalService: originalService.name,
              originalPrice: originalService.unitPrice,
              correctedService: updated.name,
              correctedPrice: updated.unitPrice,
            });
          }
        }
        
        return updated;
      })
    );
    
    // Mark as modified
    setHasModifications(true);
  };

  // Handler for adding staff services via modal
  const handleAddStaffService = (newService: StaffAddedService) => {
    if (isLocked) {
      toast.error(LIFECYCLE_ERRORS.JOB_LOCKED);
      return;
    }
    
    // Convert to ServiceItem with staff tracking
    const serviceItem: ServiceItem = {
      ...newService,
      source: 'staff',
      addedBy: user?.id,
      addedByName: user?.email || undefined,
      addedAt: new Date().toISOString(),
    };
    
    setServices(prev => [...prev, serviceItem]);
    setHasModifications(true);
    toast.success(`Added: ${newService.name}`);
  };

  // Legacy handler for admin quick-add (kept for backward compatibility)
  const handleAddService = () => {
    if (isLocked) {
      toast.error(LIFECYCLE_ERRORS.JOB_LOCKED);
      return;
    }
    // Staff/admin now uses the modal for proper tracking
    setShowAddServiceModal(true);
  };

  const handleRemoveService = (id: string) => {
    if (isLocked) {
      toast.error(LIFECYCLE_ERRORS.JOB_LOCKED);
      return;
    }
    // Check if this is a required service
    const service = services.find(s => s.id === id);
    if (service) {
      const category = categorizeService(service.name);
      if (category === 'required' && !isAdminOverride) {
        setShowOverrideWarning(true);
        return;
      }
    }
    setServices(prev => prev.filter(s => s.id !== id));
    if (editingId === id) setEditingId(null);
    setHasModifications(true);
  };

  const calculateTotal = () => {
    return services.reduce((sum, s) => sum + (s.quantity * s.unitPrice), 0);
  };

  const handleApprove = async () => {
    if (isLocked) {
      toast.error(LIFECYCLE_ERRORS.JOB_LOCKED);
      return;
    }
    
    if (services.length === 0) {
      toast.error('Please add at least one service');
      return;
    }
    
    if (!user) {
      toast.error('You must be logged in to approve estimates');
      return;
    }

    setIsSaving(true);
    const total = calculateTotal();
    
    try {
      // Check if there's an existing approved estimate for this inspection
      const { data: existing, error: fetchError } = await supabase
        .from('approved_estimates')
        .select('id')
        .eq('inspection_id', inspectionId)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      if (existing) {
        // Update existing estimate
        const { error: updateError } = await supabase
          .from('approved_estimates')
          .update({
            services: services as any,
            total_amount: total,
            approved_by_staff_at: new Date().toISOString(),
            approved_by_staff_user_id: user.id,
          })
          .eq('id', existing.id);
        
        if (updateError) throw updateError;
      } else {
        // Create new approved estimate
        const { error: insertError } = await supabase
          .from('approved_estimates')
          .insert({
            inspection_id: inspectionId,
            job_id: jobId,
            services: services as any,
            total_amount: total,
            approved_by_staff_at: new Date().toISOString(),
            approved_by_staff_user_id: user.id,
          });
        
        if (insertError) throw insertError;
      }
      
      // Mark the inspection as estimate_approved
      const { error: updateInspectionError } = await supabase
        .from('inspections')
        .update({ estimate_approved: true })
        .eq('id', inspectionId);
      
      if (updateInspectionError) throw updateInspectionError;
      
      // Clear modification tracking after successful save
      setHasModifications(false);
      
      toast.success('Estimate approved and saved!');
      onApprove(services, total);
    } catch (error) {
      console.error('Failed to save approved estimate:', error);
      toast.error('Failed to save estimate. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Report
        </Button>
      </div>

      {/* Rug Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Expert Service Assessment
          </CardTitle>
          <CardDescription>
            Based on professional inspection, the following services have been identified
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Rug Number</p>
              <p className="font-medium">{rugInfo.rugNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{rugInfo.rugType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dimensions</p>
              <p className="font-medium">{rugInfo.dimensions}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Sq. Footage</p>
              <p className="font-medium">
                {rugInfo.squareFootage ? `${rugInfo.squareFootage.toFixed(2)} sq ft` : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Override Warning */}
      {showOverrideWarning && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Required services cannot be removed</strong> without administrative override. 
            These services are deemed essential for proper rug care. Contact an administrator 
            if you believe this assessment is incorrect.
          </AlertDescription>
        </Alert>
      )}

      {/* Services List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Identified Services</CardTitle>
              <CardDescription className="text-xs mt-1">
                Services are categorized by necessity based on expert assessment
              </CardDescription>
            </div>
            {/* Add Service button - available to staff/admin when not locked */}
            {!isLocked ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleAddService} className="gap-1">
                      <Plus className="h-4 w-4" />
                      Add Service
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Add a service that AI may have missed
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button variant="outline" size="sm" disabled className="gap-1">
                        <Lock className="h-4 w-4" />
                        Locked
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Estimate is locked after payment
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No services detected from the analysis.</p>
              <p className="text-sm mt-1">Click "Add Service" to add services manually.</p>
            </div>
          ) : (
            services.map((service, index) => (
              <div key={service.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-start gap-4" data-category={categorizeService(service.name)}>
                  <div className="flex-1 space-y-3">
                    {editingId === service.id ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <Label>Service Name</Label>
                          <Input
                            value={service.name}
                            onChange={(e) => handleUpdateService(service.id, { name: e.target.value })}
                            placeholder="Service name"
                          />
                        </div>
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            value={service.quantity}
                            onChange={(e) => handleUpdateService(service.id, { quantity: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div>
                          <Label>Unit Price ($)</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={service.unitPrice}
                            onChange={(e) => handleUpdateService(service.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Priority</Label>
                          <Select
                            value={service.priority}
                            onValueChange={(value: 'high' | 'medium' | 'low') => 
                              handleUpdateService(service.id, { priority: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button 
                            size="sm" 
                            onClick={() => setEditingId(null)}
                            className="gap-1"
                          >
                            <Check className="h-4 w-4" />
                            Done
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Category Icon */}
                          {categorizeService(service.name) === 'required' && (
                            <Lock className="h-4 w-4 text-destructive flex-shrink-0" />
                          )}
                          {categorizeService(service.name) === 'recommended' && (
                            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          )}
                          {categorizeService(service.name) === 'preventative' && (
                            <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <Badge
                            variant={SERVICE_CATEGORIES[categorizeService(service.name)].badgeVariant}
                            className="text-[10px]"
                          >
                            {categorizeService(service.name) === 'required' ? 'Required' : 
                             categorizeService(service.name) === 'recommended' ? 'Recommended' : 'Preventative'}
                          </Badge>
                          {/* Staff-added badge */}
                          {service.source === 'staff' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[10px] gap-1 border-primary/50 text-primary">
                                    <UserPlus className="h-3 w-3" />
                                    Staff Added
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="font-medium">Added by staff</p>
                                  {service.reasonNote && (
                                    <p className="text-xs text-muted-foreground mt-1">{service.reasonNote}</p>
                                  )}
                                  {service.addedAt && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(service.addedAt).toLocaleDateString()}
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <span className="font-medium">{service.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              {service.quantity} × ${service.unitPrice.toFixed(2)}
                            </p>
                            <p className="font-semibold">
                              ${(service.quantity * service.unitPrice).toFixed(2)}
                            </p>
                          </div>
                          {/* Only show edit/delete for non-required or with admin override */}
                          {(canStaffEditService(categorizeService(service.name), isAdminOverride)) && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingId(service.id)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveService(service.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Total */}
          {services.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total Investment Required</span>
                  <span className="text-primary">${calculateTotal().toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on professional inspection and expert assessment
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pending Feedback Banner */}
      {pendingFeedback && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Help improve AI accuracy</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  You made significant changes. Would you like to teach the AI?
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPendingFeedback(null)}
              >
                Dismiss
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowTeachAI(true)}
                className="gap-1"
              >
                <Lightbulb className="h-4 w-4" />
                Teach AI
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          variant="outline" 
          size="lg" 
          className="flex-1"
          onClick={onBack}
        >
          Back to Report
        </Button>
        <Button 
          variant="default" 
          size="lg" 
          className="flex-1 gap-2"
          onClick={handleApprove}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {existingApprovedEstimate ? 'Confirm Assessment' : 'Approve Expert Assessment'}
            </>
          )}
        </Button>
      </div>

      {/* Teach AI Dialog */}
      <TeachAIDialog
        open={showTeachAI}
        onOpenChange={(open) => {
          setShowTeachAI(open);
          if (!open) setPendingFeedback(null);
        }}
        inspectionId={inspectionId}
        rugType={rugInfo.rugType}
        originalServiceName={pendingFeedback?.originalService}
        originalPrice={pendingFeedback?.originalPrice}
        correctedServiceName={pendingFeedback?.correctedService}
        correctedPrice={pendingFeedback?.correctedPrice}
      />


      {/* Add Staff Service Modal */}
      <AddStaffServiceModal
        open={showAddServiceModal}
        onOpenChange={setShowAddServiceModal}
        onAdd={handleAddStaffService}
        availableServices={availableServices}
        isAdmin={isAdmin}
        userId={user?.id || ''}
        userName={user?.email || undefined}
        rugDimensions={rugDimensions}
      />
    </div>
  );
};

export default EstimateReview;
