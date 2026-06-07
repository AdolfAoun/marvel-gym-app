import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { premiumColors } from '@/constants/premiumTheme';

type PremiumScreenBackgroundProps = {
  children: ReactNode;
  bottomInset?: boolean;
};

export function PremiumScreenBackground({
  children,
  bottomInset = true,
}: PremiumScreenBackgroundProps) {
  return (
    <SafeAreaView
      edges={bottomInset ? ['left', 'right', 'bottom'] : ['left', 'right']}
      style={styles.safeArea}>
      <View pointerEvents="none" style={styles.redGlowTop} />
      <View pointerEvents="none" style={styles.redGlowBottom} />
      <View pointerEvents="none" style={styles.grid} />
      <View pointerEvents="none" style={styles.diagonalOne} />
      <View pointerEvents="none" style={styles.diagonalTwo} />
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
  redGlowTop: {
    position: 'absolute',
    right: -120,
    top: -86,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(177, 18, 38, 0.22)',
  },
  redGlowBottom: {
    position: 'absolute',
    left: -150,
    bottom: 40,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(177, 18, 38, 0.12)',
  },
  grid: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 320,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.035)',
    backgroundColor: 'rgba(255, 255, 255, 0.018)',
  },
  diagonalOne: {
    position: 'absolute',
    right: 40,
    top: 72,
    width: 2,
    height: 260,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    transform: [{ rotate: '28deg' }],
  },
  diagonalTwo: {
    position: 'absolute',
    left: 34,
    top: 190,
    width: 1,
    height: 260,
    borderRadius: 1,
    backgroundColor: 'rgba(177, 18, 38, 0.22)',
    transform: [{ rotate: '28deg' }],
  },
});
