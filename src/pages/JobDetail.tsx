import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, ArrowLeft, Plus, Loader2, Eye, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { generatePDF } from '@/lib/pdfGenerator';
import RugForm from '@/components/RugForm';
import AnalysisReport from '@/components/AnalysisReport';

interface Job {
  id: string;
  job_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

interface Rug {
  id: string;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  notes: string | null;
  photo_urls: string[] | null;
  analysis_report: string | null;
  created_at: string;
}

const JobDetail = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [rugs, setRugs] = useState<Rug[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingRug, setIsAddingRug] = useState(false);
  const [analyzingRug, setAnalyzingRug] = useState(false);
  const [selectedRug, setSelectedRug] = useState<Rug | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && jobId) {
      fetchJobDetails();
    }
  }, [user, jobId]);

  const fetchJobDetails = async () => {
    setLoading(true);
    try {
      // Fetch job
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (jobError) throw jobError;
      if (!jobData) {
        toast.error('Job not found');
        navigate('/dashboard');
        return;
      }

      setJob(jobData);

      // Fetch rugs for this job
      const { data: rugsData, error: rugsError } = await supabase
        .from('inspections')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (rugsError) throw rugsError;
      setRugs(rugsData || []);
    } catch (error) {
      console.error('Error fetching job details:', error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const uploadPhotos = async (photos: File[]): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const photo of photos) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${photo.name}`;
      
      const { data, error } = await supabase.storage
        .from('rug-photos')
        .upload(fileName, photo, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Upload error:', error);
        throw new Error(`Failed to upload ${photo.name}`);
      }
      
      const { data: urlData } = supabase.storage
        .from('rug-photos')
        .getPublicUrl(data.path);
      
      uploadedUrls.push(urlData.publicUrl);
    }
    
    return uploadedUrls;
  };

  const handleAddRug = async (
    formData: { rugNumber: string; length: string; width: string; rugType: string; notes: string },
    photos: File[]
  ) => {
    if (!user || !job) return;

    setAnalyzingRug(true);
    
    try {
      toast.info('Uploading photos...');
      const photoUrls = await uploadPhotos(photos);
      
      toast.info('Analyzing rug with AI...');
      
      // Call the edge function to analyze the rug
      const { data, error } = await supabase.functions.invoke('analyze-rug', {
        body: {
          photos: photoUrls,
          rugInfo: {
            clientName: job.client_name,
            rugNumber: formData.rugNumber,
            rugType: formData.rugType,
            length: formData.length,
            width: formData.width,
            notes: formData.notes
          }
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Save the rug to the database
      const { error: insertError } = await supabase.from('inspections').insert({
        user_id: user.id,
        job_id: job.id,
        client_name: job.client_name,
        rug_number: formData.rugNumber,
        rug_type: formData.rugType,
        length: formData.length ? parseFloat(formData.length) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        notes: formData.notes || null,
        photo_urls: photoUrls,
        analysis_report: data.report
      });

      if (insertError) throw insertError;

      toast.success('Rug analyzed and added to job!');
      setIsAddingRug(false);
      fetchJobDetails();
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze rug');
    } finally {
      setAnalyzingRug(false);
    }
  };

  const handleViewReport = (rug: Rug) => {
    setSelectedRug(rug);
    setShowReport(true);
  };

  const handleDownloadPDF = async (rug: Rug) => {
    if (!job) return;
    
    try {
      await generatePDF({
        ...rug,
        client_name: job.client_name,
        client_email: job.client_email,
        client_phone: job.client_phone,
      });
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleDeleteRug = async (rugId: string) => {
    if (!confirm('Are you sure you want to delete this rug?')) return;

    try {
      const { error } = await supabase
        .from('inspections')
        .delete()
        .eq('id', rugId);

      if (error) throw error;
      toast.success('Rug deleted');
      fetchJobDetails();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete rug');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) return null;

  if (showReport && selectedRug) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-primary to-terracotta-light p-2.5 shadow-soft">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">RugInspect</h1>
                <p className="text-xs text-muted-foreground">{selectedRug.rug_number}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowReport(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Job
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <AnalysisReport
              report={selectedRug.analysis_report || ''}
              rugInfo={{
                clientName: job.client_name,
                rugNumber: selectedRug.rug_number,
                rugType: selectedRug.rug_type,
                dimensions: `${selectedRug.length || '–'}' × ${selectedRug.width || '–'}'`,
              }}
              onNewInspection={() => setShowReport(false)}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary to-terracotta-light p-2.5 shadow-soft">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">RugInspect</h1>
              <p className="text-xs text-muted-foreground">Job Details</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Job Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-2xl">
                Job {job.job_number}
              </CardTitle>
              <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                {job.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Client</p>
                <p className="font-medium">{job.client_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{job.client_email || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{job.client_phone || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{format(new Date(job.created_at), 'MMM d, yyyy')}</p>
              </div>
            </div>
            {job.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-muted-foreground text-sm">Notes</p>
                <p className="text-sm">{job.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rugs Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-xl">
                Rugs ({rugs.length})
              </CardTitle>
              <Dialog open={isAddingRug} onOpenChange={setIsAddingRug}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Rug
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display text-xl">Add Rug to Job</DialogTitle>
                  </DialogHeader>
                  <RugForm
                    onSubmit={handleAddRug}
                    isLoading={analyzingRug}
                    rugIndex={rugs.length}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {rugs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No rugs added yet</p>
                <p className="text-sm mt-1">Click "Add Rug" to start inspecting rugs for this job</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rug #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dimensions</TableHead>
                    <TableHead>Photos</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rugs.map((rug) => (
                    <TableRow key={rug.id}>
                      <TableCell className="font-medium">{rug.rug_number}</TableCell>
                      <TableCell>{rug.rug_type}</TableCell>
                      <TableCell>
                        {rug.length && rug.width ? `${rug.length}' × ${rug.width}'` : '—'}
                      </TableCell>
                      <TableCell>{rug.photo_urls?.length || 0}</TableCell>
                      <TableCell>{format(new Date(rug.created_at), 'MMM d')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReport(rug)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPDF(rug)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRug(rug.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default JobDetail;
