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

const formatConfidence = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `${Math.round(value * 100)}%`;
};

const formatFlag = (flag: string) => flag.replace(/[_-]+/g, ' ');

const StructuredFindingsPanel: React.FC<{ findings: StructuredFindings }> = ({ findings }) => {
  const damages = Array.isArray(findings.damages) ? findings.damages : [];
  const reviewFlags = Array.isArray(findings.reviewFlags) ? findings.reviewFlags : [];
  const profile = findings.rugProfile;

  if (!profile && damages.length === 0 && reviewFlags.length === 0 && !findings.summary) {
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
                        <p className="text-xs text-muted-foreground">
                          {(dmg.category || 'other').toUpperCase()} • {dmg.location || 'location not specified'}
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
        <div className="max-w-none space-y-1 relative z-10">
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
  let skipCostSections = hasApprovedCosts;

  const flushLineItems = () => {
    if (skipCostSections && lineItemsBuffer.length > 0) { lineItemsBuffer = []; return; }
    if (lineItemsBuffer.length > 0) {
      elements.push(
        <div key={`items-${elements.length}`} className="bg-muted/30 rounded-lg p-5 my-4 space-y-2">
          {lineItemsBuffer.map((item, idx) => {
            const isTotal = /total|subtotal/i.test(item);
            return (
              <div key={idx} className={`flex justify-between items-center text-base leading-relaxed ${isTotal ? 'border-t border-border pt-3 mt-3 font-semibold text-foreground' : 'text-foreground/85'}`}>
                <span className="flex-1">{item.replace(/:\s*\$[\d,.]+$/, '')}</span>
                <span className={`font-mono ${isTotal ? 'text-xl text-primary' : 'text-base'}`}>
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
            <div key={service.id || idx} className="flex justify-between items-center text-base leading-relaxed text-foreground/85">
              <span className="flex-1">{service.name}</span>
              <span className="font-mono text-base">${(service.quantity * service.unitPrice).toFixed(2)}</span>
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
