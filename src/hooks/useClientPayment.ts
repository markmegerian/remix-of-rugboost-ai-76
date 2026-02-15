import { useState } from 'react';
import { handleMutationError } from '@/lib/errorHandler';
import { supabase } from '@/integrations/supabase/client';
import { categorizeService, getServiceDeclineConsequence } from '@/lib/serviceCategories';
import { openExternalUrl } from '@/lib/navigation';
import type { RugData, JobData } from '@/hooks/useClientPortalData';
import type { User } from '@supabase/supabase-js';

interface UseClientPaymentParams {
  job: JobData | null;
  rugs: RugData[];
  clientJobAccessId: string | null;
  accessToken: string | undefined;
  user: User | null;
}

export function useClientPayment({
  job,
  rugs,
  clientJobAccessId,
  accessToken,
  user,
}: UseClientPaymentParams) {
  const [isProcessing, setIsProcessing] = useState(false);

  const proceedToPayment = async (declinedServiceIds: Set<string> = new Set()) => {
    setIsProcessing(true);
    try {
      // Build checkout services (exclude declined)
      const servicesForCheckout: {
        rugNumber: string;
        rugId: string;
        estimateId: string;
        services: RugData['services'];
      }[] = [];

      rugs.forEach((rug) => {
        const filtered = rug.services.filter((s) => !declinedServiceIds.has(s.id));
        if (filtered.length > 0) {
          servicesForCheckout.push({
            rugNumber: rug.rug_number,
            rugId: rug.id,
            estimateId: rug.estimate_id,
            services: filtered,
          });
        }
      });

      const total = servicesForCheckout.reduce(
        (sum, rug) =>
          sum + rug.services.reduce((s, svc) => s + svc.quantity * svc.unitPrice, 0),
        0,
      );

      // Persist client service selections
      for (const rugSelection of servicesForCheckout) {
        const selectionTotal = rugSelection.services.reduce(
          (sum, s) => sum + s.quantity * s.unitPrice,
          0,
        );

        const { data: existing } = await supabase
          .from('client_service_selections')
          .select('id')
          .eq('client_job_access_id', clientJobAccessId!)
          .eq('approved_estimate_id', rugSelection.estimateId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('client_service_selections')
            .update({
              selected_services: rugSelection.services as unknown as any,
              total_selected: selectionTotal,
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('client_service_selections').insert({
            client_job_access_id: clientJobAccessId!,
            approved_estimate_id: rugSelection.estimateId,
            selected_services: rugSelection.services as unknown as any,
            total_selected: selectionTotal,
          });
        }
      }

      // Log declined services
      if (declinedServiceIds.size > 0) {
        const allServices = rugs.flatMap((rug) =>
          rug.services.map((s) => ({ ...s, rugId: rug.id })),
        );
        const declined = allServices.filter((s) => declinedServiceIds.has(s.id));

        for (const service of declined) {
          const category = categorizeService(service.name);
          const consequence = getServiceDeclineConsequence(service.name, category);
          const rug = rugs.find((r) => r.services.some((s) => s.id === service.id));
          if (!rug) continue;

          await supabase.from('declined_services').upsert(
            {
              job_id: job?.id,
              inspection_id: rug.id,
              service_id: service.id,
              service_name: service.name,
              service_category: category,
              unit_price: service.unitPrice,
              quantity: service.quantity,
              declined_amount: service.unitPrice * service.quantity,
              decline_consequence: consequence,
              acknowledged_at: new Date().toISOString(),
            },
            { onConflict: 'job_id,service_id', ignoreDuplicates: false },
          );
        }
      }

      // Create Stripe checkout session
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
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

      if (data.checkoutUrl) {
        openExternalUrl(data.checkoutUrl, { critical: true });
        return;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      handleMutationError(error, 'ClientPayment');
      setIsProcessing(false);
    }
  };

  return { proceedToPayment, isProcessing };
}
