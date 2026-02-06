import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileCarouselProps {
  children: React.ReactNode[];
  className?: string;
}

export default function MobileCarousel({ children, className }: MobileCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentIndex < children.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const goTo = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, children.length - 1)));
  };

  return (
    <div className={cn("relative", className)}>
      {/* Carousel container */}
      <div 
        ref={containerRef}
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {children.map((child, index) => (
            <div 
              key={index} 
              className="w-full flex-shrink-0 px-4"
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows (hidden on mobile, visible on tablet+) */}
      {children.length > 1 && (
        <>
          <button
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            className={cn(
              "hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2",
              "h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-md",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "hover:bg-accent transition-colors"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex === children.length - 1}
            className={cn(
              "hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2",
              "h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-md",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "hover:bg-accent transition-colors"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {children.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {children.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === currentIndex 
                  ? "w-6 bg-primary" 
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
