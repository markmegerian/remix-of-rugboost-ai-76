import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError, extractErrorMessage } from '@/lib/errorHandler';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import type { AnalysisStage } from '@/components/AnalysisProgress';
import type { BusinessBranding, UpsellService } from '@/lib/pdfGenerator';
import { renderEstimateLetterDraft, type LetterContext, type StructuredFindings } from '@/lib/estimateLetterRenderer';

// Re-export types used by the hook consumers
export interface JobDetailJob {
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

export interface JobDetailRug {
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

export interface JobDetailApprovedEstimate {
  id: string;
  inspection_id: string;
  services: any[];
  total_amount: number;
}

export interface ClientPortalStatusData {
  accessToken: string;
  emailSentAt: string | null;
  emailError: string | null;
  firstAccessedAt: string | null;
  passwordSetAt: string | null;
  hasClientAccount: boolean;
  hasServiceSelections: boolean;
  serviceSelectionsAt: string | null;
}

interface UseJobDetailActionsParams {
  job: JobDetailJob | null;
  rugs: JobDetailRug[];
  approvedEstimates: JobDetailApprovedEstimate[];
  branding: BusinessBranding | null;
  upsellServices: UpsellService[];
  clientPortalStatus: ClientPortalStatusData | null;
  userId: string | undefined;
  jobId: string | undefined;
  companyId: string | undefined;
  fetchJobDetails: () => void;
}

export function useJobDetailActions({
  job,
  rugs,
  approvedEstimates,
  branding,
  upsellServices,
  clientPortalStatus,
  userId,
  jobId,
  companyId,
  fetchJobDetails,
}: UseJobDetailActionsParams) {
  // Loading states
  const [addingRug, setAddingRug] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [savingRug, setSavingRug] = useState(false);
  const [savingClientInfo, setSavingClientInfo] = useState(false);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [analyzingRugId, setAnalyzingRugId] = useState<string | null>(null);
  const [reanalyzingRugId, setReanalyzingRugId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generatingPortalLink, setGeneratingPortalLink] = useState(false);
  const [resendingInvite, setResendingInvite] = useState(false);
  const [confirmDeleteRugId, setConfirmDeleteRugId] = useState<string | null>(null);

  // Analysis progress state
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('idle');
  const [analysisRugNumber, setAnalysisRugNumber] = useState<string>('');
  const [analysisCurrent, setAnalysisCurrent] = useState<number>(0);
  const [analysisTotal, setAnalysisTotal] = useState<number>(0);

  // Annotation state (set during analysis)
  const [imageAnnotations, setImageAnnotations] = useState<any[]>([]);

  // Offline sync hook
  const { queueRugSubmission } = useOfflineSync();

  // Photo upload hook
  const {
    uploadPhotos,
    progress: uploadProgress,
    isUploading: isUploadingPhotos,
    reset: resetUploadProgress,
  } = usePhotoUpload({ batchSize: 4 });

  // ── Analysis ──────────────────────────────────────────────

  const performRugAnalysis = useCallback(async (rug: JobDetailRug, isReanalysis: boolean) => {
    if (!job) return;

    if (isReanalysis) {
      setReanalyzingRugId(rug.id);
    } else {
      setAnalyzingRugId(rug.id);
    }
    setAnalysisRugNumber(rug.rug_number);
    setAnalysisStage('preparing');

    try {
      if (isReanalysis) {
        // Clear existing analysis first
        await supabase
          .from('inspections')
          .update({ analysis_report: null })
          .eq('id', rug.id);
      }

      await new Promise(resolve => setTimeout(resolve, isReanalysis ? 0 : 500));
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
            notes: rug.notes || '',
          },
          userId,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysisStage('generating');

      const annotations = data.imageAnnotations || [];
      const edgeSuggs = data.edgeSuggestions || [];
      setImageAnnotations(annotations);

      // Build structured findings and letter draft
      const findings: StructuredFindings | null = data.structuredFindings || null;
      let analysisReport = data.report as string | null;

      try {
        if (findings) {
          const ctx: LetterContext = {
            clientName: job.client_name,
            businessName: branding?.business_name || 'Megerian Rug Cleaners',
            businessPhone: branding?.business_phone || '(718) 782-7474',
            rugs: [
              {
                rugNumber: rug.rug_number,
                label:
                  (findings.rugProfile?.fiber || '') +
                  (findings.rugProfile?.origin ? ` ${findings.rugProfile.origin}` : '') ||
                  rug.rug_type,
                dimensionsLabel:
                  rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : '—',
                findings,
              },
            ],
          };
          const { draftText } = renderEstimateLetterDraft(ctx);
          analysisReport = draftText;
        }
      } catch (e) {
        console.error('[JobDetailActions] Failed to render estimate letter draft, falling back to AI report:', e);
      }

      const { error: updateError } = await supabase
        .from('inspections')
        .update({
          analysis_report: analysisReport,
          image_annotations: annotations,
          system_services: { edgeSuggestions: edgeSuggs },
          structured_findings: findings as any,
        })
        .eq('id', rug.id);

      if (updateError) throw updateError;

      setAnalysisStage('complete');
      await new Promise(resolve => setTimeout(resolve, 800));

      const verb = isReanalysis ? 're-analyzed' : 'analyzed';
      toast.success(`${rug.rug_number} ${verb}!`);
      fetchJobDetails();

      // Return data for callers that need it (e.g. to update selectedRug)
      return {
        report: data.report,
        annotations,
        edgeSuggestions: edgeSuggs,
        structuredFindings: data.structuredFindings || null,
      };
    } catch (error) {
      const verb = isReanalysis ? 're-analyze' : 'analyze';
      handleMutationError(error, 'JobDetailActions', extractErrorMessage(error, `Failed to ${verb} ${rug.rug_number}`));
      return null;
    } finally {
      if (isReanalysis) {
        setReanalyzingRugId(null);
      } else {
        setAnalyzingRugId(null);
      }
      setAnalysisStage('idle');
      setAnalysisRugNumber('');
    }
  }, [job, userId, fetchJobDetails]);

  const handleAnalyzeAllRugs = useCallback(async () => {
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
              notes: rug.notes || '',
            },
            userId,
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        setAnalysisStage('generating');

        const findings: StructuredFindings | null = data.structuredFindings || null;
        let analysisReport = data.report as string | null;

        try {
          if (findings) {
            const ctx: LetterContext = {
              clientName: job.client_name,
              businessName: branding?.business_name || 'Megerian Rug Cleaners',
              businessPhone: branding?.business_phone || '(718) 782-7474',
              rugs: [
                {
                  rugNumber: rug.rug_number,
                  label:
                    (findings.rugProfile?.fiber || '') +
                    (findings.rugProfile?.origin ? ` ${findings.rugProfile.origin}` : '') ||
                    rug.rug_type,
                  dimensionsLabel:
                    rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : '—',
                  findings,
                },
              ],
            };
            const { draftText } = renderEstimateLetterDraft(ctx);
            analysisReport = draftText;
          }
        } catch (e) {
          console.error('[JobDetailActions] Failed to render estimate letter draft (analyze all), falling back to AI report:', e);
        }

        await supabase
          .from('inspections')
          .update({
            analysis_report: analysisReport,
            image_annotations: data.imageAnnotations || [],
            system_services: { edgeSuggestions: data.edgeSuggestions || [] },
            structured_findings: findings as any,
          })
          .eq('id', rug.id);

        successCount++;
      } catch (error) {
        console.error(`[JobDetailActions] Analysis failed for ${rug.rug_number}:`, error);
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
  }, [job, rugs, userId, fetchJobDetails]);

  // ── CRUD ──────────────────────────────────────────────────

  const handleAddRug = useCallback(async (
    formData: { rugNumber: string; length: string; width: string; rugType: string; notes: string },
    photos: File[]
  ) => {
    if (!userId || !job) return;

    // If offline, queue for later sync
    if (!navigator.onLine) {
      try {
        await queueRugSubmission({
          jobId: job.id,
          jobNumber: job.job_number,
          clientName: job.client_name,
          userId,
          companyId: companyId || null,
          formData,
          photos,
        });
        return true;
      } catch (error) {
        console.error('[JobDetailActions] Failed to queue offline:', error);
        toast.error('Failed to save offline. Please try again.');
        return false;
      }
    }

    setAddingRug(true);
    resetUploadProgress();

    try {
      const photoUrls = await uploadPhotos(photos, userId);

      const { error: insertError } = await supabase.from('inspections').insert({
        user_id: userId,
        job_id: job.id,
        client_name: job.client_name,
        rug_number: formData.rugNumber,
        rug_type: formData.rugType,
        length: formData.length ? parseFloat(formData.length) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        notes: formData.notes || null,
        photo_urls: photoUrls,
        analysis_report: null,
      });

      if (insertError) throw insertError;

      toast.success('Rug added to job!');
      fetchJobDetails();
      return true;
    } catch (error) {
      // If it failed due to network, queue offline
      if (!navigator.onLine) {
        try {
          await queueRugSubmission({
            jobId: job.id,
            jobNumber: job.job_number,
            clientName: job.client_name,
            userId,
            companyId: companyId || null,
            formData,
            photos,
          });
          return true;
        } catch (offlineError) {
          console.error('[JobDetailActions] Failed to queue offline:', offlineError);
        }
      }
      handleMutationError(error, 'JobDetailActions', extractErrorMessage(error, 'Failed to add rug'));
      return false;
    } finally {
      setAddingRug(false);
      resetUploadProgress();
    }
  }, [userId, job, companyId, uploadPhotos, resetUploadProgress, fetchJobDetails, queueRugSubmission]);

  const handleEditJob = useCallback(async (formData: {
    jobNumber: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    notes: string;
  }) => {
    if (!job) return false;

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
      fetchJobDetails();
      return true;
    } catch (error) {
      handleMutationError(error, 'JobDetailActions', 'Failed to update job');
      return false;
    } finally {
      setSavingJob(false);
    }
  }, [job, fetchJobDetails]);

  const handleSaveClientInfo = useCallback(async (data: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    notes: string;
  }) => {
    if (!job) return false;

    setSavingClientInfo(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          client_name: data.clientName,
          client_email: data.clientEmail || null,
          client_phone: data.clientPhone || null,
          notes: data.notes || null,
        })
        .eq('id', job.id);

      if (error) throw error;

      toast.success('Client information updated!');
      fetchJobDetails();
      return true;
    } catch (error) {
      handleMutationError(error, 'JobDetailActions', 'Failed to update client information');
      return false;
    } finally {
      setSavingClientInfo(false);
    }
  }, [job, fetchJobDetails]);

  const handleEditRug = useCallback(async (
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
      fetchJobDetails();
      return true;
    } catch (error) {
      handleMutationError(error, 'JobDetailActions', 'Failed to update rug');
      return false;
    } finally {
      setSavingRug(false);
    }
  }, [fetchJobDetails]);

  const handleDeleteRug = useCallback(async (rugId: string) => {
    try {
      const { error } = await supabase
        .from('inspections')
        .delete()
        .eq('id', rugId);

      if (error) throw error;
      toast.success('Rug deleted');
      fetchJobDetails();
    } catch (error) {
      handleMutationError(error, 'JobDetailActions', 'Failed to delete rug');
    } finally {
      setConfirmDeleteRugId(null);
    }
  }, [fetchJobDetails]);

  // ── Email / PDF ───────────────────────────────────────────

  const handleSendEmail = useCallback(async (subject: string, message: string) => {
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

      const { generateJobPDFBase64 } = await import('@/lib/pdfGenerator');
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
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Report sent to ${job.client_email}!`);
      return true;
    } catch (error) {
      handleMutationError(error, 'JobDetailActions', extractErrorMessage(error, 'Failed to send email'));
      return false;
    } finally {
      setSendingEmail(false);
    }
  }, [job, rugs, branding, upsellServices]);

  const handleDownloadPDF = useCallback(async (rug: JobDetailRug) => {
    if (!job) return;

    try {
      const { generatePDF } = await import('@/lib/pdfGenerator');
      await generatePDF({
        ...rug,
        client_name: job.client_name,
        client_email: job.client_email,
        client_phone: job.client_phone,
      }, branding);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      handleMutationError(error, 'JobDetailActions', 'Failed to generate PDF');
    }
  }, [job, branding]);

  const handleDownloadPhotosPDF = useCallback(async () => {
    if (!job || rugs.length === 0) {
      toast.error('No rugs with photos to download');
      return;
    }

    const allPhotoPaths = rugs.flatMap(r => r.photo_urls || []);
    if (allPhotoPaths.length === 0) {
      toast.error('No photos found');
      return;
    }

    try {
      toast.info('Generating photos PDF...');
      const { batchSignUrls } = await import('@/hooks/useSignedUrls');
      const signedMap = await batchSignUrls(allPhotoPaths);

      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;
      let isFirstPage = true;

      for (const rug of rugs) {
        const photos = rug.photo_urls || [];
        if (photos.length === 0) continue;

        for (const photoPath of photos) {
          if (!isFirstPage) pdf.addPage();
          isFirstPage = false;

          // Add rug label at top
          pdf.setFontSize(10);
          pdf.setTextColor(100);
          pdf.text(`${job.job_number} — ${rug.rug_number} (${rug.rug_type})`, margin, margin - 10);

          const cleanPath = photoPath.startsWith('http') ? photoPath : photoPath;
          const signedUrl = signedMap.get(cleanPath.replace(/.*\/rug-photos\//, '').replace(/\?.*/, '')) || signedMap.get(cleanPath);

          if (signedUrl) {
            try {
              const resp = await fetch(signedUrl);
              const blob = await resp.blob();
              const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });

              const img = new Image();
              await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = reject;
                img.src = dataUrl;
              });

              const imgRatio = img.width / img.height;
              let drawW = usableW;
              let drawH = drawW / imgRatio;
              if (drawH > usableH) {
                drawH = usableH;
                drawW = drawH * imgRatio;
              }
              const x = margin + (usableW - drawW) / 2;
              const y = margin + (usableH - drawH) / 2;

              pdf.addImage(dataUrl, 'JPEG', x, y, drawW, drawH);
            } catch (e) {
              pdf.setFontSize(12);
              pdf.setTextColor(180);
              pdf.text('Photo could not be loaded', pageW / 2, pageH / 2, { align: 'center' });
            }
          }
        }
      }

      pdf.save(`${job.job_number}-photos.pdf`);
      toast.success('Photos PDF downloaded!');
    } catch (error) {
      handleMutationError(error, 'JobDetailActions', 'Failed to generate photos PDF');
    }
  }, [job, rugs]);

  const handleDownloadJobPDF = useCallback(async () => {
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

      const { generateJobPDF } = await import('@/lib/pdfGenerator');
      await generateJobPDF(job, rugsWithClient, branding, upsellServices);
      toast.success('Complete job report downloaded!');
    } catch (error) {
      handleMutationError(error, 'JobDetailActions', 'Failed to generate job report');
    }
  }, [job, rugs, branding, upsellServices]);

  const handleOpenEmailPreview = useCallback(() => {
    if (!job || rugs.length === 0) {
      toast.error('No rugs to include in the report');
      return false;
    }

    if (!job.client_email) {
      toast.error('Client email is required to send report');
      return false;
    }

    const analyzedRugs = rugs.filter(r => r.analysis_report);
    if (analyzedRugs.length === 0) {
      toast.error('Please analyze at least one rug before sending the report');
      return false;
    }

    return true;
  }, [job, rugs]);

  // ── Client Portal ─────────────────────────────────────────

  const generateClientPortalLink = useCallback(async () => {
    if (!job || !jobId) return;

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
      const { generateSecureToken, hashToken } = await import('@/lib/tokenSecurity');
      const accessToken = generateSecureToken();
      const accessTokenHash = await hashToken(accessToken);

      // Delete existing pending payments
      await supabase
        .from('payments')
        .delete()
        .eq('job_id', jobId)
        .eq('status', 'pending');

      // Delete existing client_job_access records
      await supabase
        .from('client_job_access')
        .delete()
        .eq('job_id', jobId);

      const { error } = await supabase
        .from('client_job_access')
        .insert({
          job_id: jobId,
          access_token: accessToken,
          access_token_hash: accessTokenHash,
          invited_email: job.client_email,
          company_id: companyId,
        });

      if (error) throw error;

      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const portalUrl = `${baseUrl}/client/${accessToken}`;

      const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-client', {
        body: {
          email: job.client_email,
          fullName: job.client_name,
          jobId,
          accessToken,
          jobNumber: job.job_number,
          portalUrl,
        },
      });

      if (inviteError) {
        console.error('[JobDetailActions] Invite error:', inviteError);
      }

      await supabase
        .from('jobs')
        .update({
          client_portal_enabled: true,
          all_estimates_approved: true,
        })
        .eq('id', jobId);

      const link = `${baseUrl}/client/${accessToken}`;
      await navigator.clipboard.writeText(link);

      fetchJobDetails();

      if (inviteData?.isNewUser) {
        toast.success('Client portal link generated! Client will be prompted to set their password on first visit.');
      } else {
        toast.success('Client portal link generated and copied to clipboard!');
      }
    } catch (error) {
      handleMutationError(error, 'JobDetailActions', 'Failed to generate client portal link');
    } finally {
      setGeneratingPortalLink(false);
    }
  }, [job, jobId, rugs, approvedEstimates, companyId, fetchJobDetails]);

  const handleResendInvite = useCallback(async () => {
    if (!job || !clientPortalStatus) return;

    setResendingInvite(true);
    try {
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const portalUrl = `${baseUrl}/client/${clientPortalStatus.accessToken}`;

      const { error: inviteError } = await supabase.functions.invoke('invite-client', {
        body: {
          email: job.client_email,
          fullName: job.client_name,
          jobId,
          accessToken: clientPortalStatus.accessToken,
          jobNumber: job.job_number,
          portalUrl,
        },
      });

      if (inviteError) throw inviteError;

      toast.success('Invitation email resent successfully!');
      fetchJobDetails();
    } catch (error) {
      handleMutationError(error, 'JobDetailActions', 'Failed to resend invitation');
    } finally {
      setResendingInvite(false);
    }
  }, [job, clientPortalStatus, jobId, fetchJobDetails]);

  return {
    // Loading/state
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

    // Analysis progress
    analysisStage,
    analysisRugNumber,
    analysisCurrent,
    analysisTotal,

    // Annotations
    imageAnnotations,

    // Photo upload
    uploadProgress,
    isUploadingPhotos,
    resetUploadProgress,

    // Actions
    performRugAnalysis,
    handleAnalyzeAllRugs,
    handleAddRug,
    handleEditJob,
    handleSaveClientInfo,
    handleEditRug,
    handleDeleteRug,
    handleSendEmail,
    handleDownloadPDF,
    handleDownloadPhotosPDF,
    handleDownloadJobPDF,
    handleOpenEmailPreview,
    generateClientPortalLink,
    handleResendInvite,
  };
}
