import React from 'react';
import { Plus, Loader2, Eye, Download, Trash2, Edit2, CheckCircle, Clock, Sparkles, FlaskConical, Image, FileDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatusGatedButton from '@/components/StatusGatedButton';
import RugPhoto from '@/components/RugPhoto';

interface Rug {
  id: string;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  notes: string | null;
  photo_urls: string[] | null;
  analysis_report: string | null;
  image_annotations: unknown;
  system_services: unknown;
  structured_findings: unknown;
  created_at: string;
  estimate_approved?: boolean;
}

interface ActionState {
  enabled: boolean;
  reason?: string;
}

interface RugGalleryCardProps {
  rugs: Rug[];
  actions: {
    analyzeRug: ActionState;
    addRug: ActionState;
    editRug: ActionState;
    deleteRug: ActionState;
  };
  analyzingAll: boolean;
  analyzingRugId: string | null;
  onAnalyzeAll: () => void;
  onAnalyzeRug: (rug: Rug) => void;
  onViewReport: (rug: Rug) => void;
  onDownloadPDF: (rug: Rug) => void;
  onDownloadPhotosPDF: () => void;
  onEditRug: (rug: Rug) => void;
  onDeleteRug: (rugId: string) => void;
  onAddRug: () => void;
  onCompareRug: (rug: Rug) => void;
}

const RugGalleryCard: React.FC<RugGalleryCardProps> = ({
  rugs,
  actions,
  analyzingAll,
  analyzingRugId,
  onAnalyzeAll,
  onAnalyzeRug,
  onViewReport,
  onDownloadPDF,
  onDownloadPhotosPDF,
  onEditRug,
  onDeleteRug,
  onAddRug,
  onCompareRug,
}) => {
  return (
    <Card>
      <CardHeader className="pb-2 md:pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Image className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <span className="truncate">
              Rugs ({rugs.length}) • {rugs.reduce((acc, r) => acc + (r.photo_urls?.length || 0), 0)} photos
            </span>
          </CardTitle>
          {/* Mobile: Actions in a row, hidden on mobile (in bottom bar) */}
          <div className="hidden md:flex items-center gap-2">
            {rugs.length > 0 && rugs.some(r => (r.photo_urls?.length || 0) > 0) && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={onDownloadPhotosPDF}
              >
                <FileDown className="h-4 w-4" />
                Photos PDF
              </Button>
            )}
            {rugs.length > 0 && rugs.some(r => !r.analysis_report) && (
              <StatusGatedButton 
                actionState={actions.analyzeRug}
                variant="warm"
                size="sm"
                className="gap-2"
                onClick={onAnalyzeAll}
                disabled={analyzingAll || !actions.analyzeRug.enabled}
              >
                {analyzingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze All
                  </>
                )}
              </StatusGatedButton>
            )}
            <StatusGatedButton 
              actionState={actions.addRug}
              size="sm" 
              className="gap-1"
              onClick={() => actions.addRug.enabled && onAddRug()}
            >
              <Plus className="h-4 w-4" />
              Add Rug
            </StatusGatedButton>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {rugs.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-muted-foreground">
            <Image className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
            <p className="text-sm md:text-base">No rugs added yet</p>
            <p className="text-xs md:text-sm mt-1">Tap the + button to add your first rug</p>
          </div>
        ) : (
          /* Mobile: Full-width stacked cards, Desktop: Grid */
          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
            {rugs.map((rug) => (
              <div key={rug.id} className="border rounded-lg p-3 space-y-2 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{rug.rug_number}</p>
                    <p className="text-xs text-muted-foreground truncate">{rug.rug_type}</p>
                  </div>
                  {rug.analysis_report ? (
                    <Badge variant="outline" className="border-success text-success gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Analyzed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </div>
                {/* Photo thumbnails */}
                {rug.photo_urls && rug.photo_urls.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto">
                    {rug.photo_urls.slice(0, 4).map((url, idx) => (
                      <RugPhoto
                        key={idx}
                        filePath={url}
                        alt={`${rug.rug_number} photo ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded border flex-shrink-0"
                        loadingClassName="w-20 h-20"
                      />
                    ))}
                    {rug.photo_urls.length > 4 && (
                      <div className="w-20 h-20 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                        +{rug.photo_urls.length - 4}
                      </div>
                    )}
                  </div>
                )}
                {/* Actions - Mobile touch-friendly */}
                <div className="flex items-center gap-2 pt-2">
                  {rug.analysis_report ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onViewReport(rug)} 
                        className="flex-1 min-h-[44px] gap-1.5"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden xs:inline">View</span> Report
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onDownloadPDF(rug)}
                        className="min-h-[44px] min-w-[44px] p-0"
                        aria-label="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <StatusGatedButton 
                        actionState={actions.analyzeRug}
                        variant="outline" 
                        size="sm" 
                        onClick={() => onAnalyzeRug(rug)} 
                        disabled={!!analyzingRugId || analyzingAll} 
                        className="flex-1 min-h-[44px] gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        Analyze
                      </StatusGatedButton>
                      <StatusGatedButton 
                        actionState={actions.analyzeRug}
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onCompareRug(rug)} 
                        disabled={!!analyzingRugId || analyzingAll}
                        showLockIcon={false}
                        className="min-h-[44px] min-w-[44px]"
                        aria-label="Compare models"
                      >
                        <FlaskConical className="h-3 w-3" />
                      </StatusGatedButton>
                    </>
                  )}
                  <StatusGatedButton 
                    actionState={actions.editRug}
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onEditRug(rug)}
                    showLockIcon={false}
                    className="min-h-[44px] min-w-[44px]"
                    aria-label="Edit rug"
                  >
                    <Edit2 className="h-3 w-3" />
                  </StatusGatedButton>
                  <StatusGatedButton 
                    actionState={actions.deleteRug}
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onDeleteRug(rug.id)} 
                    className="text-destructive hover:text-destructive min-h-[44px] min-w-[44px]"
                    showLockIcon={false}
                    aria-label="Delete rug"
                  >
                    <Trash2 className="h-3 w-3" />
                  </StatusGatedButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RugGalleryCard;
