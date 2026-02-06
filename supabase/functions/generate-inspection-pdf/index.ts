import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ServiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priority?: string;
  adjustedTotal: number;
}

interface RugDetail {
  id: string;
  rugNumber: string;
  rugType: string;
  dimensions: string;
  conditionSummary: string;
  photoCount: number;
  services: ServiceItem[];
  total: number;
}

interface InspectionPdfRequest {
  jobId: string;
  jobNumber: string;
  clientName: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  rugs: RugDetail[];
  totalAmount: number;
  createdAt: string;
}

// Professional color palette
const COLORS = {
  navy: [26, 61, 92] as [number, number, number],
  teal: [44, 95, 124] as [number, number, number],
  gold: [139, 115, 85] as [number, number, number],
  cream: [250, 248, 245] as [number, number, number],
  lightBlue: [232, 241, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  text: [45, 45, 50] as [number, number, number],
  textMuted: [100, 100, 105] as [number, number, number],
  border: [200, 200, 195] as [number, number, number],
};

// Service categorization
function categorizeService(serviceName: string): 'required' | 'recommended' | 'high_cost' | 'preventative' {
  const lower = serviceName.toLowerCase();
  
  // Required: core cleaning services
  if (lower.includes('basic clean') || lower.includes('deep clean') || 
      lower.includes('dusting') || lower.includes('wash')) {
    return 'required';
  }
  
  // High cost: structural/restoration
  if (lower.includes('repair') || lower.includes('restoration') || 
      lower.includes('reweave') || lower.includes('binding')) {
    return 'high_cost';
  }
  
  // Preventative: protection services
  if (lower.includes('protection') || lower.includes('scotchgard') || 
      lower.includes('moth') || lower.includes('storage')) {
    return 'preventative';
  }
  
  return 'recommended';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const request: InspectionPdfRequest = await req.json();
    const {
      jobId,
      jobNumber,
      clientName,
      businessName = "Professional Rug Care",
      businessEmail,
      businessPhone,
      businessAddress,
      rugs,
      totalAmount,
      createdAt,
    } = request;

    console.log(`Generating inspection PDF for job ${jobNumber}`);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = 20;

    // Helper functions
    const addPage = () => {
      doc.addPage();
      y = 25;
    };

    const checkPageBreak = (requiredSpace: number) => {
      if (y + requiredSpace > pageHeight - 30) {
        addPage();
      }
    };

    const drawSectionHeader = (title: string) => {
      checkPageBreak(20);
      doc.setFillColor(...COLORS.lightBlue);
      doc.rect(margin, y - 6, pageWidth - margin * 2, 14, 'F');
      doc.setFillColor(...COLORS.teal);
      doc.rect(margin, y - 6, 4, 14, 'F');
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.navy);
      doc.text(title, margin + 10, y + 2);
      y += 16;
    };

    // ===== COVER / HEADER =====
    doc.setFillColor(...COLORS.navy);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(businessName, margin, 25);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.cream);
    doc.text("Expert Inspection Report", margin, 38);

    // Report info box
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.white);
    doc.text(`Report #${jobNumber}`, pageWidth - margin, 22, { align: "right" });
    doc.text(new Date(createdAt).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    }), pageWidth - margin, 32, { align: "right" });

    y = 65;

    // Client info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.navy);
    doc.text("Prepared For:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.text);
    doc.text(clientName, margin + 35, y);
    y += 15;

    // Introduction
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textMuted);
    const introText = `This report summarizes our professional inspection findings and outlines the recommended services for your ${rugs.length === 1 ? 'rug' : `${rugs.length} rugs`}. All recommendations are based on observed conditions, material characteristics, and industry best practices.`;
    const introLines = doc.splitTextToSize(introText, pageWidth - margin * 2);
    doc.text(introLines, margin, y);
    y += introLines.length * 5 + 10;

    // ===== RUG OVERVIEW =====
    drawSectionHeader("Rug Overview");

    for (const rug of rugs) {
      checkPageBreak(35);
      
      // Rug header
      doc.setFillColor(...COLORS.cream);
      doc.setDrawColor(...COLORS.teal);
      doc.setLineWidth(0.5);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 12, 'FD');
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.navy);
      doc.text(`${rug.rugNumber} - ${rug.rugType}`, margin + 6, y + 3);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.textMuted);
      doc.text(rug.dimensions, pageWidth - margin - 6, y + 3, { align: "right" });
      y += 16;

      // Condition summary
      if (rug.conditionSummary) {
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.text);
        const condLines = doc.splitTextToSize(rug.conditionSummary, pageWidth - margin * 2 - 10);
        doc.text(condLines, margin + 5, y);
        y += condLines.length * 4 + 8;
      }
    }

    y += 5;

    // ===== SERVICES REQUIRED =====
    const requiredServices = rugs.flatMap(r => 
      r.services.filter(s => categorizeService(s.name) === 'required')
        .map(s => ({ ...s, rugNumber: r.rugNumber }))
    );
    
    if (requiredServices.length > 0) {
      drawSectionHeader("Services Required for Proper Care");
      
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("These services are required to safely clean and handle rugs based on material and condition.", margin, y);
      y += 10;

      for (const service of requiredServices) {
        checkPageBreak(12);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.text);
        doc.text(`• ${service.name}`, margin + 5, y);
        
        if (rugs.length > 1) {
          doc.setFontSize(8);
          doc.setTextColor(...COLORS.textMuted);
          doc.text(`(${service.rugNumber})`, margin + 100, y);
        }
        
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.text);
        doc.text(`$${service.adjustedTotal.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
        y += 8;
      }
      y += 5;
    }

    // ===== EXPERT RECOMMENDATIONS =====
    const recommendedServices = rugs.flatMap(r => 
      r.services.filter(s => categorizeService(s.name) === 'recommended')
        .map(s => ({ ...s, rugNumber: r.rugNumber }))
    );

    if (recommendedServices.length > 0) {
      drawSectionHeader("Expert Recommendations");
      
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Recommended based on professional inspection findings.", margin, y);
      y += 10;

      for (const service of recommendedServices) {
        checkPageBreak(12);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.text);
        doc.text(`• ${service.name}`, margin + 5, y);
        
        if (rugs.length > 1) {
          doc.setFontSize(8);
          doc.setTextColor(...COLORS.textMuted);
          doc.text(`(${service.rugNumber})`, margin + 100, y);
        }
        
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.text);
        doc.text(`$${service.adjustedTotal.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
        y += 8;
      }
      y += 5;
    }

    // ===== HIGH COST / STRUCTURAL =====
    const highCostServices = rugs.flatMap(r => 
      r.services.filter(s => categorizeService(s.name) === 'high_cost')
        .map(s => ({ ...s, rugNumber: r.rugNumber }))
    );

    if (highCostServices.length > 0) {
      drawSectionHeader("Structural / High-Impact Services");
      
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Significant restoration work addressing structural integrity or severe conditions.", margin, y);
      y += 10;

      for (const service of highCostServices) {
        checkPageBreak(12);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.text);
        doc.text(`• ${service.name}`, margin + 5, y);
        
        if (rugs.length > 1) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...COLORS.textMuted);
          doc.text(`(${service.rugNumber})`, margin + 100, y);
        }
        
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.text);
        doc.text(`$${service.adjustedTotal.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
        y += 8;
      }
      y += 5;
    }

    // ===== PREVENTATIVE =====
    const preventativeServices = rugs.flatMap(r => 
      r.services.filter(s => categorizeService(s.name) === 'preventative')
        .map(s => ({ ...s, rugNumber: r.rugNumber }))
    );

    if (preventativeServices.length > 0) {
      drawSectionHeader("Preventative Care Options");
      
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Optional protection and long-term preservation services.", margin, y);
      y += 10;

      for (const service of preventativeServices) {
        checkPageBreak(12);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.text);
        doc.text(`• ${service.name}`, margin + 5, y);
        
        if (rugs.length > 1) {
          doc.setFontSize(8);
          doc.setTextColor(...COLORS.textMuted);
          doc.text(`(${service.rugNumber})`, margin + 100, y);
        }
        
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.text);
        doc.text(`$${service.adjustedTotal.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
        y += 8;
      }
      y += 5;
    }

    // ===== RISK & DISCLOSURES =====
    checkPageBreak(50);
    drawSectionHeader("Risk & Disclosures");
    
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    const disclosures = [
      "• All estimates are based on visible inspection. Hidden damage may require additional services.",
      "• Certain stains, particularly those set by heat or time, may not be fully removable.",
      "• Natural fiber rugs may experience some color variation during cleaning.",
      "• Declined protective treatments may result in faster re-soiling or damage susceptibility.",
    ];
    
    for (const disclosure of disclosures) {
      checkPageBreak(10);
      const lines = doc.splitTextToSize(disclosure, pageWidth - margin * 2 - 10);
      doc.text(lines, margin + 5, y);
      y += lines.length * 4 + 3;
    }
    y += 5;

    // ===== TOTAL INVESTMENT =====
    checkPageBreak(40);
    drawSectionHeader("Total Investment");
    
    doc.setFillColor(...COLORS.teal);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text("Total Estimate", margin + 10, y + 10);
    
    doc.setFontSize(18);
    doc.text(`$${totalAmount.toFixed(2)}`, pageWidth - margin - 10, y + 14, { align: "right" });
    y += 35;

    // ===== AUTHORIZATION =====
    checkPageBreak(60);
    drawSectionHeader("Authorization");
    
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    doc.text("By proceeding with services, you authorize the work outlined above.", margin, y);
    y += 15;

    // Signature line
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 20, margin + 80, y + 20);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text("Client Signature", margin, y + 26);

    doc.line(pageWidth - margin - 50, y + 20, pageWidth - margin, y + 20);
    doc.text("Date", pageWidth - margin - 50, y + 26);

    y += 40;

    // ===== FOOTER =====
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(businessName, margin, footerY);
    
    const contactParts = [businessPhone, businessEmail].filter(Boolean);
    if (contactParts.length > 0) {
      doc.text(contactParts.join(" • "), pageWidth - margin, footerY, { align: "right" });
    }

    // Generate base64
    const pdfBase64 = doc.output("datauristring").split(",")[1];

    console.log(`PDF generated successfully for job ${jobNumber}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfBase64,
        filename: `Expert_Inspection_Report_${jobNumber}.pdf`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating inspection PDF:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
