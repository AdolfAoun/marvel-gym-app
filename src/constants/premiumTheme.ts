export const premiumColors = {
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

// Reusable gradient stops (use with expo-linear-gradient `colors`).
export const premiumGradients = {
  // App background — charcoal depth from top to bottom
  screen: ['#13151D', '#0A0B0F', '#050608'] as const,
  // Frosted card — top-lit translucent panel
  card: ['rgba(44, 47, 59, 0.86)', 'rgba(24, 26, 34, 0.82)'] as const,
  // Subtle red-tinted hero/feature panel
  redPanel: ['#7E0F1E', '#4A0B16', '#1C0710'] as const,
  // Glossy primary button
  redButton: ['#FF4254', '#E11D2E', '#A50F1E'] as const,
  // Inner glass sheen overlay
  glassSheen: ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.0)'] as const,
} as const;

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
