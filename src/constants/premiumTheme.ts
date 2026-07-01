// ── Dark palette (the app's original, default look) ────────────────────────
export const darkColors = {
  // Base — premium neutral charcoal, not a flat black
  background: '#0A0B0F',
  backgroundDeep: '#050608',
  charcoal: '#14161D',

  // Surfaces — frosted charcoal glass that floats over the background gradient
  surface: 'rgba(26, 28, 36, 0.80)',
  surfaceAlt: 'rgba(38, 41, 52, 0.78)',
  surfaceSoft: 'rgba(255, 255, 255, 0.055)',
  glass: 'rgba(255, 255, 255, 0.06)',

  // Lines & highlights
  border: 'rgba(255, 255, 255, 0.10)',
  borderStrong: 'rgba(225, 29, 46, 0.36)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
  hairline: 'rgba(255, 255, 255, 0.42)',

  // Brand
  red: '#B11226',
  redBright: '#E11D2E',
  redGlow: 'rgba(225, 29, 46, 0.30)',
  wine: '#5E0F1B',

  // Text
  text: '#F7F8FA',
  textMuted: '#A6AEBD',
  textFaint: '#6F7888',

  // Status
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#DC2626',
} as const;

// Shared palette shape — same keys as the dark palette, values widened to string
// so the light palette can supply different color literals.
export type ThemeColors = Record<keyof typeof darkColors, string>;

// ── Light palette — same design, inverted neutrals. Brand red + status colors
// are byte-for-byte identical to dark; only background/surface/text/border flip.
export const lightColors: ThemeColors = {
  // Base — soft warm-white, not clinical flat white
  background: '#F5F6F8',
  backgroundDeep: '#EAECEF',
  charcoal: '#FFFFFF',

  // Surfaces — frosted white glass floating over the light gradient
  surface: 'rgba(255, 255, 255, 0.80)',
  surfaceAlt: 'rgba(244, 245, 248, 0.85)',
  surfaceSoft: 'rgba(10, 11, 15, 0.045)',
  glass: 'rgba(10, 11, 15, 0.05)',

  // Lines & highlights
  border: 'rgba(10, 11, 15, 0.10)',
  borderStrong: 'rgba(177, 18, 38, 0.30)',
  glassBorder: 'rgba(10, 11, 15, 0.12)',
  hairline: 'rgba(10, 11, 15, 0.35)',

  // Brand — UNCHANGED, same red across both themes
  red: '#B11226',
  redBright: '#E11D2E',
  redGlow: 'rgba(225, 29, 46, 0.22)',
  wine: '#5E0F1B',

  // Text — dark ink on light surfaces
  text: '#14161D',
  textMuted: '#5B6270',
  textFaint: '#8A90A0',

  // Status — UNCHANGED
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#DC2626',
} as const;

// Backward-compat alias — screens that still import `premiumColors` directly
// keep rendering the dark look until migrated to useAppTheme().
export const premiumColors = darkColors;

// ── Gradients (use with expo-linear-gradient `colors`). ─────────────────────
export const darkGradients = {
  // App background — near-black with a very faint red undertone
  screen: ['#141010', '#0D0909', '#080505'] as const,
  // Frosted card — top-lit translucent panel
  card: ['rgba(44, 47, 59, 0.86)', 'rgba(24, 26, 34, 0.82)'] as const,
  // Subtle red-tinted hero/feature panel
  redPanel: ['#7E0F1E', '#4A0B16', '#1C0710'] as const,
  // Glossy primary button
  redButton: ['#FF4254', '#E11D2E', '#A50F1E'] as const,
  // Inner glass sheen overlay
  glassSheen: ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.0)'] as const,
} as const;

// A gradient is a stop list of at least two colors (satisfies expo-linear-gradient).
export type ThemeGradient = readonly [string, string, ...string[]];
export type ThemeGradients = Record<keyof typeof darkGradients, ThemeGradient>;

export const lightGradients: ThemeGradients = {
  // App background — soft warm-white falling into a faint red-tinted floor,
  // mirroring the dark theme's near-black-with-red-undertone falloff.
  screen: ['#FDFAFA', '#F6ECED', '#EDD9DB'] as const,
  // Frosted card — bright top-lit translucent panel
  card: ['rgba(255, 255, 255, 0.92)', 'rgba(240, 241, 244, 0.86)'] as const,
  // Brand hero panel — kept identical, red must not change
  redPanel: ['#7E0F1E', '#4A0B16', '#1C0710'] as const,
  // Glossy primary button — kept identical
  redButton: ['#FF4254', '#E11D2E', '#A50F1E'] as const,
  // Inner glass sheen overlay — dark-ink sheen instead of white sheen
  glassSheen: ['rgba(10, 11, 15, 0.06)', 'rgba(10, 11, 15, 0.0)'] as const,
} as const;

// Backward-compat alias — see note on `premiumColors`.
export const premiumGradients = darkGradients;

// Deep, soft elevation shadow for floating glass cards.
export const premiumShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 18 },
  shadowOpacity: 0.4,
  shadowRadius: 28,
  elevation: 10,
} as const;

// Red accent glow for primary actions / highlighted elements.
export const premiumGlow = {
  shadowColor: premiumColors.redBright,
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.45,
  shadowRadius: 22,
  elevation: 8,
} as const;

// Shared corner radii for a consistent modern rhythm.
export const radius = {
  sm: 14,
  md: 18,
  lg: 24,
  xl: 30,
  pill: 999,
} as const;
