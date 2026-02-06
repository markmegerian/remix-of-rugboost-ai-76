import { Clock, FileText, Users, Zap, CheckCircle, TrendingUp } from 'lucide-react';

const problems = [
  {
    icon: Clock,
    title: 'Time-Consuming Inspections',
    description: 'Hours spent manually documenting rug conditions and calculating estimates.',
  },
  {
    icon: FileText,
    title: 'Inconsistent Pricing',
    description: 'No standardized process leads to pricing errors and lost revenue.',
  },
  {
    icon: Users,
    title: 'Client Communication Gaps',
    description: 'Difficulty keeping clients informed about job status and approvals.',
  },
];

const solutions = [
  {
    icon: Zap,
    title: 'Instant AI Analysis',
    description: 'Photograph rugs and get detailed condition reports in seconds.',
  },
  {
    icon: CheckCircle,
    title: 'Automated Estimates',
    description: 'AI recommends services and calculates accurate pricing automatically.',
  },
  {
    icon: TrendingUp,
    title: 'Digital Client Portal',
    description: 'Clients approve estimates and track jobs from their phone.',
  },
];

export default function LandingProblemSolution() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Stop Losing Time and Money
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Traditional rug inspection is slow, inconsistent, and frustrating. 
            RugBoost changes everything.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
          {/* Problems */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-8 bg-destructive rounded-full" />
              <span className="text-sm font-semibold text-destructive uppercase tracking-wide">The Old Way</span>
            </div>
            {problems.map((item, index) => (
              <div key={index} className="flex gap-4 p-4 rounded-xl bg-destructive/5 border border-destructive/10">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Solutions */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-1 w-8 bg-primary rounded-full" />
              <span className="text-sm font-semibold text-primary uppercase tracking-wide">The RugBoost Way</span>
            </div>
            {solutions.map((item, index) => (
              <div key={index} className="flex gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
