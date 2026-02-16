import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Loader2, Eye, Download, Trash2, 
  Edit2, FileText, CheckCircle, Clock, PlayCircle, Sparkles, Mail, FlaskConical,
  Link, Copy, ExternalLink, User, MapPin, Phone, Calendar, Image, 
  MessageSquare, DollarSign, CreditCard, AlertCircle
} from 'lucide-react';
import rugboostLogo from '@/assets/rugboost-logo.svg';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useCompany } from '@/hooks/useCompany';
import { useJobDetail, useInvalidateJobDetail } from '@/hooks/useJobDetail';
import { useUpdateJobStatus } from '@/hooks/useJobs';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import type { BusinessBranding, UpsellService } from '@/lib/pdfGenerator';
import RugForm from '@/components/RugForm';
import JobForm from '@/components/JobForm';
import EditRugDialog from '@/components/EditRugDialog';
import AnalysisProgress, { AnalysisStage } from '@/components/AnalysisProgress';
import ClientPortalStatus from '@/components/ClientPortalStatus';
import ServiceCompletionCard from '@/components/ServiceCompletionCard';
import PaymentTracking from '@/components/PaymentTracking';
import PhotoUploadProgress from '@/components/PhotoUploadProgress';
import { JobDetailSkeleton } from '@/components/skeletons/JobDetailSkeleton';
import JobTimeline, { mapLegacyStatus, JobStatus, JOB_STATUSES, getNextAction, getNextStatus, TransitionContext, isJobStatusLocked } from '@/components/JobTimeline';
import JobStatusControl from '@/components/JobStatusControl';
import StatusGatedButton from '@/components/StatusGatedButton';
import { useJobActions, isJobLocked } from '@/hooks/useJobActions';
import { LockedIndicator } from '@/components/LifecycleErrorState';
import RugPhoto from '@/components/RugPhoto';
import JobBreadcrumb from '@/components/JobBreadcrumb';
import MobileJobActionBar from '@/components/MobileJobActionBar';
import { useIsMobile } from '@/hooks/use-mobile';
import EditClientInfoDialog from '@/components/EditClientInfoDialog';
import ResponsiveFormSheet from '@/components/ResponsiveFormSheet';
import ExpertEstimateCard from '@/components/ExpertEstimateCard';
import { useJobDetailActions } from '@/hooks/useJobDetailActions';
import ClientLogisticsCard from '@/components/job-detail/ClientLogisticsCard';
import RugGalleryCard from '@/components/job-detail/RugGalleryCard';
import ClientApprovalCard from '@/components/job-detail/ClientApprovalCard';

// Lazy load heavy dialogs for code splitting
const AnalysisReport = lazy(() => import('@/components/AnalysisReport'));
const EstimateReview = lazy(() => import('@/components/EstimateReview'));
const EmailPreviewDialog = lazy(() => import('@/components/EmailPreviewDialog'));
const ModelComparisonDialog = lazy(() => import('@/components/ModelComparisonDialog').then(mod => ({ default: mod.ModelComparisonDialog })));

// Loading fallback for lazy dialogs
const DialogLoadingFallback = () => (
  <div className="flex items-center justify-center p-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Types are re-exported from the hook
import type { ClientPortalStatusData } from '@/hooks/useJobDetailActions';

interface Job {
  id: string;
  job_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  client_approved_at?: string | null;
  payment_status?: string;
}

interface Rug {
  id: string;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  notes: string | null;
  photo_urls: string[] | null;
  analysis_report: string | null;
  image_annotations: unknown;
  system_services: unknown;
  structured_findings: unknown;
  created_at: string;
  estimate_approved?: boolean;
}

interface ApprovedEstimate {
  id: string;
  inspection_id: string;
  services: any[];
  total_amount: number;
}

interface Payment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  metadata: any;
}

// Import service categories from centralized module
import { SERVICE_CATEGORIES, categorizeService } from '@/lib/serviceCategories';


const JobDetail = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useAdminAuth();
  const { companyId } = useCompany();
  const invalidateJobDetail = useInvalidateJobDetail();
  const updateJobStatus = useUpdateJobStatus();
  
  // Use React Query for all data fetching (parallel fetches)
  const { data: jobData, isLoading: loading, isError, error: queryError, refetch } = useJobDetail(jobId, user?.id);

  // Local state for UI interactions (non-action state stays in component)
  const [isAddingRug, setIsAddingRug] = useState(false);
  const [addRugIndex, setAddRugIndex] = useState(0);
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [editingRug, setEditingRug] = useState<Rug | null>(null);
  const [selectedRug, setSelectedRug] = useState<Rug | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showEstimateReview, setShowEstimateReview] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [compareRug, setCompareRug] = useState<Rug | null>(null);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  const statusAdvanceRef = useRef<HTMLButtonElement>(null);
  // Mutable state derived from query data
  const [localApprovedEstimates, setLocalApprovedEstimates] = useState<ApprovedEstimate[]>([]);
  const [localRugs, setLocalRugs] = useState<Rug[]>([]);
  const [isEditingClientInfo, setIsEditingClientInfo] = useState(false);
  
  // Sync query data to local state when it changes
  useEffect(() => {
    if (jobData) {
      setLocalApprovedEstimates(jobData.approvedEstimates);
      setLocalRugs(jobData.rugs);
    }
  }, [jobData]);

  // Derived data from React Query (with fallbacks for local state)
  const job = jobData?.job || null;
  const rugs = localRugs.length > 0 ? localRugs : (jobData?.rugs || []);
  const branding = jobData?.branding || null;
  const servicePrices = jobData?.servicePrices || [];
  const upsellServices = jobData?.upsellServices || [];
  const approvedEstimates = localApprovedEstimates.length > 0 ? localApprovedEstimates : (jobData?.approvedEstimates || []);
  const payments = jobData?.payments || [];
  const clientPortalLink = jobData?.clientPortalLink || null;
  const clientPortalStatus = jobData?.clientPortalStatus || null;
  const serviceCompletions = jobData?.serviceCompletions || [];

  // Compute current job status for action gating
  const hasAnalyzedRugs = rugs.some(r => r.analysis_report);
  const currentJobStatus = job ? mapLegacyStatus(
    job.status, 
    job.payment_status, 
    hasAnalyzedRugs,
    !!clientPortalLink
  ) : 'picked_up' as JobStatus;
  
  // Get action states for status-based disabling (hook must be at top level)
  const actions = useJobActions(currentJobStatus, adminOverride);

  // Helper function to refresh data
  const fetchJobDetails = useCallback(() => {
    if (jobId) {
      invalidateJobDetail(jobId);
      refetch();
    }
  }, [jobId, invalidateJobDetail, refetch]);
  
  const fetchServiceCompletions = useCallback(() => {
    fetchJobDetails();
  }, [fetchJobDetails]);
  
  const fetchClientPortalLink = useCallback(() => {
    fetchJobDetails();
  }, [fetchJobDetails]);

  // Extract all mutation/action functions into custom hook
  const {
    addingRug,
    savingJob,
    savingRug,
    savingClientInfo,
    analyzingAll,
    analyzingRugId,
    reanalyzingRugId,
    sendingEmail,
    generatingPortalLink,
    resendingInvite,
    confirmDeleteRugId,
    setConfirmDeleteRugId,
    analysisStage,
    analysisRugNumber,
    analysisCurrent,
    analysisTotal,
    imageAnnotations,
    uploadProgress,
    isUploadingPhotos,
    resetUploadProgress,
    performRugAnalysis,
    handleAnalyzeAllRugs,
    handleAddRug: handleAddRugAction,
    handleEditJob: handleEditJobAction,
    handleSaveClientInfo: handleSaveClientInfoAction,
    handleEditRug: handleEditRugAction,
    handleDeleteRug,
    handleSendEmail: handleSendEmailAction,
    handleDownloadPDF,
    handleDownloadJobPDF,
    handleOpenEmailPreview: checkEmailPreviewReady,
    generateClientPortalLink,
    handleResendInvite,
  } = useJobDetailActions({
    job,
    rugs,
    approvedEstimates,
    branding,
    upsellServices,
    clientPortalStatus,
    userId: user?.id,
    jobId,
    companyId,
    fetchJobDetails,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Wrapper handlers that manage local UI state alongside the hook actions
  const handleAddRug = async (
    formData: { rugNumber: string; length: string; width: string; rugType: string; notes: string },
    photos: File[]
  ) => {
    const success = await handleAddRugAction(formData, photos);
    if (success) setIsAddingRug(false);
  };

  const handleEditJob = async (formData: {
    jobNumber: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    notes: string;
  }) => {
    const success = await handleEditJobAction(formData);
    if (success) setIsEditingJob(false);
  };

  const handleSaveClientInfo = async (data: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    notes: string;
  }) => {
    const success = await handleSaveClientInfoAction(data);
    if (success) setIsEditingClientInfo(false);
  };

  const handleEditRug = async (
    rugId: string,
    formData: { rugNumber: string; rugType: string; length: string; width: string; notes: string }
  ) => {
    const success = await handleEditRugAction(rugId, formData);
    if (success) setEditingRug(null);
  };

  const handleSendEmail = async (subject: string, message: string) => {
    const success = await handleSendEmailAction(subject, message);
    if (success) setShowEmailPreview(false);
  };

  const handleOpenEmailPreview = () => {
    if (checkEmailPreviewReady()) {
      setShowEmailPreview(true);
    }
  };

  const handleReanalyzeRug = async (rug: Rug) => {
    const result = await performRugAnalysis(rug, true);
    if (result) {
      // Update the selected rug in local state to reflect new analysis
      setSelectedRug(prev => prev ? {
        ...prev,
        analysis_report: result.report,
        image_annotations: result.annotations,
        system_services: { edgeSuggestions: result.edgeSuggestions },
        structured_findings: result.structuredFindings,
      } : null);
    }
  };

  const analyzeRug = async (rug: Rug) => {
    await performRugAnalysis(rug, false);
  };

  const handleViewReport = (rug: Rug) => {
    setSelectedRug(rug);
    setShowReport(true);
  };

  const handleStatusChange = (newStatus: string) => {
    if (!job) return;
    updateJobStatus.mutate({ jobId: job.id, status: newStatus });
  };


  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-destructive/10 p-3 w-fit">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Job Not Found</CardTitle>
            <CardDescription>
              {queryError?.message?.includes('tenant')
                ? 'You don\'t have access to this job. It belongs to a different organization.'
                : 'This job could not be loaded. It may have been deleted or you may not have permission to view it.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showEstimateReview && selectedRug) {
    const squareFootage = selectedRug.length && selectedRug.width 
      ? selectedRug.length * selectedRug.width 
      : null;
    
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="container mx-auto flex items-center justify-between px-4 py-2.5 md:py-4">
            <div className="flex items-center gap-2 md:gap-3">
              <img src={rugboostLogo} alt="RugBoost" className="h-8 w-8 md:h-10 md:w-10" />
              <div>
                <h1 className="font-display text-lg md:text-xl font-bold text-foreground">Job #{job.job_number}</h1>
                <p className="text-xs text-muted-foreground">{selectedRug.rug_number} – Expert Estimate</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              setShowEstimateReview(false);
              setShowReport(true);
            }}>
              <ArrowLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Back to Report</span>
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <JobBreadcrumb jobNumber={job.job_number} jobId={job.id} currentPage={`${selectedRug.rug_number} – Expert Estimate`} />
          <div className="mx-auto max-w-3xl">
            <Suspense fallback={<DialogLoadingFallback />}>
              <EstimateReview
                report={selectedRug.analysis_report || ''}
                structuredFindings={selectedRug.structured_findings}
                rugInfo={{
                  rugNumber: selectedRug.rug_number,
                  rugType: selectedRug.rug_type,
                  dimensions: `${selectedRug.length || '–'}' × ${selectedRug.width || '–'}'`,
                  squareFootage,
                }}
                rugDimensions={
                  selectedRug.length && selectedRug.width
                    ? { lengthFt: selectedRug.length, widthFt: selectedRug.width }
                    : null
                }
                edgeSuggestions={
                  selectedRug.system_services &&
                  typeof selectedRug.system_services === 'object' &&
                  !Array.isArray(selectedRug.system_services)
                    ? (selectedRug.system_services as any).edgeSuggestions || null
                    : null
                }
                inspectionId={selectedRug.id}
                jobId={jobId || ''}
                availableServices={servicePrices}
                existingApprovedEstimate={approvedEstimates.find(ae => ae.inspection_id === selectedRug.id) || null}
                onBack={() => {
                  setShowEstimateReview(false);
                  setShowReport(true);
                }}
                onApprove={(services, totalCost) => {
                  // Update local state with new approved estimate
                  setLocalApprovedEstimates(prev => {
                    const existing = prev.find(ae => ae.inspection_id === selectedRug.id);
                    if (existing) {
                      return prev.map(ae => 
                        ae.inspection_id === selectedRug.id 
                          ? { ...ae, services, total_amount: totalCost }
                          : ae
                      );
                    } else {
                      return [...prev, {
                        id: crypto.randomUUID(),
                        inspection_id: selectedRug.id,
                        services,
                        total_amount: totalCost
                      }];
                    }
                  });
                  // Update rug's estimate_approved flag locally
                  setLocalRugs(prev => prev.map(r => 
                    r.id === selectedRug.id ? { ...r, estimate_approved: true } : r
                  ));
                  setShowEstimateReview(false);
                  setShowReport(false);
                }}
              />
            </Suspense>
          </div>
        </main>
      </div>
    );
  }

  if (showReport && selectedRug) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="container mx-auto flex items-center justify-between px-4 py-2.5 md:py-4">
            <div className="flex items-center gap-2 md:gap-3">
              <img src={rugboostLogo} alt="RugBoost" className="h-8 w-8 md:h-10 md:w-10" />
              <div>
                <h1 className="font-display text-lg md:text-xl font-bold text-foreground">Job #{job.job_number}</h1>
                <p className="text-xs text-muted-foreground">{selectedRug.rug_number} – Analysis Report</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowReport(false)}>
              <ArrowLeft className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Back to Job</span>
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <JobBreadcrumb jobNumber={job.job_number} jobId={job.id} currentPage={`${selectedRug.rug_number} – Analysis Report`} />
          <div className="mx-auto max-w-3xl">
            <Suspense fallback={<DialogLoadingFallback />}>
              <AnalysisReport
                report={selectedRug.analysis_report || ''}
                rugInfo={{
                  clientName: job.client_name,
                  rugNumber: selectedRug.rug_number,
                  rugType: selectedRug.rug_type,
                  dimensions: `${selectedRug.length || '–'}' × ${selectedRug.width || '–'}'`,
                }}
                photoUrls={selectedRug.photo_urls || []}
                imageAnnotations={
                  imageAnnotations.length > 0 
                    ? imageAnnotations 
                    : (Array.isArray(selectedRug.image_annotations) ? selectedRug.image_annotations : [])
                }
                approvedEstimate={approvedEstimates.find(ae => ae.inspection_id === selectedRug.id) || null}
                onNewInspection={() => setShowReport(false)}
                onReviewEstimate={() => {
                  setShowReport(false);
                  setShowEstimateReview(true);
                }}
                onReanalyze={() => handleReanalyzeRug(selectedRug)}
                isReanalyzing={reanalyzingRugId === selectedRug.id}
                onAnnotationsChange={async (newAnnotations) => {
                  try {
                    const { error } = await supabase
                      .from('inspections')
                      .update({ image_annotations: newAnnotations as unknown as Json })
                      .eq('id', selectedRug.id);
                    
                    if (error) throw error;
                    
                    // Update the rug in local state
                    setLocalRugs(prev => prev.map(r => 
                      r.id === selectedRug.id 
                        ? { ...r, image_annotations: newAnnotations as unknown as Json }
                        : r
                    ));
                  } catch (error) {
                    console.error('Failed to save annotations:', error);
                    toast.error('Failed to save markers');
                  }
                }}
              />
            </Suspense>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <AnalysisProgress 
        stage={analysisStage}
        rugNumber={analysisRugNumber}
        current={analysisCurrent}
        total={analysisTotal}
      />
      <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header - Mobile optimized with status visible */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 md:py-4">
          {/* Mobile: Compact header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0 md:hidden h-9 w-9"
                onClick={() => navigate('/dashboard')}
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img src={rugboostLogo} alt="RugBoost" className="h-8 w-8 md:h-10 md:w-10 shrink-0" />
              <div className="min-w-0">
                <h1 className="font-display text-lg md:text-xl font-bold text-foreground truncate">
                  Job #{job.job_number}
                </h1>
                <p className="text-xs text-muted-foreground truncate">{job.client_name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="hidden md:flex">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
        {/* Breadcrumb - Hidden on mobile for cleaner UI */}
        <div className="hidden md:block">
          <JobBreadcrumb jobNumber={job.job_number} jobId={job.id} />
        </div>
        
        {/* Locked status indicator - shown when job is past payment */}
        {isJobLocked(currentJobStatus) && (
          <LockedIndicator 
            message={currentJobStatus === 'closed' 
              ? 'This job is closed. All data is read-only.' 
              : 'This job is locked. Scope and pricing cannot be modified.'
            } 
          />
        )}
        
        {/* Section 1: Job Status Control - Most prominent */}
        {(() => {
          // Build validation context for state machine
          const hasApprovedEstimates = approvedEstimates.length > 0;
          const hasPaidPayment = payments.some(p => p.status === 'paid' || p.status === 'completed');
          const allServicesComplete = (() => {
            if (approvedEstimates.length === 0) return false;
            const allServiceIds = approvedEstimates.flatMap(ae => 
              (ae.services || []).map((s: any) => s.id || s.service_name)
            );
            const completedIds = serviceCompletions.map(sc => sc.service_id);
            return allServiceIds.length > 0 && allServiceIds.every((id: string) => completedIds.includes(id));
          })();
          
          // For delivery address, check if job has notes with address info
          const hasDeliveryAddress = !!(job.notes && job.notes.toLowerCase().includes('address'));
          const hasDeliveryWindow = !!(job.notes && (job.notes.toLowerCase().includes('delivery') || job.notes.toLowerCase().includes('window')));
          
          const validationContext: TransitionContext = {
            hasPortalLink: !!clientPortalLink,
            hasDeliveryAddress,
            hasDeliveryWindow,
            hasAnalyzedRugs,
            hasApprovedEstimates,
            hasPaidPayment,
            allServicesComplete,
          };
          
          const handleTimelineStatusChange = async (newStatus: JobStatus) => {
            try {
              const { error } = await supabase
                .from('jobs')
                .update({ status: newStatus })
                .eq('id', job.id);
              
              if (error) throw error;
              toast.success(`Status updated to ${JOB_STATUSES.find(s => s.value === newStatus)?.label}`);
              fetchJobDetails();
            } catch (error) {
              console.error('Status update error:', error);
              toast.error('Failed to update status');
            }
          };

          return (
            <JobStatusControl
              currentStatus={currentJobStatus}
              validationContext={validationContext}
              onAdvanceStatus={handleTimelineStatusChange}
              isAdmin={isAdmin}
              onOverrideChange={setAdminOverride}
              className="border-primary/20"
              advanceButtonRef={statusAdvanceRef}
            />
          );
        })()}

        {/* Section A: Client & Logistics */}
        <ClientLogisticsCard job={job} onEditClientInfo={() => setIsEditingClientInfo(true)} />

        {/* Section B: Photos/Scan Assets */}
        <RugGalleryCard
          rugs={rugs}
          actions={actions}
          analyzingAll={analyzingAll}
          analyzingRugId={analyzingRugId}
          onAnalyzeAll={handleAnalyzeAllRugs}
          onAnalyzeRug={analyzeRug}
          onViewReport={handleViewReport}
          onDownloadPDF={handleDownloadPDF}
          onEditRug={setEditingRug}
          onDeleteRug={(rugId) => setConfirmDeleteRugId(rugId)}
          onAddRug={() => { setAddRugIndex(rugs.length); setIsAddingRug(true); }}
          onCompareRug={(rug) => {
            setCompareRug(rug);
            setShowCompareDialog(true);
          }}
        />

        {/* Section C: Inspection Notes */}
        {job.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Inspection Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Section D: Expert Estimate - Mobile optimized */}
        {approvedEstimates.length > 0 && (
          <ExpertEstimateCard
            estimates={approvedEstimates}
            rugs={rugs.map(r => ({
              id: r.id,
              rug_number: r.rug_number,
              rug_type: r.rug_type,
              length: r.length,
              width: r.width
            }))}
            onViewDetails={(rugId) => {
              const rug = rugs.find(r => r.id === rugId);
              if (rug) {
                setSelectedRug(rug);
                setShowReport(true);
              }
            }}
            onEditEstimate={(rugId) => {
              const rug = rugs.find(r => r.id === rugId);
              if (rug) {
                setSelectedRug(rug);
                setShowEstimateReview(true);
              }
            }}
            showEditButton={adminOverride}
            isAdminOverride={adminOverride}
          />
        )}

        {/* Download/Email Actions for Estimates */}
        {approvedEstimates.length > 0 && rugs.some(r => r.analysis_report) && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadJobPDF} className="gap-1">
              <FileText className="h-4 w-4" />
              Download Full Report
            </Button>
            {job.client_email && (
              <Button variant="outline" size="sm" onClick={handleOpenEmailPreview} disabled={sendingEmail} className="gap-1">
                <Mail className="h-4 w-4" />
                Email Report
              </Button>
            )}
          </div>
        )}

        {/* Section E: Client Approval & Payment */}
        <ClientApprovalCard
          job={job}
          rugs={rugs}
          approvedEstimates={approvedEstimates}
          payments={payments}
          serviceCompletions={serviceCompletions}
          clientPortalLink={clientPortalLink}
          clientPortalStatus={clientPortalStatus}
          branding={branding}
          actions={actions}
          generatingPortalLink={generatingPortalLink}
          resendingInvite={resendingInvite}
          onGeneratePortalLink={generateClientPortalLink}
          onResendInvite={handleResendInvite}
          onServiceCompletionChange={fetchServiceCompletions}
        />
      </main>

      {/* Edit Rug Dialog */}
      <EditRugDialog
        rug={editingRug}
        open={!!editingRug}
        onOpenChange={(open) => !open && setEditingRug(null)}
        onSave={handleEditRug}
        isLoading={savingRug}
      />

      {/* Email Preview Dialog */}
      {job.client_email && showEmailPreview && (
        <Suspense fallback={null}>
          <EmailPreviewDialog
            open={showEmailPreview}
            onOpenChange={setShowEmailPreview}
            onSend={handleSendEmail}
            clientName={job.client_name}
            clientEmail={job.client_email}
            jobNumber={job.job_number}
            rugDetails={rugs.filter(r => r.analysis_report).map(rug => ({
              rugNumber: rug.rug_number,
              rugType: rug.rug_type,
              dimensions: rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : '—',
            }))}
            businessName={branding?.business_name || undefined}
            isSending={sendingEmail}
          />
        </Suspense>
      )}
      
      {/* Model Comparison Dialog */}
      {compareRug && job && showCompareDialog && (
        <Suspense fallback={null}>
          <ModelComparisonDialog
            open={showCompareDialog}
            onOpenChange={setShowCompareDialog}
            rug={compareRug}
            clientName={job.client_name}
            userId={user?.id}
            onSelectModel={async (model, report, annotations) => {
              try {
                // Save the selected analysis to the database
                const { error } = await supabase
                  .from('inspections')
                  .update({ 
                    analysis_report: report,
                    image_annotations: annotations
                  })
                  .eq('id', compareRug.id);

                if (error) throw error;
                
                toast.success(`Analysis saved for ${compareRug.rug_number}`);
                fetchJobDetails();
              } catch (error) {
                console.error('Failed to save analysis:', error);
                toast.error('Failed to save analysis');
              }
            }}
          />
        </Suspense>
      )}
      
      {/* Add Rug - Drawer on mobile, Dialog on desktop */}
      <ResponsiveFormSheet open={isAddingRug} onOpenChange={setIsAddingRug} title="Add Rug to Job">
        {isUploadingPhotos && (
          <PhotoUploadProgress 
            progress={uploadProgress} 
            isUploading={isUploadingPhotos} 
          />
        )}
        <RugForm
          onSubmit={handleAddRug}
          isLoading={addingRug}
          rugIndex={addRugIndex}
        />
      </ResponsiveFormSheet>
      
      {/* Edit Client Info Dialog */}
      {job && (
        <EditClientInfoDialog
          open={isEditingClientInfo}
          onOpenChange={setIsEditingClientInfo}
          initialData={{
            clientName: job.client_name,
            clientEmail: job.client_email || '',
            clientPhone: job.client_phone || '',
            notes: job.notes || '',
          }}
          onSave={handleSaveClientInfo}
          isLoading={savingClientInfo}
        />
      )}
      
      {/* Mobile Bottom Action Bar */}
      <MobileJobActionBar
        actions={actions}
        rugsCount={rugs.length}
        hasUnanalyzedRugs={rugs.some(r => !r.analysis_report)}
        hasApprovedEstimates={approvedEstimates.length > 0}
        hasClientPortalLink={!!clientPortalLink}
        isAnalyzing={analyzingAll}
        isGeneratingLink={generatingPortalLink}
        onAddRug={() => { setAddRugIndex(rugs.length); setIsAddingRug(true); }}
        onAnalyzeAll={handleAnalyzeAllRugs}
        onSendToClient={generateClientPortalLink}
        onAdvanceStatus={() => {
          statusAdvanceRef.current?.click();
        }}
        nextStatusLabel={(() => {
          const next = getNextStatus(currentJobStatus);
          return next ? JOB_STATUSES.find(s => s.value === next)?.label : undefined;
        })()}
      />
      {/* Delete Rug Confirmation Dialog */}
      <AlertDialog open={!!confirmDeleteRugId} onOpenChange={(open) => !open && setConfirmDeleteRugId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rug?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The rug and all its photos and analysis data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteRugId && handleDeleteRug(confirmDeleteRugId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  );
};

export default JobDetail;
