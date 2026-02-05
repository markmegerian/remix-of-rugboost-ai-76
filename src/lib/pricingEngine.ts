 // Pricing & Risk Multiplier Engine
 // Automatically adjusts pricing based on risk, severity, and material
 // Staff cannot manipulate formulas - only review final prices
 
 import { ServiceCategory } from './serviceCategories';
 import { RugMaterial, ConditionSeverity, DeterminedService, InspectionInput } from './serviceRulesEngine';
 
 // ============================================
 // RISK LEVELS (Internal - Never Shown to Clients)
 // ============================================
 
 export type RiskLevel = 'low' | 'medium' | 'high';
 
 // Map service categories to base risk levels
 const CATEGORY_RISK_MAP: Record<ServiceCategory, RiskLevel> = {
   required: 'low',      // Standard care - baseline risk
   recommended: 'medium', // Treatment work - moderate risk
   high_cost: 'high',    // Structural work - highest risk
   preventative: 'low',  // Future protection - minimal risk
 };
 
 // ============================================
 // MULTIPLIER CONFIGURATION (Internal Only)
 // ============================================
 
 // Risk level multipliers (based on service category)
 const RISK_MULTIPLIERS: Record<RiskLevel, number> = {
   low: 1.0,
   medium: 1.15,
   high: 1.35,
 };
 
 // Severity multipliers (from inspection condition flags)
 const SEVERITY_MULTIPLIERS: Record<ConditionSeverity, number> = {
   none: 1.0,
   minor: 1.0,
   moderate: 1.2,
   severe: 1.45,
 };
 
 // Material sensitivity multipliers
 interface MaterialMultipliers {
   type: Record<RugMaterial['type'], number>;
   construction: Record<RugMaterial['construction'], number>;
   age: Record<RugMaterial['age'], number>;
   value: Record<RugMaterial['value'], number>;
 }
 
 const MATERIAL_MULTIPLIERS: MaterialMultipliers = {
   type: {
     wool: 1.0,
     silk: 1.4,        // Fragile, high liability
     cotton: 1.0,
     synthetic: 0.9,   // Lower care complexity
     mixed: 1.1,
     unknown: 1.15,    // Unknown = assume moderate risk
   },
   construction: {
     'hand-knotted': 1.25,   // High skill required
     'hand-tufted': 1.1,
     'machine-made': 0.95,
     'flat-weave': 1.05,
     'hooked': 1.0,
     'unknown': 1.1,
   },
   age: {
     new: 0.95,
     modern: 1.0,
     'semi-antique': 1.2,
     antique: 1.45,    // Highest handling sensitivity
     unknown: 1.1,
   },
   value: {
     standard: 1.0,
     premium: 1.15,
     heirloom: 1.35,   // Maximum care required
     unknown: 1.05,
   },
 };
 
 // ============================================
 // PRICING CALCULATION
 // ============================================
 
 export interface PricedService extends DeterminedService {
   baseTotal: number;         // Base price × quantity
   riskMultiplier: number;    // Combined multiplier (internal)
   adjustedTotal: number;     // Final price after multipliers
   riskLevel: RiskLevel;
   pricingFactors: string[];  // Human-readable tags for staff
   isOverridden: boolean;
   overrideAmount?: number;
 }
 
 export interface PricingResult {
   services: PricedService[];
   subtotal: number;
   totalBeforeAdjustments: number;
   totalAfterAdjustments: number;
   averageRiskMultiplier: number;
   pricingStatement: string;  // Client-facing neutral statement
 }
 
 // Determine the dominant severity from condition flags
 function getDominantSeverity(input: InspectionInput): ConditionSeverity {
   const severities: ConditionSeverity[] = [
     input.conditions.staining,
     input.conditions.odor,
     input.conditions.petUrine,
     input.conditions.mold,
     input.conditions.fringeCondition,
     input.conditions.edgeCondition,
     input.conditions.foundationCondition,
     input.conditions.holes,
     input.conditions.tears,
     input.conditions.mothDamage,
     input.conditions.colorRun,
     input.conditions.colorFade,
     input.conditions.distortion,
   ];
   
   const severityOrder: ConditionSeverity[] = ['severe', 'moderate', 'minor', 'none'];
   
   for (const severity of severityOrder) {
     if (severities.includes(severity)) {
       return severity;
     }
   }
   
   return 'none';
 }
 
 // Get the severity relevant to a specific service
 function getServiceRelevantSeverity(service: DeterminedService, input: InspectionInput): ConditionSeverity {
   const serviceId = service.id.toLowerCase();
   
   // Map services to their relevant condition flags
   if (serviceId.includes('stain')) return input.conditions.staining;
   if (serviceId.includes('odor')) return input.conditions.odor;
   if (serviceId.includes('urine')) return input.conditions.petUrine;
   if (serviceId.includes('mold')) return input.conditions.mold;
   if (serviceId.includes('fringe')) return input.conditions.fringeCondition;
   if (serviceId.includes('edge') || serviceId.includes('selvedge')) return input.conditions.edgeCondition;
   if (serviceId.includes('foundation')) return input.conditions.foundationCondition;
   if (serviceId.includes('hole')) return input.conditions.holes;
   if (serviceId.includes('tear')) return input.conditions.tears;
   if (serviceId.includes('moth')) return input.conditions.mothDamage;
   if (serviceId.includes('color')) {
     return input.conditions.colorRun !== 'none' ? input.conditions.colorRun : input.conditions.colorFade;
   }
   if (serviceId.includes('blocking') || serviceId.includes('distortion')) return input.conditions.distortion;
   
   // For general services, use dominant severity
   return getDominantSeverity(input);
 }
 
 // Calculate material-based multiplier
 function calculateMaterialMultiplier(material: RugMaterial): number {
   const typeMultiplier = MATERIAL_MULTIPLIERS.type[material.type];
   const constructionMultiplier = MATERIAL_MULTIPLIERS.construction[material.construction];
   const ageMultiplier = MATERIAL_MULTIPLIERS.age[material.age];
   const valueMultiplier = MATERIAL_MULTIPLIERS.value[material.value];
   
   // Use geometric mean to avoid extreme compounding
   const combined = Math.pow(
     typeMultiplier * constructionMultiplier * ageMultiplier * valueMultiplier,
     0.5 // Square root to moderate the compound effect
   );
   
   // Cap at reasonable bounds
   return Math.min(Math.max(combined, 0.85), 1.8);
 }
 
 // Generate pricing factors (tags for staff view)
 function generatePricingFactors(
   service: DeterminedService,
   material: RugMaterial,
   severity: ConditionSeverity,
   riskLevel: RiskLevel
 ): string[] {
   const factors: string[] = [];
   
   if (riskLevel === 'high') factors.push('structural risk');
   if (severity === 'severe') factors.push('severe condition');
   if (severity === 'moderate') factors.push('moderate condition');
   
   if (material.type === 'silk') factors.push('silk handling');
   if (material.age === 'antique') factors.push('antique care');
   if (material.value === 'heirloom') factors.push('heirloom value');
   if (material.construction === 'hand-knotted') factors.push('hand-knotted');
   
   return factors;
 }
 
 // Main pricing calculation
 export function calculatePricing(
   services: DeterminedService[],
   input: InspectionInput,
   overrides: Map<string, number> = new Map()
 ): PricingResult {
   const pricedServices: PricedService[] = [];
   let totalBeforeAdjustments = 0;
   let totalAfterAdjustments = 0;
   let totalMultiplierSum = 0;
   
   const materialMultiplier = calculateMaterialMultiplier(input.material);
   
   for (const service of services) {
     const baseTotal = service.baseUnitPrice * service.quantity;
     const riskLevel = CATEGORY_RISK_MAP[service.category];
     const severity = getServiceRelevantSeverity(service, input);
     
     // Calculate combined multiplier
     const riskMult = RISK_MULTIPLIERS[riskLevel];
     const severityMult = SEVERITY_MULTIPLIERS[severity];
     
     // Apply material multiplier only to high-skill services
     const shouldApplyMaterial = 
       service.category === 'high_cost' || 
       service.category === 'recommended' ||
       service.id.includes('cleaning');
     
     const materialMult = shouldApplyMaterial ? materialMultiplier : 1.0;
     
     // Use geometric mean for final multiplier (avoids extreme values)
     const rawMultiplier = riskMult * severityMult * materialMult;
     const smoothedMultiplier = Math.pow(rawMultiplier, 0.75); // Dampen extremes
     const finalMultiplier = Math.round(smoothedMultiplier * 100) / 100;
     
     const adjustedTotal = Math.round(baseTotal * finalMultiplier * 100) / 100;
     
     // Check for manual override
     const hasOverride = overrides.has(service.id);
     const overrideAmount = hasOverride ? overrides.get(service.id) : undefined;
     const finalPrice = hasOverride && overrideAmount !== undefined ? overrideAmount : adjustedTotal;
     
     const pricingFactors = generatePricingFactors(service, input.material, severity, riskLevel);
     
     pricedServices.push({
       ...service,
       baseTotal,
       riskMultiplier: finalMultiplier,
       adjustedTotal: finalPrice,
       riskLevel,
       pricingFactors,
       isOverridden: hasOverride,
       overrideAmount,
     });
     
     totalBeforeAdjustments += baseTotal;
     totalAfterAdjustments += finalPrice;
     totalMultiplierSum += finalMultiplier;
   }
   
   const averageRiskMultiplier = pricedServices.length > 0 
     ? totalMultiplierSum / pricedServices.length 
     : 1.0;
   
   // Generate client-facing neutral statement
   const pricingStatement = generatePricingStatement(input.material, pricedServices);
   
   return {
     services: pricedServices,
     subtotal: totalAfterAdjustments,
     totalBeforeAdjustments,
     totalAfterAdjustments,
     averageRiskMultiplier: Math.round(averageRiskMultiplier * 100) / 100,
     pricingStatement,
   };
 }
 
 // ============================================
 // CLIENT-FACING STATEMENTS (Neutral Framing)
 // ============================================
 
 function generatePricingStatement(material: RugMaterial, services: PricedService[]): string {
   const hasHighRisk = services.some(s => s.riskLevel === 'high');
   const hasStructural = services.some(s => s.category === 'high_cost');
   
   const materialDescriptors: string[] = [];
   if (material.type !== 'unknown') materialDescriptors.push(material.type);
   if (material.construction !== 'unknown') materialDescriptors.push(material.construction);
   if (material.age === 'antique' || material.age === 'semi-antique') {
     materialDescriptors.push(material.age);
   }
   
   const materialDesc = materialDescriptors.length > 0 
     ? materialDescriptors.join(' ') 
     : 'your rug';
   
   if (hasStructural && hasHighRisk) {
     return `Pricing reflects the specialized care required for ${materialDesc}, including structural restoration work identified during inspection.`;
   }
   
   if (hasHighRisk) {
     return `Pricing reflects the condition-specific treatment required for ${materialDesc} based on professional inspection findings.`;
   }
   
   return `Pricing reflects the material, condition, and recommended care for ${materialDesc}.`;
 }
 
 // ============================================
 // OVERRIDE VALIDATION
 // ============================================
 
 export const OVERRIDE_REASONS = [
   'Customer loyalty adjustment',
   'Bundle discount applied',
   'Condition reassessed on-site',
   'Material reclassified',
   'Scope reduced by client request',
   'Promotional rate',
   'Error correction',
   'Manager approval required',
 ] as const;
 
 export type OverrideReason = typeof OVERRIDE_REASONS[number];
 
 export interface PriceOverride {
   serviceId: string;
   serviceName: string;
   originalPrice: number;
   adjustedPrice: number;
   reason: OverrideReason;
   notes?: string;
 }
 
 export function validateOverride(override: PriceOverride): { valid: boolean; error?: string } {
   if (override.adjustedPrice < 0) {
     return { valid: false, error: 'Price cannot be negative' };
   }
   
   if (override.adjustedPrice === 0 && override.reason !== 'Bundle discount applied') {
     return { valid: false, error: 'Zero price requires manager approval' };
   }
   
   const maxDiscount = 0.5; // 50% max discount
   if (override.adjustedPrice < override.originalPrice * maxDiscount) {
     return { valid: false, error: 'Discount exceeds maximum allowed (50%)' };
   }
   
   const maxIncrease = 1.5; // 50% max increase
   if (override.adjustedPrice > override.originalPrice * maxIncrease) {
     return { valid: false, error: 'Increase exceeds maximum allowed (50%)' };
   }
   
   return { valid: true };
 }
 
 // ============================================
 // CONSISTENCY CHECK (For Analytics)
 // ============================================
 
 export function getPricingConsistencyScore(
   currentPricing: PricingResult,
   historicalAverage: number
 ): { score: number; deviation: string } {
   const currentTotal = currentPricing.totalAfterAdjustments;
   const deviation = Math.abs(currentTotal - historicalAverage) / historicalAverage;
   
   if (deviation < 0.1) {
     return { score: 100, deviation: 'within normal range' };
   } else if (deviation < 0.25) {
     return { score: 75, deviation: 'slightly outside typical range' };
   } else if (deviation < 0.5) {
     return { score: 50, deviation: 'significantly different from typical' };
   } else {
     return { score: 25, deviation: 'requires review' };
   }
 }