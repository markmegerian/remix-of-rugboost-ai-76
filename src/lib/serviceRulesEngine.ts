// Service Rules Engine - Automatically determines services based on inspection inputs
// Staff inputs inspection data, system determines scope

import { ServiceCategory } from './serviceCategories';

// ============================================
// INSPECTION INPUT TYPES
// ============================================

export type ConditionSeverity = 'none' | 'minor' | 'moderate' | 'severe';

export interface RugMaterial {
  type: 'wool' | 'silk' | 'cotton' | 'synthetic' | 'mixed' | 'unknown';
  construction: 'hand-knotted' | 'hand-tufted' | 'machine-made' | 'flat-weave' | 'hooked' | 'unknown';
  age: 'new' | 'modern' | 'semi-antique' | 'antique' | 'unknown';
  value: 'standard' | 'premium' | 'heirloom' | 'unknown';
}

export interface ConditionFlags {
  // Cleaning needs
  generalSoiling: ConditionSeverity;
  staining: ConditionSeverity;
  odor: ConditionSeverity;
  petUrine: ConditionSeverity;
  mold: ConditionSeverity;
  
  // Structural issues
  fringeCondition: ConditionSeverity;
  edgeCondition: ConditionSeverity;
  foundationCondition: ConditionSeverity;
  holes: ConditionSeverity;
  tears: ConditionSeverity;
  colorRun: ConditionSeverity;
  colorFade: ConditionSeverity;
  
  // Shape/form issues
  distortion: ConditionSeverity;
  wrinkles: ConditionSeverity;
  
  // Pest issues
  mothDamage: ConditionSeverity;
  pestInfestation: boolean;
  
  // Other flags
  dryRot: boolean;
  previousRepairs: boolean;
  highTrafficUse: boolean;
  petsInHome: boolean;
}

export interface InspectionInput {
  material: RugMaterial;
  conditions: ConditionFlags;
  squareFootage: number;
  notes?: string;
}

// ============================================
// SERVICE DETERMINATION OUTPUT
// ============================================

export interface DeterminedService {
  id: string;
  name: string;
  category: ServiceCategory;
  rationale: string;
  quantity: number;
  baseUnitPrice: number;
  canDecline: boolean;
  declineConsequence: string;
  triggeredBy: string[]; // Which condition flags triggered this
}

export interface ServiceDetermination {
  services: DeterminedService[];
  conditionSummary: string;
  riskDisclosure: string;
  requiresStaffReview: boolean;
  reviewReasons: string[];
}

// ============================================
// SERVICE RULES DEFINITIONS
// ============================================

interface ServiceRule {
  id: string;
  name: string;
  category: ServiceCategory;
  basePrice: number; // per sq ft or flat
  priceType: 'per_sqft' | 'flat' | 'per_linear_ft';
  condition: (input: InspectionInput) => boolean;
  rationale: (input: InspectionInput) => string;
  consequence: string;
  priority: number; // Higher = more important
}

const SERVICE_RULES: ServiceRule[] = [
  // ============================================
  // REQUIRED SERVICES (Cannot be declined)
  // ============================================
  {
    id: 'professional_cleaning',
    name: 'Professional Cleaning',
    category: 'required',
    basePrice: 3.50,
    priceType: 'per_sqft',
    condition: () => true, // Always required
    rationale: () => 'Standard professional cleaning required for all rugs to ensure proper care.',
    consequence: 'Cannot proceed without cleaning.',
    priority: 100,
  },
  {
    id: 'dusting',
    name: 'Pre-Wash Dusting',
    category: 'required',
    basePrice: 1.00,
    priceType: 'per_sqft',
    condition: (input) => input.conditions.generalSoiling !== 'none' || input.material.age !== 'new',
    rationale: () => 'Deep dusting required to remove embedded particulates before wet cleaning.',
    consequence: 'Cannot proceed without dusting.',
    priority: 99,
  },
  {
    id: 'mold_mitigation',
    name: 'Mold Mitigation Treatment',
    category: 'required',
    basePrice: 75,
    priceType: 'flat',
    condition: (input) => input.conditions.mold !== 'none',
    rationale: (input) => `Active mold detected (${input.conditions.mold}). Mitigation required for safe handling.`,
    consequence: 'Cannot proceed with active mold present.',
    priority: 98,
  },
  {
    id: 'stabilization',
    name: 'Pre-Cleaning Stabilization',
    category: 'required',
    basePrice: 2.00,
    priceType: 'per_sqft',
    condition: (input) => 
      input.conditions.foundationCondition === 'severe' || 
      input.conditions.holes === 'severe' ||
      input.conditions.dryRot,
    rationale: () => 'Structural stabilization required before cleaning to prevent further damage.',
    consequence: 'Cleaning without stabilization may cause irreversible damage.',
    priority: 97,
  },

  // ============================================
  // RECOMMENDED SERVICES (Declinable with warning)
  // ============================================
  {
    id: 'stain_treatment',
    name: 'Stain Treatment',
    category: 'recommended',
    basePrice: 2.50,
    priceType: 'per_sqft',
    condition: (input) => input.conditions.staining !== 'none',
    rationale: (input) => `${input.conditions.staining} staining detected. Targeted treatment recommended.`,
    consequence: 'Stains may become permanently set if not treated during this service.',
    priority: 80,
  },
  {
    id: 'odor_treatment',
    name: 'Odor Neutralization',
    category: 'recommended',
    basePrice: 2.00,
    priceType: 'per_sqft',
    condition: (input) => input.conditions.odor !== 'none' && input.conditions.petUrine === 'none',
    rationale: (input) => `${input.conditions.odor} odor detected. Neutralization treatment recommended.`,
    consequence: 'Odor may persist and could worsen over time.',
    priority: 75,
  },
  {
    id: 'fringe_repair_minor',
    name: 'Fringe Repair',
    category: 'recommended',
    basePrice: 15,
    priceType: 'per_linear_ft',
    condition: (input) => input.conditions.fringeCondition === 'minor' || input.conditions.fringeCondition === 'moderate',
    rationale: (input) => `Fringe shows ${input.conditions.fringeCondition} wear. Repair recommended to prevent further unraveling.`,
    consequence: 'Fringe damage may progress during cleaning and normal use.',
    priority: 70,
  },
  {
    id: 'edge_reinforcement',
    name: 'Edge Binding Reinforcement',
    category: 'recommended',
    basePrice: 12,
    priceType: 'per_linear_ft',
    condition: (input) => input.conditions.edgeCondition === 'minor' || input.conditions.edgeCondition === 'moderate',
    rationale: (input) => `Edge binding shows ${input.conditions.edgeCondition} wear. Reinforcement recommended.`,
    consequence: 'Edge deterioration may accelerate during cleaning.',
    priority: 70,
  },
  {
    id: 'blocking',
    name: 'Blocking & Shape Correction',
    category: 'recommended',
    basePrice: 1.50,
    priceType: 'per_sqft',
    condition: (input) => input.conditions.distortion !== 'none' || input.conditions.wrinkles !== 'none',
    rationale: () => 'Shape distortion detected. Blocking recommended to restore proper form.',
    consequence: 'Rug may retain distortion without proper blocking.',
    priority: 65,
  },
  {
    id: 'color_stabilization',
    name: 'Color Stabilization',
    category: 'recommended',
    basePrice: 45,
    priceType: 'flat',
    condition: (input) => input.conditions.colorRun !== 'none',
    rationale: () => 'Color instability detected. Stabilization treatment recommended before wet cleaning.',
    consequence: 'Colors may run or bleed during cleaning without treatment.',
    priority: 85,
  },

  // ============================================
  // HIGH-COST / STRUCTURAL SERVICES
  // ============================================
  {
    id: 'urine_treatment',
    name: 'Pet Urine Remediation',
    category: 'high_cost',
    basePrice: 5.00,
    priceType: 'per_sqft',
    condition: (input) => input.conditions.petUrine !== 'none',
    rationale: (input) => `${input.conditions.petUrine} pet urine contamination detected. Specialized remediation required.`,
    consequence: 'Urine salts will persist in foundation fibers. Odor may return in humid conditions and attract pets to re-soil.',
    priority: 90,
  },
  {
    id: 'foundation_repair',
    name: 'Foundation Repair',
    category: 'high_cost',
    basePrice: 150,
    priceType: 'flat',
    condition: (input) => input.conditions.foundationCondition === 'moderate' || input.conditions.foundationCondition === 'severe',
    rationale: (input) => `Foundation shows ${input.conditions.foundationCondition} damage. Repair recommended.`,
    consequence: 'Foundation damage will worsen with use. May become unsafe for professional cleaning.',
    priority: 88,
  },
  {
    id: 'hole_repair',
    name: 'Hole Repair',
    category: 'high_cost',
    basePrice: 200,
    priceType: 'flat',
    condition: (input) => input.conditions.holes !== 'none',
    rationale: (input) => `${input.conditions.holes} hole damage detected. Repair recommended to prevent expansion.`,
    consequence: 'Holes will expand during cleaning and normal use, increasing future repair costs.',
    priority: 87,
  },
  {
    id: 'tear_repair',
    name: 'Tear Repair',
    category: 'high_cost',
    basePrice: 125,
    priceType: 'flat',
    condition: (input) => input.conditions.tears !== 'none',
    rationale: (input) => `${input.conditions.tears} tear damage detected. Repair recommended.`,
    consequence: 'Tears will expand during cleaning and use.',
    priority: 86,
  },
  {
    id: 'reweaving',
    name: 'Reweaving Service',
    category: 'high_cost',
    basePrice: 350,
    priceType: 'flat',
    condition: (input) => input.conditions.holes === 'severe' || input.conditions.mothDamage === 'severe',
    rationale: () => 'Significant structural damage requires reweaving for proper restoration.',
    consequence: 'Structural gaps will expand, potentially causing irreversible damage to surrounding areas.',
    priority: 95,
  },
  {
    id: 'dry_rot_treatment',
    name: 'Dry Rot Treatment',
    category: 'high_cost',
    basePrice: 100,
    priceType: 'flat',
    condition: (input) => input.conditions.dryRot,
    rationale: () => 'Dry rot detected. Treatment required to halt progressive deterioration.',
    consequence: 'Dry rot is progressive and will spread to unaffected areas if untreated.',
    priority: 92,
  },
  {
    id: 'color_correction',
    name: 'Color Correction',
    category: 'high_cost',
    basePrice: 200,
    priceType: 'flat',
    condition: (input) => input.conditions.colorFade === 'severe' || input.conditions.colorRun === 'severe',
    rationale: () => 'Significant color damage detected. Correction service recommended.',
    consequence: 'Color damage will remain visible and may become more pronounced over time.',
    priority: 75,
  },
  {
    id: 'selvedge_rebuild',
    name: 'Selvedge Rebuild',
    category: 'high_cost',
    basePrice: 25,
    priceType: 'per_linear_ft',
    condition: (input) => input.conditions.edgeCondition === 'severe',
    rationale: () => 'Severe edge damage requires full selvedge rebuild.',
    consequence: 'Edge will continue to deteriorate without rebuild.',
    priority: 80,
  },
  {
    id: 'fringe_replacement',
    name: 'Fringe Replacement',
    category: 'high_cost',
    basePrice: 35,
    priceType: 'per_linear_ft',
    condition: (input) => input.conditions.fringeCondition === 'severe',
    rationale: () => 'Severe fringe damage requires full replacement.',
    consequence: 'Fringe damage will continue to progress into the rug body.',
    priority: 78,
  },
  {
    id: 'moth_damage_repair',
    name: 'Moth Damage Repair',
    category: 'high_cost',
    basePrice: 175,
    priceType: 'flat',
    condition: (input) => input.conditions.mothDamage !== 'none' && input.conditions.mothDamage !== 'minor',
    rationale: (input) => `${input.conditions.mothDamage} moth damage detected. Repair recommended.`,
    consequence: 'Moth damage will remain visible and may expand.',
    priority: 82,
  },

  // ============================================
  // PREVENTATIVE SERVICES
  // ============================================
  {
    id: 'fiber_protection',
    name: 'Fiber Protection Treatment',
    category: 'preventative',
    basePrice: 1.50,
    priceType: 'per_sqft',
    condition: (input) => input.conditions.highTrafficUse || input.material.value === 'premium' || input.material.value === 'heirloom',
    rationale: () => 'Protection treatment recommended based on usage or rug value.',
    consequence: 'Fibers will remain more vulnerable to future staining and soiling.',
    priority: 50,
  },
  {
    id: 'moth_proofing',
    name: 'Moth Proofing Treatment',
    category: 'preventative',
    basePrice: 1.00,
    priceType: 'per_sqft',
    condition: (input) => 
      input.material.type === 'wool' || 
      input.material.type === 'silk' ||
      input.conditions.mothDamage !== 'none',
    rationale: () => 'Natural fiber rug is susceptible to moth damage. Preventative treatment recommended.',
    consequence: 'Natural fiber rugs remain at risk during storage without treatment.',
    priority: 45,
  },
  {
    id: 'pet_protection',
    name: 'Pet Deterrent & Protection',
    category: 'preventative',
    basePrice: 1.25,
    priceType: 'per_sqft',
    condition: (input) => input.conditions.petsInHome || input.conditions.petUrine !== 'none',
    rationale: () => 'Pet presence noted. Deterrent treatment recommended to prevent future accidents.',
    consequence: 'Rug may be more susceptible to pet accidents without protection.',
    priority: 40,
  },
  {
    id: 'custom_padding',
    name: 'Custom Rug Padding',
    category: 'preventative',
    basePrice: 2.50,
    priceType: 'per_sqft',
    condition: (input) => input.conditions.highTrafficUse || input.squareFootage > 80,
    rationale: () => 'Custom padding recommended for rug size and usage patterns.',
    consequence: 'Rug may experience increased friction and accelerated backing wear.',
    priority: 35,
  },
];

// ============================================
// ENGINE FUNCTIONS
// ============================================

function calculateQuantity(input: InspectionInput, priceType: string): number {
  switch (priceType) {
    case 'per_sqft':
      return input.squareFootage;
    case 'per_linear_ft':
      // Estimate perimeter: assume 3:2 aspect ratio
      const area = input.squareFootage;
      const width = Math.sqrt(area * 2 / 3);
      const length = width * 1.5;
      return Math.round((2 * width + 2 * length) * 10) / 10;
    case 'flat':
      return 1;
    default:
      return 1;
  }
}

function generateConditionSummary(input: InspectionInput): string {
  const issues: string[] = [];
  
  if (input.conditions.staining !== 'none') issues.push(`${input.conditions.staining} staining`);
  if (input.conditions.odor !== 'none') issues.push(`${input.conditions.odor} odor`);
  if (input.conditions.petUrine !== 'none') issues.push(`${input.conditions.petUrine} pet urine contamination`);
  if (input.conditions.mold !== 'none') issues.push(`active mold (${input.conditions.mold})`);
  if (input.conditions.fringeCondition !== 'none') issues.push(`${input.conditions.fringeCondition} fringe wear`);
  if (input.conditions.edgeCondition !== 'none') issues.push(`${input.conditions.edgeCondition} edge damage`);
  if (input.conditions.foundationCondition !== 'none') issues.push(`${input.conditions.foundationCondition} foundation issues`);
  if (input.conditions.holes !== 'none') issues.push(`holes (${input.conditions.holes})`);
  if (input.conditions.tears !== 'none') issues.push(`tears (${input.conditions.tears})`);
  if (input.conditions.mothDamage !== 'none') issues.push(`moth damage (${input.conditions.mothDamage})`);
  if (input.conditions.dryRot) issues.push('dry rot present');
  if (input.conditions.distortion !== 'none') issues.push(`shape distortion`);
  if (input.conditions.colorRun !== 'none') issues.push(`color instability`);
  if (input.conditions.colorFade !== 'none') issues.push(`color fading`);
  
  if (issues.length === 0) {
    return `${input.material.construction} ${input.material.type} rug in good overall condition. Standard cleaning and care recommended.`;
  }
  
  const materialDesc = `${input.material.age !== 'unknown' ? input.material.age + ' ' : ''}${input.material.construction} ${input.material.type} rug`;
  return `Assessment of ${materialDesc} indicates: ${issues.join(', ')}. Services outlined below address identified conditions based on professional inspection.`;
}

function generateRiskDisclosure(services: DeterminedService[]): string {
  const highCostCount = services.filter(s => s.category === 'high_cost').length;
  const hasRequired = services.some(s => s.category === 'required' && s.name !== 'Professional Cleaning');
  
  let disclosure = 'Rugs of varying age and condition may exhibit pre-existing weaknesses. ';
  
  if (hasRequired) {
    disclosure += 'This assessment includes services required for safe handling and cleaning. ';
  }
  
  if (highCostCount > 0) {
    disclosure += `${highCostCount} structural or high-impact service${highCostCount > 1 ? 's' : ''} identified. `;
  }
  
  disclosure += 'Authorization confirms understanding that results depend on material condition at time of service.';
  
  return disclosure;
}

export function determineServices(input: InspectionInput): ServiceDetermination {
  const determinedServices: DeterminedService[] = [];
  const reviewReasons: string[] = [];
  
  // Evaluate each rule
  for (const rule of SERVICE_RULES) {
    if (rule.condition(input)) {
      const quantity = calculateQuantity(input, rule.priceType);
      
      determinedServices.push({
        id: rule.id,
        name: rule.name,
        category: rule.category,
        rationale: rule.rationale(input),
        quantity,
        baseUnitPrice: rule.basePrice,
        canDecline: rule.category !== 'required',
        declineConsequence: rule.consequence,
        triggeredBy: [], // Could track which specific conditions triggered
      });
    }
  }
  
  // Sort by priority (higher first) then by category order
  const categoryOrder: Record<ServiceCategory, number> = {
    required: 0,
    high_cost: 1,
    recommended: 2,
    preventative: 3,
  };
  
  determinedServices.sort((a, b) => {
    const catDiff = categoryOrder[a.category] - categoryOrder[b.category];
    if (catDiff !== 0) return catDiff;
    return 0;
  });
  
  // Determine if staff review is needed
  const hasHighCost = determinedServices.some(s => s.category === 'high_cost');
  const hasSevereConditions = 
    input.conditions.foundationCondition === 'severe' ||
    input.conditions.holes === 'severe' ||
    input.conditions.mold === 'severe' ||
    input.conditions.petUrine === 'severe';
  
  if (hasHighCost) {
    reviewReasons.push('High-cost structural services detected');
  }
  if (hasSevereConditions) {
    reviewReasons.push('Severe condition flags require verification');
  }
  if (input.material.value === 'heirloom') {
    reviewReasons.push('Heirloom/high-value rug requires expert review');
  }
  
  return {
    services: determinedServices,
    conditionSummary: generateConditionSummary(input),
    riskDisclosure: generateRiskDisclosure(determinedServices),
    requiresStaffReview: reviewReasons.length > 0,
    reviewReasons,
  };
}

// ============================================
// DEFAULT CONDITION FLAGS
// ============================================

export function getDefaultConditionFlags(): ConditionFlags {
  return {
    generalSoiling: 'moderate',
    staining: 'none',
    odor: 'none',
    petUrine: 'none',
    mold: 'none',
    fringeCondition: 'none',
    edgeCondition: 'none',
    foundationCondition: 'none',
    holes: 'none',
    tears: 'none',
    colorRun: 'none',
    colorFade: 'none',
    distortion: 'none',
    wrinkles: 'none',
    mothDamage: 'none',
    pestInfestation: false,
    dryRot: false,
    previousRepairs: false,
    highTrafficUse: false,
    petsInHome: false,
  };
}

export function getDefaultMaterial(): RugMaterial {
  return {
    type: 'unknown',
    construction: 'unknown',
    age: 'unknown',
    value: 'standard',
  };
}

// Convert AI analysis to condition flags (helper for existing flow)
export function parseAIAnalysisToConditions(analysisReport: string): Partial<ConditionFlags> {
  const report = analysisReport.toLowerCase();
  const conditions: Partial<ConditionFlags> = {};
  
  // Staining detection
  if (report.includes('severe stain') || report.includes('heavy stain')) {
    conditions.staining = 'severe';
  } else if (report.includes('moderate stain') || report.includes('visible stain')) {
    conditions.staining = 'moderate';
  } else if (report.includes('minor stain') || report.includes('light stain')) {
    conditions.staining = 'minor';
  }
  
  // Odor detection
  if (report.includes('strong odor') || report.includes('severe odor')) {
    conditions.odor = 'severe';
  } else if (report.includes('odor') || report.includes('smell')) {
    conditions.odor = 'moderate';
  }
  
  // Pet urine
  if (report.includes('urine') || report.includes('pet accident')) {
    if (report.includes('severe') || report.includes('heavy')) {
      conditions.petUrine = 'severe';
    } else {
      conditions.petUrine = 'moderate';
    }
  }
  
  // Fringe
  if (report.includes('fringe damage') || report.includes('fringe repair')) {
    if (report.includes('severe') || report.includes('replace')) {
      conditions.fringeCondition = 'severe';
    } else if (report.includes('moderate')) {
      conditions.fringeCondition = 'moderate';
    } else {
      conditions.fringeCondition = 'minor';
    }
  }
  
  // Edge/binding
  if (report.includes('edge') || report.includes('binding') || report.includes('selvedge')) {
    if (report.includes('severe') || report.includes('rebuild')) {
      conditions.edgeCondition = 'severe';
    } else if (report.includes('moderate')) {
      conditions.edgeCondition = 'moderate';
    } else {
      conditions.edgeCondition = 'minor';
    }
  }
  
  // Holes
  if (report.includes('hole')) {
    if (report.includes('large') || report.includes('severe') || report.includes('multiple')) {
      conditions.holes = 'severe';
    } else if (report.includes('moderate')) {
      conditions.holes = 'moderate';
    } else {
      conditions.holes = 'minor';
    }
  }
  
  // Moth damage
  if (report.includes('moth')) {
    if (report.includes('severe') || report.includes('extensive')) {
      conditions.mothDamage = 'severe';
    } else if (report.includes('moderate')) {
      conditions.mothDamage = 'moderate';
    } else {
      conditions.mothDamage = 'minor';
    }
  }
  
  // Dry rot
  if (report.includes('dry rot')) {
    conditions.dryRot = true;
  }
  
  // Color issues
  if (report.includes('color run') || report.includes('bleed')) {
    conditions.colorRun = 'moderate';
  }
  if (report.includes('fad')) {
    conditions.colorFade = 'moderate';
  }
  
  // Mold
  if (report.includes('mold') || report.includes('mildew')) {
    conditions.mold = 'moderate';
  }
  
  return conditions;
}