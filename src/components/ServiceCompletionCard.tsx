import React, { useState } from 'react';
import { CheckCircle, Circle, Clock, Package, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ServiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priority?: 'high' | 'medium' | 'low';
}

interface ServiceCompletion {
  service_id: string;
  completed_at: string;
}

interface RugWorkOrder {
  rugId: string;
  rugNumber: string;
  rugType: string;
  dimensions: string;
  estimateId: string;
  services: ServiceItem[];
  total: number;
}

interface ServiceCompletionCardProps {
  rugs: RugWorkOrder[];
  completions: ServiceCompletion[];
  clientApprovedAt: string | null;
  isPaid: boolean;
  onCompletionChange: () => void;
}

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
};

const ServiceCompletionCard: React.FC<ServiceCompletionCardProps> = ({
  rugs,
  completions,
  clientApprovedAt,
  isPaid,
  onCompletionChange,
}) => {
  const [loading, setLoading] = useState<string | null>(null);

  // Calculate total progress
  const totalServices = rugs.reduce((sum, rug) => sum + rug.services.length, 0);
  const completedServices = completions.length;
  const progressPercent = totalServices > 0 ? Math.round((completedServices / totalServices) * 100) : 0;

  const isServiceCompleted = (serviceId: string) => {
    return completions.some(c => c.service_id === serviceId);
  };

  const getCompletionDate = (serviceId: string) => {
    const completion = completions.find(c => c.service_id === serviceId);
    return completion ? completion.completed_at : null;
  };

  const handleToggleService = async (estimateId: string, serviceId: string, isCompleted: boolean) => {
    if (!isPaid) {
      toast.error('Cannot mark services complete until payment is received');
      return;
    }

    setLoading(serviceId);
    try {
      if (isCompleted) {
        // Remove completion
        const { error } = await supabase
          .from('service_completions')
          .delete()
          .eq('approved_estimate_id', estimateId)
          .eq('service_id', serviceId);

        if (error) throw error;
        toast.success('Service marked as incomplete');
      } else {
        // Add completion
        const { error } = await supabase
          .from('service_completions')
          .insert({
            approved_estimate_id: estimateId,
            service_id: serviceId,
          });

        if (error) throw error;
        toast.success('Service marked as complete');
      }
      
      onCompletionChange();
    } catch (error) {
      console.error('Error updating service completion:', error);
      toast.error('Failed to update service status');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Work Order
          </CardTitle>
          <Badge 
            variant={isPaid ? "default" : "secondary"}
            className={isPaid ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isPaid ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Paid & Ready
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Awaiting Payment
              </>
            )}
          </Badge>
        </div>
        {clientApprovedAt && (
          <p className="text-xs text-muted-foreground">
            Client approved on {format(new Date(clientApprovedAt), 'MMM d, yyyy \'at\' h:mm a')}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Completion Progress</span>
            <span className={progressPercent === 100 ? 'text-green-600 font-bold' : 'text-muted-foreground'}>
              {completedServices}/{totalServices} services ({progressPercent}%)
            </span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          {progressPercent === 100 && (
            <p className="text-sm text-green-600 font-medium flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              All services completed! Ready for pickup/delivery.
            </p>
          )}
        </div>

        <Separator />

        {/* Service Checklist by Rug */}
        <div className="space-y-4">
          {rugs.map((rug) => (
            <div key={rug.rugId} className="bg-background rounded-lg p-3 border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{rug.rugNumber}</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    {rug.rugType} • {rug.dimensions}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {rug.services.filter(s => isServiceCompleted(s.id)).length}/{rug.services.length}
                </span>
              </div>
              
              <div className="space-y-2">
                {rug.services.map((service) => {
                  const completed = isServiceCompleted(service.id);
                  const completionDate = getCompletionDate(service.id);
                  const isLoading = loading === service.id;

                  return (
                    <div 
                      key={service.id}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                        completed ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : (
                            <Checkbox
                              checked={completed}
                              onCheckedChange={() => handleToggleService(rug.estimateId, service.id, completed)}
                              disabled={!isPaid || isLoading}
                              className="h-5 w-5"
                            />
                          )}
                        </div>
                        <div>
                          <span className={`text-sm ${completed ? 'line-through text-muted-foreground' : ''}`}>
                            {service.name}
                          </span>
                          {completionDate && (
                            <p className="text-xs text-green-600">
                              Completed {format(new Date(completionDate), 'MMM d, h:mm a')}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={service.priority ? PRIORITY_COLORS[service.priority] : ''}
                      >
                        ${(service.quantity * service.unitPrice).toFixed(2)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceCompletionCard;
