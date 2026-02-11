export interface ImageAnnotation {
  label: string;
  location: string;
  x: number;
  y: number;
}

export interface PhotoAnnotations {
  photoIndex: number;
  annotations: ImageAnnotation[];
}

export interface ApprovedEstimate {
  services: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    priority: string;
  }>;
  total_amount: number;
}

export interface AnalysisReportProps {
  report: string;
  rugInfo: {
    clientName: string;
    rugNumber: string;
    rugType: string;
    dimensions: string;
  };
  photoUrls?: string[];
  imageAnnotations?: PhotoAnnotations[];
  onNewInspection: () => void;
  onReviewEstimate?: () => void;
  onReanalyze?: () => void;
  isReanalyzing?: boolean;
  onAnnotationsChange?: (annotations: PhotoAnnotations[]) => void;
  approvedEstimate?: ApprovedEstimate | null;
}
