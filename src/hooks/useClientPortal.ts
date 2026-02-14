import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { supabase } from '@/integrations/supabase/client';
import type { BusinessBranding, UpsellService } from '@/lib/pdfGenerator';
import type { JobDetailJob, JobDetailRug, JobDetailApprovedEstimate, ClientPortalStatusData } from '@/hooks/useJobDetailActions';

interface UseClientPortalParams {
  job: JobDetailJob | null;
  rugs: JobDetailRug[];
  approvedEstimates: JobDetailApprovedEstimate[];
  branding: BusinessBranding | null;
  upsellServices: UpsellService[];
  clientPortalStatus: ClientPortalStatusData | null;
  jobId: string | undefined;
  companyId: string | undefined;
  fetchJobDetails: () => void;
}

export function useClientPortal({
  job,
  rugs,
  approvedEstimates,
  branding,
  upsellServices,
  clientPortalStatus,
  jobId,
  companyId,
  fetchJobDetails,
}: UseClientPortalParams) {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generatingPortalLink, setGeneratingPortalLink] = useState(false);
  const [resendingInvite, setResendingInvite] = useState(false);

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
      handleMutationError(error, 'JobDetail.sendEmail');
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
      handleMutationError(error, 'JobDetail.downloadPDF');
    }
  }, [job, branding]);

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
      handleMutationError(error, 'JobDetail.downloadJobPDF');
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

      await supabase
        .from('payments')
        .delete()
        .eq('job_id', jobId)
        .eq('status', 'pending');

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
        console.error('Invite error:', inviteError);
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
      handleMutationError(error, 'JobDetail.generatePortalLink');
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
      handleMutationError(error, 'JobDetail.resendInvite');
    } finally {
      setResendingInvite(false);
    }
  }, [job, clientPortalStatus, jobId, fetchJobDetails]);

  return {
    sendingEmail,
    generatingPortalLink,
    resendingInvite,
    handleSendEmail,
    handleDownloadPDF,
    handleDownloadJobPDF,
    handleOpenEmailPreview,
    generateClientPortalLink,
    handleResendInvite,
  };
}
