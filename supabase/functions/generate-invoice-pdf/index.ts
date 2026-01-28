import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SelectedService {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface RugDetail {
  rugNumber: string;
  rugType: string;
  dimensions: string;
  services: SelectedService[];
  total: number;
}

interface InvoiceRequest {
  jobNumber: string;
  clientName: string;
  clientEmail: string;
  amount: number; // in cents
  rugs: RugDetail[];
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  paidAt: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      jobNumber,
      clientName,
      clientEmail,
      amount,
      rugs,
      businessName,
      businessEmail,
      businessPhone,
      businessAddress,
      paidAt,
    }: InvoiceRequest = await req.json();

    

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Header - Business info
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // Emerald green
    doc.text(businessName || "Rug Cleaning Service", margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128); // Gray
    if (businessAddress) {
      doc.text(businessAddress, margin, y);
      y += 5;
    }
    if (businessPhone) {
      doc.text(`Phone: ${businessPhone}`, margin, y);
      y += 5;
    }
    if (businessEmail) {
      doc.text(`Email: ${businessEmail}`, margin, y);
      y += 5;
    }

    // Invoice title and number - right aligned
    const invoiceDate = new Date(paidAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const invoiceNumber = `INV-${jobNumber}-${Date.now().toString().slice(-6)}`;

    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 41, 55); // Dark gray
    doc.text("INVOICE", pageWidth - margin, 25, { align: "right" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(`Invoice #: ${invoiceNumber}`, pageWidth - margin, 35, { align: "right" });
    doc.text(`Date: ${invoiceDate}`, pageWidth - margin, 42, { align: "right" });
    doc.text(`Job #: ${jobNumber}`, pageWidth - margin, 49, { align: "right" });

    y = Math.max(y, 55) + 10;

    // Paid badge
    doc.setFillColor(209, 250, 229); // Light green
    doc.roundedRect(pageWidth - margin - 50, y - 5, 50, 18, 3, 3, "F");
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105); // Green
    doc.text("✓ PAID", pageWidth - margin - 25, y + 6, { align: "center" });

    y += 20;

    // Divider
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    // Bill To section
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text("BILL TO:", margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(12);
    doc.text(clientName, margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(clientEmail, margin, y);
    y += 15;

    // Services table header
    doc.setFillColor(249, 250, 251); // Light gray
    doc.rect(margin, y, pageWidth - (margin * 2), 10, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text("ITEM", margin + 5, y + 7);
    doc.text("QTY", pageWidth - margin - 65, y + 7, { align: "center" });
    doc.text("PRICE", pageWidth - margin - 35, y + 7, { align: "right" });
    doc.text("TOTAL", pageWidth - margin - 5, y + 7, { align: "right" });

    y += 15;

    // Services for each rug
    doc.setFont("helvetica", "normal");
    let grandTotal = 0;

    for (const rug of rugs) {
      // Check if we need a new page
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // Rug header
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(31, 41, 55);
      doc.text(`${rug.rugNumber} - ${rug.rugType}`, margin + 5, y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text(rug.dimensions, margin + 5, y + 5);
      y += 12;

      // Services
      for (const service of rug.services) {
        const lineTotal = service.quantity * service.unitPrice;
        
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);
        
        // Truncate long service names
        let serviceName = service.name;
        if (serviceName.length > 40) {
          serviceName = serviceName.substring(0, 37) + "...";
        }
        
        doc.text(serviceName, margin + 10, y);
        doc.text(service.quantity.toString(), pageWidth - margin - 65, y, { align: "center" });
        doc.text(`$${service.unitPrice.toFixed(2)}`, pageWidth - margin - 35, y, { align: "right" });
        doc.text(`$${lineTotal.toFixed(2)}`, pageWidth - margin - 5, y, { align: "right" });
        y += 7;
      }

      // Rug subtotal
      doc.setDrawColor(229, 231, 235);
      doc.line(pageWidth - margin - 80, y, pageWidth - margin, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(31, 41, 55);
      doc.text(`Subtotal: $${rug.total.toFixed(2)}`, pageWidth - margin - 5, y, { align: "right" });
      y += 12;

      grandTotal += rug.total;
    }

    // Grand total
    y += 5;
    doc.setFillColor(16, 185, 129); // Emerald
    doc.roundedRect(pageWidth - margin - 100, y - 5, 100, 25, 3, 3, "F");
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL PAID", pageWidth - margin - 90, y + 5);
    doc.setFontSize(16);
    const formattedAmount = (amount / 100).toFixed(2);
    doc.text(`$${formattedAmount}`, pageWidth - margin - 10, y + 12, { align: "right" });

    y += 35;

    // Payment confirmation
    doc.setFontSize(10);
    doc.setTextColor(5, 150, 105);
    doc.setFont("helvetica", "normal");
    doc.text(`Payment received on ${invoiceDate}`, margin, y);

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" });

    // Convert to base64
    const pdfBase64 = doc.output("datauristring").split(",")[1];

    

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfBase64,
        invoiceNumber 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating invoice PDF:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
