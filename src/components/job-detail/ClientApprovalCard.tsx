import React from 'react';
import { Loader2, Link, CreditCard, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientPortalStatus from '@/components/ClientPortalStatus';
import StatusGatedButton from '@/components/StatusGatedButton';
import PaymentTracking from '@/components/PaymentTracking';
import ServiceCompletionCard from '@/components/ServiceCompletionCard';
import type { BusinessBranding } from '@/lib/pdfGenerator';

interface ActionState {
  enabled: boolean;
  reason?: string;
}

interface Rug {
  id: string;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  analysis_report: string | null;
}

interface ApprovedEstimate {
  id: string;
  inspection_id: string;
  services: any[];
  total_amount: number;
}

interface Payment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  metadata: any;
}

interface ServiceCompletion {
  service_id: string;
  completed_at: string;
}

interface ClientPortalStatusData {
  accessToken: string;
  emailSentAt: string | null;
  emailError: string | null;
  firstAccessedAt: string | null;
  passwordSetAt: string | null;
  hasClientAccount: boolean;
  hasServiceSelections: boolean;
  serviceSelectionsAt: string | null;
}

interface ClientApprovalCardProps {
  job: {
    job_number: string;
    client_name: string;
    client_approved_at?: string | null;
  };
  rugs: Rug[];
  approvedEstimates: ApprovedEstimate[];
  payments: Payment[];
  serviceCompletions: ServiceCompletion[];
  clientPortalLink: string | null;
  clientPortalStatus: ClientPortalStatusData | null;
  branding: BusinessBranding | null;
  actions: {
    sendToClient: ActionState;
  };
  generatingPortalLink: boolean;
  resendingInvite: boolean;
  onGeneratePortalLink: () => void;
  onResendInvite: () => void;
  onServiceCompletionChange: () => void;
}

const ClientApprovalCard: React.FC<ClientApprovalCardProps> = ({
  job,
  rugs,
  approvedEstimates,
  payments,
  serviceCompletions,
  clientPortalLink,
  clientPortalStatus,
  branding,
  actions,
  generatingPortalLink,
  resendingInvite,
  onGeneratePortalLink,
  onResendInvite,
  onServiceCompletionChange,
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Client Approval & Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Portal Link Status */}
        {clientPortalLink && clientPortalStatus ? (
          <ClientPortalStatus
            portalLink={clientPortalLink}
            emailSentAt={clientPortalStatus.emailSentAt}
            emailError={clientPortalStatus.emailError}
            firstAccessedAt={clientPortalStatus.firstAccessedAt}
            passwordSetAt={clientPortalStatus.passwordSetAt}
            hasClientAccount={clientPortalStatus.hasClientAccount}
            hasServiceSelections={clientPortalStatus.hasServiceSelections}
            serviceSelectionsAt={clientPortalStatus.serviceSelectionsAt}
            onResendInvite={onResendInvite}
            isResending={resendingInvite}
          />
        ) : approvedEstimates.length > 0 ? (
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium">Ready to send Expert Inspection Report</p>
                <p className="text-sm text-muted-foreground">
                  Client will receive the expert assessment for approval and payment
                </p>
              </div>
            </div>
            <StatusGatedButton 
              actionState={actions.sendToClient}
              variant="default"
              onClick={onGeneratePortalLink}
              disabled={generatingPortalLink || approvedEstimates.length < rugs.filter(r => r.analysis_report).length}
              className="gap-2"
            >
              {generatingPortalLink ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4" />
                  Send to Client
                </>
              )}
            </StatusGatedButton>
          </div>
        ) : rugs.some(r => r.analysis_report) ? (
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium">Confirm expert assessment first</p>
              <p className="text-sm text-muted-foreground">
                Review and confirm the expert assessment for each rug before sending to client
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">No rugs analyzed yet</p>
              <p className="text-sm text-muted-foreground">
                Add rugs and run AI analysis to generate estimates
              </p>
            </div>
          </div>
        )}

        {/* Payment Tracking */}
        {payments.length > 0 && (
          <div className="pt-4 border-t">
            <PaymentTracking
              payments={payments}
              jobNumber={job.job_number}
              clientName={job.client_name}
              branding={branding}
              rugs={approvedEstimates.map(ae => {
                const rug = rugs.find(r => r.id === ae.inspection_id);
                return {
                  rugNumber: rug?.rug_number || 'Unknown',
                  rugType: rug?.rug_type || 'Unknown',
                  dimensions: rug?.length && rug?.width ? `${rug.length}' × ${rug.width}'` : 'N/A',
                  services: ae.services,
                  total: ae.total_amount,
                };
              })}
            />
          </div>
        )}
        
        {/* Service Completion - Only show when paid */}
        {payments.some(p => p.status === 'completed') && approvedEstimates.length > 0 && (
          <div className="pt-4 border-t">
            <ServiceCompletionCard
              rugs={approvedEstimates.map(ae => {
                const rug = rugs.find(r => r.id === ae.inspection_id);
                return {
                  rugId: ae.inspection_id,
                  rugNumber: rug?.rug_number || 'Unknown',
                  rugType: rug?.rug_type || 'Unknown',
                  dimensions: rug?.length && rug?.width 
                    ? `${rug.length}' × ${rug.width}'` 
                    : 'N/A',
                  estimateId: ae.id,
                  services: ae.services,
                  total: ae.total_amount,
                };
              })}
              completions={serviceCompletions}
              clientApprovedAt={job.client_approved_at || null}
              isPaid={true}
              onCompletionChange={onServiceCompletionChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientApprovalCard;
