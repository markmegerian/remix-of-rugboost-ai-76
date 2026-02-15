import React, { forwardRef } from 'react';
import { demoEstimates, calculateGrandTotal } from '@/data/demoData';
import { CheckCircle, Lock, ArrowLeft, FileCheck } from 'lucide-react';

const MockEstimate = forwardRef<HTMLDivElement>((_, ref) => {
  const grandTotal = calculateGrandTotal(demoEstimates);
  
  return (
    <div ref={ref} className="w-full h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <button className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">Estimate Review</h1>
            <p className="text-xs text-muted-foreground">3 rugs • Morrison Job</p>
          </div>
        </div>
      </header>

      <div className="p-5 space-y-4 pb-24 overflow-auto">
        {/* Summary Card */}
        <div className="bg-gradient-to-br from-primary via-primary to-accent rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm opacity-90">Total Investment</p>
            <FileCheck className="h-5 w-5 opacity-80" />
          </div>
          <p className="text-3xl font-bold font-display">${grandTotal.toLocaleString()}</p>
          <p className="text-sm opacity-75 mt-1">3 rugs • 242 sq ft total</p>
        </div>

        {/* Rug Estimates */}
        {demoEstimates.slice(0, 2).map((estimate, index) => (
          <div key={index} className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-base text-foreground">{estimate.rugNumber}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{estimate.rugType}</p>
                <p className="text-xs text-muted-foreground">{estimate.dimensions}</p>
              </div>
              <p className="font-bold text-lg text-foreground">${estimate.total.toLocaleString()}</p>
            </div>
            
            <div className="space-y-2.5">
              {estimate.services.slice(0, 4).map((service, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2.5">
                    {service.isRequired ? (
                      <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
                        <Lock className="h-3 w-3 text-primary" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      </div>
                    )}
                    <span className="text-sm text-foreground">{service.name}</span>
                    {service.isRequired && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">Required</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">${service.price.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Third rug teaser */}
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm opacity-60">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-foreground">{demoEstimates[2].rugNumber}</p>
              <p className="text-xs text-muted-foreground">{demoEstimates[2].rugType}</p>
            </div>
            <p className="font-bold text-foreground">${demoEstimates[2].total.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background to-transparent">
        <button className="w-full h-12 bg-primary text-primary-foreground rounded-xl text-base font-semibold flex items-center justify-center gap-2 shadow-lg">
          <CheckCircle className="h-5 w-5" />
          Approve Estimate
        </button>
      </div>
    </div>
  );
});

MockEstimate.displayName = 'MockEstimate';

export default MockEstimate;
