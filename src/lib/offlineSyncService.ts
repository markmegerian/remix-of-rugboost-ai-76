import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/lib/imageCompression';
import {
  getPendingSubmissions,
  getPhotosForSubmission,
  updateSubmissionStatus,
  deleteSubmission,
  clearCompletedSubmissions,
  getPendingCount,
  type OfflineRugSubmission,
} from '@/lib/offlineDb';

const MAX_RETRIES = 5;
const SYNC_INTERVAL_MS = 30_000; // Check every 30s

type SyncListener = (pendingCount: number, syncing: boolean) => void;

class OfflineSyncService {
  private listeners = new Set<SyncListener>();
  private syncing = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private pendingCount = 0;

  /** Start watching for connectivity and periodically syncing */
  start() {
    // Listen for online events
    window.addEventListener('online', this.onOnline);

    // Periodic check
    this.intervalId = setInterval(() => this.trySync(), SYNC_INTERVAL_MS);

    // Initial sync attempt
    this.refreshCount();
    this.trySync();
  }

  stop() {
    window.removeEventListener('online', this.onOnline);
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.pendingCount, this.syncing);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.pendingCount, this.syncing);
    }
  }

  async refreshCount() {
    this.pendingCount = await getPendingCount();
    this.notify();
  }

  private onOnline = () => {
    console.debug('[OfflineSync] Device came online, triggering sync');
    this.trySync();
  };

  /** Manually trigger a sync attempt */
  async trySync(): Promise<void> {
    if (this.syncing || !navigator.onLine) return;

    const pending = await getPendingSubmissions();
    if (pending.length === 0) return;

    this.syncing = true;
    this.notify();

    console.debug(`[OfflineSync] Syncing ${pending.length} pending submissions`);

    for (const submission of pending) {
      if (!navigator.onLine) {
        console.debug('[OfflineSync] Lost connection during sync, stopping');
        break;
      }

      if (submission.retryCount >= MAX_RETRIES) {
        console.warn(`[OfflineSync] Skipping ${submission.id} — max retries reached`);
        continue;
      }

      await this.syncSubmission(submission);
    }

    // Clean up completed
    await clearCompletedSubmissions();

    this.syncing = false;
    await this.refreshCount();
  }

  private async syncSubmission(submission: OfflineRugSubmission): Promise<void> {
    try {
      await updateSubmissionStatus(submission.id, 'uploading');
      this.pendingCount = await getPendingCount();
      this.notify();

      // 1. Get photo files from IndexedDB
      const photos = await getPhotosForSubmission(submission.photoKeys);

      // 2. Upload photos to storage
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const compressed = await compressImage(photo);
        const fileName = `${submission.userId}/${Date.now()}-${Math.random().toString(36).substring(7)}-${photo.name}`;

        const { data, error: uploadError } = await supabase.storage
          .from('rug-photos')
          .upload(fileName, compressed, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;
        photoUrls.push(data.path);
      }

      // 3. Insert inspection record
      const { error: insertError } = await supabase.from('inspections').insert({
        user_id: submission.userId,
        job_id: submission.jobId,
        company_id: submission.companyId,
        client_name: submission.clientName,
        rug_number: submission.formData.rugNumber,
        rug_type: submission.formData.rugType,
        length: submission.formData.length ? parseFloat(submission.formData.length) : null,
        width: submission.formData.width ? parseFloat(submission.formData.width) : null,
        notes: submission.formData.notes || null,
        photo_urls: photoUrls,
        analysis_report: null,
      });

      if (insertError) throw insertError;

      // Mark as uploaded (will be cleaned up)
      await updateSubmissionStatus(submission.id, 'uploaded');
      console.debug(`[OfflineSync] Successfully synced submission ${submission.id}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[OfflineSync] Failed to sync ${submission.id}:`, msg);
      await updateSubmissionStatus(submission.id, 'failed', msg);
    }
  }
}

// Singleton instance
export const offlineSyncService = new OfflineSyncService();
