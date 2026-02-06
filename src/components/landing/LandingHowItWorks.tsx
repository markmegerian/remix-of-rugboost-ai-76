import { Camera, Sparkles, FileCheck, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: Camera,
    number: '01',
    title: 'Photograph',
    description: 'Use guided capture to photograph rugs consistently. Our app walks your team through each required angle.',
  },
  {
    icon: Sparkles,
    number: '02',
    title: 'Analyze',
    description: 'AI instantly identifies rug type, origin, and condition issues. Service recommendations are generated automatically.',
  },
  {
    icon: FileCheck,
    number: '03',
    title: 'Deliver',
    description: 'Send professional estimates to clients via portal. They approve, pay, and track their rugs online.',
  },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Three Steps to Transform Your Workflow
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From rug drop-off to client approval in minutes, not hours.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent z-0" />
              )}
              
              <div className="relative bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-medium transition-shadow">
                {/* Step number */}
                <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-xs font-bold text-white shadow-md">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg text-muted-foreground mb-4">
            Ready to modernize your rug business?
          </p>
          <a 
            href="/auth" 
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
          >
            Start your free trial
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
