import React, { useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown>;
  children: React.ReactNode;
  className?: string;
}

const THRESHOLD = 60;
const MAX_PULL = 100;

const PullToRefresh = ({ onRefresh, children, className }: PullToRefreshProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pulling = useRef(false);

  const isAtTop = useCallback(() => {
    const el = containerRef.current;
    if (!el) return false;
    // Check if we're scrolled to top (or near top)
    return el.scrollTop <= 0;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    if (isAtTop()) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing, isAtTop]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && isAtTop()) {
      // Apply resistance curve
      const distance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(distance);
    } else {
      pulling.current = false;
      setPullDistance(0);
    }
  }, [refreshing, isAtTop]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(THRESHOLD); // Snap to threshold during refresh
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = pullDistance > 10 || refreshing;

  return (
    <div
      ref={containerRef}
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height: showIndicator ? `${pullDistance}px` : '0px' }}
      >
        <div
          className="flex items-center gap-2 text-muted-foreground text-sm"
          style={{ opacity: progress }}
        >
          <Loader2
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            style={{
              transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
            }}
          />
          <span>{refreshing ? 'Refreshing…' : progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      </div>
      {children}
    </div>
  );
};

export default PullToRefresh;
