import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { supabase } from '@/integrations/supabase/client';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { useOfflineSync } from '@/hooks/useOfflineSync';

// Re-export types used by hook consumers
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
  userId: string | undefined;
  companyId: string | undefined;
  fetchJobDetails: () => void;
}

export function useJobDetailActions({
  job,
  userId,
  companyId,
  fetchJobDetails,
}: UseJobDetailActionsParams) {
  const [addingRug, setAddingRug] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [savingRug, setSavingRug] = useState(false);
  const [savingClientInfo, setSavingClientInfo] = useState(false);
  const [confirmDeleteRugId, setConfirmDeleteRugId] = useState<string | null>(null);

  const { queueRugSubmission } = useOfflineSync();

  const {
    uploadPhotos,
    progress: uploadProgress,
    isUploading: isUploadingPhotos,
    reset: resetUploadProgress,
  } = usePhotoUpload({ batchSize: 4 });

  // ── Rug CRUD ──────────────────────────────────────────────

  const handleAddRug = useCallback(async (
    formData: { rugNumber: string; length: string; width: string; rugType: string; notes: string },
    photos: File[]
  ) => {
    if (!userId || !job) return;

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
        handleMutationError(error, 'JobDetail.offlineQueue');
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
          console.error('Failed to queue offline:', offlineError);
        }
      }
      handleMutationError(error, 'JobDetail.addRug');
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
      handleMutationError(error, 'JobDetail.editJob');
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
      handleMutationError(error, 'JobDetail.saveClientInfo');
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
      handleMutationError(error, 'JobDetail.editRug');
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
      handleMutationError(error, 'JobDetail.deleteRug');
    } finally {
      setConfirmDeleteRugId(null);
    }
  }, [fetchJobDetails]);

  return {
    addingRug,
    savingJob,
    savingRug,
    savingClientInfo,
    confirmDeleteRugId,
    setConfirmDeleteRugId,
    uploadProgress,
    isUploadingPhotos,
    resetUploadProgress,
    handleAddRug,
    handleEditJob,
    handleSaveClientInfo,
    handleEditRug,
    handleDeleteRug,
  };
}
