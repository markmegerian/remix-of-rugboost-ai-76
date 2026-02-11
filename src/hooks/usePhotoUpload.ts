import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/lib/imageCompression';

interface UploadProgress {
  total: number;
  completed: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
}

interface UsePhotoUploadOptions {
  batchSize?: number;
  bucket?: string;
  expirySeconds?: number;
}

interface UsePhotoUploadReturn {
  uploadPhotos: (photos: File[], userId: string) => Promise<string[]>;
  progress: UploadProgress | null;
  isUploading: boolean;
  error: Error | null;
  reset: () => void;
}

const DEFAULT_BATCH_SIZE = 4;
const DEFAULT_BUCKET = 'rug-photos';
const DEFAULT_EXPIRY = 604800; // 7 days

export const usePhotoUpload = (options: UsePhotoUploadOptions = {}): UsePhotoUploadReturn => {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    bucket = DEFAULT_BUCKET,
    expirySeconds = DEFAULT_EXPIRY,
  } = options;

  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setProgress(null);
    setIsUploading(false);
    setError(null);
  }, []);

  const uploadSinglePhoto = async (photo: File, userId: string): Promise<string> => {
    // Compress image before upload to save bandwidth
    const compressedPhoto = await compressImage(photo);
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}-${photo.name}`;

    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, compressedPhoto, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload ${photo.name}`);
    }

    // Return the storage path instead of a signed URL
    // Signed URLs will be generated on-demand when displaying images
    return data.path;
  };

  const uploadPhotos = useCallback(
    async (photos: File[], userId: string): Promise<string[]> => {
      if (photos.length === 0) return [];

      setIsUploading(true);
      setError(null);

      const totalBatches = Math.ceil(photos.length / batchSize);
      const results: string[] = [];

      setProgress({
        total: photos.length,
        completed: 0,
        percentage: 0,
        currentBatch: 0,
        totalBatches,
      });

      try {
        for (let i = 0; i < photos.length; i += batchSize) {
          const batchNumber = Math.floor(i / batchSize) + 1;
          const batch = photos.slice(i, i + batchSize);

          // Upload batch in parallel
          const batchResults = await Promise.all(
            batch.map((photo) => uploadSinglePhoto(photo, userId))
          );

          results.push(...batchResults);

          const completed = Math.min(i + batch.length, photos.length);
          setProgress({
            total: photos.length,
            completed,
            percentage: Math.round((completed / photos.length) * 100),
            currentBatch: batchNumber,
            totalBatches,
          });
        }

        return results;
      } catch (err) {
        const uploadError = err instanceof Error ? err : new Error('Upload failed');
        setError(uploadError);
        throw uploadError;
      } finally {
        setIsUploading(false);
      }
    },
    [batchSize, bucket, expirySeconds]
  );

  return {
    uploadPhotos,
    progress,
    isUploading,
    error,
    reset,
  };
};
