import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { useNextJobNumber } from '@/hooks/useNextJobNumber';
import ClientSearch from './ClientSearch';

interface QuickCreateJobSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QuickCreateJobSheet: React.FC<QuickCreateJobSheetProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { nextJobNumber } = useNextJobNumber();
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleClientSelect = (client: { client_name: string; client_email: string | null; client_phone: string | null }) => {
    setClientName(client.client_name);
    setClientEmail(client.client_email || '');
    setClientPhone(client.client_phone || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !clientName.trim()) {
      toast.error('Client name is required');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          company_id: companyId || null,
          job_number: nextJobNumber,
          client_name: clientName.trim(),
          client_email: clientEmail.trim() || null,
          client_phone: clientPhone.trim() || null,
          notes: null,
          status: 'intake_scheduled',
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success('Job created!');
      onOpenChange(false);
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      navigate(`/jobs/${data.id}`);
    } catch (error) {
      console.error('Quick create error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create job');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setClientName('');
      setClientEmail('');
      setClientPhone('');
    }
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Quick Create Job</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Search Existing Client</Label>
            <ClientSearch onSelectClient={handleClientSelect} initialValue={clientName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-clientName">Client Name *</Label>
            <Input
              id="quick-clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="John Smith"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-clientEmail">Email</Label>
            <Input
              id="quick-clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-clientPhone">Phone</Label>
            <Input
              id="quick-clientPhone"
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Job #{nextJobNumber} will be created. Add rugs and details on the next page.
          </p>
          <Button type="submit" className="w-full" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Job'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default QuickCreateJobSheet;
