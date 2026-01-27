import React, { forwardRef } from 'react';
import { Camera, CheckCircle, Image, ArrowLeft, Zap } from 'lucide-react';

const captureSteps = [
  { id: 'overall-front', label: 'Overall Front', description: 'Full rug from above', captured: true },
  { id: 'overall-back', label: 'Overall Back', description: 'Flip and capture', captured: true },
  { id: 'edge', label: 'Edge Detail', description: 'Close-up of edges', captured: true },
  { id: 'fringe', label: 'Fringe', description: 'Fringe condition', captured: false, current: true },
  { id: 'issue', label: 'Issue Areas', description: 'Problem spots', captured: false },
];

const MockPhotoCapture = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="w-full h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <button className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">Capture Photos</h1>
            <p className="text-xs text-muted-foreground">RUG-001 • Antique Persian Tabriz</p>
          </div>
        </div>
      </header>

      <div className="p-5 space-y-4 pb-20">
        {/* Progress Bar */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Photo Progress</span>
            </div>
            <span className="text-sm font-bold text-primary">3 of 5</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-3/5 bg-gradient-to-r from-primary to-accent rounded-full transition-all" />
          </div>
        </div>

        {/* Camera Preview */}
        <div className="bg-zinc-900 rounded-2xl aspect-[4/3] relative overflow-hidden shadow-xl">
          {/* Simulated camera view */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
            {/* Guide frame */}
            <div className="absolute inset-6 border-2 border-dashed border-white/20 rounded-xl" />
            
            {/* Center guide */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3 mx-auto backdrop-blur-sm">
                  <Camera className="h-8 w-8 text-white/60" />
                </div>
                <p className="text-white/90 text-base font-medium">Capture Fringe Detail</p>
                <p className="text-white/50 text-sm mt-1">Position fringe in frame</p>
              </div>
            </div>
            
            {/* Flash indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5 backdrop-blur-sm">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-white/80 text-xs">Auto</span>
            </div>
          </div>
          
          {/* Capture button */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <button className="w-16 h-16 rounded-full bg-white border-4 border-white/50 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent" />
            </button>
          </div>
        </div>

        {/* Photo Steps List */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {captureSteps.map((step, index) => (
            <div 
              key={step.id}
              className={`flex items-center justify-between p-4 ${
                index !== captureSteps.length - 1 ? 'border-b border-border' : ''
              } ${step.current ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  step.captured 
                    ? 'bg-green-500/10' 
                    : step.current 
                      ? 'bg-primary/10' 
                      : 'bg-muted'
                }`}>
                  {step.captured ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Image className={`h-5 w-5 ${step.current ? 'text-primary' : 'text-muted-foreground'}`} />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    step.captured ? 'text-muted-foreground' : 'text-foreground'
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {step.current && (
                <span className="text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-full font-medium">
                  Current
                </span>
              )}
              {step.captured && (
                <span className="text-xs text-green-500 font-medium">Done</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

MockPhotoCapture.displayName = 'MockPhotoCapture';

export default MockPhotoCapture;
