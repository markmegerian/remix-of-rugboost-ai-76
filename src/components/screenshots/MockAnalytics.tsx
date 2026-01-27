import React, { forwardRef } from 'react';
import { demoAnalytics } from '@/data/demoData';
import { TrendingUp, DollarSign, Briefcase, Target, ArrowLeft, Calendar } from 'lucide-react';

const MockAnalytics = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="w-full h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-foreground">Analytics</h1>
            <p className="text-xs text-muted-foreground">Business Performance</p>
          </div>
          <button className="h-9 px-3 rounded-lg bg-muted flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">2024</span>
          </button>
        </div>
      </header>

      <div className="p-5 space-y-4 pb-20 overflow-auto">
        {/* Metric Cards - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Briefcase, label: 'Total Jobs', value: demoAnalytics.totalJobs.toString(), change: '+12%', color: 'primary' },
            { icon: DollarSign, label: 'Revenue', value: `$${(demoAnalytics.totalRevenue / 1000).toFixed(0)}K`, change: '+18%', color: 'green-500' },
            { icon: DollarSign, label: 'Avg Job', value: `$${demoAnalytics.avgJobValue}`, change: '+8%', color: 'accent' },
            { icon: Target, label: 'Completion', value: `${demoAnalytics.completionRate}%`, change: '+2%', color: 'amber-500' },
          ].map((metric, i) => {
            const Icon = metric.icon;
            return (
              <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg bg-${metric.color}/10 flex items-center justify-center`}
                    style={{ backgroundColor: metric.color === 'primary' ? 'hsl(var(--primary) / 0.1)' : 
                             metric.color === 'accent' ? 'hsl(var(--accent) / 0.1)' : 
                             metric.color === 'green-500' ? 'rgb(34 197 94 / 0.1)' : 'rgb(245 158 11 / 0.1)' }}>
                    <Icon className="h-4 w-4" style={{ 
                      color: metric.color === 'primary' ? 'hsl(var(--primary))' : 
                             metric.color === 'accent' ? 'hsl(var(--accent))' : 
                             metric.color === 'green-500' ? 'rgb(34 197 94)' : 'rgb(245 158 11)' }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{metric.value}</p>
                <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  {metric.change} this month
                </p>
              </div>
            );
          })}
        </div>

        {/* Revenue Chart */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h2 className="font-display text-base font-bold text-foreground mb-1">Monthly Revenue</h2>
          <p className="text-xs text-muted-foreground mb-4">Last 12 months performance</p>
          <div className="flex items-end justify-between h-32 gap-1.5 px-1">
            {demoAnalytics.monthlyData.map((month, i) => {
              const height = (month.revenue / 35000) * 100;
              const isHighlighted = i >= 5 && i <= 7;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className={`w-full rounded-t-md transition-all ${isHighlighted ? 'bg-gradient-to-t from-primary to-primary/70' : 'bg-gradient-to-t from-muted-foreground/30 to-muted-foreground/20'}`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground font-medium">{month.month.slice(0, 1)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jobs Chart */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h2 className="font-display text-base font-bold text-foreground mb-1">Jobs Completed</h2>
          <p className="text-xs text-muted-foreground mb-4">Monthly job volume</p>
          <div className="flex items-end justify-between h-24 gap-1.5 px-1">
            {demoAnalytics.monthlyData.map((month, i) => {
              const height = (month.jobs / 100) * 100;
              const isHighlighted = i >= 6 && i <= 8;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className={`w-full rounded-t-md transition-all ${isHighlighted ? 'bg-gradient-to-t from-accent to-accent/70' : 'bg-gradient-to-t from-muted-foreground/30 to-muted-foreground/20'}`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground font-medium">{month.month.slice(0, 1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

MockAnalytics.displayName = 'MockAnalytics';

export default MockAnalytics;
