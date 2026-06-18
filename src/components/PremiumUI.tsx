import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import {
  premiumColors,
  premiumGradients,
  premiumGlow,
  premiumShadow,
  radius,
} from '@/constants/premiumTheme';

const SIGN_SOURCES = {
  divide: require('@/assets/images/marvel-logo-startup-sign-divide.png'),
  dot: require('@/assets/images/marvel-logo-startup-sign-dot.png'),
  slash: require('@/assets/images/marvel-logo-startup-sign-slash.png'),
  x: require('@/assets/images/marvel-logo-startup-sign-x.png'),
} as const;

// The Marvel Gym brand signs (＋ − × ÷). Scattered faintly they replace the
// generic glow-circles with a professional, on-brand decorative motif.
const MARK_LAYOUTS = {
  // Top-right cluster — for cards / hero panels
  corner: [
    { s: '+', top: 12, right: 16, size: 30, rotate: '14deg', opacity: 0.18 },
    { s: '×', top: 30, right: 48, size: 18, rotate: '-10deg', opacity: 0.12 },
    { s: '÷', top: 52, right: 20, size: 20, rotate: '8deg', opacity: 0.12 },
    { s: '−', top: 14, right: 60, size: 16, rotate: '0deg', opacity: 0.1 },
  ],
  // Sparse large signs — for full-screen backgrounds
  scatterTop: [
    { s: '×', top: 70, right: 26, size: 64, rotate: '-12deg', opacity: 0.05 },
    { s: '+', top: 140, right: 70, size: 30, rotate: '10deg', opacity: 0.05 },
    { s: '÷', top: 120, right: 18, size: 26, rotate: '4deg', opacity: 0.045 },
  ],
  scatterBottom: [
    { s: '+', bottom: 150, left: 22, size: 58, rotate: '12deg', opacity: 0.045 },
    { s: '÷', bottom: 110, left: 64, size: 26, rotate: '-6deg', opacity: 0.04 },
    { s: '×', bottom: 210, left: 40, size: 22, rotate: '8deg', opacity: 0.04 },
  ],
} as const;

type MarvelMarksProps = {
  variant?: keyof typeof MARK_LAYOUTS;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

function getMarkSource(variant: keyof typeof MARK_LAYOUTS, index: number) {
  const order =
    variant === 'scatterBottom'
      ? [SIGN_SOURCES.slash, SIGN_SOURCES.divide, SIGN_SOURCES.x]
      : [SIGN_SOURCES.x, SIGN_SOURCES.slash, SIGN_SOURCES.divide, SIGN_SOURCES.dot];

  return order[index % order.length];
}

/** Faint scattered Marvel operator signs used as a branded decorative motif. */
export function MarvelMarks({
  variant = 'corner',
  color = '#FFFFFF',
  style,
}: MarvelMarksProps) {
  return (
    <View pointerEvents="none" style={[styles.marksWrap, style]}>
      {MARK_LAYOUTS[variant].map((mark, index) => (
        <Image
          key={index}
          source={getMarkSource(variant, index)}
          resizeMode="contain"
          style={[
            styles.mark,
            {
              height: mark.size,
              opacity: mark.opacity,
              top: 'top' in mark ? mark.top : undefined,
              bottom: 'bottom' in mark ? mark.bottom : undefined,
              left: 'left' in mark ? mark.left : undefined,
              right: 'right' in mark ? mark.right : undefined,
              width: mark.size,
              transform: [{ rotate: mark.rotate }],
            },
          ]}
        />
      ))}
    </View>
  );
}

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Adds a soft red accent glow behind the card. */
  glow?: boolean;
  /** Top-lit inner highlight line for a frosted-glass edge. */
  highlight?: boolean;
};

/**
 * Frosted glass panel: top-lit translucent gradient, hairline edge highlight,
 * soft elevation. The premium replacement for plain rectangle cards.
 */
export function GlassCard({
  children,
  style,
  glow = false,
  highlight = true,
}: GlassCardProps) {
  return (
    <View style={[styles.glassCard, glow && styles.glassGlow, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={premiumGradients.card}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {highlight ? <View pointerEvents="none" style={styles.cardHighlight} /> : null}
      {children}
    </View>
  );
}

type GradientButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Glossy red primary action button with depth + glow. */
export function GradientButton({
  label,
  onPress,
  disabled = false,
  style,
}: GradientButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.gradientButtonWrap,
        disabled && styles.buttonDisabled,
        pressed && styles.buttonPressed,
        style,
      ]}>
      <LinearGradient
        colors={premiumGradients.redButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientButton}>
        <View pointerEvents="none" style={styles.buttonGloss} />
        <Text style={styles.gradientButtonText}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  marksWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  mark: {
    position: 'absolute',
  },
  glassCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: radius.lg,
    backgroundColor: premiumColors.surface,
    padding: 18,
    ...premiumShadow,
  },
  glassGlow: {
    shadowColor: premiumColors.redBright,
    shadowOpacity: 0.22,
    shadowRadius: 26,
  },
  cardHighlight: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  gradientButtonWrap: {
    borderRadius: radius.md,
    ...premiumGlow,
  },
  gradientButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderRadius: radius.md,
  },
  buttonGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  gradientButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
