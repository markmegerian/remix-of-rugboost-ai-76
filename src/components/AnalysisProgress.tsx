import React from 'react';
import { Loader2, Upload, Brain, FileText, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export type AnalysisStage = 'idle' | 'preparing' | 'analyzing' | 'generating' | 'complete';

interface AnalysisProgressProps {
  stage: AnalysisStage;
  rugNumber?: string;
  current?: number;
  total?: number;
}

const stages = {
  idle: { label: '', icon: null, progress: 0 },
  preparing: { label: 'Preparing photos...', icon: Upload, progress: 20 },
  analyzing: { label: 'AI analyzing rug condition...', icon: Brain, progress: 50 },
  generating: { label: 'Generating report...', icon: FileText, progress: 80 },
  complete: { label: 'Complete!', icon: CheckCircle, progress: 100 },
};

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ 
  stage, 
  rugNumber,
  current,
  total 
}) => {
  if (stage === 'idle') return null;

  const { label, icon: Icon, progress } = stages[stage];

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            {stage !== 'complete' ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              Icon && <Icon className="h-6 w-6 text-success" />
            )}
            <span className="text-lg font-medium">
              {rugNumber ? `Analyzing ${rugNumber}` : 'Analyzing...'}
            </span>
          </div>
          
          {total && total > 1 && current && (
            <p className="text-center text-sm text-muted-foreground">
              Rug {current} of {total}
            </p>
          )}

          <Progress value={progress} className="h-2" />
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {Icon && stage !== 'complete' && <Icon className="h-4 w-4" />}
            <span>{label}</span>
          </div>

          <div className="flex justify-center gap-2 pt-2">
            {Object.entries(stages).slice(1, 5).map(([key, { icon: StepIcon }]) => (
              <div
                key={key}
                className={`w-2 h-2 rounded-full transition-colors ${
                  Object.keys(stages).indexOf(key) <= Object.keys(stages).indexOf(stage)
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisProgress;
