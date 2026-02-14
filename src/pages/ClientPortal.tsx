import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, X, LogOut, History, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import rugboostLogo from '@/assets/rugboost-logo.svg';
import ExpertInspectionReport from '@/components/ExpertInspectionReport';
import { useInspectionPdf } from '@/hooks/useInspectionPdf';
import { useClientPortalData } from '@/hooks/useClientPortalData';
import { useClientPayment } from '@/hooks/useClientPayment';

const ClientPortal = () => {
  const { accessToken } = useParams<{ accessToken: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { generateAndDownload, isGenerating } = useInspectionPdf();

  const {
    loading,
    job,
    rugs,
    branding,
    hasAccess,
    clientJobAccessId,
  } = useClientPortalData({ accessToken, user, authLoading });

  const { proceedToPayment, isProcessing } = useClientPayment({
    job,
    rugs,
    clientJobAccessId,
    accessToken,
    user,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // ── Loading skeleton ────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
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
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full max-w-md" />
            </CardContent>
          </Card>

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

  // ── Access denied ───────────────────────────────────────
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

  // ── Main render ─────────────────────────────────────────
  const totalAmount = rugs.reduce((sum, rug) => sum + rug.total, 0);

  return (
    <div className="min-h-screen bg-background">
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
              onClick={() =>
                generateAndDownload({
                  type: 'inspection',
                  jobId: job.id,
                  jobNumber: job.job_number,
                  clientName: job.client_name,
                  rugs,
                  totalAmount,
                  createdAt: job.created_at,
                  branding,
                })
              }
              disabled={isGenerating}
              className="gap-1"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Download PDF</span>
            </Button>
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
            <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ExpertInspectionReport
          rugs={rugs}
          clientName={job.client_name}
          jobNumber={job.job_number}
          businessName={branding?.business_name || null}
          onApprove={proceedToPayment}
          isProcessing={isProcessing}
          totalAmount={totalAmount}
        />

        {branding && (
          <Card className="mt-6">
            <CardContent className="py-4">
              <p className="text-sm text-center text-muted-foreground">
                Questions? Contact us at{' '}
                {branding.business_email && (
                  <a
                    href={`mailto:${branding.business_email}`}
                    className="text-primary hover:underline"
                  >
                    {branding.business_email}
                  </a>
                )}
                {branding.business_phone && (
                  <>
                    {branding.business_email && ' or '}
                    <a
                      href={`tel:${branding.business_phone}`}
                      className="text-primary hover:underline"
                    >
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
