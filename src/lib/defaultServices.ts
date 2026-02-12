// Canonical list of default rug care services used across the platform.
// Used as a fallback when no company/user-specific prices have been configured.

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

export type DefaultServiceName = (typeof DEFAULT_SERVICES)[number];
