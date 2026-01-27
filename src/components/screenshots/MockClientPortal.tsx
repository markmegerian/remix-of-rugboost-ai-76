import React, { forwardRef } from 'react';
import { demoEstimates } from '@/data/demoData';
import { CreditCard, CheckCircle, FileText, Shield, User } from 'lucide-react';

const MockClientPortal = forwardRef<HTMLDivElement>((_, ref) => {
  const selectedTotal = demoEstimates[0].total + demoEstimates[1].total;
  
  return (
    <div ref={ref} className="w-full h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">Your Rugs</h1>
            <p className="text-xs text-muted-foreground">Katherine Morrison</p>
          </div>
          <button className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="p-5 space-y-4 pb-48 overflow-auto">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 rounded-xl border border-primary/20 p-5">
          <h2 className="font-display text-base font-bold text-foreground mb-2">
            Welcome to Your Portal
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Review your rug inspection reports and select the services you'd like us to perform.
          </p>
        </div>

        {/* Service Selection Cards */}
        {demoEstimates.slice(0, 2).map((estimate, index) => (
          <div key={index} className="bg-card rounded-xl border-2 border-primary/30 p-5 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-base text-foreground">{estimate.rugNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{estimate.rugType}</p>
                  </div>
                  <button className="text-primary text-xs flex items-center gap-1 font-medium">
                    <FileText className="h-3.5 w-3.5" />
                    View Report
                  </button>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 ml-9">
              {estimate.services.slice(0, 3).map((service, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-muted-foreground">{service.name}</span>
                  <span className="text-sm font-medium text-foreground">${service.price.toFixed(0)}</span>
                </div>
              ))}
              {estimate.services.length > 3 && (
                <p className="text-xs text-primary font-medium pt-1">
                  +{estimate.services.length - 3} more services included
                </p>
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-border ml-9 flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Subtotal</span>
              <span className="text-lg font-bold text-foreground">${estimate.total.toLocaleString()}</span>
            </div>
          </div>
        ))}

        {/* Third rug - unselected */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm opacity-70">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-md border-2 border-muted-foreground/30 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-base text-foreground">{demoEstimates[2].rugNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{demoEstimates[2].rugType}</p>
                </div>
                <span className="text-sm text-muted-foreground">${demoEstimates[2].total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom payment section */}
      <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="font-display text-base font-bold text-foreground">Total Selected</span>
          <span className="text-2xl font-bold text-primary">${selectedTotal.toLocaleString()}</span>
        </div>
        
        <button className="w-full h-12 bg-primary text-primary-foreground rounded-xl text-base font-semibold flex items-center justify-center gap-2 shadow-lg">
          <CreditCard className="h-5 w-5" />
          Proceed to Payment
        </button>
        
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          Secure payment powered by Stripe
        </div>
      </div>
    </div>
  );
});

MockClientPortal.displayName = 'MockClientPortal';

export default MockClientPortal;
