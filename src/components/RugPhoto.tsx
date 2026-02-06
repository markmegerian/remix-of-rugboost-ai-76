import React, { memo, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff } from 'lucide-react';
import { useCachedSignedUrl } from '@/hooks/useSignedUrls';

interface RugPhotoProps {
  filePath: string | null | undefined;
  alt?: string;
  className?: string;
  loadingClassName?: string;
}

/**
 * RugPhoto component that displays rug photos using cached signed URLs.
 * Uses batch URL signing for improved performance.
 * Memoized to prevent unnecessary re-renders.
 */
const RugPhoto: React.FC<RugPhotoProps> = memo(({
  filePath,
  alt = 'Rug photo',
  className = 'w-full h-auto object-cover',
  loadingClassName = 'w-full h-32',
}) => {
  const { signedUrl, loading, error } = useCachedSignedUrl(filePath);
  const [imageError, setImageError] = useState(false);

  const handleError = useCallback(() => {
    setImageError(true);
  }, []);

  if (loading && !signedUrl) {
    return (
      <Skeleton className={loadingClassName} />
    );
  }

  if (error || !signedUrl || imageError) {
    return (
      <div className={`flex items-center justify-center bg-muted/50 rounded-lg ${loadingClassName}`}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageOff className="h-8 w-8" />
          <span className="text-xs">Image unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={signedUrl}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={handleError}
    />
  );
});

RugPhoto.displayName = 'RugPhoto';

export default RugPhoto;
