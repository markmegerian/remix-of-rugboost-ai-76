import type { RugDimensions } from '@/lib/rugDimensions';
import { calculateSquareFeet, calculateLinearFeet, type EdgeSuggestion, getSuggestedEdgesForService } from '@/lib/rugDimensions';
import { getServiceUnit } from '@/lib/serviceUnits';

export interface ParsedServiceItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  priority: 'high' | 'medium' | 'low';
  source?: 'ai' | 'staff';
  addedBy?: string;
  addedByName?: string;
  addedAt?: string;
  reasonNote?: string;
}

export function getServicePriority(serviceName: string): 'high' | 'medium' | 'low' {
  const lowerName = serviceName.toLowerCase();

  if (lowerName.includes('cleaning') ||
      lowerName.includes('wash') ||
      lowerName.includes('stain removal') ||
      lowerName.includes('repair') ||
      lowerName.includes('reweaving') ||
      lowerName.includes('reweave') ||
      lowerName.includes('patch') ||
      lowerName.includes('restoration') ||
      lowerName.includes('stabiliz') ||
      lowerName.includes('stabilise') ||
      lowerName.includes('dry rot') ||
      lowerName.includes('soaking')) {
    return 'high';
  }

  if (lowerName.includes('binding') ||
      lowerName.includes('overcast') ||
      lowerName.includes('fringe') ||
      lowerName.includes('edge') ||
      lowerName.includes('selvedge') ||
      lowerName.includes('blocking') ||
      lowerName.includes('stretching') ||
      lowerName.includes('shearing') ||
      lowerName.includes('zenjireh')) {
    return 'medium';
  }

  if (lowerName.includes('protection') ||
      lowerName.includes('moth proof') ||
      lowerName.includes('padding') ||
      lowerName.includes('fiber protect') ||
      lowerName.includes('scotchgard') ||
      lowerName.includes('storage')) {
    return 'low';
  }

  return 'medium';
}

interface ParseContext {
  rugDimensions?: RugDimensions | null;
  availableServices: { name: string; unitPrice: number }[];
  parsedEdgeSuggestions: EdgeSuggestion[];
}

export function parseReportForServices(
  reportText: string,
  ctx: ParseContext,
): ParsedServiceItem[] {
  const { rugDimensions = null, availableServices, parsedEdgeSuggestions } = ctx;
  const services: ParsedServiceItem[] = [];
  const lines = reportText.split('\n');

  let inBreakdownSection = false;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    const trimmedLine = line.trim();

    if (lowerLine.includes('rug breakdown') ||
        lowerLine.includes('estimate of services') ||
        lowerLine.includes('services and costs') ||
        lowerLine.includes('itemized list')) {
      inBreakdownSection = true;
      continue;
    }

    if (lowerLine.includes('total estimate') ||
        lowerLine.includes('total investment') ||
        lowerLine.includes('next steps') ||
        lowerLine.includes('sincerely') ||
        lowerLine.includes('additional protection')) {
      inBreakdownSection = false;
      continue;
    }

    if (lowerLine.startsWith('rug #') || lowerLine.startsWith('rug:')) continue;
    if (lowerLine.includes('subtotal')) continue;

    if (inBreakdownSection && trimmedLine.length > 0) {
      const serviceMatch = trimmedLine.match(/^[-*]?\s*(.+?):\s*\$([0-9,]+(?:\.[0-9]{2})?)/);

      if (serviceMatch) {
        const serviceName = serviceMatch[1].trim()
          .replace(/\s*\([^)]*\)\s*$/, '');
        const price = parseFloat(serviceMatch[2].replace(',', ''));

        if (serviceName.length < 3) continue;

        const existingIndex = services.findIndex(
          s => s.name.toLowerCase() === serviceName.toLowerCase()
        );

        if (existingIndex >= 0) {
          services[existingIndex].quantity += 1;
          if (price > 0 && services[existingIndex].unitPrice === 0) {
            services[existingIndex].unitPrice = price;
          }
        } else {
          services.push({
            id: crypto.randomUUID(),
            name: serviceName,
            quantity: 1,
            unitPrice: price,
            priority: getServicePriority(serviceName),
            source: 'ai',
          });
        }
      }
    }
  }

  // Fallback: look for any line with a dollar amount
  if (services.length === 0) {
    for (const line of lines) {
      const trimmedLine = line.trim();
      const priceMatch = trimmedLine.match(/^(.+?):\s*\$([0-9,]+(?:\.[0-9]{2})?)/);

      if (priceMatch) {
        const serviceName = priceMatch[1].trim()
          .replace(/^[-*]\s*/, '')
          .replace(/\*\*/g, '')
          .replace(/\s*\([^)]*\)\s*$/, '');
        const price = parseFloat(priceMatch[2].replace(',', ''));

        const lowerName = serviceName.toLowerCase();
        if (lowerName.includes('subtotal') ||
            lowerName.includes('total') ||
            lowerName.includes('rug #') ||
            serviceName.length < 3) continue;

        const existingIndex = services.findIndex(
          s => s.name.toLowerCase() === serviceName.toLowerCase()
        );

        if (existingIndex < 0) {
          services.push({
            id: crypto.randomUUID(),
            name: serviceName,
            quantity: 1,
            unitPrice: price,
            priority: getServicePriority(serviceName),
            source: 'ai',
          });
        }
      }
    }
  }

  // ── Auto-recalculate quantities using unit types + dimensions ──
  const hasDims = rugDimensions && rugDimensions.lengthFt > 0 && rugDimensions.widthFt > 0;

  for (const svc of services) {
    const unitConfig = getServiceUnit(svc.name);

    if (hasDims && unitConfig.unit === 'sqft') {
      const sqft = calculateSquareFeet(rugDimensions!);
      if (svc.quantity === 1 && svc.unitPrice > 0) {
        const catalogEntry = availableServices.find(
          a => a.name.toLowerCase() === svc.name.toLowerCase()
        );
        if (catalogEntry && catalogEntry.unitPrice > 0) {
          svc.unitPrice = catalogEntry.unitPrice;
        } else if (svc.unitPrice > sqft) {
          svc.unitPrice = Math.round((svc.unitPrice / sqft) * 100) / 100;
        }
      }
      svc.quantity = Math.round(sqft * 100) / 100;
    } else if (hasDims && unitConfig.unit === 'linear_ft') {
      const suggestion = getSuggestedEdgesForService(svc.name, parsedEdgeSuggestions);
      if (suggestion && suggestion.suggestedEdges.length > 0) {
        const linFt = calculateLinearFeet(rugDimensions!, suggestion.suggestedEdges);
        const catalogEntry = availableServices.find(
          a => a.name.toLowerCase() === svc.name.toLowerCase()
        );
        if (catalogEntry && catalogEntry.unitPrice > 0) {
          svc.unitPrice = catalogEntry.unitPrice;
        } else if (svc.quantity === 1 && svc.unitPrice > linFt) {
          svc.unitPrice = Math.round((svc.unitPrice / linFt) * 100) / 100;
        }
        svc.quantity = Math.round(linFt * 100) / 100;
      } else {
        const perimeter = 2 * (rugDimensions!.lengthFt + rugDimensions!.widthFt);
        const catalogEntry = availableServices.find(
          a => a.name.toLowerCase() === svc.name.toLowerCase()
        );
        if (catalogEntry && catalogEntry.unitPrice > 0) {
          svc.unitPrice = catalogEntry.unitPrice;
        } else if (svc.quantity === 1 && svc.unitPrice > perimeter) {
          svc.unitPrice = Math.round((svc.unitPrice / perimeter) * 100) / 100;
        }
        svc.quantity = Math.round(perimeter * 100) / 100;
      }
    } else if (unitConfig.unit !== 'variable') {
      const catalogEntry = availableServices.find(
        a => a.name.toLowerCase() === svc.name.toLowerCase()
      );
      if (catalogEntry && catalogEntry.unitPrice > 0 && svc.unitPrice === 0) {
        svc.unitPrice = catalogEntry.unitPrice;
      }
    }
  }

  return services;
}
