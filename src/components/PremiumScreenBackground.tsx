import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { premiumColors, premiumGradients } from '@/constants/premiumTheme';

type PremiumScreenBackgroundProps = {
  children: ReactNode;
  bottomInset?: boolean;
};

/**
 * App-wide premium backdrop: a layered charcoal gradient with a soft top light
 * and a single subtle red horizon glow. Deliberately calm so screen content
 * sits on top with depth instead of competing with decorative shapes.
 */
export function PremiumScreenBackground({
  children,
  bottomInset = true,
}: PremiumScreenBackgroundProps) {
  return (
    <SafeAreaView
      edges={bottomInset ? ['left', 'right', 'bottom'] : ['left', 'right']}
      style={styles.safeArea}>
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
      {/* Quiet red horizon glow rising from the bottom — accent, not a spotlight */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(177, 18, 38, 0.14)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.redHorizon}
      />
      <View pointerEvents="none" style={styles.vignette} />
      {children}
    </SafeAreaView>
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
