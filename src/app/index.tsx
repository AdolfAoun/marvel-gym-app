import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';

export default function IndexRoute() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/welcome');
    }, 1000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={styles.deepRedLayer} />
      <View pointerEvents="none" style={styles.energyGlowTop} />
      <View pointerEvents="none" style={styles.energyGlowBottom} />
      <View pointerEvents="none" style={styles.slashOne} />
      <View pointerEvents="none" style={styles.slashTwo} />
      <View style={styles.logoCrop}>
        <Image
          source={require('@/assets/images/marvel-logo-transparent.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#6F0715',
  },
  deepRedLayer: {
    position: 'absolute',
    top: -120,
    left: -120,
    right: -120,
    bottom: -120,
    backgroundColor: '#B11226',
  },
  energyGlowTop: {
    position: 'absolute',
    top: -140,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#F43F5E',
    opacity: 0.42,
  },
  energyGlowBottom: {
    position: 'absolute',
    right: -120,
    bottom: -110,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: '#3B040B',
    opacity: 0.58,
  },
  slashOne: {
    position: 'absolute',
    top: 94,
    right: -82,
    width: 190,
    height: 520,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '24deg' }],
  },
  slashTwo: {
    position: 'absolute',
    left: -104,
    bottom: 60,
    width: 150,
    height: 420,
    borderRadius: 38,
    backgroundColor: 'rgba(75, 4, 13, 0.2)',
    transform: [{ rotate: '24deg' }],
  },
  logoCrop: {
    width: 220,
    height: 136,
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 220,
    height: 220,
    tintColor: '#FFFFFF',
  },
});
