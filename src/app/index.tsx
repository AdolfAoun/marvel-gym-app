import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

const signs = ['•', 'X', '/', '÷'];
const signDelay = 210;
const jumpDuration = 340;
const cycleDuration = signs.length * signDelay + jumpDuration;
const splashDuration = cycleDuration * 2;

export default function IndexRoute() {
  const router = useRouter();
  const jumps = useRef(signs.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = signs.flatMap((_, cycleIndex) =>
      signs.map((__, signIndex) =>
        Animated.sequence([
          Animated.delay(cycleIndex * cycleDuration + signIndex * signDelay),
          Animated.timing(jumps[signIndex], {
            toValue: 1,
            duration: jumpDuration / 2,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(jumps[signIndex], {
            toValue: 0,
            duration: jumpDuration / 2,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    Animated.parallel(animations).start();

    const timeout = setTimeout(() => {
      router.replace('/welcome');
    }, splashDuration + 120);

    return () => clearTimeout(timeout);
  }, [jumps, router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={styles.redGlowOne} />
      <View pointerEvents="none" style={styles.redGlowTwo} />
      <View pointerEvents="none" style={styles.darkBladeOne} />
      <View pointerEvents="none" style={styles.darkBladeTwo} />

      <View style={styles.logoBlock}>
        <View style={styles.signRow}>
          {signs.map((sign, index) => (
            <Animated.Text
              key={sign}
              style={[
                styles.signText,
                {
                  opacity: jumps[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.72, 1],
                  }),
                  transform: [
                    {
                      translateY: jumps[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -14],
                      }),
                    },
                    {
                      scale: jumps[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.08],
                      }),
                    },
                  ],
                },
              ]}>
              {sign}
            </Animated.Text>
          ))}
        </View>

        <Text style={styles.marvelText}>MARVEL</Text>
        <Text style={styles.brandSubtext}>fitness and health</Text>
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
    backgroundColor: '#070708',
  },
  redGlowOne: {
    position: 'absolute',
    top: -110,
    right: -120,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: '#B11226',
    opacity: 0.62,
  },
  redGlowTwo: {
    position: 'absolute',
    left: -150,
    bottom: -130,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: '#7F0A19',
    opacity: 0.72,
  },
  darkBladeOne: {
    position: 'absolute',
    top: 40,
    right: -72,
    width: 118,
    height: 540,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '24deg' }],
  },
  darkBladeTwo: {
    position: 'absolute',
    left: -90,
    bottom: 40,
    width: 94,
    height: 440,
    borderRadius: 32,
    backgroundColor: 'rgba(177, 18, 38, 0.24)',
    transform: [{ rotate: '24deg' }],
  },
  logoBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 28,
    backgroundColor: 'rgba(10, 10, 12, 0.38)',
    paddingHorizontal: 34,
    paddingVertical: 28,
    shadowColor: '#B11226',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 10,
  },
  signRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    minHeight: 34,
    marginBottom: 7,
  },
  signText: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 32,
  },
  marvelText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 8,
    lineHeight: 56,
  },
  brandSubtext: {
    color: '#F7D6DC',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 4,
    marginTop: 4,
  },
});
