import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowUpCircle, Brain, MessageSquare, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  correction_type: CorrectionType;
  original_value: string | null;
  corrected_value: string | null;
  context: string | null;
  rug_category: string | null;
  priority: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

interface UserFeedback {
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
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Fetch global corrections
  const { data: corrections = [], isLoading: correctionsLoading } = useQuery({
    queryKey: ['ai-global-corrections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_global_corrections')
        .select('*')
        .order('priority', { ascending: false });
      if (error) throw error;
      return data as GlobalCorrection[];
    },
  });

  // Fetch user feedback queue
  const { data: feedbackQueue = [], isLoading: feedbackLoading } = useQuery({
    queryKey: ['ai-feedback-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_analysis_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as UserFeedback[];
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
      queryClient.invalidateQueries({ queryKey: ['ai-global-corrections'] });
      toast.success(editingId ? 'Correction updated' : 'Correction added');
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_global_corrections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-global-corrections'] });
      toast.success('Correction deleted');
    },
    onError: (err: Error) => toast.error(err.message),
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
      queryClient.invalidateQueries({ queryKey: ['ai-global-corrections'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(false);
  };

  const openEdit = (c: GlobalCorrection) => {
    setForm({
      correction_type: c.correction_type,
      original_value: c.original_value || '',
      corrected_value: c.corrected_value || '',
      context: c.context || '',
      rug_category: c.rug_category || '',
      priority: c.priority,
    });
    setEditingId(c.id);
    setFormOpen(true);
  };

  const promoteFromFeedback = (fb: UserFeedback) => {
    let original = '';
    let corrected = '';
    let context = '';
    const type = fb.feedback_type as CorrectionType;

    if (fb.feedback_type === 'price_correction') {
      original = fb.original_service_name ? `${fb.original_service_name}: $${fb.original_price}` : '';
      corrected = fb.corrected_price ? `$${fb.corrected_price}` : '';
    } else if (fb.feedback_type === 'service_correction') {
      original = fb.original_service_name || '';
      corrected = fb.corrected_service_name || '';
    } else if (fb.feedback_type === 'identification_error') {
      original = fb.original_rug_identification || '';
      corrected = fb.corrected_identification || '';
    } else if (fb.feedback_type === 'missed_issue') {
      corrected = fb.notes || '';
    } else if (fb.feedback_type === 'false_positive') {
      original = fb.original_service_name || '';
    }

    if (fb.rug_type) context = `for ${fb.rug_type} rugs`;

    setForm({
      correction_type: type,
      original_value: original,
      corrected_value: corrected,
      context,
      rug_category: fb.rug_origin || '',
      priority: 1,
    });
    setEditingId(null);
    setFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(editingId ? { ...form, id: editingId } : form);
  };

  const typeLabel = (type: string) =>
    CORRECTION_TYPES.find(t => t.value === type)?.label || type;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="corrections" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="corrections" className="gap-2">
            <Brain className="h-4 w-4" />
            Global Corrections ({corrections.length})
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            User Feedback Queue ({feedbackQueue.length})
          </TabsTrigger>
        </TabsList>

        {/* GLOBAL CORRECTIONS TAB */}
        <TabsContent value="corrections" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              These corrections are applied to ALL AI rug analyses across the platform.
            </p>
            <Dialog open={formOpen} onOpenChange={(o) => { if (!o) resetForm(); else setFormOpen(true); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Add Correction
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Edit' : 'Add'} Global Correction</DialogTitle>
                  <DialogDescription>
                    This correction will improve AI analysis accuracy for all users.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Label>Original Value</Label>
                    <Input value={form.original_value} onChange={e => setForm(f => ({ ...f, original_value: e.target.value }))} placeholder="What the AI currently says/does" />
                  </div>
                  <div className="space-y-2">
                    <Label>Corrected Value</Label>
                    <Input value={form.corrected_value} onChange={e => setForm(f => ({ ...f, corrected_value: e.target.value }))} placeholder="What it should say/do instead" />
                  </div>
                  <div className="space-y-2">
                    <Label>Context</Label>
                    <Textarea value={form.context} onChange={e => setForm(f => ({ ...f, context: e.target.value }))} placeholder='e.g. "for Persian wool rugs" or "when fringe is under 2 inches"' rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rug Category (optional)</Label>
                      <Input value={form.rug_category} onChange={e => setForm(f => ({ ...f, rug_category: e.target.value }))} placeholder="e.g. persian, turkish" />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority (1-10)</Label>
                      <Input type="number" min={1} max={10} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 1 }))} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {editingId ? 'Update' : 'Add'} Correction
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {correctionsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : corrections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Brain className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No global corrections yet. Add one or promote from user feedback.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {corrections.map(c => (
                <Card key={c.id} className={!c.is_active ? 'opacity-60' : ''}>
                  <CardContent className="py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline">{typeLabel(c.correction_type)}</Badge>
                        <Badge variant={c.is_active ? 'default' : 'secondary'} className="text-xs">
                          Priority {c.priority}
                        </Badge>
                        {c.rug_category && <Badge variant="secondary" className="text-xs">{c.rug_category}</Badge>}
                      </div>
                      {c.original_value && (
                        <p className="text-sm"><span className="text-muted-foreground">From:</span> {c.original_value}</p>
                      )}
                      {c.corrected_value && (
                        <p className="text-sm"><span className="text-muted-foreground">To:</span> <span className="font-medium">{c.corrected_value}</span></p>
                      )}
                      {c.context && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{c.context}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={c.is_active}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: c.id, is_active: checked })}
                        title={c.is_active ? 'Active' : 'Inactive'}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* USER FEEDBACK QUEUE TAB */}
        <TabsContent value="feedback" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Review individual user corrections and promote the best ones to global standards.
          </p>

          {feedbackLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : feedbackQueue.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No user feedback submissions yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {feedbackQueue.map(fb => (
                <Card key={fb.id}>
                  <CardContent className="py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline">{typeLabel(fb.feedback_type)}</Badge>
                        {fb.rug_type && <Badge variant="secondary" className="text-xs">{fb.rug_type}</Badge>}
                        {fb.rug_origin && <Badge variant="secondary" className="text-xs">{fb.rug_origin}</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {new Date(fb.created_at!).toLocaleDateString()}
                        </span>
                      </div>
                      {fb.original_service_name && (
                        <p className="text-sm"><span className="text-muted-foreground">Service:</span> {fb.original_service_name}
                          {fb.corrected_service_name && <> → <span className="font-medium">{fb.corrected_service_name}</span></>}
                        </p>
                      )}
                      {fb.original_price != null && (
                        <p className="text-sm"><span className="text-muted-foreground">Price:</span> ${fb.original_price}
                          {fb.corrected_price != null && <> → <span className="font-medium">${fb.corrected_price}</span></>}
                        </p>
                      )}
                      {fb.original_rug_identification && (
                        <p className="text-sm"><span className="text-muted-foreground">ID:</span> {fb.original_rug_identification}
                          {fb.corrected_identification && <> → <span className="font-medium">{fb.corrected_identification}</span></>}
                        </p>
                      )}
                      {fb.notes && <p className="text-xs text-muted-foreground mt-1">{fb.notes}</p>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 shrink-0"
                      onClick={() => promoteFromFeedback(fb)}
                      title="Promote to global correction"
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                      Promote
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
