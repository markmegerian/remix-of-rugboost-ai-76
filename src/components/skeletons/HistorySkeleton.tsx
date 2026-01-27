import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const HistorySkeleton: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Timeline group 1 */}
      <div className="relative">
        {/* Timeline label */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-border" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Jobs in this period */}
        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[25px] top-4 w-3 h-3 rounded-full bg-muted border-2 border-background" />
              
              <Card className="ml-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-5 w-16 rounded" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right space-y-1">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <Skeleton className="h-5 w-5" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline group 2 */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-border" />
          <Skeleton className="h-6 w-28 rounded-full" />
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
          {[1, 2].map((i) => (
            <div key={i} className="relative">
              <div className="absolute -left-[25px] top-4 w-3 h-3 rounded-full bg-muted border-2 border-background" />
              <Card className="ml-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-5 w-16 rounded" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-14" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right space-y-1">
                        <Skeleton className="h-5 w-14" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                      <Skeleton className="h-5 w-5" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HistorySkeleton;
