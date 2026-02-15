import { useState } from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AITrainingManager } from '@/components/admin/AITrainingManager';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const AdminAITraining = () => {
  const { isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="container max-w-6xl py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-display font-bold">AI Training</h1>
          </div>
          <p className="text-muted-foreground">
            Manage global corrections that improve rug analysis for all users.
          </p>
        </div>
        <AITrainingManager />
      </main>
    </div>
  );
};

export default AdminAITraining;
