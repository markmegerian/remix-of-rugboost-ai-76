import React from 'react';
import { Edit2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ImageAnnotation } from './types';

interface AnnotationMarkerProps {
  annotation: ImageAnnotation;
  annIndex: number;
  photoIndex: number;
  editMode: boolean;
  isDragging: boolean;
  isLongPressed: boolean;
  onPointerDown: (e: React.PointerEvent, photoIndex: number, annIndex: number) => void;
  onClick: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDismissLongPress: () => void;
}

const AnnotationMarker: React.FC<AnnotationMarkerProps> = ({
  annotation,
  annIndex,
  editMode,
  isDragging,
  isLongPressed,
  onPointerDown,
  onClick,
  onEdit,
  onDelete,
  onDismissLongPress,
  photoIndex,
}) => {
  return (
    <div
      className={`absolute ${isDragging ? 'z-50 scale-110' : isLongPressed ? 'z-50' : 'z-10'}`}
      style={{
        left: `${annotation.x}%`,
        top: `${annotation.y}%`,
        transform: 'translate(-50%, -50%)',
        transition: isDragging ? 'none' : 'all 0.15s ease-out',
        touchAction: 'none',
      }}
      onPointerDown={(e) => onPointerDown(e, photoIndex, annIndex)}
      onClick={onClick}
    >
      <div className={`relative group ${editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}>
        <div className={`w-7 h-7 sm:w-6 sm:h-6 bg-destructive rounded-full flex items-center justify-center text-destructive-foreground text-xs font-bold shadow-lg border-2 border-white ${editMode ? 'ring-2 ring-primary/50' : 'animate-pulse'} ${isLongPressed ? 'scale-125 ring-4 ring-primary' : ''} transition-transform`}>
          {annIndex + 1}
        </div>
        {/* Tooltip - hidden on touch devices in non-edit mode */}
        {!editMode && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden md:group-hover:block z-10 pointer-events-none">
            <div className="bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-lg text-sm whitespace-nowrap border border-border max-w-[200px] truncate">
              {annotation.label}
            </div>
          </div>
        )}
        {/* Long-press menu for mobile */}
        {editMode && isLongPressed && (
          <div
            className="absolute -top-12 left-1/2 -translate-x-1/2 flex z-30 gap-1 bg-background rounded-xl p-1.5 shadow-xl border-2 border-primary animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="secondary" size="sm" className="h-9 w-9 p-0 touch-manipulation rounded-lg"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" className="h-9 w-9 p-0 touch-manipulation rounded-lg"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <X className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 touch-manipulation rounded-lg"
              onClick={(e) => { e.stopPropagation(); onDismissLongPress(); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        {/* Edit mode controls - hover for desktop */}
        {editMode && !isLongPressed && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden md:flex z-20 gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-border">
            <Button variant="secondary" size="sm" className="h-8 w-8 p-0 touch-manipulation"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="sm" className="h-8 w-8 p-0 touch-manipulation"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnotationMarker;
