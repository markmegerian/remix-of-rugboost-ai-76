/**
 * Rug dimension utilities.
 *
 * The rug industry commonly writes dimensions in a "feet.inches" notation:
 *   9.06 → 9 ft 6 in   (NOT 9.06 decimal feet)
 *   6.08 → 6 ft 8 in
 *   8.10 → 8 ft 10 in
 *   8.11 → 8 ft 11 in
 *   8.00 → 8 ft 0 in
 *
 * The inches portion is always two digits (00-11).  If a user enters "9.6"
 * instead of "9.06" we treat it as 9 ft 6 in for convenience but the UI
 * should encourage the two-digit convention.
 */

export type DimensionFormat = 'ft_in' | 'decimal_ft';

/** Default dimension format if no company setting is found */
export const DEFAULT_DIMENSION_FORMAT: DimensionFormat = 'ft_in';

/**
 * Parse a rug-industry dimension string into mathematical feet.
 *
 * @param raw  The value entered by the user (e.g. "9.06")
 * @param format  How to interpret the value
 */
export function parseDimension(raw: string | number, format: DimensionFormat): number {
  const val = typeof raw === 'string' ? raw.trim() : String(raw);
  if (!val || val === '0') return 0;

  if (format === 'decimal_ft') {
    return parseFloat(val) || 0;
  }

  // ft_in format
  const parts = val.split('.');
  const feet = parseInt(parts[0], 10) || 0;

  if (parts.length < 2 || parts[1] === '') return feet;

  let inchStr = parts[1];

  // Pad a single digit → e.g. "9.6" → treat as "9.06" (6 inches)
  if (inchStr.length === 1) {
    inchStr = '0' + inchStr;
  }

  const inches = parseInt(inchStr, 10) || 0;

  // Clamp to 0-11 range
  const clampedInches = Math.min(Math.max(inches, 0), 11);

  return feet + clampedInches / 12;
}

/**
 * Format mathematical feet back into the industry "ft.in" notation.
 */
export function formatDimension(mathFeet: number, format: DimensionFormat): string {
  if (format === 'decimal_ft') return mathFeet.toFixed(2);

  const feet = Math.floor(mathFeet);
  const inches = Math.round((mathFeet - feet) * 12);
  return `${feet}.${String(inches).padStart(2, '0')}`;
}

// ─── Edge types ───────────────────────────────────────────────

/** Which edges of a rug can be selected for a linear-ft service. */
export type RugEdge = 'end1' | 'end2' | 'side1' | 'side2';

export interface RugDimensions {
  /** Mathematical feet (already parsed) */
  lengthFt: number;
  /** Mathematical feet (already parsed) */
  widthFt: number;
}

/**
 * Calculate the linear footage for a set of selected edges.
 *
 * Convention:
 *   • "Ends" run across the WIDTH of the rug (top / bottom fringes).
 *   • "Sides" run along the LENGTH of the rug (left / right selvedges).
 */
export function calculateLinearFeet(
  dims: RugDimensions,
  selectedEdges: RugEdge[],
): number {
  let total = 0;
  for (const edge of selectedEdges) {
    if (edge === 'end1' || edge === 'end2') total += dims.widthFt;
    if (edge === 'side1' || edge === 'side2') total += dims.lengthFt;
  }
  return total;
}

/**
 * Calculate the square footage of a rug.
 */
export function calculateSquareFeet(dims: RugDimensions): number {
  return dims.lengthFt * dims.widthFt;
}

// ─── Edge suggestion parsing ───────────────────────────────────

/**
 * Represents AI-suggested edges for a specific service type.
 */
export interface EdgeSuggestion {
  servicePattern: string;   // e.g. "fringe", "binding", "overcasting"
  suggestedEdges: RugEdge[];
  rationale: string;
}

/**
 * Parse AI edge suggestions from the analysis report's structured edgeSuggestions field.
 */
export function parseEdgeSuggestions(suggestions: any[]): EdgeSuggestion[] {
  if (!Array.isArray(suggestions)) return [];
  return suggestions
    .filter(s => s && typeof s.serviceType === 'string' && Array.isArray(s.edges))
    .map(s => ({
      servicePattern: s.serviceType.toLowerCase(),
      suggestedEdges: s.edges.filter((e: string) =>
        ['end1', 'end2', 'side1', 'side2'].includes(e),
      ) as RugEdge[],
      rationale: s.rationale || '',
    }));
}

/**
 * Find suggested edges for a given service name.
 */
export function getSuggestedEdgesForService(
  serviceName: string,
  suggestions: EdgeSuggestion[],
): EdgeSuggestion | null {
  const lower = serviceName.toLowerCase();
  return suggestions.find(s => lower.includes(s.servicePattern)) ?? null;
}
