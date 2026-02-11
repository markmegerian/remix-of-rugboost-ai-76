import React, { useMemo } from 'react';
import { Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApprovedEstimate } from './types';

interface ReportContentProps {
  report: string;
  approvedEstimate?: ApprovedEstimate | null;
}

const ReportContent: React.FC<ReportContentProps> = ({ report, approvedEstimate }) => {
  const reportElements = useMemo(() => formatReport(report, approvedEstimate), [report, approvedEstimate]);

  return (
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
