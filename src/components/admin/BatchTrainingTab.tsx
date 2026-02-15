import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { handleMutationError } from '@/lib/errorHandler';
import { batchSignUrls } from '@/hooks/useSignedUrls';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Upload, Loader2, CheckCircle, XCircle, AlertCircle, Image as ImageIcon,
  ChevronDown, ChevronUp, Save, Trash2
} from 'lucide-react';
import browserImageCompression from 'browser-image-compression';

interface BatchItem {
  id: string;
  photo_path: string;
  rug_type: string;
  analysis_result: string | null;
  status: string;
  error_message: string | null;
  corrections_applied: boolean;
  created_at: string;
}

interface CorrectionForm {
  correction_type: string;
  original_value: string;
  corrected_value: string;
  context: string;
  rug_category: string;
}

export const BatchTrainingTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [correctionForms, setCorrectionForms] = useState<Record<string, CorrectionForm[]>>({});
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 0 });

  // Fetch batch items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'batch-training-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_batch_training_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as BatchItem[];
    },
  });

  // Load signed URLs for visible items
  const loadSignedUrls = useCallback(async (paths: string[]) => {
    if (paths.length === 0) return;
    const urls = await batchSignUrls(paths);
    setSignedUrls(prev => {
      const next = new Map(prev);
      urls.forEach((url, path) => next.set(path, url));
      return next;
    });
  }, []);

  // Upload photos
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const uploadedItems: string[] = [];

    try {
      for (const file of files) {
        // Compress
        const compressed = await browserImageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 2048,
          useWebWorker: true,
        });

        const ext = file.name.split('.').pop() || 'jpg';
        const path = `training/${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('rug-photos')
          .upload(path, compressed, { contentType: compressed.type });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // Create DB record
        const { error: dbError } = await supabase
          .from('ai_batch_training_items')
          .insert({
            photo_path: path,
            created_by: user!.id,
            status: 'pending',
          });

        if (dbError) {
          console.error('DB error:', dbError);
          continue;
        }

        uploadedItems.push(path);
      }

      toast.success(`Uploaded ${uploadedItems.length} of ${files.length} photos`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'batch-training-items'] });
      await loadSignedUrls(uploadedItems);
    } catch (err) {
      handleMutationError(err, 'BatchUpload');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  // Analyze all pending items
  const handleAnalyzeAll = async () => {
    const pending = items.filter(i => i.status === 'pending');
    if (pending.length === 0) {
      toast.info('No pending photos to analyze');
      return;
    }

    setAnalyzing(true);
    setAnalysisProgress({ current: 0, total: pending.length });

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setAnalysisProgress({ current: i + 1, total: pending.length });

      // Mark as analyzing
      await supabase
        .from('ai_batch_training_items')
        .update({ status: 'analyzing' })
        .eq('id', item.id);

      try {
        const { data, error } = await supabase.functions.invoke('analyze-rug', {
          body: {
            photos: [item.photo_path],
            rugInfo: {
              clientName: 'Training Batch',
              rugNumber: `TRAIN-${item.id.slice(0, 8)}`,
              rugType: item.rug_type || 'Unknown',
            },
            userId: user!.id,
          },
        });

        if (error) throw error;

        const report = data?.report || data?.analysis || JSON.stringify(data);

        await supabase
          .from('ai_batch_training_items')
          .update({ status: 'analyzed', analysis_result: report })
          .eq('id', item.id);
      } catch (err: any) {
        await supabase
          .from('ai_batch_training_items')
          .update({ status: 'error', error_message: err?.message || 'Analysis failed' })
          .eq('id', item.id);
      }

      // Small delay between analyses to avoid rate limiting
      if (i < pending.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    setAnalyzing(false);
    queryClient.invalidateQueries({ queryKey: ['admin', 'batch-training-items'] });
    toast.success('Batch analysis complete!');
  };

  // Save corrections as global corrections
  const saveCorrectionsMutation = useMutation({
    mutationFn: async ({ itemId, corrections }: { itemId: string; corrections: CorrectionForm[] }) => {
      for (const correction of corrections) {
        if (!correction.corrected_value) continue;
        const { error } = await supabase.from('ai_global_corrections').insert({
          correction_type: correction.correction_type || 'service_correction',
          original_value: correction.original_value || null,
          corrected_value: correction.corrected_value || null,
          context: correction.context || null,
          rug_category: correction.rug_category || null,
          priority: 1,
          is_active: true,
          created_by: user!.id,
        });
        if (error) throw error;
      }

      // Mark item as reviewed
      const { error } = await supabase
        .from('ai_batch_training_items')
        .update({ status: 'reviewed', corrections_applied: true })
        .eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'batch-training-items'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'global-corrections'] });
      toast.success('Corrections saved as global standards');
    },
    onError: (err) => handleMutationError(err, 'BatchCorrections'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_batch_training_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'batch-training-items'] });
      toast.success('Item removed');
    },
    onError: (err) => handleMutationError(err, 'BatchDelete'),
  });

  // Toggle expand and load signed URL
  const toggleExpand = async (item: BatchItem) => {
    const newId = expandedItem === item.id ? null : item.id;
    setExpandedItem(newId);
    if (newId && !signedUrls.has(item.photo_path)) {
      await loadSignedUrls([item.photo_path]);
    }
    // Init correction form if needed
    if (newId && !correctionForms[item.id]) {
      setCorrectionForms(prev => ({
        ...prev,
        [item.id]: [{ correction_type: 'service_correction', original_value: '', corrected_value: '', context: '', rug_category: '' }],
      }));
    }
  };

  const addCorrectionRow = (itemId: string) => {
    setCorrectionForms(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), { correction_type: 'service_correction', original_value: '', corrected_value: '', context: '', rug_category: '' }],
    }));
  };

  const updateCorrectionRow = (itemId: string, index: number, field: keyof CorrectionForm, value: string) => {
    setCorrectionForms(prev => ({
      ...prev,
      [itemId]: prev[itemId].map((row, i) => i === index ? { ...row, [field]: value } : row),
    }));
  };

  const removeCorrectionRow = (itemId: string, index: number) => {
    setCorrectionForms(prev => ({
      ...prev,
      [itemId]: prev[itemId].filter((_, i) => i !== index),
    }));
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      case 'analyzing': return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'analyzed': return <CheckCircle className="h-4 w-4 text-amber-500" />;
      case 'reviewed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const analyzedCount = items.filter(i => i.status === 'analyzed').length;

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Training Photos</CardTitle>
          <CardDescription>
            Upload rug photos for batch AI analysis. After analysis, review results and correct mistakes to auto-create global corrections.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Label
              htmlFor="batch-upload"
              className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploading ? 'Uploading...' : 'Click to upload rug photos (up to 20)'}
              </span>
              <Input
                id="batch-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </Label>
            <Button
              onClick={handleAnalyzeAll}
              disabled={analyzing || pendingCount === 0}
              className="gap-2 shrink-0"
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              Analyze {pendingCount > 0 ? `${pendingCount} Pending` : 'All'}
            </Button>
          </div>

          {analyzing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Analyzing photo {analysisProgress.current} of {analysisProgress.total}...</span>
                <span>{Math.round((analysisProgress.current / analysisProgress.total) * 100)}%</span>
              </div>
              <Progress value={(analysisProgress.current / analysisProgress.total) * 100} />
            </div>
          )}

          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>{items.length} total</span>
            <span>·</span>
            <span>{pendingCount} pending</span>
            <span>·</span>
            <span>{analyzedCount} ready for review</span>
          </div>
        </CardContent>
      </Card>

      {/* Items List */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No training photos yet. Upload some to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <Card key={item.id} className={item.status === 'reviewed' ? 'opacity-60' : ''}>
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => toggleExpand(item)}
              >
                {statusIcon(item.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{item.photo_path.split('/').pop()}</span>
                    <Badge variant="outline" className="text-xs">{item.status}</Badge>
                    {item.corrections_applied && <Badge variant="secondary" className="text-xs">Corrected</Badge>}
                  </div>
                  {item.error_message && <p className="text-xs text-destructive mt-1">{item.error_message}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); deleteItemMutation.mutate(item.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {expandedItem === item.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {expandedItem === item.id && (
                <CardContent className="pt-0 space-y-4">
                  <Separator />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Photo */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Photo</Label>
                      {signedUrls.has(item.photo_path) ? (
                        <img
                          src={signedUrls.get(item.photo_path)}
                          alt="Training rug"
                          className="w-full max-h-96 object-contain rounded-lg border bg-muted"
                        />
                      ) : (
                        <div className="w-full h-48 flex items-center justify-center rounded-lg border bg-muted">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Analysis Result */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">AI Analysis</Label>
                      {item.analysis_result ? (
                        <div className="text-sm bg-muted/50 rounded-lg p-3 max-h-96 overflow-y-auto whitespace-pre-wrap border">
                          {item.analysis_result}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 border">
                          {item.status === 'pending' ? 'Not yet analyzed' : item.status === 'analyzing' ? 'Analysis in progress...' : 'No result'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Corrections */}
                  {item.status === 'analyzed' && !item.corrections_applied && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Corrections (auto-saved as global)</Label>
                        <Button size="sm" variant="outline" onClick={() => addCorrectionRow(item.id)}>
                          + Add Correction
                        </Button>
                      </div>

                      {(correctionForms[item.id] || []).map((row, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end p-3 rounded-lg border bg-muted/30">
                          <div>
                            <Label className="text-xs">Type</Label>
                            <select
                              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                              value={row.correction_type}
                              onChange={e => updateCorrectionRow(item.id, idx, 'correction_type', e.target.value)}
                            >
                              <option value="service_correction">Service</option>
                              <option value="price_correction">Price</option>
                              <option value="missed_issue">Missed Issue</option>
                              <option value="false_positive">False Positive</option>
                              <option value="identification_error">ID Error</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">AI Said</Label>
                            <Input
                              value={row.original_value}
                              onChange={e => updateCorrectionRow(item.id, idx, 'original_value', e.target.value)}
                              placeholder="Original"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Should Be</Label>
                            <Input
                              value={row.corrected_value}
                              onChange={e => updateCorrectionRow(item.id, idx, 'corrected_value', e.target.value)}
                              placeholder="Corrected"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Context</Label>
                            <Input
                              value={row.context}
                              onChange={e => updateCorrectionRow(item.id, idx, 'context', e.target.value)}
                              placeholder="e.g. for Persian rugs"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeCorrectionRow(item.id, idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => saveCorrectionsMutation.mutate({
                            itemId: item.id,
                            corrections: correctionForms[item.id] || [],
                          })}
                          disabled={saveCorrectionsMutation.isPending}
                          size="sm"
                          className="gap-2"
                        >
                          {saveCorrectionsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save Corrections & Mark Reviewed
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            // Mark as reviewed without corrections
                            await supabase
                              .from('ai_batch_training_items')
                              .update({ status: 'reviewed' })
                              .eq('id', item.id);
                            queryClient.invalidateQueries({ queryKey: ['admin', 'batch-training-items'] });
                            toast.success('Marked as reviewed (no corrections needed)');
                          }}
                        >
                          ✓ Looks Good
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
