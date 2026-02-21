import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import rugboostLogo from '@/assets/rugboost-logo.svg';

const NewJobSkeleton: React.FC = () => (
  <div className="min-h-screen bg-background">
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-2.5 md:py-4">
        <div className="flex items-center gap-2 md:gap-3">
          <img src={rugboostLogo} alt="RugBoost" className="h-8 w-8 md:h-10 md:w-10" />
          <div>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-16 mt-1 hidden sm:block" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 md:w-36" />
      </div>
    </header>

    <main className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="h-9 w-48 mx-auto" />
          <Skeleton className="h-4 w-72 mx-auto" />
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-medium sm:p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-36" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-full mt-6" />
        </div>
      </div>
    </main>
  </div>
);

export default NewJobSkeleton;
