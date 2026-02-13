import React from 'react';
import { User, Phone, Mail, Calendar, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface ClientLogisticsCardProps {
  job: {
    client_name: string;
    client_phone: string | null;
    client_email: string | null;
    created_at: string;
  };
  onEditClientInfo: () => void;
}

const ClientLogisticsCard: React.FC<ClientLogisticsCardProps> = ({ job, onEditClientInfo }) => {
  return (
    <Card>
      <CardHeader className="pb-2 md:pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base md:text-lg flex items-center gap-2 mb-0">
          <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          Client & Logistics
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onEditClientInfo}
        >
          <Edit2 className="h-4 w-4" />
          <span className="sr-only">Edit client info</span>
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Mobile: 2-column compact grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground">Client</p>
              <p className="text-sm font-medium truncate">{job.client_name}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground">Phone</p>
              {job.client_phone ? (
                <a href={`tel:${job.client_phone}`} className="text-sm font-medium text-primary truncate block">
                  {job.client_phone}
                </a>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">—</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground">Email</p>
              {job.client_email ? (
                <a href={`mailto:${job.client_email}`} className="text-sm font-medium text-primary truncate block">
                  {job.client_email}
                </a>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">—</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium">{format(new Date(job.created_at), 'MMM d')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientLogisticsCard;
