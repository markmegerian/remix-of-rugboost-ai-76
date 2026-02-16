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

export interface StructuredRugProfile {
  origin?: string;
  construction?: string;
  fiber?: string;
  confidence?: number;
}

export interface StructuredDamage {
  id?: string;
  category?: string;
  severity?: 'minor' | 'moderate' | 'severe' | 'critical' | string;
  location?: string;
  description?: string;
  photoIndices?: number[];
  confidence?: number;
}

export interface StructuredRecommendedService {
  serviceType?: string;
  reason?: string;
  pricingModel?: 'sqft' | 'linear_ft' | 'fixed' | string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  estimatedCost?: number;
  relatedDamageIds?: string[];
  confidence?: number;
}

export interface StructuredTotals {
  subtotal?: number;
  estimatedRangeLow?: number;
  estimatedRangeHigh?: number;
  currency?: string;
}

export interface StructuredFindings {
  rugProfile?: StructuredRugProfile;
  damages?: StructuredDamage[];
  recommendedServices?: StructuredRecommendedService[];
  totals?: StructuredTotals;
  reviewFlags?: string[];
  summary?: string;
}

export interface AnalysisReportProps {
  report: string;
  structuredFindings?: StructuredFindings | null;
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
