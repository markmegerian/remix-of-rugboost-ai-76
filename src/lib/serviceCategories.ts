 // Service categorization for Expert Decision Engine
 // Services are categorized based on their nature: Required, Recommended, or Preventative
 
 export type ServiceCategory = 'required' | 'recommended' | 'preventative';
 
 export interface ServiceCategoryConfig {
   label: string;
   description: string;
   helpText: string;
   keywords: string[];
   color: string;
   badgeVariant: 'destructive' | 'secondary' | 'outline';
 }
 
 export const SERVICE_CATEGORIES: Record<ServiceCategory, ServiceCategoryConfig> = {
   required: {
     label: 'Required for Proper Care',
     description: 'Based on professional inspection, these services are necessary to safely clean and preserve your rug.',
     helpText: 'These services are deemed essential by our experts and cannot be declined.',
     keywords: [
       'cleaning', 'wash', 'professional cleaning', 'deep cleaning', 'immersion',
       'dry rot', 'foundation repair', 'structural repair', 'hole repair', 
       'tear repair', 'reweaving', 'severe damage'
     ],
     color: 'text-destructive',
     badgeVariant: 'destructive'
   },
   recommended: {
     label: 'Expert-Recommended Enhancements',
     description: 'Based on our assessment, we strongly recommend these services to address identified issues and prevent further damage.',
     helpText: 'Recommended to prevent long-term damage. Accept or decline as a group.',
     keywords: [
       'stain removal', 'stain treatment', 'binding', 'overcast', 'fringe', 
       'edge', 'selvedge', 'blocking', 'stretching', 'shearing', 'zenjireh',
       'limewash', 'special wash', 'persian binding', 'cotton binding',
       'leather binding', 'glue binding', 'hand fringe', 'machine fringe',
       'overnight soaking', 'soaking'
     ],
     color: 'text-amber-600',
     badgeVariant: 'secondary'
   },
   preventative: {
     label: 'Preventative / Longevity Services',
     description: 'Recommended to protect your investment and extend the life of your rug.',
     helpText: 'Optional protection services for future risk mitigation.',
     keywords: [
       'protection', 'moth proof', 'moth proofing', 'fiber protect', 
       'scotchgard', 'stain protection', 'padding', 'custom padding',
       'storage', 'preservation'
     ],
     color: 'text-muted-foreground',
     badgeVariant: 'outline'
   }
 };
 
 // Categorize a service based on its name
 export function categorizeService(serviceName: string): ServiceCategory {
   const lowerName = serviceName.toLowerCase();
   
   // Check required first (highest priority)
   if (SERVICE_CATEGORIES.required.keywords.some(k => lowerName.includes(k))) {
     return 'required';
   }
   
   // Check preventative before recommended (more specific)
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
   // Required services cannot be removed without admin override
   return category !== 'required';
 }
 
 // Get risk disclosure text for a service category
 export function getRiskDisclosure(category: ServiceCategory): string | null {
   if (category === 'required') {
     return 'Declining this service may result in irreversible damage to your rug.';
   }
   if (category === 'recommended') {
     return 'Declining expert-recommended services may lead to progressive deterioration.';
   }
   return null;
 }
 
 // Expert language replacements
 export const EXPERT_LANGUAGE = {
   // Replace casual terms with expert terminology
   terms: {
     'choose': 'authorized',
     'optional': 'expert-recommended',
     'customize': 'review',
     'add': 'include',
     'remove': 'decline',
     'select': 'confirm',
     'edit': 'adjust',
   },
   
   // Professional framing phrases
   phrases: {
     serviceIntro: 'Based on professional inspection',
     required: 'Required to safely clean and preserve this rug',
     recommended: 'Recommended to prevent long-term damage',
     preventative: 'Advised for optimal longevity and protection',
     approval: 'Approval authorizes work exactly as outlined',
     pricing: 'Investment required for proper restoration',
   }
 };