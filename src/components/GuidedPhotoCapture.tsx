import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, ChevronLeft, ChevronRight, AlertCircle, Plus, SkipForward, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Import reference images
import guideOverallFront from '@/assets/photo-guide-overall-front.png';
import guideOverallBack from '@/assets/photo-guide-overall-back.png';
import guideFringe from '@/assets/photo-guide-fringe.png';
import guideEdge from '@/assets/photo-guide-edge.png';
import guideIssue from '@/assets/photo-guide-issue.png';

// Photo step definitions with guidance
const PHOTO_STEPS = [
  {
    id: 'overall-front',
    title: 'Overall Front',
    instruction: 'Capture the entire rug from directly above, showing the full front/top surface',
    tip: 'Stand back far enough to fit the whole rug in frame',
    required: true,
    icon: '📷',
    guideImage: guideOverallFront,
  },
  {
    id: 'overall-back',
    title: 'Overall Back',
    instruction: 'Flip the rug and capture the entire back surface',
    tip: 'This helps identify construction type and hidden damage',
    required: true,
    icon: '🔄',
    guideImage: guideOverallBack,
  },
  {
    id: 'fringe-end-a',
    title: 'Fringe - End A',
    instruction: 'Close-up of the fringe on one end of the rug',
    tip: 'Show the full width of the fringe clearly',
    required: true,
    icon: '〰️',
    guideImage: guideFringe,
  },
  {
    id: 'fringe-end-b',
    title: 'Fringe - End B',
    instruction: 'Close-up of the fringe on the opposite end',
    tip: 'Capture any differences in condition from End A',
    required: true,
    icon: '〰️',
    guideImage: guideFringe,
  },
  {
    id: 'edge-side-a',
    title: 'Edge/Binding - Side A',
    instruction: 'Close-up of one side edge/binding of the rug',
    tip: 'Show the binding or selvedge condition',
    required: true,
    icon: '📏',
    guideImage: guideEdge,
  },
  {
    id: 'edge-side-b',
    title: 'Edge/Binding - Side B',
    instruction: 'Close-up of the opposite side edge/binding',
    tip: 'Note any wear, loose threads, or damage',
    required: true,
    icon: '📏',
    guideImage: guideEdge,
  },
] as const;

interface PhotoData {
  file: File;
  stepId: string;
  label: string;
}

interface GuidedPhotoCaptureProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  onRequiredComplete?: (complete: boolean) => void;
  maxPhotos?: number;
}

const GuidedPhotoCapture: React.FC<GuidedPhotoCaptureProps> = ({
  photos,
  onPhotosChange,
  onRequiredComplete,
  maxPhotos = 50, // Allow many optional photos
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [photoData, setPhotoData] = useState<PhotoData[]>([]);
  const [captureMode, setCaptureMode] = useState<'guided' | 'additional'>('guided');

  const totalRequiredSteps = PHOTO_STEPS.length;
  const completedRequiredSteps = photoData.filter(p => 
    PHOTO_STEPS.some(s => s.id === p.stepId)
  ).length;
  const additionalPhotos = photoData.filter(p => p.stepId.startsWith('additional-'));
  const allRequiredComplete = completedRequiredSteps === totalRequiredSteps;
  const remainingOptionalSlots = maxPhotos - totalRequiredSteps - additionalPhotos.length;

  // Notify parent of required completion status
  useEffect(() => {
    onRequiredComplete?.(allRequiredComplete);
  }, [allRequiredComplete, onRequiredComplete]);

  const processFile = (file: File) => {
    if (captureMode === 'guided') {
      const step = PHOTO_STEPS[currentStep];
      const newPhotoData: PhotoData = {
        file,
        stepId: step.id,
        label: step.title,
      };

      // Replace or add photo for current step
      const existingIndex = photoData.findIndex(p => p.stepId === step.id);
      let updatedPhotoData: PhotoData[];
      
      if (existingIndex >= 0) {
        updatedPhotoData = [...photoData];
        updatedPhotoData[existingIndex] = newPhotoData;
      } else {
        updatedPhotoData = [...photoData, newPhotoData];
      }

      setPhotoData(updatedPhotoData);
      syncPhotos(updatedPhotoData);

      // Auto-advance to next uncaptured step or additional mode
      const nextUncapturedStep = findNextUncapturedStep(currentStep, updatedPhotoData);
      if (nextUncapturedStep !== null) {
        setTimeout(() => setCurrentStep(nextUncapturedStep), 300);
      } else {
        // All required done, switch to additional mode
        setTimeout(() => setCaptureMode('additional'), 300);
      }
    } else {
      // Additional photo mode - allow unlimited
      const additionalCount = photoData.filter(p => p.stepId.startsWith('additional-')).length;
      if (additionalCount >= remainingOptionalSlots + additionalPhotos.length) return;

      const newPhotoData: PhotoData = {
        file,
        stepId: `additional-${Date.now()}`,
        label: `Issue Close-up ${additionalCount + 1}`,
      };

      const updatedPhotoData = [...photoData, newPhotoData];
      setPhotoData(updatedPhotoData);
      syncPhotos(updatedPhotoData);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Process first file for guided mode, all files for additional mode
    if (captureMode === 'guided') {
      processFile(files[0]);
    } else {
      files.forEach(file => processFile(file));
    }

    // Reset inputs
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const findNextUncapturedStep = (fromStep: number, data: PhotoData[]): number | null => {
    // First check steps after current
    for (let i = fromStep + 1; i < totalRequiredSteps; i++) {
      if (!data.find(p => p.stepId === PHOTO_STEPS[i].id)) {
        return i;
      }
    }
    // Then check steps before current
    for (let i = 0; i <= fromStep; i++) {
      if (!data.find(p => p.stepId === PHOTO_STEPS[i].id)) {
        return i;
      }
    }
    return null; // All complete
  };

  const syncPhotos = (data: PhotoData[]) => {
    // Maintain order: required photos first (in step order), then additional photos
    const orderedPhotos: File[] = [];
    
    // Add required photos in order
    PHOTO_STEPS.forEach(step => {
      const photo = data.find(p => p.stepId === step.id);
      if (photo) orderedPhotos.push(photo.file);
    });
    
    // Add additional photos
    data
      .filter(p => p.stepId.startsWith('additional-'))
      .forEach(p => orderedPhotos.push(p.file));

    onPhotosChange(orderedPhotos);
  };

  const removePhoto = (stepId: string) => {
    const updatedPhotoData = photoData.filter(p => p.stepId !== stepId);
    setPhotoData(updatedPhotoData);
    syncPhotos(updatedPhotoData);

    // If removing a required photo, go back to guided mode and that step
    const stepIndex = PHOTO_STEPS.findIndex(s => s.id === stepId);
    if (stepIndex >= 0) {
      setCaptureMode('guided');
      setCurrentStep(stepIndex);
    }
  };

  const openCamera = () => cameraInputRef.current?.click();
  const openGallery = () => galleryInputRef.current?.click();

  const getPhotoForStep = (stepId: string) => {
    return photoData.find(p => p.stepId === stepId);
  };

  const skipToAdditional = () => {
    setCaptureMode('additional');
  };

  return (
    <div className="space-y-6">
      {/* Hidden inputs - separate for camera (with capture) and gallery (multiple) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple={captureMode === 'additional'}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Progress Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {captureMode === 'guided' 
              ? `Step ${currentStep + 1} of ${totalRequiredSteps}: ${PHOTO_STEPS[currentStep].title}`
              : 'Additional Issue Photos (Optional)'
            }
          </span>
          <span className={cn(
            "text-sm font-medium",
            allRequiredComplete ? "text-primary" : "text-muted-foreground"
          )}>
            {allRequiredComplete ? (
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4" />
                {completedRequiredSteps}/{totalRequiredSteps} required
              </span>
            ) : (
              `${completedRequiredSteps}/${totalRequiredSteps} required`
            )}
          </span>
        </div>
        <div className="flex gap-1">
          {PHOTO_STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => {
                setCaptureMode('guided');
                setCurrentStep(index);
              }}
              className={cn(
                "h-2 flex-1 rounded-full transition-all",
                getPhotoForStep(step.id)
                  ? "bg-primary"
                  : index === currentStep && captureMode === 'guided'
                  ? "bg-primary/40"
                  : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Capture Mode Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={captureMode === 'guided' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCaptureMode('guided')}
          className="flex-1"
        >
          Required Photos ({completedRequiredSteps}/{totalRequiredSteps})
        </Button>
        <Button
          type="button"
          variant={captureMode === 'additional' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCaptureMode('additional')}
          className="flex-1"
        >
          Issue Close-ups ({additionalPhotos.length})
        </Button>
      </div>

      {/* Guided Capture View */}
      {captureMode === 'guided' && (
        <div className="space-y-4">
          {/* Current Step Card */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Reference Image */}
            <div className="bg-muted/50 p-4 flex justify-center">
              <img 
                src={PHOTO_STEPS[currentStep].guideImage} 
                alt={`Guide for ${PHOTO_STEPS[currentStep].title}`}
                className="h-32 w-auto object-contain rounded-lg opacity-80"
              />
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{PHOTO_STEPS[currentStep].icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">
                    {PHOTO_STEPS[currentStep].title}
                    <span className="ml-2 text-xs text-destructive">Required</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {PHOTO_STEPS[currentStep].instruction}
                  </p>
                  <p className="text-xs text-primary mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {PHOTO_STEPS[currentStep].tip}
                  </p>
                </div>
              </div>

              {/* Photo Preview or Capture Button */}
              {getPhotoForStep(PHOTO_STEPS[currentStep].id) ? (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <img
                    src={URL.createObjectURL(getPhotoForStep(PHOTO_STEPS[currentStep].id)!.file)}
                    alt={PHOTO_STEPS[currentStep].title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={openCamera}
                      className="gap-1"
                    >
                      <Camera className="h-3 w-3" />
                      Retake
                    </Button>
                    <button
                      type="button"
                      onClick={() => removePhoto(PHOTO_STEPS[currentStep].id)}
                      className="rounded-full bg-destructive p-1.5 text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Captured
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-video rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 flex flex-col items-center justify-center gap-3">
                  <div className="rounded-full bg-primary/20 p-4">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary">
                    Capture {PHOTO_STEPS[currentStep].title}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={openCamera}
                      className="gap-1.5"
                    >
                      <Camera className="h-4 w-4" />
                      Camera
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openGallery}
                      className="gap-1.5"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Gallery
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step Navigation */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            {currentStep < totalRequiredSteps - 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex-1"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                variant={allRequiredComplete ? "default" : "outline"}
                onClick={skipToAdditional}
                className="flex-1"
              >
                {allRequiredComplete ? "Add Issue Photos" : "Skip to Issues"}
                <SkipForward className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>

          {/* Quick skip option */}
          {!allRequiredComplete && (
            <p className="text-center text-xs text-muted-foreground">
              Complete all 6 required photos to submit the rug
            </p>
          )}
        </div>
      )}

      {/* Additional Photos View */}
      {captureMode === 'additional' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Reference Image */}
            <div className="bg-muted/50 p-4 flex justify-center">
              <img 
                src={guideIssue} 
                alt="Guide for issue close-ups"
                className="h-24 w-auto object-contain rounded-lg opacity-80"
              />
            </div>
            
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl">🔍</span>
                <div>
                  <h3 className="font-semibold text-foreground">Issue Close-ups</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Capture close-up photos of any stains, damage, wear, moth damage, or notable areas. Add as many as needed.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {additionalPhotos.map((photo, index) => (
                  <div
                    key={photo.stepId}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                  >
                    <img
                      src={URL.createObjectURL(photo.file)}
                      alt={photo.label}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.stepId)}
                      className="absolute top-2 right-2 rounded-full bg-destructive p-1.5 text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-2 left-2 rounded-full bg-foreground/70 px-2 py-0.5 text-xs text-background">
                      Issue {index + 1}
                    </div>
                  </div>
                ))}

                <div className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={openCamera}
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      title="Take photo"
                    >
                      <Camera className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={openGallery}
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      title="Choose from gallery"
                    >
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Add Issue</span>
                </div>
              </div>
            </div>
          </div>

          {additionalPhotos.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No issues to document? You can skip this step.
            </p>
          )}

          {/* Back to required photos button */}
          {!allRequiredComplete && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const nextRequired = findNextUncapturedStep(-1, photoData);
                if (nextRequired !== null) {
                  setCaptureMode('guided');
                  setCurrentStep(nextRequired);
                }
              }}
              className="w-full"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Required Photos ({totalRequiredSteps - completedRequiredSteps} remaining)
            </Button>
          )}
        </div>
      )}

      {/* Photo Summary Grid */}
      {photoData.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">
            All Photos ({photoData.length})
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {PHOTO_STEPS.map((step, index) => {
              const photo = getPhotoForStep(step.id);
              return (
                <div
                  key={step.id}
                  onClick={() => {
                    setCaptureMode('guided');
                    setCurrentStep(index);
                  }}
                  className={cn(
                    "aspect-square rounded-lg overflow-hidden cursor-pointer transition-all",
                    photo 
                      ? "ring-2 ring-primary ring-offset-1" 
                      : "border-2 border-dashed border-destructive/30 bg-destructive/5"
                  )}
                  title={step.title}
                >
                  {photo ? (
                    <img
                      src={URL.createObjectURL(photo.file)}
                      alt={step.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-sm opacity-50">{step.icon}</span>
                    </div>
                  )}
                </div>
              );
            })}
            {additionalPhotos.map((photo) => (
              <div
                key={photo.stepId}
                onClick={() => setCaptureMode('additional')}
                className="aspect-square rounded-lg overflow-hidden cursor-pointer ring-2 ring-secondary ring-offset-1"
                title={photo.label}
              >
                <img
                  src={URL.createObjectURL(photo.file)}
                  alt={photo.label}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {allRequiredComplete 
              ? "✓ All required photos captured" 
              : `⚠ ${totalRequiredSteps - completedRequiredSteps} required photos missing`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default GuidedPhotoCapture;
