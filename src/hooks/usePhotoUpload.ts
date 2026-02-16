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

const sanitizeFileName = (name: string): string => {
  // Normalize and keep a safe subset for storage keys
  return name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
};

const makeStoragePath = (userId: string, originalName: string): string => {
  const safeName = sanitizeFileName(originalName || 'photo.jpg');
  const uniqueSuffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${userId}/${uniqueSuffix}-${safeName}`;
};

export const usePhotoUpload = (options: UsePhotoUploadOptions = {}): UsePhotoUploadReturn => {
  const {
    batchSize = DEFAULT_BATCH_SIZE,
    bucket = DEFAULT_BUCKET,
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
    const compressedPhoto = await compressImage(photo);
    const filePath = makeStoragePath(userId, photo.name);

    console.debug(`Uploading photo: ${filePath}, size: ${(compressedPhoto.size / 1024).toFixed(0)}KB, type: ${compressedPhoto.type}`);
    
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, compressedPhoto, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error details:', { 
        message: uploadError.message, 
        name: uploadError.name,
        filePath,
        bucket,
        photoSize: compressedPhoto.size,
        photoType: compressedPhoto.type,
      });
      throw new Error(`Failed to upload ${photo.name}: ${uploadError.message}`);
    }

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

        // Best-effort rollback to avoid orphaned files when a multi-photo upload fails midway
        if (results.length > 0) {
          const { error: cleanupError } = await supabase.storage.from(bucket).remove(results);
          if (cleanupError) {
            console.warn('Failed to clean up partial uploads:', cleanupError.message);
          }
        }

        throw uploadError;
      } finally {
        setIsUploading(false);
      }
    },
    [batchSize, bucket]
  );

  return {
    uploadPhotos,
    progress,
    isUploading,
    error,
    reset,
  };
};
