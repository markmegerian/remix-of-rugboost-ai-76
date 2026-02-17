export type RugOrigin =
  | 'persian'
  | 'turkish'
  | 'afghan'
  | 'indian'
  | 'pakistani'
  | 'chinese'
  | 'tibetan'
  | 'moroccan'
  | 'caucasian'
  | 'central_asian'
  | 'european'
  | 'native_american'
  | 'modern'
  | 'other'
  | 'unknown';

export type ConstructionType =
  | 'hand_knotted'
  | 'hand_tufted'
  | 'flatweave'
  | 'machine_made'
  | 'hand_woven'
  | 'other'
  | 'unknown';

export type FiberType =
  | 'wool'
  | 'silk'
  | 'cotton'
  | 'synthetic'
  | 'wool_silk_blend'
  | 'other_natural'
  | 'other'
  | 'unknown';

export type AgeCategory = 'antique' | 'vintage' | 'contemporary' | 'new' | 'unknown';

export type DesignFamily =
  | 'medallion'
  | 'all_over'
  | 'geometric'
  | 'curvilinear'
  | 'tribal'
  | 'pictorial'
  | 'solid_or_minimal'
  | 'other'
  | 'unknown';

export type DamageCategory =
  | 'stain'
  | 'structural'
  | 'torn'
  | 'fringe'
  | 'edge'
  | 'pile'
  | 'color'
  | 'color_run'
  | 'previous_repair'
  | 'other';

export type SeverityLevel = 'minor' | 'moderate' | 'severe' | 'critical';

export type ServiceType =
  | 'cleaning'
  | 'deep_cleaning'
  | 'overnight_soaking'
  | 'stain_removal'
  | 'moth_treatment'
  | 'fringe_repair'
  | 'fringe_replacement'
  | 'edge_binding'
  | 'overcasting'
  | 'reweave'
  | 'patch_repair'
  | 'blocking'
  | 'shearing'
  | 'fiber_protection'
  | 'padding'
  | 'inspection_only'
  | 'other';

export type PricingModel = 'sqft' | 'linear_ft' | 'fixed';

export type ServiceUnit = 'sqft' | 'linear_ft' | 'unit' | 'rug';

export type ReviewFlag =
  | 'low_photo_clarity'
  | 'fiber_uncertain'
  | 'origin_uncertain'
  | 'construction_uncertain'
  | 'significant_structural_risk'
  | 'color_run_risk'
  | 'manual_measurement_needed'
  | 'additional_photos_recommended'
  | 'in_person_conservation_assessment_recommended'
  | 'pricing_review_recommended'
  | 'other';

export interface RugProfile {
  origin: RugOrigin;
  construction: ConstructionType;
  fiber: FiberType;
  ageCategory: AgeCategory;
  designFamily: DesignFamily;
  confidence: number; // 0–1
}

export interface DamageFinding {
  id: string;
  category: DamageCategory;
  severity: SeverityLevel;
  location: string;
  description: string;
  photoIndices: number[];
  confidence: number; // 0–1
}

export interface ServiceRec {
  id?: string;
  serviceType: ServiceType;
  reason: string;
  pricingModel: PricingModel;
  quantity: number | null;
  unit: ServiceUnit | null;
  unitPrice: number | null;
  estimatedCost: number;
  relatedDamageIds: string[];
  confidence: number; // 0–1
}

export interface Totals {
  subtotal: number;
  estimatedRangeLow: number;
  estimatedRangeHigh: number;
  currency: string;
}

export interface StructuredFindings {
  rugProfile: RugProfile | null;
  damages: DamageFinding[];
  recommendedServices: ServiceRec[];
  totals: Totals | null;
  reviewFlags: ReviewFlag[];
  summary: string | null;
}

export interface LetterRugContext {
  rugNumber: string;
  label: string; // e.g. "Silk Wool Oriental"
  dimensionsLabel: string; // e.g. "9' x 6'"
  findings: StructuredFindings;
}

export interface LetterContext {
  clientName: string;
  businessName: string;
  businessPhone: string;
  estimateNumber?: string;
  rugs: LetterRugContext[];
  totals?: Totals; // overall totals for multi-rug estimates
  pendingTopics?: string[]; // e.g. fringe work
}

export interface HighlightInput {
  rugProfile: RugProfile | null;
  damages: DamageFinding[];
  services: ServiceRec[];
  totals: Totals | null;
  reviewFlags: ReviewFlag[];
}

export interface EstimateLetterDraft {
  draftText: string;
  highlightKeyServiceInput: HighlightInput | null;
  highlightKeyRugInput?: HighlightInput | null;
  fringeWorkInput?: {
    rugNumbers: string[];
  } | null;
}

// Static service description blurbs keyed by serviceType.
// These are intentionally concise; they can be expanded later.
const SERVICE_DESCRIPTION_BLURBS: Partial<Record<ServiceType, string>> = {
  cleaning:
    'Our immersion-based cleaning method safely lifts embedded soil, allergens, and contaminants while protecting natural dyes and delicate fibers.',
  overnight_soaking:
    'Overnight soaking allows cleaning agents to penetrate deep into the rug foundation and dissolve contaminants that standard cleaning cannot reach.',
  blocking:
    'Blocking and stretching gently realign warp and weft threads to correct distortion so the rug lies flat and wears evenly.',
  padding:
    'Custom-cut padding provides support, reduces fiber compression, and improves comfort and safety underfoot.',
  stain_removal:
    'Targeted stain removal uses calibrated solutions and techniques to address specific discolorations without risking color bleed or fiber damage.',
  edge_binding:
    'Edge binding reinforces vulnerable sides and helps prevent fraying, unraveling, and accelerated wear along the perimeter.',
  fringe_repair:
    'Fringe repair stabilizes and refreshes existing fringe to protect the ends of the rug and improve overall appearance.',
  fringe_replacement:
    'Fringe replacement uses carefully matched materials to restore missing or severely damaged fringe while maintaining an authentic look.',
  moth_treatment:
    'Moth treatment is a preventative measure intended to disrupt the lifecycle of moth larvae before they can damage wool fibers.',
  fiber_protection:
    'Fiber protection creates an invisible shield that helps liquids bead on the surface and reduces the accumulation of dry soil between cleanings.',
  patch_repair:
    'Patch repair reconstructs damaged or missing sections using matched materials to restore structural integrity and visual continuity.',
};

const formatCurrency = (value: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

const buildServiceDescriptionsBlock = (services: ServiceRec[]): string => {
  const seen = new Set<ServiceType>();
  const lines: string[] = [];

  for (const svc of services) {
    if (seen.has(svc.serviceType)) continue;
    seen.add(svc.serviceType);

    const blurb = SERVICE_DESCRIPTION_BLURBS[svc.serviceType];
    if (!blurb) continue;

    const priceHint = svc.unitPrice && svc.pricingModel !== 'fixed'
      ? ` (${formatCurrency(svc.unitPrice)} per ${svc.pricingModel === 'sqft' ? 'square foot' : svc.pricingModel === 'linear_ft' ? 'linear foot' : 'unit'})`
      : '';

    const title =
      svc.serviceType === 'cleaning'
        ? 'Professional Cleaning'
        : svc.serviceType === 'overnight_soaking'
        ? 'Overnight Soaking'
        : svc.serviceType === 'blocking'
        ? 'Blocking & Stretching'
        : svc.serviceType === 'padding'
        ? 'Custom Padding'
        : svc.serviceType === 'stain_removal'
        ? 'Stain Removal'
        : svc.serviceType === 'edge_binding'
        ? 'Persian Binding'
        : svc.serviceType === 'moth_treatment'
        ? 'Moth Proofing Treatment'
        : svc.serviceType === 'fiber_protection'
        ? 'Fiber Protection Treatment'
        : svc.serviceType === 'patch_repair'
        ? 'Hole Patch Repair'
        : svc.serviceType === 'fringe_repair'
        ? 'Fringe Work'
        : svc.serviceType === 'fringe_replacement'
        ? 'Fringe Replacement'
        : 'Service';

    lines.push(`${title}${priceHint}\n${blurb}\n`);
  }

  if (lines.length === 0) return '';
  return lines.join('\n');
};

const buildPerRugServicesBlock = (rug: LetterRugContext): { text: string; subtotal: number } => {
  const findings = rug.findings;
  const services = findings.recommendedServices || [];
  const currency = findings.totals?.currency || 'USD';

  const lines: string[] = [];
  let subtotal = 0;

  for (const svc of services) {
    const title =
      svc.serviceType === 'cleaning'
        ? 'Professional Cleaning'
        : svc.serviceType === 'overnight_soaking'
        ? 'Overnight Soaking'
        : svc.serviceType === 'blocking'
        ? 'Blocking & Stretching'
        : svc.serviceType === 'padding'
        ? 'Custom Padding'
        : svc.serviceType === 'stain_removal'
        ? 'Stain Removal'
        : svc.serviceType === 'edge_binding'
        ? 'Persian Binding'
        : svc.serviceType === 'moth_treatment'
        ? 'Moth Proofing Treatment'
        : svc.serviceType === 'fiber_protection'
        ? 'Fiber Protection Treatment'
        : svc.serviceType === 'patch_repair'
        ? 'Hole Patch Repair'
        : svc.serviceType === 'fringe_repair'
        ? 'Fringe Work'
        : svc.serviceType === 'fringe_replacement'
        ? 'Fringe Replacement'
        : 'Service';

    lines.push(`${title}: ${formatCurrency(svc.estimatedCost, currency)}`);
    subtotal += svc.estimatedCost;
  }

  const subtotalLine = `Subtotal for Rug ${rug.rugNumber}: ${formatCurrency(subtotal, currency)}`;
  lines.push(subtotalLine);

  return {
    text: lines.join('\n'),
    subtotal,
  };
};

const pickHighlightKeyServiceInput = (ctx: LetterContext): HighlightInput | null => {
  if (ctx.rugs.length === 0) return null;

  // Simple heuristic: pick the rug with highest subtotal or any rug with structural/torn/edge damage.
  let best: { rug: LetterRugContext; score: number } | null = null;

  for (const rug of ctx.rugs) {
    const { findings } = rug;
    const totals = findings.totals;
    const damages = findings.damages || [];
    const hasStructural = damages.some((d) =>
      d.category === 'structural' || d.category === 'torn' || d.category === 'edge'
    );
    const baseScore = (totals?.subtotal ?? 0) + (hasStructural ? 10000 : 0);
    if (!best || baseScore > best.score) {
      best = { rug, score: baseScore };
    }
  }

  if (!best) return null;

  const f = best.rug.findings;
  return {
    rugProfile: f.rugProfile,
    damages: f.damages,
    services: f.recommendedServices,
    totals: f.totals,
    reviewFlags: f.reviewFlags,
  };
};

const collectFringeWorkRugs = (ctx: LetterContext): string[] => {
  const rugNumbers: string[] = [];
  for (const rug of ctx.rugs) {
    const services = rug.findings.recommendedServices || [];
    const hasFringe = services.some(
      (s) => s.serviceType === 'fringe_repair' || s.serviceType === 'fringe_replacement'
    );
    if (hasFringe) rugNumbers.push(rug.rugNumber);
  }
  return rugNumbers;
};

export const renderEstimateLetterDraft = (ctx: LetterContext): EstimateLetterDraft => {
  const isCollection = ctx.rugs.length > 1;
  const lines: string[] = [];

  // Greeting
  lines.push(`Dear ${ctx.clientName},`);
  lines.push('');

  if (isCollection) {
    const estimateLine = ctx.estimateNumber
      ? `We are pleased to present Estimate #${ctx.estimateNumber}, which outlines our recommendations for the restoration, cleaning, and preservation of your ${ctx.rugs.length} rugs.`
      : `We are pleased to present this estimate, which outlines our recommendations for the restoration, cleaning, and preservation of your ${ctx.rugs.length} rugs.`;

    lines.push(
      `Thank you for entrusting ${ctx.businessName} with the care of your collection. ${estimateLine} Each service has been selected based on our hands-on assessment to ensure your pieces receive the specialized attention they deserve.`,
    );
  } else {
    const rug = ctx.rugs[0];
    const fiberLabel = rug.findings.rugProfile?.fiber ?? 'rug';
    const originLabel = rug.findings.rugProfile?.origin ?? '';
    lines.push(
      `I am writing to provide you with a comprehensive estimate for the restoration and preservation services recommended for your ${fiberLabel}${originLabel ? ' ' + originLabel : ''} rug. Our assessment has identified several treatments to support the quality, appearance, and longevity of this piece.`,
    );
  }

  if (ctx.pendingTopics && ctx.pendingTopics.length > 0 && isCollection) {
    lines.push('');
    lines.push(
      `There are a few topics we would like to discuss with you in more detail, including ${ctx.pendingTopics.join(', ')}. We will follow up to confirm your preferences before finalizing those portions of the work.`,
    );
  }

  lines.push('');
  lines.push('Below you will find detailed descriptions of the services included in this estimate, followed by an itemized breakdown by rug for easy review and approval.');
  lines.push('');

  // Service descriptions section
  const allServices = ctx.rugs.flatMap((r) => r.findings.recommendedServices || []);
  const serviceDescriptions = buildServiceDescriptionsBlock(allServices);
  if (serviceDescriptions) {
    lines.push('Comprehensive Service Descriptions');
    lines.push('');
    lines.push(serviceDescriptions.trim());
    lines.push('');
  }

  // Rug breakdown
  lines.push('Rug Breakdown and Services');
  lines.push('');

  const currency = ctx.totals?.currency || ctx.rugs[0]?.findings.totals?.currency || 'USD';
  let overallSubtotal = 0;

  for (const rug of ctx.rugs) {
    lines.push(
      `Rug ${rug.rugNumber}: ${rug.label} (${rug.dimensionsLabel})`,
    );
    const { text, subtotal } = buildPerRugServicesBlock(rug);
    lines.push(text);
    lines.push('');
    overallSubtotal += subtotal;
  }

  if (isCollection) {
    const total = ctx.totals?.subtotal ?? overallSubtotal;
    lines.push(`Total Confirmed Estimate for All Services: ${formatCurrency(total, currency)}`);
    lines.push('');
  } else {
    const single = ctx.rugs[0];
    const singleTotal = single.findings.totals?.subtotal ?? overallSubtotal;
    lines.push(`Total Estimate: ${formatCurrency(singleTotal, currency)}`);
    lines.push('');
  }

  // Placeholders for highlights
  lines.push('[HIGHLIGHT_KEY_SERVICE]');
  if (isCollection) {
    lines.push('');
    lines.push('[HIGHLIGHT_KEY_RUG]');
  }

  const fringeRugNumbers = collectFringeWorkRugs(ctx);
  if (fringeRugNumbers.length > 0) {
    lines.push('');
    lines.push('[FRINGE_OR_SPECIAL_WORK]');
  }

  // Next steps
  lines.push('');
  lines.push('Next Steps');
  lines.push('');

  if (isCollection) {
    lines.push(
      'These recommendations reflect our commitment to providing not just a cleaning service, but a comprehensive preservation partnership for your collection. We understand the investment these pieces represent and are dedicated to honoring that.',
    );
  } else {
    lines.push(
      'These recommendations are based on a thorough professional assessment of your rug\'s condition. We understand the investment this piece represents and are committed to delivering the highest level of care and craftsmanship.',
    );
  }

  lines.push('');
  lines.push(
    'Would you like to proceed with all recommended services, or would you prefer to discuss a prioritized approach? We are happy to work with you to develop a preservation plan that meets your specific needs and budget.',
  );
  lines.push('');
  lines.push(
    `Please contact us at ${ctx.businessPhone} to discuss these recommendations, approve services, or schedule a consultation.`,
  );
  lines.push('');
  lines.push('Sincerely,');
  lines.push(ctx.businessName);

  const draftText = lines.join('\n');

  const highlightKeyServiceInput = pickHighlightKeyServiceInput(ctx);
  const highlightKeyRugInput = isCollection ? highlightKeyServiceInput : null;
  const fringeWorkInput = fringeRugNumbers.length > 0 ? { rugNumbers: fringeRugNumbers } : null;

  return {
    draftText,
    highlightKeyServiceInput,
    highlightKeyRugInput,
    fringeWorkInput,
  };
};
