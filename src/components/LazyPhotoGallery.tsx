import React, { useState, useCallback, memo } from 'react';
import { ImageIcon, ZoomIn, ChevronDown, Loader2 } from 'lucide-react';
import RugPhoto from '@/components/RugPhoto';
import { batchSignUrls } from '@/hooks/useSignedUrls';

interface ImageAnnotation {
  label: string;
  location: string;
  x: number;
  y: number;
}

interface PhotoAnnotations {
  photoIndex: number;
  annotations: ImageAnnotation[];
}

interface LazyPhotoGalleryProps {
  photoUrls: string[];
  rugNumber: string;
  initialCount?: number;
  annotations?: PhotoAnnotations[] | null;
  onOpenLightbox: (photos: string[], startIndex: number, annotations?: PhotoAnnotations[] | null) => void;
}

const LazyPhotoGalleryComponent: React.FC<LazyPhotoGalleryProps> = ({
  photoUrls,
  rugNumber,
  initialCount = 3,
  annotations = null,
  onOpenLightbox,
}) => {
  const [showAll, setShowAll] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const visiblePhotos = showAll ? photoUrls : photoUrls.slice(0, initialCount);
  const hiddenCount = photoUrls.length - initialCount;
  const hasMore = hiddenCount > 0 && !showAll;
  
  const handleShowMore = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Load remaining photos before showing
    const remainingPhotos = photoUrls.slice(initialCount);
    if (remainingPhotos.length > 0) {
      setIsLoadingMore(true);
      try {
        await batchSignUrls(remainingPhotos);
      } catch (err) {
        console.error('Failed to load more photos:', err);
      } finally {
        setIsLoadingMore(false);
      }
    }
    
    setShowAll(true);
  }, [photoUrls, initialCount]);
  
  const handlePhotoClick = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenLightbox(photoUrls, index, annotations);
  };

  // Get annotations for a specific photo
  const getPhotoAnnotations = (photoIndex: number): ImageAnnotation[] => {
    if (!annotations) return [];
    const photoAnnotation = annotations.find(a => a.photoIndex === photoIndex);
    return photoAnnotation?.annotations || [];
  };
  
  if (photoUrls.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ImageIcon className="h-3 w-3" />
        <span>
          {photoUrls.length} inspection photo{photoUrls.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 flex-wrap">
        {visiblePhotos.map((url, idx) => {
          const photoAnnotations = getPhotoAnnotations(idx);
          const hasAnnotations = photoAnnotations.length > 0;
          
          return (
            <button
              key={idx}
              onClick={handlePhotoClick(idx)}
              className="relative group flex-shrink-0"
            >
              <RugPhoto
                filePath={url}
                alt={`${rugNumber} photo ${idx + 1}`}
                className="w-20 h-20 object-cover rounded-lg border transition-opacity group-hover:opacity-80"
                loadingClassName="w-20 h-20"
              />
              
              {/* Annotation markers overlay on thumbnails */}
              {hasAnnotations && (
                <div className="absolute inset-0 pointer-events-none">
                  {photoAnnotations.map((annotation, annIdx) => (
                    <div
                      key={annIdx}
                      className="absolute"
                      style={{
                        left: `${annotation.x}%`,
                        top: `${annotation.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div className="w-4 h-4 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-[8px] font-bold shadow border border-white">
                        {annIdx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="h-5 w-5 text-white drop-shadow-lg" />
              </div>
              
              {/* Badge showing annotation count */}
              {hasAnnotations && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-[10px] font-bold shadow border border-white">
                  {photoAnnotations.length}
                </div>
              )}
            </button>
          );
        })}
        
        {/* Show More Button */}
        {hasMore && (
          <button
            onClick={handleShowMore}
            disabled={isLoadingMore}
            className="w-20 h-20 flex-shrink-0 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50 transition-colors disabled:opacity-50"
          >
            {isLoadingMore ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span className="text-[10px] font-medium">+{hiddenCount} more</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const LazyPhotoGallery = memo(LazyPhotoGalleryComponent);
LazyPhotoGallery.displayName = 'LazyPhotoGallery';

export default LazyPhotoGallery;
export type { PhotoAnnotations, ImageAnnotation };