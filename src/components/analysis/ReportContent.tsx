import React, { useMemo } from 'react';
import { AlertTriangle, ShieldCheck, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ApprovedEstimate, StructuredFindings } from './types';

interface ReportContentProps {
  report: string;
  structuredFindings?: StructuredFindings | null;
  approvedEstimate?: ApprovedEstimate | null;
}

const severityBadgeClass: Record<string, string> = {
  minor: 'bg-blue-100 text-blue-700 border-blue-300',
  moderate: 'bg-amber-100 text-amber-700 border-amber-300',
  severe: 'bg-orange-100 text-orange-700 border-orange-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
};

const severityRank: Record<string, number> = {
  critical: 0,
  severe: 1,
  moderate: 2,
  minor: 3,
};

const formatConfidence = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `${Math.round(value * 100)}%`;
};

const formatFlag = (flag: string) => flag.replace(/[_-]+/g, ' ');
const formatCategory = (category?: string) => {
  if (!category) return 'OTHER';
  return category.replace(/[_-]+/g, ' ').toUpperCase();
};

const formatServiceType = (serviceType?: string) => {
  if (!serviceType) return 'Service';

  const map: Record<string, string> = {
    cleaning: 'Standard Wash',
    wash: 'Standard Wash',
    overnight_soaking: 'Overnight Soaking',
    soaking: 'Overnight Soaking',
    overcasting: 'Overcasting',
    overcast: 'Overcasting',
    binding: 'Persian Binding',
    persian_binding: 'Persian Binding',
    hand_fringe: 'Hand Fringe',
    fringe: 'Hand Fringe',
    machine_fringe: 'Machine Fringe',
    stain_removal: 'Stain Removal',
    repair: 'Repair',
    reweave: 'Reweave',
    padding: 'Padding',
  };

  const key = serviceType.toLowerCase().trim();
  if (map[key]) return map[key];

  return serviceType
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatMoney = (value?: number, currency = 'USD') => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  }).format(value);
};

const StructuredFindingsPanel: React.FC<{ findings: StructuredFindings }> = ({ findings }) => {
  const damages = Array.isArray(findings.damages)
    ? [...findings.damages].sort((a, b) => {
        const sa = (a.severity || 'moderate').toLowerCase();
        const sb = (b.severity || 'moderate').toLowerCase();
        return (severityRank[sa] ?? 99) - (severityRank[sb] ?? 99);
      })
    : [];
  const reviewFlags = Array.isArray(findings.reviewFlags) ? findings.reviewFlags : [];
  const recommendedServices = Array.isArray(findings.recommendedServices) ? findings.recommendedServices : [];
  const profile = findings.rugProfile;
  const totals = findings.totals;
  const currency = totals?.currency || 'USD';
  const damageById = new Map(
    damages
      .filter((d) => !!d.id)
      .map((d) => [d.id as string, d]),
  );

  if (!profile && damages.length === 0 && reviewFlags.length === 0 && recommendedServices.length === 0 && !findings.summary && !totals) {
    return null;
  }

  return (
    <Card className="shadow-medium border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Structured Findings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {findings.summary && (
          <p className="text-sm text-foreground/85 leading-relaxed">{findings.summary}</p>
        )}

        {profile && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Origin</p>
              <p className="font-medium">{profile.origin || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Construction</p>
              <p className="font-medium">{profile.construction || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fiber</p>
              <p className="font-medium">{profile.fiber || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Confidence</p>
              <p className="font-medium">{formatConfidence(profile.confidence) || '—'}</p>
            </div>
          </div>
        )}

        {damages.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Damage Summary ({damages.length})</p>
            <div className="space-y-2">
              {damages.map((dmg, idx) => {
                const severity = (dmg.severity || 'moderate').toLowerCase();
                return (
                  <div key={dmg.id || idx} className="rounded-md border bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{dmg.description || 'Observed damage'}</p>
                        <p className="text-xs text-muted-foreground break-words">
                          {formatCategory(dmg.category)} • {dmg.location || 'location not specified'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={severityBadgeClass[severity] || severityBadgeClass.moderate}>
                          {severity}
                        </Badge>
                        {formatConfidence(dmg.confidence) && (
                          <Badge variant="secondary">{formatConfidence(dmg.confidence)}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {recommendedServices.length > 0 && (
          <details className="group rounded-md border bg-muted/10 p-3" open>
            <summary className="cursor-pointer list-none text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Recommended Services ({recommendedServices.length})</span>
              <span className="text-xs text-muted-foreground group-open:hidden">tap to expand</span>
            </summary>
            <div className="space-y-2 mt-3">
              {recommendedServices.map((svc, idx) => {
                const related = (svc.relatedDamageIds || [])
                  .map((id) => damageById.get(id))
                  .filter(Boolean);

                return (
                  <div key={`${svc.serviceType || 'service'}-${idx}`} className="rounded-md border bg-muted/20 p-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium break-words">{formatServiceType(svc.serviceType)}</p>
                        {svc.reason && <p className="text-xs text-muted-foreground mt-0.5 break-words">{svc.reason}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {(svc.pricingModel || 'fixed').toUpperCase()} • Qty {svc.quantity ?? '—'} {svc.unit || ''}
                        </p>
                        {related.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {related.map((dmg, i) => (
                              <Badge key={`${dmg?.id || 'dmg'}-${i}`} variant="outline" className="text-[10px]">
                                {(dmg?.severity || 'moderate').toUpperCase()} · {dmg?.location || 'damage link'}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <p className="text-sm font-semibold text-primary">{formatMoney(svc.estimatedCost, currency)}</p>
                        <p className="text-xs text-muted-foreground">@ {formatMoney(svc.unitPrice, currency)}</p>
                        {formatConfidence(svc.confidence) && (
                          <Badge variant="secondary" className="mt-1">{formatConfidence(svc.confidence)}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        {totals && (
          <div className="rounded-md border bg-primary/5 p-3 space-y-1">
            <p className="text-sm font-semibold text-foreground">Estimated Totals</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatMoney(totals.subtotal, currency)}</span>
            </div>
            {(typeof totals.estimatedRangeLow === 'number' || typeof totals.estimatedRangeHigh === 'number') && (
              <div className="flex justify-between text-sm gap-3">
                <span className="text-muted-foreground">Range</span>
                <span className="font-medium text-right">
                  {formatMoney(totals.estimatedRangeLow, currency)} – {formatMoney(totals.estimatedRangeHigh, currency)}
                </span>
              </div>
            )}
          </div>
        )}

        {reviewFlags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Review Flags
            </p>
            <div className="flex flex-wrap gap-2">
              {reviewFlags.map((flag, i) => (
                <Badge key={`${flag}-${i}`} variant="outline" className="capitalize">
                  {formatFlag(flag)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ReportContent: React.FC<ReportContentProps> = ({ report, structuredFindings, approvedEstimate }) => {
  const reportElements = useMemo(() => formatReport(report, approvedEstimate), [report, approvedEstimate]);

  return (
    <div className="space-y-4">
      {structuredFindings && <StructuredFindingsPanel findings={structuredFindings} />}
      <Card className="shadow-medium overflow-hidden">
      <CardHeader className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2 font-display">
          <Wrench className="h-5 w-5 text-primary" />
          Professional Estimate
        </CardTitle>
      </CardHeader>
      <CardContent
        className="pt-8 pb-10 px-8 md:px-12 relative"
        style={{
          background: `linear-gradient(180deg, hsl(40 20% 99%) 0%, hsl(35 15% 97%) 100%)`,
          boxShadow: 'inset 0 0 80px hsl(30 15% 92% / 0.5)',
        }}
      >
        <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary/20 rounded-tl-sm" />
        <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/20 rounded-tr-sm" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary/20 rounded-bl-sm" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary/20 rounded-br-sm" />
        <div className="max-w-none space-y-1 relative z-10 break-words overflow-x-hidden">
          {reportElements}
        </div>
      </CardContent>
      </Card>
    </div>
  );
};

function formatReport(text: string, approvedEstimate?: ApprovedEstimate | null): React.ReactNode[] {
  const hasApprovedCosts = approvedEstimate && approvedEstimate.services.length > 0;
  const cleanText = text
    .replace(/^#{1,3}\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^\* /gm, '• ')
    .replace(/^- /gm, '• ');

  const lines = cleanText.split('\n');
  const elements: React.ReactNode[] = [];
  let lineItemsBuffer: string[] = [];
  const skipCostSections = hasApprovedCosts;

  const flushLineItems = () => {
    if (skipCostSections && lineItemsBuffer.length > 0) { lineItemsBuffer = []; return; }
    if (lineItemsBuffer.length > 0) {
      elements.push(
        <div key={`items-${elements.length}`} className="bg-muted/30 rounded-lg p-5 my-4 space-y-2">
          {lineItemsBuffer.map((item, idx) => {
            const isTotal = /total|subtotal/i.test(item);
            return (
              <div key={idx} className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-base leading-relaxed ${isTotal ? 'border-t border-border pt-3 mt-3 font-semibold text-foreground' : 'text-foreground/85'}`}>
                <span className="flex-1 break-words">{item.replace(/:\s*\$[\d,.]+$/, '')}</span>
                <span className={`font-mono shrink-0 ${isTotal ? 'text-xl text-primary' : 'text-base'}`}>
                  {item.match(/\$[\d,.]+/)?.[0] || ''}
                </span>
              </div>
            );
          })}
        </div>
      );
      lineItemsBuffer = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine === '') { flushLineItems(); return; }

    if (/^[A-Z][A-Z\s&]+:?$/.test(trimmedLine) && trimmedLine.length > 3) {
      flushLineItems();
      elements.push(
        <div key={index} className="mt-10 first:mt-0">
          <h3 className="font-display text-xl font-semibold text-foreground border-b border-primary/20 pb-3 mb-5 tracking-wide">
            {trimmedLine.replace(/:$/, '')}
          </h3>
        </div>
      );
      return;
    }

    if (trimmedLine.startsWith('Dear ')) {
      flushLineItems();
      elements.push(<p key={index} className="text-foreground text-xl leading-relaxed mb-6">{trimmedLine}</p>);
      return;
    }

    if (trimmedLine.startsWith('Sincerely') || trimmedLine.startsWith('Best regards')) {
      flushLineItems();
      elements.push(
        <div key={index} className="mt-10 pt-6 border-t border-border">
          <p className="text-foreground text-lg font-medium">{trimmedLine}</p>
        </div>
      );
      return;
    }

    if (/^Rug\s*#/i.test(trimmedLine)) {
      flushLineItems();
      elements.push(
        <div key={index} className="mt-8 mb-4 p-4 bg-primary/5 rounded-lg border-l-4 border-primary">
          <h4 className="font-display text-lg font-semibold text-foreground">{trimmedLine}</h4>
        </div>
      );
      return;
    }

    if (/\$[\d,]+(\.\d{2})?/.test(trimmedLine)) { lineItemsBuffer.push(trimmedLine); return; }

    if (trimmedLine.startsWith('•')) {
      flushLineItems();
      elements.push(
        <div key={index} className="flex items-start gap-3 ml-3 mb-3">
          <span className="w-2 h-2 rounded-full bg-primary mt-2.5 flex-shrink-0" />
          <span className="text-foreground/85 text-base leading-relaxed">{trimmedLine.replace(/^•\s*/, '')}</span>
        </div>
      );
      return;
    }

    flushLineItems();
    elements.push(<p key={index} className="text-foreground/85 text-base leading-[1.8] mb-4">{line}</p>);
  });

  flushLineItems();

  if (hasApprovedCosts && approvedEstimate) {
    elements.push(
      <div key="approved-costs" className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-display text-xl font-semibold text-foreground border-b border-primary/20 pb-3 tracking-wide flex-1">
            VERIFIED SERVICES & COSTS
          </h3>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">✓ Staff Verified</span>
        </div>
        <div className="bg-muted/30 rounded-lg p-5 space-y-2">
          {approvedEstimate.services.map((service, idx) => (
            <div key={service.id || idx} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-base leading-relaxed text-foreground/85">
              <span className="flex-1 break-words">{service.name} <span className="text-xs text-muted-foreground">({service.quantity} × ${service.unitPrice.toFixed(2)})</span></span>
              <span className="font-mono text-base shrink-0">${(service.quantity * service.unitPrice).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-3 mt-3 flex justify-between items-center font-semibold text-foreground">
            <span>Total Estimate</span>
            <span className="font-mono text-xl text-primary">${approvedEstimate.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }

  return elements;
}

export default ReportContent;
