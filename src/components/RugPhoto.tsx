import React from 'react';
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
 */
const RugPhoto: React.FC<RugPhotoProps> = ({
  filePath,
  alt = 'Rug photo',
  className = 'w-full h-auto object-cover',
  loadingClassName = 'w-full h-32',
}) => {
  const { signedUrl, loading, error } = useCachedSignedUrl(filePath);

  if (loading && !signedUrl) {
    return (
      <Skeleton className={loadingClassName} />
    );
  }

  if (error || !signedUrl) {
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
    />
  );
};

export default RugPhoto;
