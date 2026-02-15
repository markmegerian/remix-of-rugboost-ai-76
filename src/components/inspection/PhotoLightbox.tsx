import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import RugPhoto from '@/components/RugPhoto';

interface PhotoAnnotations {
  photoIndex: number;
  annotations: Array<{
    label: string;
    location: string;
    x: number;
    y: number;
  }>;
}

interface PhotoLightboxProps {
  photos: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  annotations?: PhotoAnnotations[] | null;
}

const PhotoLightboxComponent: React.FC<PhotoLightboxProps> = ({
  photos,
  initialIndex,
  isOpen,
  onClose,
  annotations = null,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [tappedAnnotation, setTappedAnnotation] = useState<number | null>(null);

  // Reset index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setTappedAnnotation(null);
    }
  }, [isOpen, initialIndex]);

  const navigate = useCallback((newIndex: number) => {
    setCurrentIndex(newIndex);
    setTappedAnnotation(null);
  }, []);

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          navigate((currentIndex - 1 + photos.length) % photos.length);
          break;
        case 'ArrowRight':
          navigate((currentIndex + 1) % photos.length);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length, onClose, navigate]);

  if (!isOpen) return null;

  const currentAnnotation = annotations?.find(a => a.photoIndex === currentIndex);
  const markers = currentAnnotation?.annotations || [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        aria-label="Close photo viewer"
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>

      {/* Photo counter */}
      <div className="absolute top-4 left-4 text-white/80 text-sm">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Navigation - Previous */}
      {photos.length > 1 && (
        <button
          aria-label="Previous photo"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-black/30 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            navigate((currentIndex - 1 + photos.length) % photos.length);
          }}
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Main Image with Annotations */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <RugPhoto
          filePath={photos[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
          loadingClassName="w-64 h-64"
        />
        {/* Annotation markers */}
        {markers.map((annotation, annIdx) => {
          const isSelected = tappedAnnotation === annIdx;
          return (
            <div
              key={annIdx}
              className="absolute z-10"
              style={{
                left: `${annotation.x}%`,
                top: `${annotation.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setTappedAnnotation(isSelected ? null : annIdx);
              }}
            >
              <div className="relative cursor-pointer group">
                <div className={`w-8 h-8 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-sm font-bold shadow-lg border-2 transition-all ${isSelected ? 'border-white ring-2 ring-white/50 scale-110' : 'border-white'}`}>
                  {annIdx + 1}
                </div>
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none transition-opacity ${isSelected ? 'block' : 'hidden md:group-hover:block'}`}>
                  <div className="bg-white text-foreground px-3 py-2 rounded-md shadow-lg text-sm whitespace-normal border border-border max-w-[200px] sm:max-w-[250px]">
                    {annotation.label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation - Next */}
      {photos.length > 1 && (
        <button
          aria-label="Next photo"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-black/30 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            navigate((currentIndex + 1) % photos.length);
          }}
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Annotation Legend */}
      {markers.length > 0 && (
        <div
          className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-[90vw] bg-black/70 backdrop-blur-sm rounded-lg p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-wrap gap-3 justify-center">
            {markers.map((annotation, annIdx) => (
              <div key={annIdx} className="flex items-center gap-2 text-white text-sm">
                <span className="w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold">
                  {annIdx + 1}
                </span>
                <span className="max-w-[150px] truncate">{annotation.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto p-2">
          {photos.map((url, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                navigate(idx);
              }}
              className={`flex-shrink-0 rounded border-2 transition-all ${
                idx === currentIndex
                  ? 'border-white opacity-100'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <RugPhoto
                filePath={url}
                alt={`Thumbnail ${idx + 1}`}
                className="w-12 h-12 object-cover rounded"
                loadingClassName="w-12 h-12"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const PhotoLightbox = React.memo(PhotoLightboxComponent);
