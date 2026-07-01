import { useMemo } from 'react';

import {
  darkColors,
  darkGradients,
  lightColors,
  lightGradients,
  premiumGlow,
  premiumShadow,
  type ThemeColors,
  type ThemeGradients,
} from '@/constants/premiumTheme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type AppColorScheme = 'light' | 'dark';

export type AppColors = ThemeColors;
export type AppGradients = ThemeGradients;

export type AppTheme = {
  scheme: AppColorScheme;
  colors: AppColors;
  gradients: AppGradients;
  shadow: typeof premiumShadow;
  glow: typeof premiumGlow;
  /** rgba(ink, opacity) — white-alpha in dark mode, near-black-alpha in light mode. */
  ink: (opacity: number) => string;
  /** rgba(paper, opacity) — inverse of ink(): dark-alpha in dark mode, white-alpha in light mode. */
  paper: (opacity: number) => string;
};

// White ink on dark surfaces; near-black ink on light surfaces.
const INK_DARK = '255, 255, 255';
const INK_LIGHT = '10, 11, 15';

/**
 * App-wide theme driven by the device's system color scheme. No provider needed —
 * `useColorScheme()` is a lightweight subscription, so calling this hook from any
 * component (and re-rendering on appearance change) is the intended pattern.
 * Defaults to dark when the scheme is unavailable, matching the app's original look.
 */
export function useAppTheme(): AppTheme {
  const scheme = useColorScheme() ?? 'dark';

  return useMemo(() => {
    const isDark = scheme === 'dark';
    const inkBase = isDark ? INK_DARK : INK_LIGHT;
    const paperBase = isDark ? INK_LIGHT : INK_DARK;

    return {
      scheme: isDark ? 'dark' : 'light',
      colors: isDark ? darkColors : lightColors,
      gradients: isDark ? darkGradients : lightGradients,
      shadow: premiumShadow,
      glow: premiumGlow,
      ink: (opacity: number) => `rgba(${inkBase}, ${opacity})`,
      paper: (opacity: number) => `rgba(${paperBase}, ${opacity})`,
    };
  }, [scheme]);
}
