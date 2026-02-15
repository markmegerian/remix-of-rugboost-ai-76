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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Upload, Loader2, CheckCircle, XCircle, AlertCircle, Image as ImageIcon,
  ChevronDown, ChevronUp, Save, Trash2, RotateCcw, Undo2, Plus, FolderOpen
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
  session_label: string;
}

interface PhotoAnnotation {
  label: string;
  location: string;
  x: number;
  y: number;
}

interface ImageAnnotation {
  photoIndex: number;
  annotations: PhotoAnnotation[];
}

interface StructuredResult {
  report: string;
  imageAnnotations: ImageAnnotation[];
  edgeSuggestions?: any[];
  modelUsed?: string;
  processingTimeMs?: number;
}

interface CorrectionForm {
  correction_type: string;
  original_value: string;
  corrected_value: string;
  context: string;
  rug_category: string;
}

interface Session {
  label: string;
  items: BatchItem[];
  status: string; // derived: pending, analyzing, analyzed, reviewed, error, mixed
}

/** Try to parse analysis_result as structured JSON, fall back to plain text */
function parseAnalysisResult(raw: string | null): StructuredResult | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.report) return parsed as StructuredResult;
  } catch { /* not JSON */ }
  return { report: raw, imageAnnotations: [] };
}

function deriveSessionStatus(items: BatchItem[]): string {
  const statuses = new Set(items.map(i => i.status));
  if (statuses.size === 1) return [...statuses][0];
  if (statuses.has('analyzing')) return 'analyzing';
  if (statuses.has('error') && statuses.size === 1) return 'error';
  if (statuses.has('analyzed')) return 'analyzed';
  return 'mixed';
}

function groupBySession(items: BatchItem[]): Session[] {
  const map = new Map<string, BatchItem[]>();
  for (const item of items) {
    const label = item.session_label || 'Unnamed';
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries())
    .map(([label, items]) => ({ label, items, status: deriveSessionStatus(items) }))
    .sort((a, b) => {
      const aDate = Math.max(...a.items.map(i => new Date(i.created_at).getTime()));
      const bDate = Math.max(...b.items.map(i => new Date(i.created_at).getTime()));
      return bDate - aDate;
    });
}

export const BatchTrainingTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [sessionLabel, setSessionLabel] = useState('');
  const [rugType, setRugType] = useState('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [correctionForms, setCorrectionForms] = useState<Record<string, CorrectionForm[]>>({});

  // Fetch all batch items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin', 'batch-training-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_batch_training_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as BatchItem[];
    },
  });

  const sessions = groupBySession(items);

  const loadSignedUrls = useCallback(async (paths: string[]) => {
    const missing = paths.filter(p => !signedUrls.has(p));
    if (missing.length === 0) return;
    const urls = await batchSignUrls(missing);
    setSignedUrls(prev => {
      const next = new Map(prev);
      urls.forEach((url, path) => next.set(path, url));
      return next;
    });
  }, [signedUrls]);

  // Upload photos into a session
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const label = sessionLabel.trim() || `Session ${new Date().toLocaleString()}`;
    setUploading(true);
    const uploadedPaths: string[] = [];

    try {
      for (const file of files) {
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

        const { error: dbError } = await supabase
          .from('ai_batch_training_items')
          .insert({
            photo_path: path,
            created_by: user!.id,
            status: 'pending',
            session_label: label,
            rug_type: rugType.trim() || 'Unknown',
          });

        if (dbError) {
          console.error('DB error:', dbError);
          continue;
        }

        uploadedPaths.push(path);
      }

      toast.success(`Uploaded ${uploadedPaths.length} photos to "${label}"`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'batch-training-items'] });
      await loadSignedUrls(uploadedPaths);
      setSessionLabel('');
    } catch (err) {
      handleMutationError(err, 'BatchUpload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Analyze an entire session — send ALL photos together (like a real job)
  const handleAnalyzeSession = async (session: Session) => {
    const pendingOrError = session.items.filter(i => i.status === 'pending' || i.status === 'error');
    if (pendingOrError.length === 0 && session.status !== 'error') {
      toast.info('No pending photos in this session');
      return;
    }

    setAnalyzing(true);
    const allItems = session.items;
    const allIds = allItems.map(i => i.id);
    const allPaths = allItems.map(i => i.photo_path);

    // Batch mark all as analyzing in one query
    await supabase.from('ai_batch_training_items')
      .update({ status: 'analyzing', error_message: null })
      .in('id', allIds);
    queryClient.invalidateQueries({ queryKey: ['admin', 'batch-training-items'] });

    try {
      // Add timeout — 3 minutes max for AI analysis
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);

      const { data, error } = await supabase.functions.invoke('analyze-rug', {
        body: {
          photos: allPaths,
          rugInfo: {
            clientName: 'Training Batch',
            rugNumber: `TRAIN-${session.label.slice(0, 12)}`,
            rugType: allItems[0]?.rug_type || 'Unknown',
          },
          userId: user!.id,
        },
      });

      clearTimeout(timeout);

      if (error) throw error;

      // Store the FULL structured response as JSON
      const structuredResult: StructuredResult = {
        report: data?.report || data?.analysis || JSON.stringify(data),
        imageAnnotations: data?.imageAnnotations || [],
        edgeSuggestions: data?.edgeSuggestions || [],
        modelUsed: data?.modelUsed,
        processingTimeMs: data?.processingTimeMs,
      };
      const resultJson = JSON.stringify(structuredResult);

      // Batch update all items to analyzed in one query
      await supabase.from('ai_batch_training_items')
        .update({ status: 'analyzed', analysis_result: resultJson })
        .in('id', allIds);

      toast.success('Session analysis complete!');
    } catch (err: any) {
      const errorMsg = err?.name === 'AbortError'
        ? 'Analysis timed out after 3 minutes. Try with fewer photos.'
        : (err?.message || 'Analysis failed');

      // Batch update all to error in one query
      await supabase.from('ai_batch_training_items')
        .update({ status: 'error', error_message: errorMsg })
        .in('id', allIds);

      toast.error('Analysis failed: ' + errorMsg);
    }

    setAnalyzing(false);
    queryClient.invalidateQueries({ queryKey: ['admin', 'batch-training-items'] });
  };

  // Delete an entire session
  const deleteSessionMutation = useMutation({
    mutationFn: async (session: Session) => {
      const allIds = session.items.map(i => i.id);
      const allPaths = session.items.map(i => i.photo_path);
      // Batch delete DB rows
      await supabase.from('ai_batch_training_items').delete().in('id', allIds);
      // Batch delete storage files
      await supabase.storage.from('rug-photos').remove(allPaths);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'batch-training-items'] });
      toast.success('Session deleted');
    },
    onError: (err) => handleMutationError(err, 'BatchDelete'),
  });

  // Save corrections as global corrections
  const saveCorrectionsMutation = useMutation({
    mutationFn: async ({ session, corrections }: { session: Session; corrections: CorrectionForm[] }) => {
      const validCorrections = corrections.filter(c => c.corrected_value);
      if (validCorrections.length > 0) {
        const { error } = await supabase.from('ai_global_corrections').insert(
          validCorrections.map(c => ({
            correction_type: c.correction_type || 'service_correction',
            original_value: c.original_value || null,
            corrected_value: c.corrected_value || null,
            context: c.context || null,
            rug_category: c.rug_category || null,
            priority: 1,
            is_active: true,
            created_by: user!.id,
          }))
        );
        if (error) throw error;
      }

      // Batch mark all items as reviewed
      const allIds = session.items.map(i => i.id);
      await supabase.from('ai_batch_training_items')
        .update({ status: 'reviewed', corrections_applied: true })
        .in('id', allIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'batch-training-items'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'global-corrections'] });
      toast.success('Corrections saved as global standards');
    },
    onError: (err) => handleMutationError(err, 'BatchCorrections'),
  });

  // Revert session to analyzed
  const revertSessionMutation = useMutation({
    mutationFn: async (session: Session) => {
      const allIds = session.items.map(i => i.id);
      await supabase.from('ai_batch_training_items')
        .update({ status: 'analyzed', corrections_applied: false })
        .in('id', allIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'batch-training-items'] });
      toast.success('Session reverted to review');
    },
    onError: (err) => handleMutationError(err, 'BatchRevert'),
  });

  // Toggle expand and load signed URLs for all photos in session
  const toggleExpandSession = async (session: Session) => {
    const newLabel = expandedSession === session.label ? null : session.label;
    setExpandedSession(newLabel);
    if (newLabel) {
      await loadSignedUrls(session.items.map(i => i.photo_path));
      if (!correctionForms[session.label]) {
        setCorrectionForms(prev => ({
          ...prev,
          [session.label]: [{ correction_type: 'service_correction', original_value: '', corrected_value: '', context: '', rug_category: '' }],
        }));
      }
    }
  };

  const addCorrectionRow = (sessionLabel: string) => {
    setCorrectionForms(prev => ({
      ...prev,
      [sessionLabel]: [...(prev[sessionLabel] || []), { correction_type: 'service_correction', original_value: '', corrected_value: '', context: '', rug_category: '' }],
    }));
  };

  const updateCorrectionRow = (sessionLabel: string, index: number, field: keyof CorrectionForm, value: string) => {
    setCorrectionForms(prev => ({
      ...prev,
      [sessionLabel]: prev[sessionLabel].map((row, i) => i === index ? { ...row, [field]: value } : row),
    }));
  };

  const removeCorrectionRow = (sessionLabel: string, index: number) => {
    setCorrectionForms(prev => ({
      ...prev,
      [sessionLabel]: prev[sessionLabel].filter((_, i) => i !== index),
    }));
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      case 'analyzing': return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'analyzed': return <CheckCircle className="h-4 w-4 text-amber-500" />;
      case 'reviewed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'mixed': return <AlertCircle className="h-4 w-4 text-amber-400" />;
      default: return null;
    }
  };

  const pendingSessions = sessions.filter(s => s.status === 'pending' || s.status === 'error');

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create Training Session</CardTitle>
          <CardDescription>
            Upload all photos of a single rug as one session. The AI will analyze them together — exactly like a real job — so you can see its full reasoning across all photos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Session Name</Label>
              <Input
                value={sessionLabel}
                onChange={e => setSessionLabel(e.target.value)}
                placeholder="e.g. Persian Tabriz Test #1"
              />
            </div>
            <div className="space-y-2">
              <Label>Rug Type</Label>
              <Input
                value={rugType}
                onChange={e => setRugType(e.target.value)}
                placeholder="e.g. Persian, Turkish, Machine-made"
              />
            </div>
          </div>

          <Label
            htmlFor="batch-upload"
            className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {uploading ? 'Uploading...' : 'Upload all photos for this rug (front, back, fringes, edges, issues)'}
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

          <div className="flex gap-3 text-sm text-muted-foreground">
            <span>{sessions.length} sessions</span>
            <span>·</span>
            <span>{items.length} total photos</span>
            <span>·</span>
            <span>{pendingSessions.length} awaiting analysis</span>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No training sessions yet. Create one above to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <Card key={session.label} className={session.status === 'reviewed' ? 'opacity-60' : ''}>
              {/* Session Header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => toggleExpandSession(session)}
              >
                {statusIcon(session.status)}
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">{session.label}</span>
                    <Badge variant="outline" className="text-xs">{session.items.length} photos</Badge>
                    <Badge variant="outline" className="text-xs">{session.status}</Badge>
                    {session.items[0]?.rug_type && session.items[0].rug_type !== 'Unknown' && (
                      <Badge variant="secondary" className="text-xs">{session.items[0].rug_type}</Badge>
                    )}
                    {session.items[0]?.corrections_applied && <Badge variant="secondary" className="text-xs">Corrected</Badge>}
                  </div>
                  {session.status === 'error' && (
                    <p className="text-xs text-destructive mt-1">{session.items.find(i => i.error_message)?.error_message}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(session.status === 'pending' || session.status === 'error') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 h-8"
                      disabled={analyzing}
                      onClick={(e) => { e.stopPropagation(); handleAnalyzeSession(session); }}
                    >
                      {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      Analyze
                    </Button>
                  )}
                  {session.status === 'reviewed' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); revertSessionMutation.mutate(session); }}
                      title="Revert to review"
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); deleteSessionMutation.mutate(session); }}
                    title="Delete session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {expandedSession === session.label ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>

              {/* Expanded Session Content — consolidated view */}
              {expandedSession === session.label && (() => {
                const structured = parseAnalysisResult(session.items[0]?.analysis_result);
                const annotations = structured?.imageAnnotations || [];

                return (
                <CardContent className="pt-0 space-y-4">
                  <Separator />

                  {/* Metadata bar */}
                  {structured?.modelUsed && (
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>Model: {structured.modelUsed}</span>
                      {structured.processingTimeMs && <span>· {(structured.processingTimeMs / 1000).toFixed(1)}s</span>}
                      <span>· {annotations.reduce((sum, a) => sum + a.annotations.length, 0)} annotations</span>
                    </div>
                  )}

                  {/* Photo Gallery with annotation markers */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Photos ({session.items.length}) — analyzed together as one rug
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {session.items.map((item, idx) => {
                        const photoAnnotations = annotations.find(a => a.photoIndex === idx)?.annotations || [];
                        return (
                          <div key={item.id} className="space-y-1">
                            <div className="relative aspect-square rounded-lg border overflow-hidden bg-muted group">
                              {signedUrls.has(item.photo_path) ? (
                                <img
                                  src={signedUrls.get(item.photo_path)}
                                  alt={`Photo ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                              )}
                              {/* Annotation markers overlaid on photo */}
                              {photoAnnotations.map((ann, annIdx) => (
                                <div
                                  key={annIdx}
                                  className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-destructive/90 text-destructive-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-white shadow-lg cursor-default"
                                  style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                                  title={ann.label}
                                >
                                  {annIdx + 1}
                                </div>
                              ))}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 text-center">
                                Photo {idx + 1}{photoAnnotations.length > 0 ? ` · ${photoAnnotations.length} issues` : ''}
                              </div>
                            </div>
                            {/* Annotation labels below each photo */}
                            {photoAnnotations.length > 0 && (
                              <div className="space-y-0.5">
                                {photoAnnotations.map((ann, annIdx) => (
                                  <div key={annIdx} className="flex items-start gap-1.5 text-[11px]">
                                    <span className="shrink-0 w-4 h-4 rounded-full bg-destructive/90 text-destructive-foreground text-[9px] font-bold flex items-center justify-center mt-0.5">
                                      {annIdx + 1}
                                    </span>
                                    <span className="text-muted-foreground leading-tight">{ann.label}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Edge Suggestions */}
                  {structured?.edgeSuggestions && structured.edgeSuggestions.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Edge-Specific Decisions</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {structured.edgeSuggestions.map((es: any, idx: number) => (
                          <div key={idx} className="text-xs p-2 rounded-lg border bg-muted/30 space-y-0.5">
                            <div className="font-medium capitalize">{es.serviceType}: {es.edges?.join(', ')}</div>
                            <div className="text-muted-foreground">{es.rationale}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Consolidated AI Analysis Report */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">AI Analysis & Reasoning</Label>
                    {structured?.report ? (
                      <div className="text-sm bg-muted/50 rounded-lg p-4 max-h-[600px] overflow-y-auto whitespace-pre-wrap border leading-relaxed">
                        {structured.report}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 border">
                        {session.status === 'pending' ? 'Not yet analyzed — click "Analyze" to run the AI on all photos together.'
                          : session.status === 'analyzing' ? 'Analysis in progress...'
                          : 'No result available'}
                      </div>
                    )}
                  </div>

                  {/* Corrections Section */}
                  {session.status === 'analyzed' && !session.items[0]?.corrections_applied && (
                    <div className="space-y-3">
                      <Separator />
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Corrections (auto-promoted to global)</Label>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => addCorrectionRow(session.label)}>
                          <Plus className="h-3.5 w-3.5" /> Add Correction
                        </Button>
                      </div>

                      {(correctionForms[session.label] || []).map((row, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end p-3 rounded-lg border bg-muted/30">
                          <div>
                            <Label className="text-xs">Type</Label>
                            <select
                              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                              value={row.correction_type}
                              onChange={e => updateCorrectionRow(session.label, idx, 'correction_type', e.target.value)}
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
                              onChange={e => updateCorrectionRow(session.label, idx, 'original_value', e.target.value)}
                              placeholder="Original"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Should Be</Label>
                            <Input
                              value={row.corrected_value}
                              onChange={e => updateCorrectionRow(session.label, idx, 'corrected_value', e.target.value)}
                              placeholder="Corrected"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Context</Label>
                            <Input
                              value={row.context}
                              onChange={e => updateCorrectionRow(session.label, idx, 'context', e.target.value)}
                              placeholder="e.g. for Persian rugs"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeCorrectionRow(session.label, idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => saveCorrectionsMutation.mutate({
                            session,
                            corrections: correctionForms[session.label] || [],
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
                            const allIds = session.items.map(i => i.id);
                            await supabase.from('ai_batch_training_items')
                              .update({ status: 'reviewed' })
                              .in('id', allIds);
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
                );
              })()}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
