import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, BarChart3, Clock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/dashboard', label: 'Jobs', icon: Briefcase },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/history', label: 'History', icon: Clock },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

const HIDDEN_PREFIXES = ['/jobs/', '/job/', '/client', '/admin', '/auth'];

const BottomTabBar: React.FC = () => {
  const { pathname } = useLocation();

  const shouldHide =
    HIDDEN_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname === '/' ||
    pathname === '/auth';

  if (shouldHide) return null;

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 md:hidden',
        'bg-background/95 backdrop-blur-md border-t border-border',
        'pb-safe-bottom',
      )}
    >
      <div className="flex items-stretch justify-around">
        {tabs.map(({ path, label, icon: Icon }) => {
          const isActive = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[48px] pt-2 pb-1 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
