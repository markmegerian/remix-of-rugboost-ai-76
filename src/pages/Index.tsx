import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import RugInspectionForm from '@/components/RugInspectionForm';
import AnalysisReport from '@/components/AnalysisReport';

interface FormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  rugNumber: string;
  length: string;
  width: string;
  rugType: string;
  notes: string;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);

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

  const handleSubmit = async (formData: FormData, photos: File[]) => {
    setIsLoading(true);
    
    try {
      toast.info('Uploading photos...');
      
      // Upload photos to storage
      const photoUrls = await uploadPhotos(photos);
      
      toast.info('Analyzing rug with AI...');
      
      // Call the edge function to analyze the rug
      const { data, error } = await supabase.functions.invoke('analyze-rug', {
        body: {
          photos: photoUrls,
          rugInfo: {
            clientName: formData.clientName,
            rugNumber: formData.rugNumber,
            rugType: formData.rugType,
            length: formData.length,
            width: formData.width,
            notes: formData.notes
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Save the inspection to the database
      await supabase.from('inspections').insert({
        client_name: formData.clientName,
        client_email: formData.clientEmail || null,
        client_phone: formData.clientPhone || null,
        rug_number: formData.rugNumber,
        rug_type: formData.rugType,
        length: formData.length ? parseFloat(formData.length) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        notes: formData.notes || null,
        photo_urls: photoUrls,
        analysis_report: data.report
      });

      setAnalysisReport(data.report);
      setSubmittedData(formData);
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze rug. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewInspection = () => {
    setAnalysisReport(null);
    setSubmittedData(null);
  };

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
              <h1 className="font-display text-xl font-bold text-foreground">
                RugInspect
              </h1>
              <p className="text-xs text-muted-foreground">
                AI-Powered Analysis
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl">
          {analysisReport && submittedData ? (
            <AnalysisReport
              report={analysisReport}
              rugInfo={{
                clientName: submittedData.clientName,
                rugNumber: submittedData.rugNumber,
                rugType: submittedData.rugType,
                dimensions: `${submittedData.length || '–'}' × ${submittedData.width || '–'}'`,
              }}
              onNewInspection={handleNewInspection}
            />
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Page Title */}
              <div className="text-center">
                <h2 className="font-display text-3xl font-bold text-foreground">
                  New Rug Inspection
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Capture photos and details for AI-powered restoration analysis
                </p>
              </div>

              {/* Form Card */}
              <div className="rounded-2xl bg-card p-6 shadow-medium sm:p-8">
                <RugInspectionForm onSubmit={handleSubmit} isLoading={isLoading} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Professional rug inspection and restoration analysis
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
