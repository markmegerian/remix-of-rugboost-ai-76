import React, { useState, memo } from 'react';
import { FileText, DollarSign, ArrowLeft, Download, ClipboardList, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { generatePDF } from '@/lib/pdfGenerator';
import PhotoAnnotationEditor from '@/components/analysis/PhotoAnnotationEditor';
import ReportContent from '@/components/analysis/ReportContent';
import type { AnalysisReportProps, PhotoAnnotations } from '@/components/analysis/types';

const AnalysisReportComponent: React.FC<AnalysisReportProps> = ({
  report,
  rugInfo,
  photoUrls = [],
  imageAnnotations = [],
  onNewInspection,
  onReviewEstimate,
  onReanalyze,
  isReanalyzing = false,
  onAnnotationsChange,
  approvedEstimate,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [localAnnotations, setLocalAnnotations] = useState<PhotoAnnotations[]>(imageAnnotations);

  // Sync local state when props change
  React.useEffect(() => {
    setLocalAnnotations(imageAnnotations);
  }, [imageAnnotations]);

  const handleDownloadPDF = async () => {
    try {
      const dimMatch = rugInfo.dimensions.match(/([0-9.]+)'?\s*[×x]\s*([0-9.]+)/);
      const length = dimMatch ? parseFloat(dimMatch[1]) : null;
      const width = dimMatch ? parseFloat(dimMatch[2]) : null;

      await generatePDF({
        id: '',
        client_name: rugInfo.clientName,
        client_email: null,
        client_phone: null,
        rug_number: rugInfo.rugNumber,
        rug_type: rugInfo.rugType,
        length,
        width,
        notes: null,
        photo_urls: null,
        analysis_report: report,
        created_at: new Date().toISOString(),
      });
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleSaveAnnotations = (annotations: PhotoAnnotations[]) => {
    if (onAnnotationsChange) {
      onAnnotationsChange(annotations);
      toast.success('Markers saved successfully!');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onNewInspection} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          New Inspection
        </Button>
        {onReanalyze && (
          <Button variant="outline" size="sm" onClick={onReanalyze} disabled={isReanalyzing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isReanalyzing ? 'animate-spin' : ''}`} />
            {isReanalyzing ? 'Re-analyzing...' : 'Re-analyze'}
          </Button>
        )}
      </div>

      {/* Rug Summary Card */}
      <Card className="shadow-card border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display">
            <FileText className="h-5 w-5 text-primary" />
            Inspection Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{rugInfo.clientName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rug Number</p>
              <p className="font-medium">{rugInfo.rugNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{rugInfo.rugType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Dimensions</p>
              <p className="font-medium">{rugInfo.dimensions}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Annotated Photos */}
      <PhotoAnnotationEditor
        photoUrls={photoUrls}
        imageAnnotations={imageAnnotations}
        localAnnotations={localAnnotations}
        editMode={editMode}
        onEditModeChange={setEditMode}
        onAnnotationsChange={onAnnotationsChange ? handleSaveAnnotations : undefined}
        onLocalAnnotationsChange={setLocalAnnotations}
      />

      {/* Analysis Report */}
      <ReportContent report={report} approvedEstimate={approvedEstimate} />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="default" size="lg" className="flex-1 gap-2" onClick={handleDownloadPDF}>
          <Download className="h-4 w-4" />
          Download PDF Report
        </Button>
        {onReviewEstimate && (
          <Button variant="warm" size="lg" className="flex-1 gap-2" onClick={onReviewEstimate}>
            <ClipboardList className="h-4 w-4" />
            Review Estimate
          </Button>
        )}
      </div>
    </div>
  );
};

const AnalysisReport = memo(AnalysisReportComponent);
AnalysisReport.displayName = 'AnalysisReport';

export default AnalysisReport;
