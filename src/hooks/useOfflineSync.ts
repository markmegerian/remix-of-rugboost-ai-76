import { useState, useEffect, useCallback } from 'react';
import { offlineSyncService } from '@/lib/offlineSyncService';
import { saveOfflineSubmission, type OfflineRugSubmission } from '@/lib/offlineDb';
import { toast } from 'sonner';

interface UseOfflineSyncReturn {
  pendingCount: number;
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
  queueRugSubmission: (params: {
    jobId: string;
    jobNumber: string;
    clientName: string;
    userId: string;
    companyId: string | null;
    formData: OfflineRugSubmission['formData'];
    photos: File[];
  }) => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((count, syncing) => {
      setPendingCount(count);
      setIsSyncing(syncing);
    });

    return unsubscribe;
  }, []);

  const triggerSync = useCallback(async () => {
    await offlineSyncService.trySync();
  }, []);

  const queueRugSubmission = useCallback(async (params: {
    jobId: string;
    jobNumber: string;
    clientName: string;
    userId: string;
    companyId: string | null;
    formData: OfflineRugSubmission['formData'];
    photos: File[];
  }) => {
    const id = crypto.randomUUID();
    const photoKeys = params.photos.map((_, i) => `${id}_photo_${i}`);

    const submission: OfflineRugSubmission = {
      id,
      jobId: params.jobId,
      jobNumber: params.jobNumber,
      clientName: params.clientName,
      userId: params.userId,
      companyId: params.companyId,
      formData: params.formData,
      photoKeys,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    };

    const photosWithKeys = params.photos.map((file, i) => ({
      file,
      key: photoKeys[i],
    }));

    await saveOfflineSubmission(submission, photosWithKeys);
    await offlineSyncService.refreshCount();

    toast.info('Rug saved offline — will upload when back online', {
      description: `${params.formData.rugNumber} queued for ${params.jobNumber}`,
    });
  }, []);

  return {
    pendingCount,
    isSyncing,
    triggerSync,
    queueRugSubmission,
  };
}
