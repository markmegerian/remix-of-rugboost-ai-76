import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// PREMIUM PDF DESIGN SYSTEM
// ============================================================================

// Sophisticated color palette - refined navy, warm accents
const PALETTE = {
  // Primary brand
  navy: { r: 15, g: 32, b: 55 },           // Deep sophisticated navy
  navyLight: { r: 35, g: 62, b: 95 },      // Lighter navy for accents
  
  // Accent colors
  gold: { r: 180, g: 145, b: 85 },         // Warm gold for highlights
  goldLight: { r: 245, g: 235, b: 215 },   // Soft gold background
  teal: { r: 45, g: 115, b: 135 },         // Professional teal
  
  // Neutrals
  charcoal: { r: 35, g: 35, b: 40 },       // Primary text
  slate: { r: 95, g: 100, b: 110 },        // Secondary text
  silver: { r: 155, g: 160, b: 170 },      // Muted text
  cloud: { r: 245, g: 247, b: 250 },       // Light backgrounds
  white: { r: 255, g: 255, b: 255 },
  
  // Status colors
  success: { r: 34, g: 139, b: 104 },
  warning: { r: 200, g: 150, b: 50 },
  info: { r: 70, g: 130, b: 180 },
};

// Typography scale
const TYPE = {
  hero: 28,
  h1: 20,
  h2: 14,
  h3: 12,
  body: 10,
  caption: 8,
  tiny: 7,
};

// Spacing system (in mm)
const SPACE = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  xxl: 30,
};

// ============================================================================
// INTERFACES
// ============================================================================

interface ServiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priority?: string;
  adjustedTotal: number;
  category?: string;
}

interface PhotoData {
  url: string;
  label?: string;
}

interface RugDetail {
  id: string;
  rugNumber: string;
  rugType: string;
  dimensions: string;
  conditionSummary: string;
  photos?: PhotoData[];
  services: ServiceItem[];
  total: number;
  analysisReport?: string;
}

interface PdfRequest {
  type: 'inspection' | 'invoice';
  jobId: string;
  jobNumber: string;
  clientName: string;
  clientEmail?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  logoPath?: string; // Storage path for logo
  rugs: RugDetail[];
  totalAmount: number;
  createdAt: string;
  paidAt?: string;
  portalUrl?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function setColor(doc: jsPDF, color: { r: number; g: number; b: number }, type: 'fill' | 'text' | 'draw' = 'fill') {
  if (type === 'fill') doc.setFillColor(color.r, color.g, color.b);
  else if (type === 'text') doc.setTextColor(color.r, color.g, color.b);
  else doc.setDrawColor(color.r, color.g, color.b);
}

function categorizeService(serviceName: string): 'required' | 'recommended' | 'structural' | 'preventative' {
  const lower = serviceName.toLowerCase();
  if (lower.includes('basic clean') || lower.includes('deep clean') || 
      lower.includes('dusting') || lower.includes('wash')) {
    return 'required';
  }
  if (lower.includes('repair') || lower.includes('restoration') || 
      lower.includes('reweave') || lower.includes('binding') || lower.includes('fringe')) {
    return 'structural';
  }
  if (lower.includes('protection') || lower.includes('scotchgard') || 
      lower.includes('moth') || lower.includes('storage')) {
    return 'preventative';
  }
  return 'recommended';
}

const CATEGORY_META = {
  required: { 
    label: 'Essential Services', 
    color: PALETTE.navy,
    description: 'Core services required for proper cleaning based on material and condition assessment.'
  },
  recommended: { 
    label: 'Expert Recommendations', 
    color: PALETTE.teal,
    description: 'Additional treatments recommended based on our professional inspection findings.'
  },
  structural: { 
    label: 'Restoration & Repair', 
    color: PALETTE.gold,
    description: 'Structural repairs to preserve integrity and extend the life of your investment.'
  },
  preventative: { 
    label: 'Protective Care', 
    color: PALETTE.success,
    description: 'Optional protection services to guard against future damage and wear.'
  },
};

async function generateQRCode(text: string): Promise<string | null> {
  try {
    const qrDataUrl = await QRCode.toDataURL(text, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0f2037',
        light: '#ffffff',
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error('QR code generation failed:', error);
    return null;
  }
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Image fetch failed:', error);
    return null;
  }
}

// ============================================================================
// PDF RENDERER CLASS
// ============================================================================

class PremiumPdfRenderer {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin = 18;
  private y = 0;
  private pageNumber = 1;

  constructor() {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.y = this.margin;
  }

  private contentWidth() {
    return this.pageWidth - this.margin * 2;
  }

  private checkPageBreak(requiredSpace: number) {
    if (this.y + requiredSpace > this.pageHeight - 25) {
      this.addPage();
    }
  }

  private addPage() {
    this.doc.addPage();
    this.pageNumber++;
    this.y = this.margin;
    this.drawPageNumber();
  }

  private drawPageNumber() {
    this.doc.setFontSize(TYPE.tiny);
    setColor(this.doc, PALETTE.silver, 'text');
    this.doc.text(
      `Page ${this.pageNumber}`,
      this.pageWidth - this.margin,
      this.pageHeight - 8,
      { align: 'right' }
    );
  }

  // -------------------------------------------------------------------------
  // HEADER SECTION
  // -------------------------------------------------------------------------
  
  async drawHeader(request: PdfRequest, logoBase64: string | null) {
    const headerHeight = 55;
    
    // Navy header background with subtle gradient effect
    setColor(this.doc, PALETTE.navy, 'fill');
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');
    
    // Decorative gold accent line
    setColor(this.doc, PALETTE.gold, 'fill');
    this.doc.rect(0, headerHeight - 3, this.pageWidth, 3, 'F');
    
    // Logo or business name
    const textStartX = this.margin;
    let logoWidth = 0;
    
    if (logoBase64) {
      try {
        // Add logo - maintain aspect ratio, max height 25mm
        const logoMaxHeight = 25;
        const logoMaxWidth = 40;
        
        // Add the logo image
        this.doc.addImage(logoBase64, 'PNG', this.margin, 10, logoMaxWidth, logoMaxHeight);
        logoWidth = logoMaxWidth + 8;
        
        console.log('[PDF] Logo added to header');
      } catch (e) {
        console.error('[PDF] Failed to add logo:', e);
        logoWidth = 0;
      }
    }
    
    // Business name (offset if logo present)
    const nameX = textStartX + logoWidth;
    this.doc.setFontSize(logoBase64 ? TYPE.h1 : TYPE.hero);
    this.doc.setFont('helvetica', 'bold');
    setColor(this.doc, PALETTE.white, 'text');
    this.doc.text(request.businessName || 'Professional Rug Care', nameX, logoBase64 ? 20 : 22);
    
    // Report type subtitle
    this.doc.setFontSize(TYPE.h2);
    this.doc.setFont('helvetica', 'normal');
    setColor(this.doc, PALETTE.goldLight, 'text');
    const reportType = request.type === 'invoice' 
      ? 'Payment Receipt' 
      : 'Expert Inspection Report';
    this.doc.text(reportType, nameX, logoBase64 ? 28 : 32);
    
    // Contact info
    this.doc.setFontSize(TYPE.caption);
    setColor(this.doc, { r: 180, g: 190, b: 200 }, 'text');
    let contactY = logoBase64 ? 36 : 42;
    if (request.businessPhone) {
      this.doc.text(request.businessPhone, nameX, contactY);
      contactY += 4;
    }
    if (request.businessEmail) {
      this.doc.text(request.businessEmail, nameX, contactY);
    }
    
    // Report info badge (right side)
    const badgeX = this.pageWidth - this.margin - 55;
    const badgeY = 10;
    
    setColor(this.doc, { r: 20, g: 42, b: 70 }, 'fill');
    this.doc.roundedRect(badgeX, badgeY, 55, 35, 3, 3, 'F');
    
    this.doc.setFontSize(TYPE.tiny);
    setColor(this.doc, PALETTE.silver, 'text');
    this.doc.text('REPORT NO.', badgeX + 27.5, badgeY + 8, { align: 'center' });
    
    this.doc.setFontSize(TYPE.h2);
    this.doc.setFont('helvetica', 'bold');
    setColor(this.doc, PALETTE.white, 'text');
    this.doc.text(request.jobNumber, badgeX + 27.5, badgeY + 18, { align: 'center' });
    
    this.doc.setFontSize(TYPE.caption);
    this.doc.setFont('helvetica', 'normal');
    setColor(this.doc, PALETTE.silver, 'text');
    const dateStr = new Date(request.createdAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    this.doc.text(dateStr, badgeX + 27.5, badgeY + 28, { align: 'center' });
    
    this.y = headerHeight + SPACE.lg;
  }

  // -------------------------------------------------------------------------
  // CLIENT INFO SECTION
  // -------------------------------------------------------------------------
  
  drawClientInfo(request: PdfRequest, qrCode: string | null) {
    this.checkPageBreak(45);
    
    // Client card
    setColor(this.doc, PALETTE.cloud, 'fill');
    this.doc.roundedRect(this.margin, this.y, this.contentWidth(), 35, 3, 3, 'F');
    
    // Left side - client details
    this.doc.setFontSize(TYPE.caption);
    this.doc.setFont('helvetica', 'bold');
    setColor(this.doc, PALETTE.slate, 'text');
    this.doc.text('PREPARED FOR', this.margin + SPACE.md, this.y + 8);
    
    this.doc.setFontSize(TYPE.h2);
    setColor(this.doc, PALETTE.charcoal, 'text');
    this.doc.text(request.clientName, this.margin + SPACE.md, this.y + 16);
    
    if (request.clientEmail) {
      this.doc.setFontSize(TYPE.body);
      this.doc.setFont('helvetica', 'normal');
      setColor(this.doc, PALETTE.slate, 'text');
      this.doc.text(request.clientEmail, this.margin + SPACE.md, this.y + 24);
    }
    
    // Right side - QR code
    if (qrCode) {
      const qrSize = 25;
      const qrX = this.pageWidth - this.margin - qrSize - SPACE.md;
      const qrY = this.y + 5;
      
      try {
        this.doc.addImage(qrCode, 'PNG', qrX, qrY, qrSize, qrSize);
        
        this.doc.setFontSize(TYPE.tiny);
        setColor(this.doc, PALETTE.slate, 'text');
        this.doc.text('Scan to view online', qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' });
      } catch (e) {
        console.error('QR code insert failed:', e);
      }
    }
    
    this.y += 45;
  }

  // -------------------------------------------------------------------------
  // EXECUTIVE SUMMARY
  // -------------------------------------------------------------------------
  
  drawExecutiveSummary(request: PdfRequest) {
    this.checkPageBreak(40);
    
    const rugCount = request.rugs.length;
    const totalServices = request.rugs.reduce((sum, r) => sum + r.services.length, 0);
    
    // Summary title
    this.doc.setFontSize(TYPE.h2);
    this.doc.setFont('helvetica', 'bold');
    setColor(this.doc, PALETTE.navy, 'text');
    this.doc.text('Inspection Summary', this.margin, this.y);
    this.y += SPACE.md;
    
    // Stat cards
    const cardWidth = (this.contentWidth() - SPACE.sm * 2) / 3;
    const cardHeight = 28;
    
    const stats = [
      { label: 'Rugs Inspected', value: rugCount.toString(), color: PALETTE.navy },
      { label: 'Services Identified', value: totalServices.toString(), color: PALETTE.teal },
      { label: 'Total Investment', value: `$${request.totalAmount.toFixed(2)}`, color: PALETTE.gold },
    ];
    
    stats.forEach((stat, i) => {
      const x = this.margin + (cardWidth + SPACE.sm) * i;
      
      // Card background
      setColor(this.doc, PALETTE.cloud, 'fill');
      this.doc.roundedRect(x, this.y, cardWidth, cardHeight, 2, 2, 'F');
      
      // Colored top border
      setColor(this.doc, stat.color, 'fill');
      this.doc.rect(x, this.y, cardWidth, 2, 'F');
      
      // Value
      this.doc.setFontSize(TYPE.h1);
      this.doc.setFont('helvetica', 'bold');
      setColor(this.doc, PALETTE.charcoal, 'text');
      this.doc.text(stat.value, x + cardWidth / 2, this.y + 14, { align: 'center' });
      
      // Label
      this.doc.setFontSize(TYPE.caption);
      this.doc.setFont('helvetica', 'normal');
      setColor(this.doc, PALETTE.slate, 'text');
      this.doc.text(stat.label, x + cardWidth / 2, this.y + 22, { align: 'center' });
    });
    
    this.y += cardHeight + SPACE.lg;
  }

  // -------------------------------------------------------------------------
  // RUG DETAIL SECTIONS
  // -------------------------------------------------------------------------
  
  async drawRugDetails(rug: RugDetail, index: number, totalRugs: number) {
    this.checkPageBreak(50);
    
    // Section header with rug number
    setColor(this.doc, PALETTE.navy, 'fill');
    this.doc.roundedRect(this.margin, this.y, this.contentWidth(), 12, 2, 2, 'F');
    
    this.doc.setFontSize(TYPE.h3);
    this.doc.setFont('helvetica', 'bold');
    setColor(this.doc, PALETTE.white, 'text');
    this.doc.text(`${rug.rugNumber} — ${rug.rugType}`, this.margin + SPACE.md, this.y + 8);
    
    // Dimensions badge
    this.doc.setFontSize(TYPE.caption);
    this.doc.setFont('helvetica', 'normal');
    setColor(this.doc, PALETTE.goldLight, 'text');
    this.doc.text(rug.dimensions, this.pageWidth - this.margin - SPACE.md, this.y + 8, { align: 'right' });
    
    this.y += 16;
    
    // Condition summary
    if (rug.conditionSummary) {
      this.checkPageBreak(20);
      
      setColor(this.doc, { r: 252, g: 250, b: 245 }, 'fill');
      const summaryLines = this.doc.splitTextToSize(rug.conditionSummary, this.contentWidth() - SPACE.md * 2);
      const boxHeight = summaryLines.length * 4 + SPACE.md;
      this.doc.roundedRect(this.margin, this.y, this.contentWidth(), boxHeight, 2, 2, 'F');
      
      // Gold left border
      setColor(this.doc, PALETTE.gold, 'fill');
      this.doc.rect(this.margin, this.y, 2, boxHeight, 'F');
      
      this.doc.setFontSize(TYPE.body);
      setColor(this.doc, PALETTE.slate, 'text');
      this.doc.text(summaryLines, this.margin + SPACE.md, this.y + 6);
      
      this.y += boxHeight + SPACE.sm;
    }
    
    // Photo thumbnails (if available)
    if (rug.photos && rug.photos.length > 0) {
      await this.drawPhotoThumbnails(rug.photos);
    }
    
    // Services table
    this.drawServicesTable(rug);
    
    // Rug subtotal
    this.checkPageBreak(12);
    setColor(this.doc, PALETTE.cloud, 'fill');
    this.doc.roundedRect(this.pageWidth - this.margin - 80, this.y, 80, 10, 2, 2, 'F');
    
    this.doc.setFontSize(TYPE.body);
    this.doc.setFont('helvetica', 'bold');
    setColor(this.doc, PALETTE.charcoal, 'text');
    this.doc.text('Subtotal:', this.pageWidth - this.margin - 75, this.y + 7);
    this.doc.text(`$${rug.total.toFixed(2)}`, this.pageWidth - this.margin - 5, this.y + 7, { align: 'right' });
    
    this.y += 18;
  }

  private async drawPhotoThumbnails(photos: PhotoData[]) {
    this.checkPageBreak(35);
    
    const thumbSize = 25;
    const maxPhotos = Math.min(photos.length, 5);
    const startX = this.margin;
    
    this.doc.setFontSize(TYPE.caption);
    this.doc.setFont('helvetica', 'bold');
    setColor(this.doc, PALETTE.slate, 'text');
    this.doc.text('INSPECTION PHOTOS', startX, this.y + 4);
    this.y += 8;
    
    for (let i = 0; i < maxPhotos; i++) {
      const photo = photos[i];
      const x = startX + (thumbSize + SPACE.xs) * i;
      
      // Photo placeholder frame
      setColor(this.doc, PALETTE.cloud, 'fill');
      this.doc.roundedRect(x, this.y, thumbSize, thumbSize, 2, 2, 'F');
      setColor(this.doc, PALETTE.silver, 'draw');
      this.doc.roundedRect(x, this.y, thumbSize, thumbSize, 2, 2, 'S');
      
      // Try to load actual photo
      if (photo.url) {
        try {
          const imageData = await fetchImageAsBase64(photo.url);
          if (imageData) {
            this.doc.addImage(imageData, 'JPEG', x + 1, this.y + 1, thumbSize - 2, thumbSize - 2);
          }
        } catch (e) {
          // Photo couldn't load - show placeholder
          this.doc.setFontSize(TYPE.tiny);
          setColor(this.doc, PALETTE.silver, 'text');
          this.doc.text('Photo', x + thumbSize / 2, this.y + thumbSize / 2, { align: 'center' });
        }
      }
    }
    
    if (photos.length > maxPhotos) {
      const moreX = startX + (thumbSize + SPACE.xs) * maxPhotos;
      this.doc.setFontSize(TYPE.caption);
      setColor(this.doc, PALETTE.slate, 'text');
      this.doc.text(`+${photos.length - maxPhotos} more`, moreX, this.y + thumbSize / 2 + 2);
    }
    
    this.y += thumbSize + SPACE.md;
  }

  private drawServicesTable(rug: RugDetail) {
    if (rug.services.length === 0) return;
    
    this.checkPageBreak(30);
    
    // Group services by category
    const categorized: Record<string, ServiceItem[]> = {};
    rug.services.forEach(service => {
      const cat = categorizeService(service.name);
      if (!categorized[cat]) categorized[cat] = [];
      categorized[cat].push(service);
    });
    
    const categoryOrder = ['required', 'recommended', 'structural', 'preventative'] as const;
    
    for (const category of categoryOrder) {
      const services = categorized[category];
      if (!services || services.length === 0) continue;
      
      const meta = CATEGORY_META[category];
      this.checkPageBreak(20 + services.length * 8);
      
      // Category header
      setColor(this.doc, meta.color, 'fill');
      this.doc.roundedRect(this.margin, this.y, 4, 8, 1, 1, 'F');
      
      this.doc.setFontSize(TYPE.caption);
      this.doc.setFont('helvetica', 'bold');
      setColor(this.doc, meta.color, 'text');
      this.doc.text(meta.label.toUpperCase(), this.margin + 8, this.y + 5);
      this.y += 10;
      
      // Services rows
      services.forEach((service, i) => {
        const isOdd = i % 2 === 0;
        if (isOdd) {
          setColor(this.doc, { r: 250, g: 251, b: 252 }, 'fill');
          this.doc.rect(this.margin, this.y - 3, this.contentWidth(), 8, 'F');
        }
        
        this.doc.setFontSize(TYPE.body);
        this.doc.setFont('helvetica', 'normal');
        setColor(this.doc, PALETTE.charcoal, 'text');
        
        // Service name (truncate if needed)
        let serviceName = service.name;
        if (serviceName.length > 50) {
          serviceName = serviceName.substring(0, 47) + '...';
        }
        this.doc.text(serviceName, this.margin + 4, this.y + 2);
        
        // Quantity and price
        this.doc.setFontSize(TYPE.caption);
        setColor(this.doc, PALETTE.slate, 'text');
        if (service.quantity > 1) {
          this.doc.text(`×${service.quantity}`, this.pageWidth - this.margin - 50, this.y + 2);
        }
        
        // Total
        this.doc.setFont('helvetica', 'bold');
        setColor(this.doc, PALETTE.charcoal, 'text');
        this.doc.text(`$${service.adjustedTotal.toFixed(2)}`, this.pageWidth - this.margin - 4, this.y + 2, { align: 'right' });
        
        this.y += 8;
      });
      
      this.y += SPACE.sm;
    }
  }

  // -------------------------------------------------------------------------
  // GRAND TOTAL SECTION
  // -------------------------------------------------------------------------
  
  drawGrandTotal(amount: number, isPaid: boolean = false) {
    this.checkPageBreak(35);
    
    // Total box
    const boxHeight = isPaid ? 35 : 28;
    setColor(this.doc, PALETTE.navy, 'fill');
    this.doc.roundedRect(this.margin, this.y, this.contentWidth(), boxHeight, 3, 3, 'F');
    
    // Paid badge (if applicable)
    if (isPaid) {
      setColor(this.doc, PALETTE.success, 'fill');
      this.doc.roundedRect(this.margin + SPACE.md, this.y + SPACE.sm, 40, 10, 2, 2, 'F');
      
      this.doc.setFontSize(TYPE.caption);
      this.doc.setFont('helvetica', 'bold');
      setColor(this.doc, PALETTE.white, 'text');
      this.doc.text('✓ PAID', this.margin + SPACE.md + 20, this.y + SPACE.sm + 7, { align: 'center' });
    }
    
    // Label
    this.doc.setFontSize(TYPE.h3);
    this.doc.setFont('helvetica', 'normal');
    setColor(this.doc, { r: 180, g: 190, b: 200 }, 'text');
    const labelY = isPaid ? this.y + 26 : this.y + 18;
    this.doc.text(isPaid ? 'Total Paid' : 'Total Investment', this.margin + SPACE.md, labelY);
    
    // Amount
    this.doc.setFontSize(TYPE.h1 + 4);
    this.doc.setFont('helvetica', 'bold');
    setColor(this.doc, PALETTE.white, 'text');
    this.doc.text(`$${amount.toFixed(2)}`, this.pageWidth - this.margin - SPACE.md, labelY, { align: 'right' });
    
    this.y += boxHeight + SPACE.lg;
  }

  // -------------------------------------------------------------------------
  // DISCLOSURES & FOOTER
  // -------------------------------------------------------------------------
  
  drawDisclosures() {
    this.checkPageBreak(50);
    
    this.doc.setFontSize(TYPE.caption);
    this.doc.setFont('helvetica', 'bold');
    setColor(this.doc, PALETTE.slate, 'text');
    this.doc.text('IMPORTANT DISCLOSURES', this.margin, this.y);
    this.y += 6;
    
    const disclosures = [
      'All estimates are based on visible inspection. Hidden damage may require additional services.',
      'Certain stains, particularly those set by heat or time, may not be fully removable.',
      'Natural fiber rugs may experience some color variation during cleaning.',
      'Declined protective treatments may result in faster re-soiling or damage susceptibility.',
    ];
    
    this.doc.setFontSize(TYPE.caption);
    this.doc.setFont('helvetica', 'normal');
    setColor(this.doc, PALETTE.silver, 'text');
    
    disclosures.forEach((text, i) => {
      this.checkPageBreak(10);
      const lines = this.doc.splitTextToSize(`${i + 1}. ${text}`, this.contentWidth() - 10);
      this.doc.text(lines, this.margin + 4, this.y);
      this.y += lines.length * 3.5 + 2;
    });
    
    this.y += SPACE.sm;
  }

  drawSignatureBlock() {
    this.checkPageBreak(40);
    
    this.doc.setFontSize(TYPE.caption);
    this.doc.setFont('helvetica', 'bold');
    setColor(this.doc, PALETTE.slate, 'text');
    this.doc.text('AUTHORIZATION', this.margin, this.y);
    this.y += 8;
    
    this.doc.setFontSize(TYPE.body);
    this.doc.setFont('helvetica', 'normal');
    setColor(this.doc, PALETTE.charcoal, 'text');
    this.doc.text('By proceeding with services, you authorize the work outlined above.', this.margin, this.y);
    this.y += 15;
    
    // Signature line
    setColor(this.doc, PALETTE.silver, 'draw');
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, this.y, this.margin + 80, this.y);
    this.doc.line(this.pageWidth - this.margin - 50, this.y, this.pageWidth - this.margin, this.y);
    
    this.y += 4;
    this.doc.setFontSize(TYPE.tiny);
    setColor(this.doc, PALETTE.silver, 'text');
    this.doc.text('Client Signature', this.margin, this.y);
    this.doc.text('Date', this.pageWidth - this.margin - 50, this.y);
    
    this.y += SPACE.lg;
  }

  drawFooter(businessName: string, businessPhone?: string, businessEmail?: string) {
    const footerY = this.pageHeight - 12;
    
    // Footer line
    setColor(this.doc, PALETTE.cloud, 'fill');
    this.doc.rect(0, footerY - 4, this.pageWidth, 16, 'F');
    
    setColor(this.doc, PALETTE.gold, 'fill');
    this.doc.rect(0, footerY - 4, this.pageWidth, 0.5, 'F');
    
    this.doc.setFontSize(TYPE.tiny);
    setColor(this.doc, PALETTE.slate, 'text');
    this.doc.text(businessName, this.margin, footerY + 2);
    
    const contact = [businessPhone, businessEmail].filter(Boolean).join(' • ');
    if (contact) {
      this.doc.text(contact, this.pageWidth - this.margin, footerY + 2, { align: 'right' });
    }
    
    this.drawPageNumber();
  }

  // -------------------------------------------------------------------------
  // MAIN GENERATION METHOD
  // -------------------------------------------------------------------------
  
  async generate(request: PdfRequest, logoBase64: string | null): Promise<string> {
    console.log(`[Premium PDF] Generating ${request.type} for job ${request.jobNumber}`);
    
    // Generate QR code for portal link
    let qrCode: string | null = null;
    if (request.portalUrl) {
      qrCode = await generateQRCode(request.portalUrl);
    }
    
    // Draw header with logo
    await this.drawHeader(request, logoBase64);
    
    // Draw client info with QR
    this.drawClientInfo(request, qrCode);
    
    // Executive summary
    if (request.type === 'inspection') {
      this.drawExecutiveSummary(request);
    }
    
    // Rug details
    for (let i = 0; i < request.rugs.length; i++) {
      await this.drawRugDetails(request.rugs[i], i, request.rugs.length);
    }
    
    // Grand total
    this.drawGrandTotal(request.totalAmount, request.type === 'invoice');
    
    // Disclosures (inspection only)
    if (request.type === 'inspection') {
      this.drawDisclosures();
      this.drawSignatureBlock();
    }
    
    // Footer on all pages
    this.drawFooter(
      request.businessName || 'Professional Rug Care',
      request.businessPhone,
      request.businessEmail
    );
    
    // Generate base64
    return this.doc.output('datauristring').split(',')[1];
  }
}

// ============================================================================
// EDGE FUNCTION HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const request: PdfRequest = await req.json();
    console.log(`[Premium PDF] Request received for ${request.type}:`, request.jobNumber);

    // Fetch logo if logoPath provided
    let logoBase64: string | null = null;
    if (request.logoPath) {
      try {
        // Create signed URL for logo
        const { data: signedUrlData, error: signError } = await supabase.storage
          .from('rug-photos')
          .createSignedUrl(request.logoPath, 60);
        
        if (!signError && signedUrlData?.signedUrl) {
          logoBase64 = await fetchImageAsBase64(signedUrlData.signedUrl);
          console.log('[Premium PDF] Logo fetched successfully');
        }
      } catch (e) {
        console.error('[Premium PDF] Failed to fetch logo:', e);
      }
    }

    // Generate PDF
    const renderer = new PremiumPdfRenderer();
    const pdfBase64 = await renderer.generate(request, logoBase64);

    const filename = request.type === 'invoice'
      ? `Invoice_${request.jobNumber}.pdf`
      : `Expert_Inspection_Report_${request.jobNumber}.pdf`;

    console.log(`[Premium PDF] Generated successfully: ${filename}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdfBase64,
        filename
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Premium PDF] Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
