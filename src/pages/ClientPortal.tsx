import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Loader2, X, LogOut, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import rugboostLogo from '@/assets/rugboost-logo.svg';
import ExpertInspectionReport from '@/components/ExpertInspectionReport';
import { categorizeService } from '@/lib/serviceCategories';

interface ServiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priority: 'high' | 'medium' | 'low';
}

interface RugData {
  id: string;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  photo_urls: string[] | null;
  analysis_report: string | null;
  estimate_id: string;
  services: ServiceItem[];
  total: number;
}

interface JobData {
  id: string;
  job_number: string;
  client_name: string;
  status: string;
}

interface BusinessBranding {
  business_name: string | null;
  business_phone: string | null;
  business_email: string | null;
}

const ClientPortal = () => {
  const { accessToken } = useParams<{ accessToken: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobData | null>(null);
  const [rugs, setRugs] = useState<RugData[]>([]);
  const [branding, setBranding] = useState<BusinessBranding | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [clientJobAccessId, setClientJobAccessId] = useState<string | null>(null);
  const [staffUserId, setStaffUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Redirect to client auth with the token
        navigate(`/client/auth?token=${accessToken}`);
      } else {
        // Check if user needs to set up their password
        if (user.user_metadata?.needs_password_setup) {
          // Fetch branding first for the password setup page
          fetchBrandingForPasswordSetup();
        } else {
          checkAccessAndLoadData();
        }
      }
    }
  }, [user, authLoading, accessToken]);

  const fetchBrandingForPasswordSetup = async () => {
    try {
      // Use secure RPC function to validate token and get staff user
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('validate_access_token', { _token: accessToken })
        .single();

      let businessName = 'Rug Cleaning';
      
      if (!tokenError && tokenData?.staff_user_id) {
        const { data: brandingData } = await supabase
          .from('profiles')
          .select('business_name')
          .eq('user_id', tokenData.staff_user_id)
          .single();
        
        if (brandingData?.business_name) {
          businessName = brandingData.business_name;
        }
      }
      
      // Redirect to password setup
      navigate(`/client/set-password?token=${accessToken}&business=${encodeURIComponent(businessName)}`);
    } catch (error) {
      console.error('Error fetching branding:', error);
      navigate(`/client/set-password?token=${accessToken}`);
    }
  };

  const checkAccessAndLoadData = async () => {
    if (!accessToken || !user) return;

    setLoading(true);
    try {
      // Use secure RPC function to validate token
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('validate_access_token', { _token: accessToken })
        .single();

      if (tokenError || !tokenData) {
        toast.error('Invalid or expired access link');
        navigate('/');
        return;
      }

      // Build access data structure from RPC result
      const accessData = {
        id: tokenData.access_id as string,
        job_id: tokenData.job_id as string,
        client_id: tokenData.client_id as string | null,
        jobs: {
          id: tokenData.job_id as string,
          job_number: tokenData.job_number as string,
          client_name: tokenData.client_name as string,
          status: tokenData.job_status as string,
          user_id: tokenData.staff_user_id as string
        }
      };
      

      // Check if user's client account is linked
      const { data: clientAccount } = await supabase
        .from('client_accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!clientAccount) {
        // Create client account and link
        const { data: newClient, error: createError } = await supabase
          .from('client_accounts')
          .insert({
            user_id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
          })
          .select('id')
          .single();

        if (createError) throw createError;

        // Link to job access
        await supabase
          .from('client_job_access')
          .update({ client_id: newClient.id })
          .eq('id', accessData.id);

        // Add client role
        await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: 'client' })
          .select();
      } else if (!accessData.client_id) {
        // Link existing client to this job access
        await supabase
          .from('client_job_access')
          .update({ client_id: clientAccount.id })
          .eq('id', accessData.id);
      }

      // Track first access
      const { error: trackingError } = await supabase.rpc('update_client_access_tracking', {
        _access_token: accessToken,
        _first_accessed: true,
        _password_set: false,
      });
      if (trackingError) {
        console.error('Error updating access tracking:', trackingError);
      }

      setHasAccess(true);
      setClientJobAccessId(accessData.id);
      setStaffUserId((accessData.jobs as any).user_id);

      const jobData = accessData.jobs as unknown as JobData;
      setJob(jobData);

      // Fetch branding
      const { data: brandingData } = await supabase
        .from('profiles')
        .select('business_name, business_phone, business_email')
        .eq('user_id', (accessData.jobs as any).user_id)
        .single();

      if (brandingData) {
        setBranding(brandingData);
      }

      // Fetch rugs for this job
      const { data: rugsData, error: rugsError } = await supabase
        .from('inspections')
        .select(`
          id,
          rug_number,
          rug_type,
          length,
          width,
          photo_urls,
          analysis_report
        `)
        .eq('job_id', jobData.id);

      if (rugsError) throw rugsError;

      // Fetch approved estimates separately (RLS uses job_id directly)
      const { data: estimatesData, error: estimatesError } = await supabase
        .from('approved_estimates')
        .select('id, inspection_id, services, total_amount')
        .eq('job_id', jobData.id);

      if (estimatesError) throw estimatesError;

      // Create a map of inspection_id -> estimate for quick lookup
      const estimateMap = new Map<string, { id: string; services: unknown; total_amount: number }>();
      (estimatesData || []).forEach(est => {
        estimateMap.set(est.inspection_id, est);
      });

      const processedRugs: RugData[] = (rugsData || [])
        .filter(r => estimateMap.has(r.id))
        .map(r => {
          const estimate = estimateMap.get(r.id)!;
          return {
            id: r.id,
            rug_number: r.rug_number,
            rug_type: r.rug_type,
            length: r.length,
            width: r.width,
            photo_urls: r.photo_urls,
            analysis_report: r.analysis_report,
            estimate_id: estimate.id,
            services: Array.isArray(estimate.services) ? estimate.services as ServiceItem[] : [],
            total: estimate.total_amount,
          };
        });

      setRugs(processedRugs);
    } catch (error) {
      console.error('Error loading portal data:', error);
      toast.error('Failed to load portal data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total - all services are included (expert decides, not client)
  const calculateTotal = () => {
    return rugs.reduce((sum, rug) => sum + rug.total, 0);
  };

  const handleProceedToPayment = async (declinedServiceIds: Set<string> = new Set()) => {
    setIsProcessingPayment(true);
    try {
      // Filter services - exclude declined ones
      const servicesForCheckout: { 
        rugNumber: string; 
        rugId: string;
        estimateId: string;
        services: ServiceItem[] 
      }[] = [];
      
      rugs.forEach(rug => {
        // Filter out declined services (required services can never be declined)
        const filteredServices = rug.services.filter(service => 
          !declinedServiceIds.has(service.id)
        );
        
        if (filteredServices.length > 0) {
          servicesForCheckout.push({
            rugNumber: rug.rug_number,
            rugId: rug.id,
            estimateId: rug.estimate_id,
            services: filteredServices,
          });
        }
      });

      // Calculate total based on filtered services
      const total = servicesForCheckout.reduce((sum, rug) => 
        sum + rug.services.reduce((s, svc) => s + svc.quantity * svc.unitPrice, 0), 0
      );

      // Save client service selections to database before checkout
      for (const rugSelection of servicesForCheckout) {
        const selectionTotal = rugSelection.services.reduce(
          (sum, s) => sum + (s.quantity * s.unitPrice), 0
        );
        
        // First try to find existing selection
        const { data: existingSelection } = await supabase
          .from('client_service_selections')
          .select('id')
          .eq('client_job_access_id', clientJobAccessId!)
          .eq('approved_estimate_id', rugSelection.estimateId)
          .maybeSingle();
        
        if (existingSelection) {
          // Update existing
          await supabase
            .from('client_service_selections')
            .update({
              selected_services: rugSelection.services as unknown as any,
              total_selected: selectionTotal,
            })
            .eq('id', existingSelection.id);
        } else {
          // Insert new
          await supabase
            .from('client_service_selections')
            .insert({
              client_job_access_id: clientJobAccessId!,
              approved_estimate_id: rugSelection.estimateId,
              selected_services: rugSelection.services as unknown as any,
              total_selected: selectionTotal,
            });
        }
      }

      // Call edge function to create Stripe checkout session
      // Build mobile-safe URLs (full page navigation, not popups)
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/client/payment-success?session_id={CHECKOUT_SESSION_ID}&token=${accessToken}`;
      const cancelUrl = `${baseUrl}/client/payment-cancelled?token=${accessToken}&job=${job?.id}`;
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          jobId: job?.id,
          clientJobAccessId,
          selectedServices: servicesForCheckout,
          totalAmount: total,
          customerEmail: user?.email,
          successUrl,
          cancelUrl,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        // Try to redirect - use window.open as fallback for iframe environments
        try {
          // First try direct navigation
          window.location.href = data.checkoutUrl;
          
          // If we're still here after a short delay, the redirect may have been blocked
          setTimeout(() => {
            // Open in new tab as fallback
            const newWindow = window.open(data.checkoutUrl, '_blank');
            if (!newWindow) {
              // Popup blocked - show manual link
              toast.info(
                'Click to complete payment',
                {
                  duration: 30000,
                  action: {
                    label: 'Open Payment',
                    onClick: () => window.open(data.checkoutUrl, '_blank'),
                  },
                }
              );
              setIsProcessingPayment(false);
            }
          }, 1500);
        } catch (redirectError) {
          console.error('Redirect failed:', redirectError);
          window.open(data.checkoutUrl, '_blank');
          setIsProcessingPayment(false);
        }
        return; // Don't hit finally block immediately
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment. Please try again.');
      setIsProcessingPayment(false);
    } finally {
      // Only reset if still processing (means we never left the page)
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Skeleton Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-5 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {/* Welcome Card Skeleton */}
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full max-w-md" />
            </CardContent>
          </Card>

          {/* Main Content Skeleton */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <Skeleton className="h-5 w-24 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-5 w-16" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="flex items-center justify-between p-3 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-5 w-5" />
                            <div>
                              <Skeleton className="h-4 w-32 mb-1" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                          <Skeleton className="h-5 w-16" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary Skeleton */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!hasAccess || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <X className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to view this estimate.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAmount = calculateTotal();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={rugboostLogo} alt="RugBoost" className="h-10 w-10" />
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">
                Job #{job.job_number}
              </h1>
              <p className="text-xs text-muted-foreground">
                {branding?.business_name || 'Rug Cleaning'} – Estimate Review
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/client/dashboard')}
              className="gap-1 hidden sm:flex"
            >
              <History className="h-4 w-4" />
              My Jobs
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Expert Inspection Report */}
        <ExpertInspectionReport
          rugs={rugs}
          clientName={job.client_name}
          jobNumber={job.job_number}
          businessName={branding?.business_name || null}
          onApprove={handleProceedToPayment}
          isProcessing={isProcessingPayment}
          totalAmount={totalAmount}
        />

        {/* Contact Info */}
        {branding && (
          <Card className="mt-6">
            <CardContent className="py-4">
              <p className="text-sm text-center text-muted-foreground">
                Questions? Contact us at{' '}
                {branding.business_email && (
                  <a href={`mailto:${branding.business_email}`} className="text-primary hover:underline">
                    {branding.business_email}
                  </a>
                )}
                {branding.business_phone && (
                  <>
                    {branding.business_email && ' or '}
                    <a href={`tel:${branding.business_phone}`} className="text-primary hover:underline">
                      {branding.business_phone}
                    </a>
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ClientPortal;
