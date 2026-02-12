/**
 * Unit type metadata for the service catalog.
 *
 * Each service has a billing unit that determines how the quantity
 * is calculated from rug dimensions.
 */

export type ServiceUnitType =
  | 'sqft'        // priced per square foot  (e.g. Standard wash)
  | 'linear_ft'   // priced per linear foot  (e.g. Hand fringe, Binding)
  | 'each'        // flat per-item rate       (e.g. Blocking, Sheering)
  | 'variable';   // manual entry per rug     (e.g. Stain removal, Repair)

export interface ServiceUnitConfig {
  unit: ServiceUnitType;
  label: string;           // display label  e.g. "per sq ft", "per linear ft"
  /** If true, the service applies to specific edges and needs an edge selector */
  edgeSelectable?: boolean;
}

/** Unit configuration for every default fixed-price service. */
export const FIXED_SERVICE_UNITS: Record<string, ServiceUnitConfig> = {
  'Standard wash':              { unit: 'sqft',      label: 'per sq ft' },
  'Special fiber/antique wash': { unit: 'sqft',      label: 'per sq ft' },
  'Limewash (moth wash)':       { unit: 'sqft',      label: 'per sq ft' },
  'Overnight soaking':          { unit: 'sqft',      label: 'per sq ft' },
  'Blocking':                   { unit: 'sqft',      label: 'per sq ft' },
  'Sheering':                   { unit: 'sqft',      label: 'per sq ft' },
  'Overcasting':                { unit: 'linear_ft', label: 'per linear ft', edgeSelectable: true },
  'Zenjireh':                   { unit: 'linear_ft', label: 'per linear ft', edgeSelectable: true },
  'Persian Binding':            { unit: 'linear_ft', label: 'per linear ft', edgeSelectable: true },
  'Hand Fringe':                { unit: 'linear_ft', label: 'per linear ft', edgeSelectable: true },
  'Machine Fringe':             { unit: 'linear_ft', label: 'per linear ft', edgeSelectable: true },
  'Leather binding':            { unit: 'linear_ft', label: 'per linear ft', edgeSelectable: true },
  'Cotton Binding':             { unit: 'linear_ft', label: 'per linear ft', edgeSelectable: true },
  'Glue binding':               { unit: 'linear_ft', label: 'per linear ft', edgeSelectable: true },
  'Padding':                    { unit: 'sqft',      label: 'per sq ft' },
};

/** Variable-price services all use the 'variable' unit type. */
export const VARIABLE_SERVICE_UNIT: ServiceUnitConfig = {
  unit: 'variable',
  label: 'price per rug',
};

/**
 * Look up the unit configuration for any service name.
 */
export function getServiceUnit(serviceName: string): ServiceUnitConfig {
  return FIXED_SERVICE_UNITS[serviceName] ?? VARIABLE_SERVICE_UNIT;
}
