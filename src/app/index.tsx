import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

const signDelay = 210;
const jumpDuration = 340;
const cycleDuration = 4 * signDelay + jumpDuration;
const splashDuration = cycleDuration * 2 + 120;

export default function IndexRoute() {
  const router = useRouter();
  const jumps = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const animations = Array.from({ length: 2 }).flatMap((_, cycleIndex) =>
      jumps.map((jump, signIndex) =>
        Animated.sequence([
          Animated.delay(cycleIndex * cycleDuration + signIndex * signDelay),
          Animated.timing(jump, {
            toValue: 1,
            duration: jumpDuration / 2,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(jump, {
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
    }, splashDuration);

    return () => clearTimeout(timeout);
  }, [jumps, router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Image
        source={require('@/assets/images/prototype-three-finger-back-pose-background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View pointerEvents="none" style={styles.backgroundVeil} />
      <View pointerEvents="none" style={styles.redGlowOne} />
      <View pointerEvents="none" style={styles.redGlowTwo} />
      <View pointerEvents="none" style={styles.darkBladeOne} />
      <View pointerEvents="none" style={styles.darkBladeTwo} />

      <View style={styles.logoBlock}>
        <View style={styles.signRow}>
          {[
            require('@/assets/images/marvel-logo-startup-sign-dot.png'),
            require('@/assets/images/marvel-logo-startup-sign-x.png'),
            require('@/assets/images/marvel-logo-startup-sign-slash.png'),
            require('@/assets/images/marvel-logo-startup-sign-divide.png'),
          ].map((source, index) => (
            <Animated.Image
              key={index}
              source={source}
              style={[
                styles.signImage,
                {
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
              ]}
              resizeMode="contain"
            />
          ))}
        </View>

        <Image
          source={require('@/assets/images/marvel-logo-startup-wordmark.png')}
          style={styles.startupLogo}
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
    backgroundColor: '#070708',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.62,
  },
  backgroundVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4, 4, 6, 0.26)',
  },
  redGlowOne: {
    position: 'absolute',
    top: -110,
    right: -120,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: '#B11226',
    opacity: 0.16,
  },
  redGlowTwo: {
    position: 'absolute',
    left: -150,
    bottom: -130,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: '#7F0A19',
    opacity: 0.14,
  },
  darkBladeOne: {
    position: 'absolute',
    top: 40,
    right: -72,
    width: 118,
    height: 540,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.012)',
    transform: [{ rotate: '24deg' }],
  },
  darkBladeTwo: {
    position: 'absolute',
    left: -90,
    bottom: 40,
    width: 94,
    height: 440,
    borderRadius: 32,
    backgroundColor: 'rgba(177, 18, 38, 0.045)',
    transform: [{ rotate: '24deg' }],
  },
  logoBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: '#B11226',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.34,
    shadowRadius: 26,
    elevation: 6,
  },
  signRow: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: -2,
  },
  signImage: {
    width: 36,
    height: 36,
  },
  startupLogo: {
    width: 268,
    height: 106,
  },
});
