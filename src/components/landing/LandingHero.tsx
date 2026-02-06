import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import DeviceFrame from '@/components/screenshots/DeviceFrame';
import MockDashboard from '@/components/screenshots/MockDashboard';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';
import GradientMeshBackground from './GradientMeshBackground';

export default function LandingHero() {
  const { ref: textRef, isVisible: textVisible } = useScrollAnimation({ threshold: 0.2 });
  const { ref: mockupRef, isVisible: mockupVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section className="pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden relative">
      {/* Gradient mesh background */}
      <GradientMeshBackground />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <div 
            ref={textRef}
            className={cn(
              "text-center lg:text-left transition-all duration-700 ease-out",
              textVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              AI-Powered Rug Inspection
            </div>
            
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Transform Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Rug Business
              </span>{' '}
              with AI
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Automate inspections, generate professional estimates in seconds, and delight clients 
              with a seamless digital experience. Built for modern rug cleaning professionals.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="xl" variant="warm" asChild>
                <Link to="/auth" className="gap-2">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" className="gap-2">
                <Play className="h-5 w-5" />
                Watch Demo
              </Button>
            </div>
            
            <p className="mt-6 text-sm text-muted-foreground">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>

          {/* Device Mockup */}
          <div 
            ref={mockupRef}
            className={cn(
              "relative flex justify-center lg:justify-end transition-all duration-700 ease-out delay-200",
              mockupVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl scale-150 opacity-50" />
              
              <DeviceFrame device="iphone-15-pro" scale={0.6}>
                <MockDashboard />
              </DeviceFrame>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
