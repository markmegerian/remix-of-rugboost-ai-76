import React, { memo } from 'react';
import { Briefcase, CheckCircle, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardsProps {
  totalJobs: number;
  completedJobs: number;
  pendingPayments: number;
  collectedRevenue: number;
}

// Memoized individual stat card
const StatCard = memo(({ 
  icon: Icon, 
  value, 
  label, 
  iconColor, 
  bgColor 
}: { 
  icon: React.ElementType;
  value: string | number;
  label: string;
  iconColor: string;
  bgColor: string;
}) => (
  <Card className="bg-card">
    <CardContent className="pt-4 pb-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </CardContent>
  </Card>
));
StatCard.displayName = 'StatCard';

const StatsCards = memo(({ 
  totalJobs, 
  completedJobs, 
  pendingPayments, 
  collectedRevenue 
}: StatsCardsProps) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <StatCard
      icon={Briefcase}
      value={totalJobs}
      label="Total Jobs"
      iconColor="text-primary"
      bgColor="bg-primary/10"
    />
    <StatCard
      icon={CheckCircle}
      value={completedJobs}
      label="Completed"
      iconColor="text-green-600"
      bgColor="bg-green-500/10"
    />
    <StatCard
      icon={DollarSign}
      value={pendingPayments}
      label="Pending Payment"
      iconColor="text-yellow-600"
      bgColor="bg-yellow-500/10"
    />
    <StatCard
      icon={TrendingUp}
      value={`$${collectedRevenue.toFixed(0)}`}
      label="Collected"
      iconColor="text-blue-600"
      bgColor="bg-blue-500/10"
    />
  </div>
));

StatsCards.displayName = 'StatsCards';

export default StatsCards;
