// Service categorization for Expert Decision Engine
// Services are categorized: Required, Recommended, High-Cost/Structural, or Preventative

export type ServiceCategory = 'required' | 'recommended' | 'high_cost' | 'preventative';

export interface ServiceCategoryConfig {
  label: string;
  description: string;
  helpText: string;
  keywords: string[];
  color: string;
  badgeVariant: 'destructive' | 'secondary' | 'outline' | 'default';
  disclaimerSeverity: 'blocking' | 'high' | 'medium' | 'low';
  canDecline: boolean;
}

export const SERVICE_CATEGORIES: Record<ServiceCategory, ServiceCategoryConfig> = {
  required: {
    label: 'Required for Proper Care',
    description: 'These services are required to safely clean and handle the rug based on its material and condition.',
    helpText: 'These services are deemed essential by our experts and cannot be declined.',
    keywords: [
      'cleaning', 'wash', 'professional cleaning', 'deep cleaning', 'immersion',
      'stabilization', 'safe handling', 'mold mitigation', 'active mold',
      'dust removal', 'dusting'
    ],
    color: 'text-destructive',
    badgeVariant: 'destructive',
    disclaimerSeverity: 'blocking',
    canDecline: false
  },
  recommended: {
    label: 'Expert-Recommended Services',
    description: 'Recommended based on professional inspection findings. Included in your assessment.',
    helpText: 'Recommended to prevent long-term damage. Each service may be individually declined.',
    keywords: [
      'stain removal', 'stain treatment', 'odor treatment', 'odor removal',
      'fringe detailing', 'fringe repair', 'minor edge', 'edge reinforcement',
      'blocking', 'stretching', 'shearing', 'limewash', 'special wash',
      'cotton binding', 'glue binding', 'machine fringe', 'spot treatment'
    ],
    color: 'text-amber-600',
    badgeVariant: 'secondary',
    disclaimerSeverity: 'medium',
    canDecline: true
  },
  high_cost: {
    label: 'Structural / High-Impact Services',
    description: 'Significant restoration services addressing structural integrity or severe condition issues.',
    helpText: 'Major restoration work. Requires explicit confirmation. Declining may affect long-term rug integrity.',
    keywords: [
      'reweaving', 'rewoven', 'color correction', 'color restoration',
      'severe pet', 'severe odor', 'urine treatment', 'foundation repair', 'foundation rebuild',
      'hole repair', 'large hole', 'structural repair', 'structural distortion',
      'tear repair', 'major repair', 'persian binding', 'leather binding', 'hand fringe',
      'dry rot', 'moth damage repair', 'extensive', 'selvedge', 'zenjireh', 'overcast'
    ],
    color: 'text-orange-600',
    badgeVariant: 'default',
    disclaimerSeverity: 'high',
    canDecline: true
  },
  preventative: {
    label: 'Preventative / Longevity Services',
    description: 'Optional treatments to extend rug longevity. Included in your assessment.',
    helpText: 'Optional protection services. Soft opt-out with mild disclaimer.',
    keywords: [
      'protection', 'moth proof', 'moth proofing', 'moth deterrent', 'fiber protect',
      'scotchgard', 'stain protection', 'padding', 'custom padding',
      'storage', 'preservation', 'fringe wrap', 'preventative'
    ],
    color: 'text-muted-foreground',
    badgeVariant: 'outline',
    disclaimerSeverity: 'low',
    canDecline: true
  }
};

// Categorize a service based on its name
export function categorizeService(serviceName: string): ServiceCategory {
  const lowerName = serviceName.toLowerCase();
  
  // Check required first (highest priority)
  if (SERVICE_CATEGORIES.required.keywords.some(k => lowerName.includes(k))) {
    return 'required';
  }
  
  // Check high-cost/structural next (before recommended)
  if (SERVICE_CATEGORIES.high_cost.keywords.some(k => lowerName.includes(k))) {
    return 'high_cost';
  }
  
  // Check preventative (specific keywords)
  if (SERVICE_CATEGORIES.preventative.keywords.some(k => lowerName.includes(k))) {
    return 'preventative';
  }
  
  // Check recommended
  if (SERVICE_CATEGORIES.recommended.keywords.some(k => lowerName.includes(k))) {
    return 'recommended';
  }
  
  // Default to recommended for unmatched services
  return 'recommended';
}

// Determine if a service can be edited/removed by staff
export function canStaffEditService(category: ServiceCategory, isAdminOverride: boolean): boolean {
  if (isAdminOverride) return true;
  return category !== 'required';
}

// Get risk disclosure text for a service category
export function getRiskDisclosure(category: ServiceCategory): string | null {
  if (category === 'required') {
    return null; // Cannot be declined
  }
  if (category === 'high_cost') {
    return 'Declining this structural service may result in progressive deterioration and reduce the rug\'s longevity and value.';
  }
  if (category === 'recommended') {
    return 'Deferring this service may result in suboptimal results or accelerated wear.';
  }
  if (category === 'preventative') {
    return 'Preventative treatments help extend the interval between professional cleanings.';
  }
  return null;
}

// Get consequence text for declining a specific service
export function getServiceDeclineConsequence(serviceName: string, category: ServiceCategory): string {
  const name = serviceName.toLowerCase();
  
  if (category === 'high_cost') {
    if (name.includes('rewea')) {
      return 'Without reweaving, structural gaps will expand with use and cleaning, potentially causing irreversible damage to surrounding areas.';
    }
    if (name.includes('color')) {
      return 'Color damage will remain visible and may become more pronounced over time as surrounding dyes continue to fade naturally.';
    }
    if (name.includes('urine') || name.includes('severe pet') || name.includes('severe odor')) {
      return 'Deep contamination will persist in the foundation fibers. Odor may return, especially in humid conditions, and may attract pets to re-soil.';
    }
    if (name.includes('foundation') || name.includes('structural')) {
      return 'Structural instability will worsen with normal use. The rug may become unsafe to clean professionally without this repair.';
    }
    if (name.includes('hole') || name.includes('tear')) {
      return 'Unrepaired damage will expand during cleaning and normal use, significantly increasing future repair costs.';
    }
    if (name.includes('dry rot')) {
      return 'Dry rot is progressive. Without treatment, deterioration will continue and may spread to unaffected areas.';
    }
    return 'This structural service addresses significant damage. Declining may affect the long-term integrity and value of your rug.';
  }
  
  if (category === 'recommended') {
    if (name.includes('stain')) {
      return 'Existing stains may become permanently set over time if not addressed during this service.';
    }
    if (name.includes('odor')) {
      return 'Odor contamination may persist and could attract pets to re-soil the area.';
    }
    if (name.includes('fringe') || name.includes('edge')) {
      return 'Minor edge/fringe issues may worsen during cleaning if not stabilized first.';
    }
    return 'Deferring this service may result in suboptimal cleaning results or accelerated wear.';
  }
  
  if (category === 'preventative') {
    if (name.includes('protection') || name.includes('scotchgard') || name.includes('fiber')) {
      return 'Fibers will remain more vulnerable to future staining and soiling.';
    }
    if (name.includes('moth')) {
      return 'Without moth deterrent, natural fiber rugs remain at risk during storage.';
    }
    if (name.includes('pad')) {
      return 'Proper padding reduces friction and extends rug life.';
    }
    return 'Preventative treatments help extend the interval between professional cleanings.';
  }
  
  return 'This service addresses conditions identified during inspection.';
}

// Expert language replacements
export const EXPERT_LANGUAGE = {
  terms: {
    'choose': 'authorized',
    'optional': 'expert-recommended',
    'customize': 'review',
    'add': 'include',
    'remove': 'decline',
    'select': 'confirm',
    'edit': 'adjust',
  },
  phrases: {
    serviceIntro: 'Based on professional inspection',
    required: 'Required to safely clean and preserve this rug',
    recommended: 'Recommended to prevent long-term damage',
    high_cost: 'Significant restoration addressing structural issues',
    preventative: 'Advised for optimal longevity and protection',
    approval: 'Approval authorizes work exactly as outlined',
    pricing: 'Investment required for proper restoration',
  }
};