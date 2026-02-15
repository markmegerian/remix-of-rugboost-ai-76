/**
 * Auth callback page for handling email confirmation and OAuth redirects.
 * This page processes authentication tokens from deep links and redirects.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL params
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (error) {
          console.error('[AuthCallback] Error in URL:', error, errorDescription);
          setStatus('error');
          setMessage(errorDescription || 'Authentication failed');
          setTimeout(() => navigate('/auth', { replace: true }), 3000);
          return;
        }

        // Get the current session - Supabase client handles the token exchange
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          setStatus('error');
          setMessage(sessionError.message);
          setTimeout(() => navigate('/auth', { replace: true }), 3000);
          return;
        }

        if (session) {
          console.debug('[AuthCallback] Session found, redirecting to dashboard');
          setStatus('success');
          setMessage('Email verified! Redirecting...');
          setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
        } else {
          // No session yet - might be waiting for token exchange
          // Listen for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.debug('[AuthCallback] Auth event:', event);
            if (event === 'SIGNED_IN' && session) {
              setStatus('success');
              setMessage('Email verified! Redirecting...');
              setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
              subscription.unsubscribe();
            }
          });

          // Timeout fallback
          setTimeout(() => {
            subscription.unsubscribe();
            // Check one more time
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                navigate('/dashboard', { replace: true });
              } else {
                setStatus('error');
                setMessage('Verification timed out. Please try again.');
                setTimeout(() => navigate('/auth', { replace: true }), 3000);
              }
            });
          }, 10000);
        }
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
        setTimeout(() => navigate('/auth', { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen-safe flex items-center justify-center bg-background safe-y">
      <div className="text-center space-y-4 p-6">
        {status === 'processing' && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
        )}
        {status === 'success' && (
          <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center mx-auto">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {status === 'error' && (
          <div className="h-12 w-12 rounded-full bg-destructive flex items-center justify-center mx-auto">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        <p className="text-lg text-foreground">{message}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
