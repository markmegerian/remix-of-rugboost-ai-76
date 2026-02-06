import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ServiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priority?: string;
  adjustedTotal: number;
}

interface RugData {
  id: string;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  services: ServiceItem[];
  total: number;
  analysis_report?: string | null;
}

interface BusinessBranding {
  business_name: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_address?: string | null;
}

interface GenerateInspectionPdfParams {
  jobId: string;
  jobNumber: string;
  clientName: string;
  rugs: RugData[];
  totalAmount: number;
  createdAt: string;
  branding?: BusinessBranding | null;
}

/**
 * Hook for generating Expert Inspection Report PDFs via server-side edge function
 */
export function useInspectionPdf() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAndDownload = useCallback(async (params: GenerateInspectionPdfParams) => {
    setIsGenerating(true);
    
    try {
      // Build condition summaries from analysis reports
      const rugDetails = params.rugs.map(rug => {
        // Generate condition summary from services
        const hasStain = rug.services.some(s => s.name.toLowerCase().includes('stain'));
        const hasOdor = rug.services.some(s => s.name.toLowerCase().includes('odor') || s.name.toLowerCase().includes('urine'));
        const hasRepair = rug.services.some(s => s.name.toLowerCase().includes('repair') || s.name.toLowerCase().includes('fringe'));
        
        const conditions: string[] = [];
        if (hasStain) conditions.push('visible staining');
        if (hasOdor) conditions.push('odor contamination');
        if (hasRepair) conditions.push('structural concerns');
        
        const conditionSummary = conditions.length > 0 
          ? `Assessment indicates ${conditions.join(', ')}. Services address identified conditions.`
          : 'Standard cleaning and care recommended based on material type.';

        return {
          id: rug.id,
          rugNumber: rug.rug_number,
          rugType: rug.rug_type,
          dimensions: rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : 'TBD',
          conditionSummary,
          photoCount: 0, // Photos not included in server-side PDF for now
          services: rug.services,
          total: rug.total,
        };
      });

      const { data, error } = await supabase.functions.invoke('generate-inspection-pdf', {
        body: {
          jobId: params.jobId,
          jobNumber: params.jobNumber,
          clientName: params.clientName,
          businessName: params.branding?.business_name,
          businessEmail: params.branding?.business_email,
          businessPhone: params.branding?.business_phone,
          businessAddress: params.branding?.business_address,
          rugs: rugDetails,
          totalAmount: params.totalAmount,
          createdAt: params.createdAt,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Download the PDF
      const byteCharacters = atob(data.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename || `Inspection_Report_${params.jobNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully');
      return { success: true };
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF');
      return { success: false, error };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateAndDownload,
    isGenerating,
  };
}

/**
 * Send "Inspection Ready" email to client
 */
export async function sendInspectionReadyEmail(params: {
  jobId: string;
  clientEmail: string;
  clientName: string;
  jobNumber: string;
  portalUrl: string;
  rugCount: number;
  totalAmount: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-inspection-ready', {
      body: params,
    });

    if (error) throw error;
    if (data.error) throw new Error(data.error);

    return { success: true };
  } catch (error) {
    console.error('Error sending inspection ready email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}
