import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useJobDetail, useInvalidateJobDetail } from '@/hooks/useJobDetail';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { useUpdateJobStatus } from '@/hooks/useJobs';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { generatePDF, generateJobPDF, generateJobPDFBase64, BusinessBranding, UpsellService } from '@/lib/pdfGenerator';
import RugForm from '@/components/RugForm';
import JobForm from '@/components/JobForm';
import EditRugDialog from '@/components/EditRugDialog';
import AnalysisReport from '@/components/AnalysisReport';
import EmailPreviewDialog from '@/components/EmailPreviewDialog';
import EstimateReview from '@/components/EstimateReview';
import AnalysisProgress, { AnalysisStage } from '@/components/AnalysisProgress';
import { ModelComparisonDialog } from '@/components/ModelComparisonDialog';
import ClientPortalStatus from '@/components/ClientPortalStatus';
import ServiceCompletionCard from '@/components/ServiceCompletionCard';
import PaymentTracking from '@/components/PaymentTracking';
import PhotoUploadProgress from '@/components/PhotoUploadProgress';
import { JobDetailSkeleton } from '@/components/skeletons/JobDetailSkeleton';
import JobTimeline, { mapLegacyStatus, JobStatus, JOB_STATUSES, getNextAction, getNextStatus, TransitionContext } from '@/components/JobTimeline';
import JobStatusControl from '@/components/JobStatusControl';
import StatusGatedButton from '@/components/StatusGatedButton';
import { useJobActions } from '@/hooks/useJobActions';
import RugPhoto from '@/components/RugPhoto';
import JobBreadcrumb from '@/components/JobBreadcrumb';

interface ClientPortalStatusData {
  accessToken: string;
  emailSentAt: string | null;
  emailError: string | null;
  firstAccessedAt: string | null;
  passwordSetAt: string | null;
  hasClientAccount: boolean;
  hasServiceSelections: boolean;
  serviceSelectionsAt: string | null;
}

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

// Service groupings for Expert Estimate display
const SERVICE_GROUPS = {
  essential: {
    label: 'Essential Services',
    description: 'Core cleaning and repair work necessary for rug health and longevity.',
    keywords: ['cleaning', 'wash', 'stain', 'repair', 'reweaving', 'hole', 'tear', 'foundation', 'dry rot', 'soaking']
  },
  protective: {
    label: 'Protective Services', 
    description: 'Structural maintenance to preserve edges and prevent future damage.',
    keywords: ['binding', 'overcast', 'fringe', 'edge', 'selvedge', 'blocking', 'stretching', 'shearing', 'zenjireh']
  },
  optional: {
    label: 'Optional Restoration',
    description: 'Additional treatments for enhanced protection and appearance.',
    keywords: ['protection', 'moth', 'padding', 'fiber protect', 'scotchgard', 'storage']
  }
};

// Legacy status options (for backwards compatibility with existing Select)
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', icon: PlayCircle, color: 'bg-blue-500' },
  { value: 'in-progress', label: 'In Progress', icon: Clock, color: 'bg-yellow-500' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-500' },
];

const JobDetail = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useAdminAuth();
  const invalidateJobDetail = useInvalidateJobDetail();
  const updateJobStatus = useUpdateJobStatus();
  
  // Use React Query for all data fetching (parallel fetches)
  const { data: jobData, isLoading: loading, refetch } = useJobDetail(jobId, user?.id);

  // Local state for UI interactions
  const [isAddingRug, setIsAddingRug] = useState(false);
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [editingRug, setEditingRug] = useState<Rug | null>(null);
  const [addingRug, setAddingRug] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [analyzingRugId, setAnalyzingRugId] = useState<string | null>(null);
  const [reanalyzingRugId, setReanalyzingRugId] = useState<string | null>(null);
  const [savingJob, setSavingJob] = useState(false);
  const [savingRug, setSavingRug] = useState(false);
  const [selectedRug, setSelectedRug] = useState<Rug | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showEstimateReview, setShowEstimateReview] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [imageAnnotations, setImageAnnotations] = useState<any[]>([]);
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('idle');
  const [analysisRugNumber, setAnalysisRugNumber] = useState<string>('');
  const [analysisCurrent, setAnalysisCurrent] = useState<number>(0);
  const [analysisTotal, setAnalysisTotal] = useState<number>(0);
  const [compareRug, setCompareRug] = useState<Rug | null>(null);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [generatingPortalLink, setGeneratingPortalLink] = useState(false);
  const [resendingInvite, setResendingInvite] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  // Mutable state derived from query data
  const [localApprovedEstimates, setLocalApprovedEstimates] = useState<ApprovedEstimate[]>([]);
  const [localRugs, setLocalRugs] = useState<Rug[]>([]);
  
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

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

  // All data fetching is now handled by useJobDetail hook with parallel fetches
  // Old manual fetch functions have been removed

  const handleResendInvite = async () => {
    if (!job || !clientPortalStatus) return;
    
    setResendingInvite(true);
    try {
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const portalUrl = `${baseUrl}/client/${clientPortalStatus.accessToken}`;
      
      const { error: inviteError } = await supabase.functions.invoke('invite-client', {
        body: {
          email: job.client_email,
          fullName: job.client_name,
          jobId: jobId,
          accessToken: clientPortalStatus.accessToken,
          jobNumber: job.job_number,
          portalUrl: portalUrl,
        },
      });

      if (inviteError) throw inviteError;
      
      toast.success('Invitation email resent successfully!');
      
      // Refresh the portal status
      await fetchClientPortalLink();
    } catch (error) {
      console.error('Error resending invite:', error);
      toast.error('Failed to resend invitation');
    } finally {
      setResendingInvite(false);
    }
  };

  const generateClientPortalLink = async () => {
    if (!job || !jobId) return;

    // Check if all analyzed rugs have approved estimates
    const analyzedRugs = rugs.filter(r => r.analysis_report);
    const approvedCount = approvedEstimates.length;

    if (analyzedRugs.length === 0) {
      toast.error('Please analyze at least one rug first');
      return;
    }

    if (approvedCount < analyzedRugs.length) {
      toast.error(`Please approve estimates for all analyzed rugs (${approvedCount}/${analyzedRugs.length} approved)`);
      return;
    }

    if (!job.client_email) {
      toast.error('Client email is required to generate portal link');
      return;
    }

    setGeneratingPortalLink(true);
    try {
      // Generate a unique access token
      const accessToken = crypto.randomUUID();

      // Delete any existing pending payments for this job (to avoid duplicates when re-generating)
      await supabase
        .from('payments')
        .delete()
        .eq('job_id', jobId)
        .eq('status', 'pending');

      // Delete any existing client_job_access records for this job (to avoid duplicates)
      await supabase
        .from('client_job_access')
        .delete()
        .eq('job_id', jobId);

      // Create client job access record
      const { error } = await supabase
        .from('client_job_access')
        .insert({
          job_id: jobId,
          access_token: accessToken,
          invited_email: job.client_email,
        });

      if (error) throw error;

      // Generate the portal URL
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const portalUrl = `${baseUrl}/client/${accessToken}`;

      // Invite the client (creates user account, links to job, and sends email)
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-client', {
        body: {
          email: job.client_email,
          fullName: job.client_name,
          jobId: jobId,
          accessToken: accessToken,
          jobNumber: job.job_number,
          portalUrl: portalUrl,
        },
      });

      if (inviteError) {
        console.error('Invite error:', inviteError);
        // Continue even if invite fails - the link will still work for login
      }

      // Update job to enable client portal
      await supabase
        .from('jobs')
        .update({ 
          client_portal_enabled: true,
          all_estimates_approved: true 
        })
        .eq('id', jobId);

      const link = `${baseUrl}/client/${accessToken}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(link);
      
      // Refresh data via React Query
      fetchJobDetails();
      
      if (inviteData?.isNewUser) {
        toast.success('Client portal link generated! Client will be prompted to set their password on first visit.');
      } else {
        toast.success('Client portal link generated and copied to clipboard!');
      }
    } catch (error) {
      console.error('Error generating portal link:', error);
      toast.error('Failed to generate client portal link');
    } finally {
      setGeneratingPortalLink(false);
    }
  };

  // Parallel photo upload hook with progress tracking
  const { 
    uploadPhotos, 
    progress: uploadProgress, 
    isUploading: isUploadingPhotos,
    reset: resetUploadProgress 
  } = usePhotoUpload({ batchSize: 4 });

  const handleStatusChange = (newStatus: string) => {
    if (!job) return;
    
    // Use optimistic update - UI updates instantly, server sync in background
    updateJobStatus.mutate({ jobId: job.id, status: newStatus });
  };

  const handleEditJob = async (formData: {
    jobNumber: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    notes: string;
  }) => {
    if (!job) return;

    setSavingJob(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          job_number: formData.jobNumber,
          client_name: formData.clientName,
          client_email: formData.clientEmail || null,
          client_phone: formData.clientPhone || null,
          notes: formData.notes || null,
        })
        .eq('id', job.id);

      if (error) throw error;

      toast.success('Job updated successfully!');
      setIsEditingJob(false);
      fetchJobDetails();
    } catch (error) {
      console.error('Update job error:', error);
      toast.error('Failed to update job');
    } finally {
      setSavingJob(false);
    }
  };

  const handleEditRug = async (
    rugId: string,
    formData: { rugNumber: string; rugType: string; length: string; width: string; notes: string }
  ) => {
    setSavingRug(true);
    try {
      const { error } = await supabase
        .from('inspections')
        .update({
          rug_number: formData.rugNumber,
          rug_type: formData.rugType,
          length: formData.length ? parseFloat(formData.length) : null,
          width: formData.width ? parseFloat(formData.width) : null,
          notes: formData.notes || null,
        })
        .eq('id', rugId);

      if (error) throw error;

      toast.success('Rug updated successfully!');
      setEditingRug(null);
      fetchJobDetails();
    } catch (error) {
      console.error('Update rug error:', error);
      toast.error('Failed to update rug');
    } finally {
      setSavingRug(false);
    }
  };

  const handleAddRug = async (
    formData: { rugNumber: string; length: string; width: string; rugType: string; notes: string },
    photos: File[]
  ) => {
    if (!user || !job) return;

    setAddingRug(true);
    resetUploadProgress();
    
    try {
      const photoUrls = await uploadPhotos(photos, user.id);

      // Just save the rug without AI analysis
      const { error: insertError } = await supabase.from('inspections').insert({
        user_id: user.id,
        job_id: job.id,
        client_name: job.client_name,
        rug_number: formData.rugNumber,
        rug_type: formData.rugType,
        length: formData.length ? parseFloat(formData.length) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        notes: formData.notes || null,
        photo_urls: photoUrls,
        analysis_report: null // No analysis yet
      });

      if (insertError) throw insertError;

      toast.success('Rug added to job!');
      setIsAddingRug(false);
      fetchJobDetails();
    } catch (error) {
      console.error('Add rug failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add rug');
    } finally {
      setAddingRug(false);
      resetUploadProgress();
    }
  };

  const analyzeRug = async (rug: Rug) => {
    if (!job) return;

    setAnalyzingRugId(rug.id);
    setAnalysisRugNumber(rug.rug_number);
    setAnalysisStage('preparing');
    
    try {
      // Stage 1: Preparing
      await new Promise(resolve => setTimeout(resolve, 500));
      setAnalysisStage('analyzing');
      
      const { data, error } = await supabase.functions.invoke('analyze-rug', {
        body: {
          photos: rug.photo_urls || [],
          rugInfo: {
            clientName: job.client_name,
            rugNumber: rug.rug_number,
            rugType: rug.rug_type,
            length: rug.length?.toString() || '',
            width: rug.width?.toString() || '',
            notes: rug.notes || ''
          },
          userId: user?.id
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Stage 3: Generating report
      setAnalysisStage('generating');
      
      // Store image annotations if provided
      const annotations = data.imageAnnotations || [];
      setImageAnnotations(annotations);

      // Update the rug with analysis and annotations
      const { error: updateError } = await supabase
        .from('inspections')
        .update({ 
          analysis_report: data.report,
          image_annotations: annotations
        })
        .eq('id', rug.id);

      if (updateError) throw updateError;

      setAnalysisStage('complete');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast.success(`${rug.rug_number} analyzed!`);
      fetchJobDetails();
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error(error instanceof Error ? error.message : `Failed to analyze ${rug.rug_number}`);
    } finally {
      setAnalyzingRugId(null);
      setAnalysisStage('idle');
      setAnalysisRugNumber('');
    }
  };

  const handleReanalyzeRug = async (rug: Rug) => {
    if (!job) return;

    setReanalyzingRugId(rug.id);
    setAnalysisRugNumber(rug.rug_number);
    setAnalysisStage('preparing');
    
    try {
      // Clear existing analysis first
      await supabase
        .from('inspections')
        .update({ analysis_report: null })
        .eq('id', rug.id);

      setAnalysisStage('analyzing');

      const { data, error } = await supabase.functions.invoke('analyze-rug', {
        body: {
          photos: rug.photo_urls || [],
          rugInfo: {
            clientName: job.client_name,
            rugNumber: rug.rug_number,
            rugType: rug.rug_type,
            length: rug.length?.toString() || '',
            width: rug.width?.toString() || '',
            notes: rug.notes || ''
          },
          userId: user?.id
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysisStage('generating');

      // Store image annotations if provided
      const annotations = data.imageAnnotations || [];
      setImageAnnotations(annotations);

      // Update the rug with new analysis and annotations
      const { error: updateError } = await supabase
        .from('inspections')
        .update({ 
          analysis_report: data.report,
          image_annotations: annotations
        })
        .eq('id', rug.id);

      if (updateError) throw updateError;

      // Update local state to reflect the new report and annotations
      setSelectedRug(prev => prev ? { 
        ...prev, 
        analysis_report: data.report,
        image_annotations: annotations
      } : null);

      setAnalysisStage('complete');
      await new Promise(resolve => setTimeout(resolve, 800));

      toast.success(`${rug.rug_number} re-analyzed!`);
      fetchJobDetails();
    } catch (error) {
      console.error('Re-analysis failed:', error);
      toast.error(error instanceof Error ? error.message : `Failed to re-analyze ${rug.rug_number}`);
    } finally {
      setReanalyzingRugId(null);
      setAnalysisStage('idle');
      setAnalysisRugNumber('');
    }
  };

  const handleAnalyzeAllRugs = async () => {
    if (!job) return;

    const pendingRugs = rugs.filter(r => !r.analysis_report);
    if (pendingRugs.length === 0) {
      toast.info('All rugs have already been analyzed');
      return;
    }

    setAnalyzingAll(true);
    setAnalysisTotal(pendingRugs.length);
    let successCount = 0;
    let errorCount = 0;

    for (const rug of pendingRugs) {
      try {
        setAnalysisCurrent(successCount + errorCount + 1);
        setAnalysisRugNumber(rug.rug_number);
        setAnalysisStage('preparing');
        
        await new Promise(resolve => setTimeout(resolve, 300));
        setAnalysisStage('analyzing');
        
        const { data, error } = await supabase.functions.invoke('analyze-rug', {
          body: {
            photos: rug.photo_urls || [],
            rugInfo: {
              clientName: job.client_name,
              rugNumber: rug.rug_number,
              rugType: rug.rug_type,
              length: rug.length?.toString() || '',
              width: rug.width?.toString() || '',
              notes: rug.notes || ''
            },
            userId: user?.id
          }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        setAnalysisStage('generating');

        await supabase
          .from('inspections')
          .update({ analysis_report: data.report })
          .eq('id', rug.id);

        successCount++;
      } catch (error) {
        console.error(`Analysis failed for ${rug.rug_number}:`, error);
        errorCount++;
      }
    }

    setAnalysisStage('complete');
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setAnalyzingAll(false);
    setAnalysisStage('idle');
    setAnalysisRugNumber('');
    setAnalysisCurrent(0);
    setAnalysisTotal(0);
    fetchJobDetails();

    if (errorCount === 0) {
      toast.success(`All ${successCount} rugs analyzed successfully!`);
    } else {
      toast.warning(`Analyzed ${successCount} rugs, ${errorCount} failed`);
    }
  };

  const handleViewReport = (rug: Rug) => {
    setSelectedRug(rug);
    setShowReport(true);
  };

  const handleDownloadPDF = async (rug: Rug) => {
    if (!job) return;
    
    try {
      await generatePDF({
        ...rug,
        client_name: job.client_name,
        client_email: job.client_email,
        client_phone: job.client_phone,
      }, branding);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleDownloadJobPDF = async () => {
    if (!job || rugs.length === 0) {
      toast.error('No rugs to include in the report');
      return;
    }

    try {
      const rugsWithClient = rugs.map(rug => ({
        ...rug,
        client_name: job.client_name,
        client_email: job.client_email,
        client_phone: job.client_phone,
      }));

      await generateJobPDF(job, rugsWithClient, branding, upsellServices);
      toast.success('Complete job report downloaded!');
    } catch (error) {
      console.error('Job PDF generation error:', error);
      toast.error('Failed to generate job report');
    }
  };

  const handleOpenEmailPreview = () => {
    if (!job || rugs.length === 0) {
      toast.error('No rugs to include in the report');
      return;
    }

    if (!job.client_email) {
      toast.error('Client email is required to send report');
      return;
    }

    const analyzedRugs = rugs.filter(r => r.analysis_report);
    if (analyzedRugs.length === 0) {
      toast.error('Please analyze at least one rug before sending the report');
      return;
    }

    setShowEmailPreview(true);
  };

  const handleSendEmail = async (subject: string, message: string) => {
    if (!job || !job.client_email) return;

    const analyzedRugs = rugs.filter(r => r.analysis_report);
    
    setSendingEmail(true);
    try {
      toast.info('Generating PDF report...');
      
      const rugsWithClient = analyzedRugs.map(rug => ({
        ...rug,
        client_name: job.client_name,
        client_email: job.client_email,
        client_phone: job.client_phone,
      }));
      
      const pdfBase64 = await generateJobPDFBase64(job, rugsWithClient, branding, upsellServices);
      
      const rugDetails = analyzedRugs.map(rug => ({
        rugNumber: rug.rug_number,
        rugType: rug.rug_type,
        dimensions: rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : '—',
      }));

      toast.info('Sending email...');
      
      const { data, error } = await supabase.functions.invoke('send-report-email', {
        body: {
          to: job.client_email,
          clientName: job.client_name,
          jobNumber: job.job_number,
          rugDetails,
          pdfBase64,
          subject,
          customMessage: message,
          businessName: branding?.business_name,
          businessEmail: branding?.business_email,
          businessPhone: branding?.business_phone,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Report sent to ${job.client_email}!`);
      setShowEmailPreview(false);
    } catch (error) {
      console.error('Email send error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDeleteRug = async (rugId: string) => {
    if (!confirm('Are you sure you want to delete this rug?')) return;

    try {
      const { error } = await supabase
        .from('inspections')
        .delete()
        .eq('id', rugId);

      if (error) throw error;
      toast.success('Rug deleted');
      fetchJobDetails();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete rug');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    const Icon = statusConfig.icon;
    
    return (
      <Badge 
        variant="outline" 
        className={`gap-1 ${
          status === 'completed' ? 'border-green-500 text-green-600' :
          status === 'in-progress' ? 'border-yellow-500 text-yellow-600' :
          'border-blue-500 text-blue-600'
        }`}
      >
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) return null;

  if (showEstimateReview && selectedRug) {
    const squareFootage = selectedRug.length && selectedRug.width 
      ? selectedRug.length * selectedRug.width 
      : null;
    
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <img src={rugboostLogo} alt="RugBoost" className="h-10 w-10" />
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Job #{job.job_number}</h1>
                <p className="text-xs text-muted-foreground">{selectedRug.rug_number} – Expert Estimate</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => {
              setShowEstimateReview(false);
              setShowReport(true);
            }}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Report
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <JobBreadcrumb jobNumber={job.job_number} jobId={job.id} currentPage={`${selectedRug.rug_number} – Expert Estimate`} />
          <div className="mx-auto max-w-3xl">
            <EstimateReview
              report={selectedRug.analysis_report || ''}
              rugInfo={{
                rugNumber: selectedRug.rug_number,
                rugType: selectedRug.rug_type,
                dimensions: `${selectedRug.length || '–'}' × ${selectedRug.width || '–'}'`,
                squareFootage,
              }}
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
          </div>
        </main>
      </div>
    );
  }

  if (showReport && selectedRug) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <img src={rugboostLogo} alt="RugBoost" className="h-10 w-10" />
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">Job #{job.job_number}</h1>
                <p className="text-xs text-muted-foreground">{selectedRug.rug_number} – Analysis Report</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowReport(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Job
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <JobBreadcrumb jobNumber={job.job_number} jobId={job.id} currentPage={`${selectedRug.rug_number} – Analysis Report`} />
          <div className="mx-auto max-w-3xl">
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
                  
                  setImageAnnotations(newAnnotations);
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
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={rugboostLogo} alt="RugBoost" className="h-10 w-10" />
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Job #{job.job_number}</h1>
              <p className="text-xs text-muted-foreground">{job.client_name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <JobBreadcrumb jobNumber={job.job_number} jobId={job.id} />
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
            />
          );
        })()}

        {/* Section A: Client & Logistics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Client & Logistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Client Name</p>
                  <p className="font-medium">{job.client_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{job.client_email || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{job.client_phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(job.created_at), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section B: Photos/Scan Assets */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" />
                Photos & Assets ({rugs.length} rugs, {rugs.reduce((acc, r) => acc + (r.photo_urls?.length || 0), 0)} photos)
              </CardTitle>
              <div className="flex items-center gap-2">
                {rugs.length > 0 && rugs.some(r => !r.analysis_report) && (
                  <StatusGatedButton 
                    actionState={actions.analyzeRug}
                    variant="warm"
                    size="sm"
                    className="gap-2"
                    onClick={handleAnalyzeAllRugs}
                    disabled={analyzingAll || !actions.analyzeRug.enabled}
                  >
                    {analyzingAll ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Analyze All
                      </>
                    )}
                  </StatusGatedButton>
                )}
                <StatusGatedButton 
                  actionState={actions.addRug}
                  size="sm" 
                  className="gap-1"
                  onClick={() => actions.addRug.enabled && setIsAddingRug(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Rug
                </StatusGatedButton>
                <Dialog open={isAddingRug} onOpenChange={setIsAddingRug}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-display text-xl">Add Rug to Job</DialogTitle>
                    </DialogHeader>
                    {isUploadingPhotos && (
                      <PhotoUploadProgress 
                        progress={uploadProgress} 
                        isUploading={isUploadingPhotos} 
                      />
                    )}
                    <RugForm
                      onSubmit={handleAddRug}
                      isLoading={addingRug}
                      rugIndex={rugs.length}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rugs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No rugs added yet</p>
                <p className="text-sm mt-1">Click "Add Rug" to start</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rugs.map((rug) => (
                  <div key={rug.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{rug.rug_number}</p>
                        <p className="text-xs text-muted-foreground">{rug.rug_type}</p>
                      </div>
                      {rug.analysis_report ? (
                        <Badge variant="outline" className="border-green-500 text-green-600 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Analyzed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    {/* Photo thumbnails */}
                    {rug.photo_urls && rug.photo_urls.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto">
                        {rug.photo_urls.slice(0, 4).map((url, idx) => (
                          <RugPhoto
                            key={idx}
                            filePath={url}
                            alt={`${rug.rug_number} photo ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded border flex-shrink-0"
                            loadingClassName="w-16 h-16"
                          />
                        ))}
                        {rug.photo_urls.length > 4 && (
                          <div className="w-16 h-16 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                            +{rug.photo_urls.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Actions */}
                    <div className="flex items-center gap-1 pt-1">
                      {rug.analysis_report ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleViewReport(rug)} className="flex-1 gap-1">
                            <Eye className="h-3 w-3" />
                            Report
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(rug)}>
                            <Download className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <StatusGatedButton 
                            actionState={actions.analyzeRug}
                            variant="outline" 
                            size="sm" 
                            onClick={() => analyzeRug(rug)} 
                            disabled={!!analyzingRugId || analyzingAll} 
                            className="flex-1 gap-1"
                          >
                            <Sparkles className="h-3 w-3" />
                            Analyze
                          </StatusGatedButton>
                          <StatusGatedButton 
                            actionState={actions.analyzeRug}
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setCompareRug(rug);
                              setShowCompareDialog(true);
                            }} 
                            disabled={!!analyzingRugId || analyzingAll}
                            showLockIcon={false}
                          >
                            <FlaskConical className="h-3 w-3" />
                          </StatusGatedButton>
                        </>
                      )}
                      <StatusGatedButton 
                        actionState={actions.editRug}
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setEditingRug(rug)}
                        showLockIcon={false}
                      >
                        <Edit2 className="h-3 w-3" />
                      </StatusGatedButton>
                      <StatusGatedButton 
                        actionState={actions.deleteRug}
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteRug(rug.id)} 
                        className="text-destructive hover:text-destructive"
                        showLockIcon={false}
                      >
                        <Trash2 className="h-3 w-3" />
                      </StatusGatedButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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

        {/* Section D: Expert Estimate */}
        {approvedEstimates.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Expert Estimate
                  </CardTitle>
                  <CardDescription>
                    Professional assessment of required services
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    ${approvedEstimates.reduce((sum, ae) => sum + ae.total_amount, 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total for {approvedEstimates.length} rug{approvedEstimates.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {approvedEstimates.map((ae) => {
                const rug = rugs.find(r => r.id === ae.inspection_id);
                // Group services by category
                const groupedServices = {
                  essential: ae.services.filter((s: any) => 
                    SERVICE_GROUPS.essential.keywords.some(k => s.name.toLowerCase().includes(k))
                  ),
                  protective: ae.services.filter((s: any) => 
                    SERVICE_GROUPS.protective.keywords.some(k => s.name.toLowerCase().includes(k))
                  ),
                  optional: ae.services.filter((s: any) => 
                    SERVICE_GROUPS.optional.keywords.some(k => s.name.toLowerCase().includes(k)) ||
                    !SERVICE_GROUPS.essential.keywords.some(k => s.name.toLowerCase().includes(k)) &&
                    !SERVICE_GROUPS.protective.keywords.some(k => s.name.toLowerCase().includes(k))
                  ),
                };
                
                return (
                  <div key={ae.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{rug?.rug_number || 'Unknown Rug'}</p>
                        <p className="text-sm text-muted-foreground">{rug?.rug_type} • {rug?.length && rug?.width ? `${rug.length}' × ${rug.width}'` : 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${ae.total_amount.toFixed(2)}</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-6 px-2"
                          onClick={() => {
                            setSelectedRug(rug || null);
                            setShowEstimateReview(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                    
                    {/* Grouped services */}
                    {Object.entries(groupedServices).map(([groupKey, services]) => {
                      if (services.length === 0) return null;
                      const group = SERVICE_GROUPS[groupKey as keyof typeof SERVICE_GROUPS];
                      return (
                        <div key={groupKey} className="mb-3 last:mb-0">
                          <p className="text-xs font-medium text-muted-foreground mb-1">{group.label}</p>
                          <p className="text-[10px] text-muted-foreground/70 mb-2">{group.description}</p>
                          <div className="space-y-1">
                            {services.map((service: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span>{service.name}</span>
                                <span className="font-medium">${(service.quantity * service.unitPrice).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              
              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                {rugs.some(r => r.analysis_report) && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleDownloadJobPDF} className="gap-1">
                      <FileText className="h-4 w-4" />
                      Download Report
                    </Button>
                    {job.client_email && (
                      <Button variant="outline" size="sm" onClick={handleOpenEmailPreview} disabled={sendingEmail} className="gap-1">
                        <Mail className="h-4 w-4" />
                        Email Report
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section E: Client Approval & Payment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Client Approval & Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Portal Link Status */}
            {clientPortalLink && clientPortalStatus ? (
              <ClientPortalStatus
                portalLink={clientPortalLink}
                emailSentAt={clientPortalStatus.emailSentAt}
                emailError={clientPortalStatus.emailError}
                firstAccessedAt={clientPortalStatus.firstAccessedAt}
                passwordSetAt={clientPortalStatus.passwordSetAt}
                hasClientAccount={clientPortalStatus.hasClientAccount}
                hasServiceSelections={clientPortalStatus.hasServiceSelections}
                serviceSelectionsAt={clientPortalStatus.serviceSelectionsAt}
                onResendInvite={handleResendInvite}
                isResending={resendingInvite}
              />
            ) : approvedEstimates.length > 0 ? (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium">Ready to send to client</p>
                    <p className="text-sm text-muted-foreground">
                      Generate a portal link to let the client review and approve services
                    </p>
                  </div>
                </div>
                <StatusGatedButton 
                  actionState={actions.sendToClient}
                  variant="default"
                  onClick={generateClientPortalLink}
                  disabled={generatingPortalLink || approvedEstimates.length < rugs.filter(r => r.analysis_report).length}
                  className="gap-2"
                >
                  {generatingPortalLink ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4" />
                      Generate Client Link
                    </>
                  )}
                </StatusGatedButton>
              </div>
            ) : rugs.some(r => r.analysis_report) ? (
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium">Approve estimates first</p>
                  <p className="text-sm text-muted-foreground">
                    Review and approve the estimate for each analyzed rug before sending to the client
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">No rugs analyzed yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add rugs and run AI analysis to generate estimates
                  </p>
                </div>
              </div>
            )}

            {/* Payment Tracking */}
            {payments.length > 0 && (
              <div className="pt-4 border-t">
                <PaymentTracking
                  payments={payments}
                  jobNumber={job.job_number}
                  clientName={job.client_name}
                  branding={branding}
                  rugs={approvedEstimates.map(ae => {
                    const rug = rugs.find(r => r.id === ae.inspection_id);
                    return {
                      rugNumber: rug?.rug_number || 'Unknown',
                      rugType: rug?.rug_type || 'Unknown',
                      dimensions: rug?.length && rug?.width ? `${rug.length}' × ${rug.width}'` : 'N/A',
                      services: ae.services,
                      total: ae.total_amount,
                    };
                  })}
                />
              </div>
            )}
            
            {/* Service Completion - Only show when paid */}
            {payments.some(p => p.status === 'completed') && approvedEstimates.length > 0 && (
              <div className="pt-4 border-t">
                <ServiceCompletionCard
                  rugs={approvedEstimates.map(ae => {
                    const rug = rugs.find(r => r.id === ae.inspection_id);
                    return {
                      rugId: ae.inspection_id,
                      rugNumber: rug?.rug_number || 'Unknown',
                      rugType: rug?.rug_type || 'Unknown',
                      dimensions: rug?.length && rug?.width 
                        ? `${rug.length}' × ${rug.width}'` 
                        : 'N/A',
                      estimateId: ae.id,
                      services: ae.services,
                      total: ae.total_amount,
                    };
                  })}
                  completions={serviceCompletions}
                  clientApprovedAt={job.client_approved_at || null}
                  isPaid={true}
                  onCompletionChange={fetchServiceCompletions}
                />
              </div>
            )}
          </CardContent>
        </Card>
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
      {job.client_email && (
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
      )}
      
      {/* Model Comparison Dialog */}
      {compareRug && job && (
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
      )}
      </div>
    </>
  );
};

export default JobDetail;
