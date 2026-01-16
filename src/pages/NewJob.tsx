import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import JobForm from '@/components/JobForm';

const NewJob = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleCreateJob = async (formData: {
    jobNumber: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    notes: string;
  }) => {
    if (!user) {
      toast.error('Please sign in to create a job');
      navigate('/auth');
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          job_number: formData.jobNumber,
          client_name: formData.clientName,
          client_email: formData.clientEmail || null,
          client_phone: formData.clientPhone || null,
          notes: formData.notes || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Job created successfully!');
      navigate(`/jobs/${data.id}`);
    } catch (error) {
      console.error('Failed to create job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create job');
    } finally {
      setIsCreating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary to-terracotta-light p-2.5 shadow-soft">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">RugInspect</h1>
              <p className="text-xs text-muted-foreground">New Job</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="space-y-6 animate-fade-in">
            {/* Page Title */}
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold text-foreground">Create New Job</h2>
              <p className="mt-2 text-muted-foreground">
                Set up a job for a client, then add rugs for inspection
              </p>
            </div>

            {/* Form Card */}
            <div className="rounded-2xl bg-card p-6 shadow-medium sm:p-8">
              <JobForm onSubmit={handleCreateJob} isLoading={isCreating} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewJob;
