import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { useAppTheme, type AppTheme } from '@/theme/useAppTheme';

type PremiumScreenBackgroundProps = {
  children: ReactNode;
  /** Kept for API compatibility; the backdrop is always edge-to-edge now. */
  bottomInset?: boolean;
  /** Show the static Marvel sign watermarks behind the content. */
  signs?: boolean;
  /** Height of the red horizon glow rising from the bottom (px). */
  redHorizonHeight?: number;
};

const signDot = require('@/assets/images/marvel-logo-startup-sign-dot.png');
const signX = require('@/assets/images/marvel-logo-startup-sign-x.png');
const signSlash = require('@/assets/images/marvel-logo-startup-sign-slash.png');
const signDivide = require('@/assets/images/marvel-logo-startup-sign-divide.png');

// Fixed Marvel sign watermarks. These live behind the scrolling content so the
// signs stay static while the UI glides over them. Uses the real startup sign
// art (not generic shapes) at a quiet opacity for a premium branded backdrop.
const signMarks = [
  { source: signX, top: 26, left: 18, size: 64, rotate: '-14deg', opacity: 0.05 },
  { source: signDivide, top: 88, right: 24, size: 52, rotate: '10deg', opacity: 0.055 },
  { source: signSlash, top: 188, left: 78, size: 60, rotate: '16deg', opacity: 0.045 },
  { source: signDot, top: 250, right: 60, size: 26, rotate: '0deg', opacity: 0.07 },
  { source: signX, top: 330, left: 30, size: 78, rotate: '12deg', opacity: 0.04 },
  { source: signSlash, top: 430, right: 28, size: 54, rotate: '-15deg', opacity: 0.05 },
  { source: signDivide, top: 560, left: 46, size: 48, rotate: '-8deg', opacity: 0.05 },
  { source: signX, top: 690, right: 70, size: 66, rotate: '8deg', opacity: 0.04 },
  { source: signDot, top: 760, left: 110, size: 22, rotate: '0deg', opacity: 0.07 },
];

/**
 * App-wide premium backdrop: a layered charcoal gradient with a soft top light,
 * a single subtle red horizon glow, and fixed Marvel sign watermarks. The signs
 * are static so screen content scrolls over them with depth.
 */
export function PremiumScreenBackground({
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bottomInset = true,
  signs = true,
  redHorizonHeight = 360,
}: PremiumScreenBackgroundProps) {
  const theme = useAppTheme();
  const styles = useStyles(theme);
  const isDark = theme.scheme === 'dark';

  return (
    // Full-bleed: the backdrop fills the whole screen and continues underneath
    // the floating tab bar so every tab feels edge-to-edge.
    <View style={styles.safeArea}>
      {/* Base depth gradient */}
      <LinearGradient
        pointerEvents="none"
        colors={theme.gradients.screen}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Soft light reflecting from the top-left */}
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ['rgba(255, 255, 255, 0.05)', 'transparent']
            : ['rgba(10, 11, 15, 0.04)', 'transparent']
        }
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.7, y: 0.42 }}
        style={styles.topLight}
      />
      {/* Fixed Marvel sign watermarks — static behind scrolling content */}
      {signs ? (
        <View pointerEvents="none" style={styles.signLayer}>
          {signMarks.map((mark, index) => (
            <Image
              key={index}
              source={mark.source}
              resizeMode="contain"
              style={{
                position: 'absolute',
                top: mark.top,
                left: 'left' in mark ? mark.left : undefined,
                right: 'right' in mark ? mark.right : undefined,
                width: mark.size,
                height: mark.size,
                opacity: isDark ? mark.opacity : Math.min(mark.opacity + 0.025, 0.09),
                tintColor: isDark ? '#FFFFFF' : '#B11226',
                transform: [{ rotate: mark.rotate }],
              }}
            />
          ))}
        </View>
      ) : null}
      {/* Subtle red horizon glow rising from the bottom — accent only */}
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ['transparent', 'rgba(177, 18, 38, 0.16)']
            : ['transparent', 'rgba(177, 18, 38, 0.20)']
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.redHorizon, { height: redHorizonHeight }]}
      />
      <View pointerEvents="none" style={styles.vignette} />
      {children}
      {/* Top fade: as content scrolls up under the status bar it dissolves
          into the backdrop (like a soft shadow at the top edge) and
          re-emerges when scrolled back down. Sits above the scrolling
          content but is short enough to clear each screen's resting header. */}
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ['#0A0B0F', '#0A0B0F', 'rgba(10,11,15,0)']
            : ['#F5F6F8', '#F5F6F8', 'rgba(245,246,248,0)']
        }
        locations={[0, 0.45, 1]}
        style={styles.topFade}
      />
    </View>
  );
}

function useStyles(theme: AppTheme) {
  return useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          overflow: 'hidden',
          backgroundColor: theme.colors.background,
        },
        topLight: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 420,
        },
        topFade: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 58,
        },
        signLayer: {
          ...StyleSheet.absoluteFillObject,
          overflow: 'hidden',
        },
        redHorizon: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 360,
        },
        vignette: {
          ...StyleSheet.absoluteFillObject,
          borderRadius: 1,
          borderColor:
            theme.scheme === 'dark' ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.06)',
          borderWidth: 0,
        },
      }),
    [theme],
  );
}
