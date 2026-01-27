import React, { forwardRef } from 'react';
import { demoJobs } from '@/data/demoData';
import { PlayCircle, Clock, CheckCircle, Plus, Search, Bell, Settings } from 'lucide-react';

const statusConfig = {
  active: { icon: PlayCircle, color: 'bg-blue-500', textColor: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  'in-progress': { icon: Clock, color: 'bg-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  completed: { icon: CheckCircle, color: 'bg-green-500', textColor: 'text-green-600', bgColor: 'bg-green-500/10' },
};

const MockDashboard = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="w-full h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">RugBoost</h1>
              <p className="text-xs text-muted-foreground">Job Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              New Job
            </button>
            <button className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
              <Bell className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
              <Settings className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Search Card */}
      <div className="px-5 py-4">
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <div className="w-full h-10 pl-10 pr-4 bg-muted/50 border border-input rounded-lg flex items-center">
                <span className="text-sm text-muted-foreground">Search jobs...</span>
              </div>
            </div>
            <div className="h-10 px-4 bg-muted/50 border border-input rounded-lg flex items-center">
              <span className="text-sm text-muted-foreground">All Status</span>
            </div>
          </div>
        </div>
      </div>

      {/* Job Cards */}
      <div className="px-5 space-y-3 pb-20">
        {demoJobs.slice(0, 5).map((job) => {
          const status = statusConfig[job.status];
          const StatusIcon = status.icon;
          
          return (
            <div 
              key={job.id}
              className="bg-card rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-base text-foreground">{job.client_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{job.job_number}</p>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.textColor} ${status.bgColor}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {job.status === 'in-progress' ? 'In Progress' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{job.rug_count}</span> rug{job.rug_count !== 1 ? 's' : ''}
                  </span>
                  {job.notes && (
                    <span className="text-primary/80 truncate max-w-[160px]">{job.notes}</span>
                  )}
                </div>
                <span className="text-muted-foreground">Today</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

MockDashboard.displayName = 'MockDashboard';

export default MockDashboard;
