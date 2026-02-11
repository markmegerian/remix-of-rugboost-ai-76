import React, { useRef, useState } from 'react';
import { ImageIcon, Edit2, X, Check, MousePointer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCapacitor, ImpactStyle } from '@/hooks/useCapacitor';
import RugPhoto from '@/components/RugPhoto';
import AnnotationMarker from './AnnotationMarker';
import type { PhotoAnnotations, ImageAnnotation } from './types';

interface PhotoAnnotationEditorProps {
  photoUrls: string[];
  imageAnnotations: PhotoAnnotations[];
  localAnnotations: PhotoAnnotations[];
  editMode: boolean;
  onEditModeChange: (mode: boolean) => void;
  onAnnotationsChange?: (annotations: PhotoAnnotations[]) => void;
  onLocalAnnotationsChange: (annotations: PhotoAnnotations[]) => void;
}

const PhotoAnnotationEditor: React.FC<PhotoAnnotationEditorProps> = ({
  photoUrls,
  imageAnnotations,
  localAnnotations,
  editMode,
  onEditModeChange,
  onAnnotationsChange,
  onLocalAnnotationsChange,
}) => {
  const [editingMarker, setEditingMarker] = useState<{ photoIndex: number; annIndex: number } | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [draggingMarker, setDraggingMarker] = useState<{ photoIndex: number; annIndex: number } | null>(null);
  const [longPressMarker, setLongPressMarker] = useState<{ photoIndex: number; annIndex: number } | null>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { hapticImpact, isNative } = useCapacitor();

  const displayAnnotations = editMode ? localAnnotations : imageAnnotations;

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>, photoIndex: number) => {
    if (!editMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: ImageAnnotation = {
      label: 'New marker - click to edit',
      location: `Photo ${photoIndex + 1}`,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
    };

    const updatedAnnotations = [...localAnnotations];
    const existing = updatedAnnotations.find(a => a.photoIndex === photoIndex);
    if (existing) {
      existing.annotations.push(newAnnotation);
    } else {
      updatedAnnotations.push({ photoIndex, annotations: [newAnnotation] });
    }
    onLocalAnnotationsChange(updatedAnnotations);

    const annIndex = existing ? existing.annotations.length - 1 : 0;
    setEditingMarker({ photoIndex, annIndex });
    setEditLabel(newAnnotation.label);
  };

  const handleDeleteMarker = (photoIndex: number, annIndex: number) => {
    const updated = localAnnotations.map(pa => {
      if (pa.photoIndex === photoIndex) {
        return { ...pa, annotations: pa.annotations.filter((_, idx) => idx !== annIndex) };
      }
      return pa;
    }).filter(pa => pa.annotations.length > 0);
    onLocalAnnotationsChange(updated);
  };

  const handleEditMarker = (photoIndex: number, annIndex: number) => {
    const pa = localAnnotations.find(a => a.photoIndex === photoIndex);
    if (pa) {
      setEditingMarker({ photoIndex, annIndex });
      setEditLabel(pa.annotations[annIndex].label);
    }
  };

  const handleSaveMarkerLabel = () => {
    if (!editingMarker) return;
    const updated = localAnnotations.map(pa => {
      if (pa.photoIndex === editingMarker.photoIndex) {
        return {
          ...pa,
          annotations: pa.annotations.map((ann, idx) =>
            idx === editingMarker.annIndex ? { ...ann, label: editLabel } : ann
          ),
        };
      }
      return pa;
    });
    onLocalAnnotationsChange(updated);
    setEditingMarker(null);
    setEditLabel('');
  };

  const handleLongPressStart = (photoIndex: number, annIndex: number) => {
    if (!editMode) return;
    longPressTimerRef.current = setTimeout(() => {
      setLongPressMarker({ photoIndex, annIndex });
      if (isNative) {
        hapticImpact(ImpactStyle.Medium);
      } else if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent, photoIndex: number, annIndex: number) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    handleLongPressStart(photoIndex, annIndex);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingMarker({ photoIndex, annIndex });

    const imageEl = imageRefs.current[photoIndex];
    if (!imageEl) return;

    const startX = e.clientX;
    const startY = e.clientY;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        handleLongPressEnd();
        setLongPressMarker(null);
      }
      const rect = imageEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      onLocalAnnotationsChange(localAnnotations.map(pa => {
        if (pa.photoIndex === photoIndex) {
          return {
            ...pa,
            annotations: pa.annotations.map((ann, idx) =>
              idx === annIndex ? { ...ann, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } : ann
            ),
          };
        }
        return pa;
      }));
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      handleLongPressEnd();
      (upEvent.target as HTMLElement).releasePointerCapture?.(upEvent.pointerId);
      setDraggingMarker(null);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
  };

  const handleSaveAnnotations = () => {
    if (onAnnotationsChange) {
      onAnnotationsChange(localAnnotations);
    }
    onEditModeChange(false);
  };

  const handleCancelEdit = () => {
    onLocalAnnotationsChange(imageAnnotations);
    onEditModeChange(false);
    setEditingMarker(null);
    setDraggingMarker(null);
  };

  if (photoUrls.length === 0) return null;

  return (
    <Card className="shadow-medium">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display">
            <ImageIcon className="h-5 w-5 text-primary" />
            Photo Analysis
          </CardTitle>
          {onAnnotationsChange && (
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="gap-1">
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                  <Button variant="default" size="sm" onClick={handleSaveAnnotations} className="gap-1">
                    <Check className="h-4 w-4" /> Save Markers
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => onEditModeChange(true)} className="gap-1">
                  <Edit2 className="h-4 w-4" /> Edit Markers
                </Button>
              )}
            </div>
          )}
        </div>
        {editMode && (
          <div className="mt-3 p-3 bg-primary/10 rounded-lg flex items-start gap-2 text-sm text-primary">
            <MousePointer className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="leading-relaxed">
              <span className="hidden sm:inline">Tap to add markers. Drag to reposition. Click a marker to edit or delete.</span>
              <span className="sm:hidden">Tap to add markers. Drag to move. Long-press a marker to edit or delete.</span>
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {photoUrls.map((url, photoIndex) => {
            const photoAnnotation = displayAnnotations.find(a => a.photoIndex === photoIndex);
            const annotations = photoAnnotation?.annotations || [];

            return (
              <div key={photoIndex} className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Photo {photoIndex + 1}</p>
                <div
                  ref={el => imageRefs.current[photoIndex] = el}
                  className={`relative rounded-lg overflow-hidden border border-border ${editMode ? 'cursor-crosshair' : ''} select-none`}
                  onClick={(e) => handleImageClick(e, photoIndex)}
                >
                  <RugPhoto filePath={url} alt={`Rug photo ${photoIndex + 1}`} className="w-full h-auto object-cover pointer-events-none" />
                  {annotations.map((annotation, annIndex) => (
                    <AnnotationMarker
                      key={annIndex}
                      annotation={annotation}
                      annIndex={annIndex}
                      photoIndex={photoIndex}
                      editMode={editMode}
                      isDragging={draggingMarker?.photoIndex === photoIndex && draggingMarker?.annIndex === annIndex}
                      isLongPressed={longPressMarker?.photoIndex === photoIndex && longPressMarker?.annIndex === annIndex}
                      onPointerDown={handlePointerDown}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (editMode && !draggingMarker) handleEditMarker(photoIndex, annIndex);
                      }}
                      onEdit={() => { setLongPressMarker(null); handleEditMarker(photoIndex, annIndex); }}
                      onDelete={() => { setLongPressMarker(null); handleDeleteMarker(photoIndex, annIndex); }}
                      onDismissLongPress={() => setLongPressMarker(null)}
                    />
                  ))}
                </div>
                {/* Annotation legend */}
                {annotations.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {annotations.map((annotation, annIndex) => {
                      const isEditing = editingMarker?.photoIndex === photoIndex && editingMarker?.annIndex === annIndex;
                      return (
                        <div key={annIndex} className="flex items-start gap-2 text-sm">
                          <span className="w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold flex-shrink-0">
                            {annIndex + 1}
                          </span>
                          {isEditing ? (
                            <div className="flex-1 flex items-center gap-2">
                              <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-7 text-sm" autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMarkerLabel(); else if (e.key === 'Escape') setEditingMarker(null); }} />
                              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleSaveMarkerLabel}>
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className={`text-foreground/80 ${editMode ? 'cursor-pointer hover:text-foreground' : ''}`}
                              onClick={() => editMode && handleEditMarker(photoIndex, annIndex)}>
                              {annotation.label}
                            </span>
                          )}
                          {editMode && !isEditing && (
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto"
                              onClick={() => handleDeleteMarker(photoIndex, annIndex)}>
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {annotations.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    {editMode ? 'Click on the photo to add markers' : 'No specific issues identified in this photo'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PhotoAnnotationEditor;
