import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { supabase } from '@/integrations/supabase/client';
import type { AnalysisStage } from '@/components/AnalysisProgress';
import type { JobDetailJob, JobDetailRug } from '@/hooks/useJobDetailActions';

interface UseRugAnalysisParams {
  job: JobDetailJob | null;
  rugs: JobDetailRug[];
  userId: string | undefined;
  fetchJobDetails: () => void;
}

export function useRugAnalysis({ job, rugs, userId, fetchJobDetails }: UseRugAnalysisParams) {
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [analyzingRugId, setAnalyzingRugId] = useState<string | null>(null);
  const [reanalyzingRugId, setReanalyzingRugId] = useState<string | null>(null);

  // Analysis progress state
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>('idle');
  const [analysisRugNumber, setAnalysisRugNumber] = useState<string>('');
  const [analysisCurrent, setAnalysisCurrent] = useState<number>(0);
  const [analysisTotal, setAnalysisTotal] = useState<number>(0);

  // Annotation state (set during analysis)
  const [imageAnnotations, setImageAnnotations] = useState<any[]>([]);

  const performRugAnalysis = useCallback(async (rug: JobDetailRug, isReanalysis: boolean) => {
    if (!job) return;

    if (isReanalysis) {
      setReanalyzingRugId(rug.id);
    } else {
      setAnalyzingRugId(rug.id);
    }
    setAnalysisRugNumber(rug.rug_number);
    setAnalysisStage('preparing');

    try {
      if (isReanalysis) {
        await supabase
          .from('inspections')
          .update({ analysis_report: null })
          .eq('id', rug.id);
      }

      await new Promise(resolve => setTimeout(resolve, isReanalysis ? 0 : 500));
      setAnalysisStage('analyzing');

      const { data, error } = await supabase.functions.invoke('analyze-rug', {
        body: {
          photos: rug.photo_urls || [],
          rugInfo: {
            clientName: job.client_name,
            rugNumber: rug.rug_number,
            rugType: rug.rug_type,
            length: rug.length?.toString() || '',
            width: rug.width?.toString() || '',
            notes: rug.notes || '',
          },
          userId,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysisStage('generating');

      const annotations = data.imageAnnotations || [];
      const edgeSuggs = data.edgeSuggestions || [];
      setImageAnnotations(annotations);

      const { error: updateError } = await supabase
        .from('inspections')
        .update({
          analysis_report: data.report,
          image_annotations: annotations,
          system_services: { edgeSuggestions: edgeSuggs },
        })
        .eq('id', rug.id);

      if (updateError) throw updateError;

      setAnalysisStage('complete');
      await new Promise(resolve => setTimeout(resolve, 800));

      const verb = isReanalysis ? 're-analyzed' : 'analyzed';
      toast.success(`${rug.rug_number} ${verb}!`);
      fetchJobDetails();

      return { report: data.report, annotations, edgeSuggestions: edgeSuggs };
    } catch (error) {
      const verb = isReanalysis ? 're-analyze' : 'analyze';
      handleMutationError(error, `JobDetail.${verb}`);
      return null;
    } finally {
      if (isReanalysis) {
        setReanalyzingRugId(null);
      } else {
        setAnalyzingRugId(null);
      }
      setAnalysisStage('idle');
      setAnalysisRugNumber('');
    }
  }, [job, userId, fetchJobDetails]);

  const handleAnalyzeAllRugs = useCallback(async () => {
    if (!job) return;

    const pendingRugs = rugs.filter(r => !r.analysis_report);
    if (pendingRugs.length === 0) {
      toast.info('All rugs have already been analyzed');
      return;
    }

    setAnalyzingAll(true);
    setAnalysisTotal(pendingRugs.length);
    let successCount = 0;
    let errorCount = 0;

    for (const rug of pendingRugs) {
      try {
        setAnalysisCurrent(successCount + errorCount + 1);
        setAnalysisRugNumber(rug.rug_number);
        setAnalysisStage('preparing');

        await new Promise(resolve => setTimeout(resolve, 300));
        setAnalysisStage('analyzing');

        const { data, error } = await supabase.functions.invoke('analyze-rug', {
          body: {
            photos: rug.photo_urls || [],
            rugInfo: {
              clientName: job.client_name,
              rugNumber: rug.rug_number,
              rugType: rug.rug_type,
              length: rug.length?.toString() || '',
              width: rug.width?.toString() || '',
              notes: rug.notes || '',
            },
            userId,
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        setAnalysisStage('generating');

        await supabase
          .from('inspections')
          .update({
            analysis_report: data.report,
            image_annotations: data.imageAnnotations || [],
            system_services: { edgeSuggestions: data.edgeSuggestions || [] },
          })
          .eq('id', rug.id);

        successCount++;
      } catch (error) {
        console.error(`Analysis failed for ${rug.rug_number}:`, error);
        errorCount++;
      }
    }

    setAnalysisStage('complete');
    await new Promise(resolve => setTimeout(resolve, 800));

    setAnalyzingAll(false);
    setAnalysisStage('idle');
    setAnalysisRugNumber('');
    setAnalysisCurrent(0);
    setAnalysisTotal(0);
    fetchJobDetails();

    if (errorCount === 0) {
      toast.success(`All ${successCount} rugs analyzed successfully!`);
    } else {
      toast.warning(`Analyzed ${successCount} rugs, ${errorCount} failed`);
    }
  }, [job, rugs, userId, fetchJobDetails]);

  return {
    analyzingAll,
    analyzingRugId,
    reanalyzingRugId,
    analysisStage,
    analysisRugNumber,
    analysisCurrent,
    analysisTotal,
    imageAnnotations,
    performRugAnalysis,
    handleAnalyzeAllRugs,
  };
}
