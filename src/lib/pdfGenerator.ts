import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface Inspection {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  notes: string | null;
  photo_urls: string[] | null;
  analysis_report: string | null;
  created_at: string;
}

interface Job {
  job_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export interface BusinessBranding {
  business_name: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  logo_url: string | null;
}

// Default RugBoost logo as base64 PNG (fallback when no custom logo)
const RUGBOOST_LOGO_BASE64 = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgODkwIiBmaWxsPSJub25lIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iZ3JhZCIgeDE9IjAlIiB5MT0iMjAlIiB4Mj0iMTAwJSIgeTI9IjgwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMyMTc0QzYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNkU1NEQxIi8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cGF0aCBkPSJNMTIwIDQ0NUMxMjAgMzY4IDI2My41NyAyNDMuNTcgMzAwIDE2MCAzNTQuMjMgMjIzLjkgNDc0IDM2MiA0ODAgNDQ1IDQ4MCA1MjAgNDIwIDY5MCAzMDAgNjkwIDE4MCA2OTAgMTIwIDUyMCAxMjAgNDQ1WiIgZmlsbD0idXJsKCNncmFkKSIvPgogIDxwYXRoIGQ9Ik0yMDAgNDYwQzIwMCAzNjAgMzQwIDMwMCAzMDAgMjIwIDI2MCAzMDAgNDAwIDM2MCA0MDAgNDYwIDQwMCA1NjAgMzIwIDYyMCAzMDAgNjIwIDI4MCA2MjAgMjAwIDU2MCAyMDAgNDYwWiIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC4zIi8+Cjwvc3ZnPg==`;

// Helper function to load image and convert to base64
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Failed to load image:', url, error);
    return null;
  }
};

// Helper function to add logo header to a page
const addLogoHeader = async (
  doc: jsPDF,
  pageWidth: number,
  branding?: BusinessBranding | null
): Promise<number> => {
  const logoWidth = 20;
  const logoHeight = 30;
  const logoX = 15;
  const logoY = 8;

  // Determine which logo and name to use
  const businessName = branding?.business_name || 'RugBoost';
  let logoBase64 = RUGBOOST_LOGO_BASE64;

  // Try to load custom logo if available
  if (branding?.logo_url) {
    const customLogo = await loadImageAsBase64(branding.logo_url);
    if (customLogo) {
      logoBase64 = customLogo;
    }
  }

  try {
    // Determine image format from base64 data
    const format = logoBase64.includes('image/png')
      ? 'PNG'
      : logoBase64.includes('image/svg')
      ? 'SVG'
      : 'JPEG';
    doc.addImage(logoBase64, format, logoX, logoY, logoWidth, logoHeight);
  } catch (error) {
    console.error('Failed to add logo to PDF:', error);
  }

  // Add company name next to logo
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 116, 198); // Primary blue
  doc.text(businessName, logoX + logoWidth + 5, logoY + 12);

  // Add business contact info if available
  let contactY = logoY + 18;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  if (branding?.business_phone) {
    doc.text(branding.business_phone, logoX + logoWidth + 5, contactY);
    contactY += 4;
  }
  if (branding?.business_email) {
    doc.text(branding.business_email, logoX + logoWidth + 5, contactY);
  }

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Draw a subtle line under the header
  doc.setDrawColor(33, 116, 198);
  doc.setLineWidth(0.5);
  doc.line(15, logoY + logoHeight + 5, pageWidth - 15, logoY + logoHeight + 5);

  // Return the Y position after header
  return logoY + logoHeight + 15;
};

// Sync version for pages after first (uses cached logo)
const addLogoHeaderSync = (
  doc: jsPDF,
  pageWidth: number,
  branding?: BusinessBranding | null,
  cachedLogoBase64?: string | null
): number => {
  const logoWidth = 20;
  const logoHeight = 30;
  const logoX = 15;
  const logoY = 8;

  const businessName = branding?.business_name || 'RugBoost';
  const logoBase64 = cachedLogoBase64 || RUGBOOST_LOGO_BASE64;

  try {
    const format = logoBase64.includes('image/png')
      ? 'PNG'
      : logoBase64.includes('image/svg')
      ? 'SVG'
      : 'JPEG';
    doc.addImage(logoBase64, format, logoX, logoY, logoWidth, logoHeight);
  } catch (error) {
    console.error('Failed to add logo to PDF:', error);
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 116, 198);
  doc.text(businessName, logoX + logoWidth + 5, logoY + 12);

  let contactY = logoY + 18;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  if (branding?.business_phone) {
    doc.text(branding.business_phone, logoX + logoWidth + 5, contactY);
    contactY += 4;
  }
  if (branding?.business_email) {
    doc.text(branding.business_email, logoX + logoWidth + 5, contactY);
  }

  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(33, 116, 198);
  doc.setLineWidth(0.5);
  doc.line(15, logoY + logoHeight + 5, pageWidth - 15, logoY + logoHeight + 5);

  return logoY + logoHeight + 15;
};

// Helper to add photos to PDF
const addPhotosToPDF = async (
  doc: jsPDF,
  photoUrls: string[],
  startY: number,
  margin: number,
  pageWidth: number,
  pageHeight: number
): Promise<number> => {
  let yPos = startY;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Inspection Photos', margin, yPos);
  yPos += 10;

  const photoWidth = 80;
  const photoHeight = 60;
  const photosPerRow = 2;
  const spacing = 10;

  let currentX = margin;
  let photosInRow = 0;

  for (const url of photoUrls) {
    if (yPos + photoHeight > pageHeight - margin - 20) {
      doc.addPage();
      yPos = margin;
      currentX = margin;
      photosInRow = 0;
    }

    try {
      const base64 = await loadImageAsBase64(url);
      if (base64) {
        doc.addImage(base64, 'JPEG', currentX, yPos, photoWidth, photoHeight);

        photosInRow++;
        if (photosInRow >= photosPerRow) {
          yPos += photoHeight + spacing;
          currentX = margin;
          photosInRow = 0;
        } else {
          currentX += photoWidth + spacing;
        }
      }
    } catch (error) {
      console.error('Error adding image to PDF:', error);
    }
  }

  if (photosInRow > 0) {
    yPos += photoHeight + spacing;
  }

  return yPos + 5;
};

export const generatePDF = async (
  inspection: Inspection,
  branding?: BusinessBranding | null
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Cache logo for subsequent pages
  let cachedLogoBase64: string | null = null;
  if (branding?.logo_url) {
    cachedLogoBase64 = await loadImageAsBase64(branding.logo_url);
  }

  // Add logo header
  let yPos = await addLogoHeader(doc, pageWidth, branding);
  yPos += 5;

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Rug Inspection Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Report Date: ${format(new Date(inspection.created_at), 'MMMM d, yyyy')}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );
  yPos += 15;

  // Client Information Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Information', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const clientInfo = [
    ['Name', inspection.client_name],
    ['Email', inspection.client_email || 'N/A'],
    ['Phone', inspection.client_phone || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: clientInfo,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Rug Details Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Rug Details', margin, yPos);
  yPos += 8;

  const rugDetails = [
    ['Rug Number', inspection.rug_number],
    ['Type', inspection.rug_type],
    [
      'Dimensions',
      inspection.length && inspection.width
        ? `${inspection.length}' × ${inspection.width}'`
        : 'N/A',
    ],
    ['Notes', inspection.notes || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: rugDetails,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Photos Section
  if (inspection.photo_urls && inspection.photo_urls.length > 0) {
    yPos = await addPhotosToPDF(doc, inspection.photo_urls, yPos, margin, pageWidth, pageHeight);
  }

  // AI Analysis Section
  if (inspection.analysis_report) {
    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Analysis & Recommendations', margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const maxWidth = pageWidth - margin * 2;
    const lines = doc.splitTextToSize(inspection.analysis_report, maxWidth);
    const lineHeight = 5;

    for (let i = 0; i < lines.length; i++) {
      if (yPos + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(lines[i], margin, yPos);
      yPos += lineHeight;
    }
  }

  // Footer and header on all pages
  const totalPages = doc.getNumberOfPages();
  const businessName = branding?.business_name || 'RugBoost';

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Add logo header on pages after the first
    if (i > 1) {
      addLogoHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Generated by ${businessName}`, margin, pageHeight - 10);
  }

  // Save the PDF
  const fileName = `rug-inspection-${inspection.rug_number}-${format(
    new Date(inspection.created_at),
    'yyyy-MM-dd'
  )}.pdf`;
  doc.save(fileName);
};

export const generateJobPDF = async (
  job: Job,
  rugs: Inspection[],
  branding?: BusinessBranding | null
): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Cache logo for subsequent pages
  let cachedLogoBase64: string | null = null;
  if (branding?.logo_url) {
    cachedLogoBase64 = await loadImageAsBase64(branding.logo_url);
  }

  const businessName = branding?.business_name || 'RugBoost';

  // Add logo header
  let yPos = await addLogoHeader(doc, pageWidth, branding);
  yPos += 5;

  // Title Page
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Complete Job Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(`Job #${job.job_number}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;

  // Job Details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Information', margin, yPos);
  yPos += 8;

  const jobInfo = [
    ['Job Number', job.job_number],
    ['Status', job.status.charAt(0).toUpperCase() + job.status.slice(1)],
    ['Date Created', format(new Date(job.created_at), 'MMMM d, yyyy')],
    ['Total Rugs', rugs.length.toString()],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: jobInfo,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Client Information
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Information', margin, yPos);
  yPos += 8;

  const clientInfo = [
    ['Name', job.client_name],
    ['Email', job.client_email || 'N/A'],
    ['Phone', job.client_phone || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: clientInfo,
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  if (job.notes) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Job Notes', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(job.notes, pageWidth - margin * 2);
    doc.text(notesLines, margin, yPos);
    yPos += notesLines.length * 5 + 10;
  }

  // Rugs Summary Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Rugs Summary', margin, yPos);
  yPos += 8;

  const rugsSummary = rugs.map((rug, index) => [
    (index + 1).toString(),
    rug.rug_number,
    rug.rug_type,
    rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : 'N/A',
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Rug Number', 'Type', 'Dimensions']],
    body: rugsSummary,
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [33, 116, 198] },
    margin: { left: margin, right: margin },
  });

  // Individual Rug Reports
  for (let i = 0; i < rugs.length; i++) {
    const rug = rugs[i];
    doc.addPage();

    // Add logo header to new page
    yPos = addLogoHeaderSync(doc, pageWidth, branding, cachedLogoBase64);
    yPos += 5;

    // Rug Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rug ${i + 1}: ${rug.rug_number}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Rug Details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Rug Details', margin, yPos);
    yPos += 8;

    const rugDetails = [
      ['Rug Number', rug.rug_number],
      ['Type', rug.rug_type],
      ['Dimensions', rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : 'N/A'],
      ['Inspected', format(new Date(rug.created_at), 'MMMM d, yyyy')],
    ];

    if (rug.notes) {
      rugDetails.push(['Notes', rug.notes]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: rugDetails,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Photos Section for this rug
    if (rug.photo_urls && rug.photo_urls.length > 0) {
      yPos = await addPhotosToPDF(doc, rug.photo_urls, yPos, margin, pageWidth, pageHeight);
    }

    // AI Analysis
    if (rug.analysis_report) {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Analysis & Recommendations', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const maxWidth = pageWidth - margin * 2;
      const lines = doc.splitTextToSize(rug.analysis_report, maxWidth);
      const lineHeight = 5;

      for (let j = 0; j < lines.length; j++) {
        if (yPos + lineHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(lines[j], margin, yPos);
        yPos += lineHeight;
      }
    }
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Generated by ${businessName}`, margin, pageHeight - 10);
    doc.text(`Job #${job.job_number}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // Save
  const fileName = `job-report-${job.job_number}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};
