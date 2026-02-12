import React from 'react';
import { CheckCircle, Clock, PlayCircle, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return (
        <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      );
    case 'in-progress':
      return (
        <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
          <Clock className="h-3 w-3" />
          In Progress
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600">
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
      <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
        <CheckCircle className="h-3 w-3" />
        Paid
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
      <DollarSign className="h-3 w-3" />
      Pending
    </Badge>
  );
};
