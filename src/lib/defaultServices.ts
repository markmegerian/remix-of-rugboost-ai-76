// Canonical list of default rug care services used across the platform.
// Used as a fallback when no company/user-specific prices have been configured.

// Fixed-price services: these have a consistent per-unit rate set in Settings.
export const DEFAULT_SERVICES = [
  "Standard wash",
  "Special fiber/antique wash",
  "Limewash (moth wash)",
  "Overnight soaking",
  "Blocking",
  "Sheering",
  "Overcasting",
  "Zenjireh",
  "Persian Binding",
  "Hand Fringe",
  "Machine Fringe",
  "Leather binding",
  "Cotton Binding",
  "Glue binding",
  "Padding",
] as const;

// Variable-price services: cost depends on the specific rug condition/scope.
// Staff must enter a price each time these are added to an estimate.
export const DEFAULT_VARIABLE_SERVICES = [
  "Stain removal",
  "Spot treatment",
  "Odor treatment",
  "Pet damage treatment",
  "Repair",
  "Reweave",
  "Patching",
  "Cutting / resizing",
  "Re-pile (re-knotting)",
  "Color correction",
  "Color run removal",
  "Mothproofing treatment",
  "Scotchgard / protector",
  "Mold / mildew treatment",
] as const;

export type DefaultServiceName = (typeof DEFAULT_SERVICES)[number];
export type DefaultVariableServiceName = (typeof DEFAULT_VARIABLE_SERVICES)[number];
