import React from 'react';
import { CheckCircle, Clock, PlayCircle, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="gap-1 border-success text-success">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      );
    case 'in-progress':
      return (
        <Badge variant="outline" className="gap-1 border-warning text-warning">
          <Clock className="h-3 w-3" />
          In Progress
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1 border-primary text-primary">
          <PlayCircle className="h-3 w-3" />
          Active
        </Badge>
      );
  }
};

export const getPaymentBadge = (paymentStatus: string | null, totalAmount: number) => {
  if (!totalAmount || totalAmount === 0) {
    return null;
  }

  if (paymentStatus === 'paid') {
    return (
      <Badge variant="outline" className="gap-1 border-success text-success">
        <CheckCircle className="h-3 w-3" />
        Paid
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 border-warning text-warning">
      <DollarSign className="h-3 w-3" />
      Pending
    </Badge>
  );
};
