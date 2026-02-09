import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isNative } from '@/lib/platformUrls';

// ============================================================================
// TYPES
// ============================================================================

interface ServiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priority?: string;
  adjustedTotal: number;
}

interface PhotoData {
  url: string;
  label?: string;
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
  photo_urls?: string[];
}

interface BusinessBranding {
  business_name: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_address?: string | null;
  logo_url?: string | null;
}

interface GeneratePdfParams {
  type: 'inspection' | 'invoice';
  jobId: string;
  jobNumber: string;
  clientName: string;
  clientEmail?: string;
  rugs: RugData[];
  totalAmount: number;
  createdAt: string;
  branding?: BusinessBranding | null;
  paidAt?: string;
  portalUrl?: string;
}

// ============================================================================
// NATIVE PDF HANDLING
// ============================================================================

async function saveAndOpenPdfNative(
  pdfBase64: string,
  filename: string
): Promise<boolean> {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const result = await Filesystem.writeFile({
      path: filename,
      data: pdfBase64,
      directory: Directory.Cache,
    });

    console.log('[PDF] Saved to:', result.uri);

    await Share.share({
      title: filename.replace('.pdf', ''),
      url: result.uri,
      dialogTitle: 'Open Report',
    });

    return true;
  } catch (error) {
    console.error('[PDF] Native save/open failed:', error);
    return false;
  }
}

// ============================================================================
// WEB PDF HANDLING
// ============================================================================

function downloadPdfWeb(pdfBase64: string, filename: string): void {
  const byteCharacters = atob(pdfBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// PHOTO URL SIGNING
// ============================================================================

async function getSignedPhotoUrls(photoUrls: string[]): Promise<PhotoData[]> {
  if (!photoUrls || photoUrls.length === 0) return [];
  
  try {
    // Sign storage URLs
    const signedUrls: PhotoData[] = [];
    
    for (const url of photoUrls.slice(0, 5)) { // Limit to 5 photos
      const path = url.replace(/^.*\/rug-photos\//, '');
      
      const { data, error } = await supabase.storage
        .from('rug-photos')
        .createSignedUrl(path, 300); // 5 min expiry
      
      if (!error && data?.signedUrl) {
        signedUrls.push({ url: data.signedUrl });
      }
    }
    
    return signedUrls;
  } catch (error) {
    console.error('[PDF] Failed to sign photo URLs:', error);
    return [];
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useInspectionPdf() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAndDownload = useCallback(async (params: GeneratePdfParams) => {
    setIsGenerating(true);

    try {
      // Build rug details with signed photo URLs
      const rugDetails = await Promise.all(
        params.rugs.map(async (rug) => {
          // Get signed URLs for photos
          const photos = await getSignedPhotoUrls(rug.photo_urls || []);
          
          // Generate condition summary
          const hasStain = rug.services.some(s => s.name.toLowerCase().includes('stain'));
          const hasOdor = rug.services.some(s => 
            s.name.toLowerCase().includes('odor') || s.name.toLowerCase().includes('urine')
          );
          const hasRepair = rug.services.some(s => 
            s.name.toLowerCase().includes('repair') || s.name.toLowerCase().includes('fringe')
          );

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
            photos,
            services: rug.services,
            total: rug.total,
            analysisReport: rug.analysis_report,
          };
        })
      );

      // Call premium PDF edge function
      const { data, error } = await supabase.functions.invoke('generate-premium-pdf', {
        body: {
          type: params.type,
          jobId: params.jobId,
          jobNumber: params.jobNumber,
          clientName: params.clientName,
          clientEmail: params.clientEmail,
          businessName: params.branding?.business_name,
          businessEmail: params.branding?.business_email,
          businessPhone: params.branding?.business_phone,
          businessAddress: params.branding?.business_address,
          logoUrl: params.branding?.logo_url,
          rugs: rugDetails,
          totalAmount: params.totalAmount,
          createdAt: params.createdAt,
          paidAt: params.paidAt,
          portalUrl: params.portalUrl,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const filename = data.filename || `Report_${params.jobNumber}.pdf`;

      // Platform-aware PDF handling
      if (isNative()) {
        const success = await saveAndOpenPdfNative(data.pdfBase64, filename);
        if (!success) {
          throw new Error('Unable to open PDF. Please try again.');
        }
        toast.success('Report ready to view');
      } else {
        downloadPdfWeb(data.pdfBase64, filename);
        toast.success('Report downloaded successfully');
      }

      return { success: true };
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF');
      return { success: false, error };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Convenience method for inspection reports
  const generateInspectionReport = useCallback(async (params: Omit<GeneratePdfParams, 'type'>) => {
    return generateAndDownload({ ...params, type: 'inspection' });
  }, [generateAndDownload]);

  // Convenience method for invoices
  const generateInvoice = useCallback(async (params: Omit<GeneratePdfParams, 'type'>) => {
    return generateAndDownload({ ...params, type: 'invoice' });
  }, [generateAndDownload]);

  return {
    generateAndDownload,
    generateInspectionReport,
    generateInvoice,
    isGenerating,
  };
}

// ============================================================================
// SEND INSPECTION READY EMAIL
// ============================================================================

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
