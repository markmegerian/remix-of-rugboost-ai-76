import { lazy, Suspense } from 'react';
import DeviceFrame from '@/components/screenshots/DeviceFrame';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';

// Lazy load mock components
const MockDashboard = lazy(() => import('@/components/screenshots/MockDashboard'));
const MockAnalysisReport = lazy(() => import('@/components/screenshots/MockAnalysisReport'));
const MockPhotoCapture = lazy(() => import('@/components/screenshots/MockPhotoCapture'));
const MockEstimate = lazy(() => import('@/components/screenshots/MockEstimate'));
const MockClientPortal = lazy(() => import('@/components/screenshots/MockClientPortal'));
const MockAnalytics = lazy(() => import('@/components/screenshots/MockAnalytics'));

const MockLoader = () => (
  <div className="w-full h-full bg-muted animate-pulse rounded-lg" />
);

const features = [
  {
    id: 'dashboard',
    title: 'Manage Jobs Effortlessly',
    description: 'Track every job from intake to delivery in one unified dashboard. See status at a glance, search clients, and never lose track of a rug again.',
    highlights: ['Real-time status updates', 'Client search & filters', 'Batch operations'],
    MockComponent: MockDashboard,
  },
  {
    id: 'analysis',
    title: 'AI-Powered Inspections',
    description: 'Our AI analyzes rug photos to identify type, origin, condition issues, and recommended services. What took 30 minutes now takes 30 seconds.',
    highlights: ['Rug type identification', 'Condition detection', 'Service recommendations'],
    MockComponent: MockAnalysisReport,
  },
  {
    id: 'photo',
    title: 'Guided Photo Capture',
    description: 'Step-by-step guidance ensures your team captures the right angles every time. Consistent documentation across all jobs.',
    highlights: ['Built-in photo guide', 'Issue annotation', 'Cloud storage'],
    MockComponent: MockPhotoCapture,
  },
  {
    id: 'estimate',
    title: 'Professional Estimates',
    description: 'Generate detailed, itemized estimates automatically based on AI analysis. Adjust pricing, add services, and approve with one tap.',
    highlights: ['Itemized pricing', 'Required vs optional services', 'One-tap approval'],
    MockComponent: MockEstimate,
  },
  {
    id: 'portal',
    title: 'Seamless Client Experience',
    description: 'Clients receive a personalized portal to view inspections, approve estimates, make payments, and track their rugs.',
    highlights: ['Estimate approval', 'Online payments', 'Job tracking'],
    MockComponent: MockClientPortal,
  },
  {
    id: 'analytics',
    title: 'Business Insights',
    description: 'Understand your business with real-time analytics. Track revenue, conversion rates, popular services, and team performance.',
    highlights: ['Revenue tracking', 'Conversion funnels', 'Service popularity'],
    MockComponent: MockAnalytics,
  },
];

function FeatureRow({ feature, index }: { feature: typeof features[0]; index: number }) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.15 });
  const isEven = index % 2 === 0;

  return (
    <div
      ref={ref}
      className={cn(
        "grid lg:grid-cols-2 gap-12 lg:gap-16 items-center transition-all duration-700 ease-out",
        isVisible 
          ? "opacity-100 translate-x-0" 
          : isEven 
            ? "opacity-0 -translate-x-8" 
            : "opacity-0 translate-x-8"
      )}
    >
      {/* Text Content */}
      <div className={cn(index % 2 === 1 ? 'lg:order-2' : '')}>
        <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">
          {feature.title}
        </h3>
        <p className="text-lg text-muted-foreground mb-6">
          {feature.description}
        </p>
        <ul className="space-y-3">
          {feature.highlights.map((highlight, i) => (
            <li 
              key={i} 
              className="flex items-center gap-3 transition-all duration-500"
              style={{ 
                transitionDelay: isVisible ? `${i * 100 + 200}ms` : '0ms',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(-10px)'
              }}
            >
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-foreground">{highlight}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Device Mockup */}
      <div className={cn(
        "flex justify-center transition-all duration-700 delay-100",
        index % 2 === 1 ? 'lg:order-1 lg:justify-start' : 'lg:justify-end',
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}>
        <div className="relative">
          {/* Subtle glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 blur-2xl scale-125 opacity-40" />
          
          <DeviceFrame device="iphone-15-pro" scale={0.55}>
            <Suspense fallback={<MockLoader />}>
              <feature.MockComponent />
            </Suspense>
          </DeviceFrame>
        </div>
      </div>
    </div>
  );
}

export default function LandingFeatures() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();

  return (
    <section id="features" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          ref={headerRef}
          className={cn(
            "text-center mb-16 transition-all duration-700 ease-out",
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Run a Modern Rug Business
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From inspection to payment, RugBoost handles every step of your workflow.
          </p>
        </div>

        <div className="space-y-24 md:space-y-32">
          {features.map((feature, index) => (
            <FeatureRow key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
