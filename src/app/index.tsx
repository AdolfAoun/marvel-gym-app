import { LinearGradient } from 'expo-linear-gradient';
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
        source={require('@/assets/images/MarvelPhoto1.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(3, 3, 5, 0.22)',
          'rgba(3, 3, 5, 0.38)',
          'rgba(3, 3, 5, 0.82)',
        ]}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255, 255, 255, 0.055)', 'rgba(255, 255, 255, 0)']}
        start={{ x: 0.18, y: 0 }}
        end={{ x: 0.74, y: 0.48 }}
        style={styles.topSheen}
      />

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
                index === 0 && styles.signDot,
                index === 1 && styles.signX,
                index === 2 && styles.signSlash,
                index === 3 && styles.signDivide,
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
    opacity: 0.82,
    transform: [{ scale: 1.03 }],
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
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
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 6,
  },
  signRow: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    marginBottom: -4,
  },
  signImage: {
    width: 30,
    height: 30,
  },
  signDot: {
    width: 17,
    height: 17,
  },
  signX: {
    width: 34,
    height: 34,
  },
  signSlash: {
    width: 28,
    height: 34,
  },
  signDivide: {
    width: 42,
    height: 34,
  },
  startupLogo: {
    width: 248,
    height: 78,
  },
});
