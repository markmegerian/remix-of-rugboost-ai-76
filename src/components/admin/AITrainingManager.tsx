import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { handleMutationError } from '@/lib/errorHandler';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, ArrowUpCircle, Pencil, X, Check, MessageSquare, Sparkles, Loader2, FlaskConical } from 'lucide-react';
import { BatchTrainingTab } from './BatchTrainingTab';

const CORRECTION_TYPES = [
  { value: 'service_correction', label: 'Service Correction' },
  { value: 'price_correction', label: 'Price Correction' },
  { value: 'missed_issue', label: 'Missed Issue' },
  { value: 'false_positive', label: 'False Positive' },
  { value: 'identification_error', label: 'Identification Error' },
] as const;

type CorrectionType = typeof CORRECTION_TYPES[number]['value'];

interface GlobalCorrection {
  id: string;
  correction_type: string;
  original_value: string | null;
  corrected_value: string | null;
  context: string | null;
  rug_category: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

interface FeedbackItem {
  id: string;
  feedback_type: string;
  original_service_name: string | null;
  corrected_service_name: string | null;
  original_price: number | null;
  corrected_price: number | null;
  original_rug_identification: string | null;
  corrected_identification: string | null;
  notes: string | null;
  rug_type: string | null;
  rug_origin: string | null;
  created_at: string;
  user_id: string;
}

const emptyForm = {
  correction_type: 'service_correction' as CorrectionType,
  original_value: '',
  corrected_value: '',
  context: '',
  rug_category: '',
  priority: 1,
};

export const AITrainingManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('corrections');
  const formRef = useRef<HTMLFormElement>(null);

  // Fetch global corrections
  const { data: corrections = [], isLoading: loadingCorrections } = useQuery({
    queryKey: ['admin', 'global-corrections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_global_corrections')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as GlobalCorrection[];
    },
  });

  // Fetch per-user feedback (review queue)
  const { data: feedbackItems = [], isLoading: loadingFeedback } = useQuery({
    queryKey: ['admin', 'ai-feedback-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_analysis_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as FeedbackItem[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const payload = {
        correction_type: values.correction_type,
        original_value: values.original_value || null,
        corrected_value: values.corrected_value || null,
        context: values.context || null,
        rug_category: values.rug_category || null,
        priority: values.priority,
        is_active: true,
        created_by: user!.id,
      };

      if (values.id) {
        const { error } = await supabase
          .from('ai_global_corrections')
          .update(payload)
          .eq('id', values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_global_corrections')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'global-corrections'] });
      toast.success(editingId ? 'Correction updated' : 'Correction added');
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: (err) => handleMutationError(err, 'AITraining'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_global_corrections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'global-corrections'] });
      toast.success('Correction deleted');
    },
    onError: (err) => handleMutationError(err, 'AITraining'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('ai_global_corrections')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'global-corrections'] });
    },
    onError: (err) => handleMutationError(err, 'AITraining'),
  });

  const handleEdit = (c: GlobalCorrection) => {
    setEditingId(c.id);
    setForm({
      correction_type: c.correction_type as CorrectionType,
      original_value: c.original_value || '',
      corrected_value: c.corrected_value || '',
      context: c.context || '',
      rug_category: c.rug_category || '',
      priority: c.priority,
    });
  };

  const handlePromote = (fb: FeedbackItem) => {
    let original = '';
    let corrected = '';
    let correctionType: CorrectionType = 'service_correction';
    let rugCategory = fb.rug_type || fb.rug_origin || '';

    if (fb.feedback_type === 'price_correction') {
      correctionType = 'price_correction';
      original = fb.original_service_name ? `${fb.original_service_name}: $${fb.original_price}` : '';
      corrected = fb.corrected_service_name ? `${fb.corrected_service_name}: $${fb.corrected_price}` : `$${fb.corrected_price}`;
    } else if (fb.feedback_type === 'service_correction') {
      correctionType = 'service_correction';
      original = fb.original_service_name || '';
      corrected = fb.corrected_service_name || '';
    } else if (fb.feedback_type === 'identification_error') {
      correctionType = 'identification_error';
      original = fb.original_rug_identification || '';
      corrected = fb.corrected_identification || '';
    } else if (fb.feedback_type === 'missed_issue') {
      correctionType = 'missed_issue';
      corrected = fb.notes || '';
    } else if (fb.feedback_type === 'false_positive') {
      correctionType = 'false_positive';
      original = fb.original_service_name || '';
    }

    setEditingId(null);
    setForm({
      correction_type: correctionType,
      original_value: original,
      corrected_value: corrected,
      context: fb.notes || '',
      rug_category: rugCategory,
      priority: 1,
    });
    setActiveTab('corrections');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    toast.info('Feedback loaded into form — review and submit');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(editingId ? { ...form, id: editingId } : form);
  };

  const activeCount = corrections.filter(c => c.is_active).length;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="corrections" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Global Corrections ({activeCount})
        </TabsTrigger>
        <TabsTrigger value="review" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          User Feedback ({feedbackItems.length})
        </TabsTrigger>
        <TabsTrigger value="batch" className="gap-2">
          <FlaskConical className="h-4 w-4" />
          Batch Training
        </TabsTrigger>
      </TabsList>

      <TabsContent value="corrections" className="space-y-6">
        {/* Add / Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{editingId ? 'Edit Correction' : 'Add Global Correction'}</CardTitle>
            <CardDescription>These corrections are applied to ALL rug analyses across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Correction Type</Label>
                  <Select value={form.correction_type} onValueChange={(v) => setForm(f => ({ ...f, correction_type: v as CorrectionType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CORRECTION_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority (1-10)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Original Value</Label>
                  <Input
                    value={form.original_value}
                    onChange={e => setForm(f => ({ ...f, original_value: e.target.value }))}
                    placeholder="What the AI currently says/does"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Corrected Value</Label>
                  <Input
                    value={form.corrected_value}
                    onChange={e => setForm(f => ({ ...f, corrected_value: e.target.value }))}
                    placeholder="What it should say/do instead"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Context (optional)</Label>
                  <Textarea
                    value={form.context}
                    onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
                    placeholder="e.g. 'for Persian wool rugs', 'when fringe is under 2 inches'"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rug Category (optional)</Label>
                  <Input
                    value={form.rug_category}
                    onChange={e => setForm(f => ({ ...f, rug_category: e.target.value }))}
                    placeholder="e.g. persian, turkish, machine-made"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingId ? 'Update' : 'Add Correction'}
                </Button>
                {editingId && (
                  <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Corrections List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Corrections ({corrections.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCorrections ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : corrections.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No global corrections yet. Add one above or promote from user feedback.</p>
            ) : (
              <div className="space-y-3">
                {corrections.map(c => (
                  <div key={c.id} className={`flex items-start justify-between gap-4 p-3 rounded-lg border ${c.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{c.correction_type.replace('_', ' ')}</Badge>
                        <Badge variant="outline" className="text-xs">Priority: {c.priority}</Badge>
                        {c.rug_category && <Badge variant="outline" className="text-xs">{c.rug_category}</Badge>}
                      </div>
                      <div className="text-sm">
                        {c.original_value && <span className="text-destructive line-through mr-2">{c.original_value}</span>}
                        {c.corrected_value && <span className="text-primary font-medium">{c.corrected_value}</span>}
                      </div>
                      {c.context && <p className="text-xs text-muted-foreground">{c.context}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: c.id, is_active: checked })}
                      />
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="review" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Feedback Review Queue</CardTitle>
            <CardDescription>Browse per-user feedback and promote useful corrections to the global set.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingFeedback ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : feedbackItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No user feedback yet.</p>
            ) : (
              <div className="space-y-3">
                {feedbackItems.map(fb => (
                  <div key={fb.id} className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-card">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{fb.feedback_type.replace('_', ' ')}</Badge>
                        {fb.rug_type && <Badge variant="outline" className="text-xs">{fb.rug_type}</Badge>}
                        {fb.rug_origin && <Badge variant="outline" className="text-xs">{fb.rug_origin}</Badge>}
                        <span className="text-xs text-muted-foreground">{new Date(fb.created_at!).toLocaleDateString()}</span>
                      </div>
                      <div className="text-sm space-y-0.5">
                        {fb.original_service_name && <div><span className="text-muted-foreground">Original:</span> {fb.original_service_name}{fb.original_price != null ? ` ($${fb.original_price})` : ''}</div>}
                        {fb.corrected_service_name && <div><span className="text-muted-foreground">Corrected:</span> {fb.corrected_service_name}{fb.corrected_price != null ? ` ($${fb.corrected_price})` : ''}</div>}
                        {fb.original_rug_identification && <div><span className="text-muted-foreground">ID was:</span> {fb.original_rug_identification}</div>}
                        {fb.corrected_identification && <div><span className="text-muted-foreground">ID should be:</span> {fb.corrected_identification}</div>}
                        {fb.notes && <div className="text-xs text-muted-foreground italic">{fb.notes}</div>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1 shrink-0" onClick={() => handlePromote(fb)}>
                      <ArrowUpCircle className="h-4 w-4" /> Promote
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="batch">
        <BatchTrainingTab />
      </TabsContent>
    </Tabs>
  );
};
