import React, { useEffect, useRef, useState } from 'react';
import { Search, Layers, Droplets, Scissors, Shield, MapPin, Calculator, FileText, CheckCircle, Eye } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import rugboostLogo from '@/assets/rugboost-logo.svg';

export type AnalysisStage = 'idle' | 'preparing' | 'analyzing' | 'generating' | 'complete';

interface AnalysisProgressProps {
  stage: AnalysisStage;
  rugNumber?: string;
  current?: number;
  total?: number;
}

const analyzingMessages = [
  { label: 'Examining rug construction...', icon: Search },
  { label: 'Identifying fiber content and weave...', icon: Layers },
  { label: 'Inspecting fringe and edge condition...', icon: Eye },
  { label: 'Inspecting bindings...', icon: Scissors },
  { label: 'Checking for stains and discoloration...', icon: Droplets },
  { label: 'Assessing structural damage and wear...', icon: Shield },
  { label: 'Mapping areas that need attention...', icon: MapPin },
  { label: 'Calculating restoration costs...', icon: Calculator },
];

const stageOrder: AnalysisStage[] = ['idle', 'preparing', 'analyzing', 'generating', 'complete'];

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ 
  stage, 
  rugNumber,
  current,
  total 
}) => {
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [messageFade, setMessageFade] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const stageStartRef = useRef<number>(Date.now());
  const prevStageRef = useRef<AnalysisStage>('idle');

  // Reset timers when stage changes
  useEffect(() => {
    if (stage !== prevStageRef.current) {
      stageStartRef.current = Date.now();
      prevStageRef.current = stage;
      if (stage === 'analyzing') {
        setMessageIndex(0);
        setMessageFade(true);
      }
      if (stage === 'complete') {
        setSmoothProgress(100);
      }
    }
  }, [stage]);

  // Smooth progress interpolation
  useEffect(() => {
    if (stage === 'idle') { setSmoothProgress(0); return; }
    if (stage === 'complete') { setSmoothProgress(100); return; }

    const interval = setInterval(() => {
      const ms = Date.now() - stageStartRef.current;
      const sec = ms / 1000;

      if (stage === 'preparing') {
        // 0→15% over 2s
        setSmoothProgress(Math.min(15, (sec / 2) * 15));
      } else if (stage === 'analyzing') {
        // 15→80% over 28s
        setSmoothProgress(15 + Math.min(65, (sec / 28) * 65));
      } else if (stage === 'generating') {
        // 80→95% over 5s
        setSmoothProgress(80 + Math.min(15, (sec / 5) * 15));
      }
    }, 50);

    return () => clearInterval(interval);
  }, [stage]);

  // Rotate analyzing messages every 4s with fade
  useEffect(() => {
    if (stage !== 'analyzing') return;

    const interval = setInterval(() => {
      setMessageFade(false);
      setTimeout(() => {
        setMessageIndex(i => (i + 1) % analyzingMessages.length);
        setMessageFade(true);
      }, 250);
    }, 4000);

    return () => clearInterval(interval);
  }, [stage]);

  // Elapsed time counter
  useEffect(() => {
    if (stage === 'idle' || stage === 'complete') { setElapsed(0); return; }

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - stageStartRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [stage]);

  if (stage === 'idle') return null;

  // Determine current display label and icon
  let displayLabel = '';
  let DisplayIcon: React.ElementType | null = null;

  if (stage === 'preparing') {
    displayLabel = 'Uploading photos...';
    DisplayIcon = null;
  } else if (stage === 'analyzing') {
    const msg = analyzingMessages[messageIndex];
    displayLabel = msg.label;
    DisplayIcon = msg.icon;
  } else if (stage === 'generating') {
    displayLabel = 'Building your detailed report...';
    DisplayIcon = FileText;
  } else if (stage === 'complete') {
    displayLabel = 'Analysis complete!';
    DisplayIcon = CheckCircle;
  }

  const currentStageIdx = stageOrder.indexOf(stage);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <div className="space-y-4">
          {/* Branded logo + title */}
          <div className="flex flex-col items-center gap-3">
            {stage !== 'complete' ? (
              <img src={rugboostLogo} alt="RugBoost" className="h-10 w-10 animate-pulse" />
            ) : (
              <CheckCircle className="h-10 w-10 text-success" />
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

          <Progress value={smoothProgress} className="h-2" />

          {/* Rotating message with fade */}
          <div
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground min-h-[24px] transition-opacity duration-250"
            style={{ opacity: messageFade ? 1 : 0 }}
          >
            {DisplayIcon && stage !== 'complete' && <DisplayIcon className="h-4 w-4 shrink-0" />}
            {stage === 'complete' && DisplayIcon && <DisplayIcon className="h-4 w-4 text-success shrink-0" />}
            <span>{displayLabel}</span>
          </div>

          {/* Elapsed time */}
          {stage !== 'complete' && elapsed > 0 && (
            <p className="text-center text-xs text-muted-foreground/60">~{elapsed}s</p>
          )}

          {/* Stage dots */}
          <div className="flex justify-center gap-2 pt-1">
            {stageOrder.slice(1).map((key) => (
              <div
                key={key}
                className={`w-2 h-2 rounded-full transition-colors ${
                  stageOrder.indexOf(key) <= currentStageIdx
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
