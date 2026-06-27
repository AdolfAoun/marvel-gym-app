import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { premiumColors, premiumGradients } from '@/constants/premiumTheme';

type PremiumScreenBackgroundProps = {
  children: ReactNode;
  /** Kept for API compatibility; the backdrop is always edge-to-edge now. */
  bottomInset?: boolean;
  /** Show the static Marvel sign watermarks behind the content. */
  signs?: boolean;
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
}: PremiumScreenBackgroundProps) {
  return (
    // Full-bleed: the backdrop fills the whole screen and continues underneath
    // the floating tab bar so every tab feels edge-to-edge.
    <View style={styles.safeArea}>
      {/* Base charcoal depth */}
      <LinearGradient
        pointerEvents="none"
        colors={premiumGradients.screen}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Soft cool light reflecting from the top-left */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255, 255, 255, 0.05)', 'transparent']}
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
                opacity: mark.opacity,
                tintColor: '#FFFFFF',
                transform: [{ rotate: mark.rotate }],
              }}
            />
          ))}
        </View>
      ) : null}
      {/* Subtle red horizon glow rising from the bottom — accent only */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(177, 18, 38, 0.16)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.redHorizon}
      />
      <View pointerEvents="none" style={styles.vignette} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: premiumColors.background,
  },
  topLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
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
    borderColor: 'rgba(0, 0, 0, 0.28)',
    borderWidth: 0,
  },
});
