import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        navigate('/dashboard');
      } else {
        navigate('/auth');
      }
    }
  }, [user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="rounded-xl bg-gradient-to-br from-primary to-terracotta-light p-4 shadow-soft mx-auto w-fit">
          <Sparkles className="h-8 w-8 text-primary-foreground" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Loading RugInspect...</p>
      </div>
    </div>
  );
};

export default Index;
