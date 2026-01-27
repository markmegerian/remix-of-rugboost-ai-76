import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import DeviceFrame, { DeviceType } from './DeviceFrame';

export interface ScreenshotSlideProps {
  headline: string;
  subheadline?: string;
  backgroundColor: string;
  accentColor?: string;
  device: DeviceType;
  children: React.ReactNode;
  className?: string;
  scale?: number;
}

const ScreenshotSlide = forwardRef<HTMLDivElement, ScreenshotSlideProps>(({
  headline,
  subheadline,
  backgroundColor,
  accentColor = 'hsl(210, 70%, 45%)',
  device,
  children,
  className,
  scale = 0.35,
}, ref) => {
  return (
    <div 
      ref={ref}
      className={cn(
        "relative flex flex-col items-center justify-center p-8 overflow-hidden",
        className
      )}
      style={{ 
        background: backgroundColor,
        minHeight: 650,
        minWidth: 320,
      }}
    >
      {/* Decorative gradient blobs */}
      <div 
        className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
      />
      <div 
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: `radial-gradient(circle, white 0%, transparent 70%)` }}
      />
      <div 
        className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
      />
      
      {/* Headlines */}
      <div className="relative z-10 text-center mb-8 max-w-sm px-4">
        <h2 
          className="text-3xl font-bold mb-3 font-display leading-tight drop-shadow-lg"
          style={{ color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
        >
          {headline}
        </h2>
        {subheadline && (
          <p 
            className="text-lg opacity-95 drop-shadow-md"
            style={{ color: 'rgba(255,255,255,0.95)' }}
          >
            {subheadline}
          </p>
        )}
      </div>
      
      {/* Device with content */}
      <div className="relative z-10 drop-shadow-2xl">
        <DeviceFrame device={device} scale={scale}>
          {children}
        </DeviceFrame>
      </div>
    </div>
  );
});

ScreenshotSlide.displayName = 'ScreenshotSlide';

export default ScreenshotSlide;
