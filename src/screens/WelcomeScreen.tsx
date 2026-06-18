import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { entryContentService } from '@/services';
import type { EntrySlide } from '@/services/entryContentService';

const accentBright = '#E11D2E';
const accentDeep = '#8F0D1B';
const logoSigns = [
  require('../../assets/images/marvel-logo-startup-sign-dot.png'),
  require('../../assets/images/marvel-logo-startup-sign-x.png'),
  require('../../assets/images/marvel-logo-startup-sign-slash.png'),
  require('../../assets/images/marvel-logo-startup-sign-divide.png'),
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [carouselSlides, setCarouselSlides] = useState<EntrySlide[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [frameWidth, setFrameWidth] = useState(0);
  const slideWidth =
    frameWidth || (Platform.OS === 'web' ? Math.min(windowWidth, 414) : windowWidth);

  const updateActiveSlide = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const viewWidth = event.nativeEvent.layoutMeasurement.width;
    const nextIndex = Math.round(
      event.nativeEvent.contentOffset.x / Math.max(1, viewWidth),
    );

    setActiveSlide(Math.min(carouselSlides.length - 1, Math.max(0, nextIndex)));
  };

  useEffect(() => {
    const loadSlides = async () => {
      const slides = await entryContentService.getEntrySlides();

      setCarouselSlides(slides);
    };

    loadSlides();
  }, []);

  return (
    <View style={styles.safeArea}>
      <StatusBar style="light" />
      <View
        style={styles.phoneFrame}
        onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)}>
        {/* Full-bleed photo carousel behind everything */}
        <ScrollView
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={updateActiveSlide}
          onScroll={updateActiveSlide}
          style={styles.heroCarousel}>
          {carouselSlides.map((slide) => (
            <View key={slide.id} style={[styles.heroSlide, { width: slideWidth }]}>
              <Image
                source={slide.image}
                style={styles.heroImage}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>

        {/* Status-bar vignette at the very top */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(5, 2, 4, 0.54)', 'rgba(5, 2, 4, 0.12)', 'transparent']}
          locations={[0, 0.58, 1]}
          style={styles.topVignette}
        />

        {/* The photo stays full-screen and slowly turns into the red/black CTA base. */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            'transparent',
            'rgba(177, 18, 38, 0.1)',
            'rgba(177, 18, 38, 0.34)',
            'rgba(96, 6, 17, 0.76)',
          ]}
          locations={[0, 0.34, 0.72, 1]}
          style={styles.photoRedFade}
        />

        {/* Cinematic wash: no separate block, just a gradual Marvel red fade. */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            'transparent',
            'rgba(177, 18, 38, 0.22)',
            'rgba(177, 18, 38, 0.72)',
            'rgba(87, 5, 14, 0.98)',
            '#070203',
          ]}
          locations={[0, 0.22, 0.5, 0.76, 1]}
          style={styles.redWash}
        />

        {/* Soft bottom glow keeps the buttons alive without turning shiny/yellow. */}
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', 'rgba(255, 35, 55, 0.16)', 'transparent']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.redBloom}
        />

        {/* All copy + CTAs sit over the photo */}
        <SafeAreaView
          edges={['bottom']}
          pointerEvents="box-none"
          style={styles.overlay}>
          <View pointerEvents="none" style={styles.copyBlock}>
            <View style={styles.signStrip}>
              {logoSigns.map((sign, index) => (
                <Image
                  key={index}
                  source={sign}
                  resizeMode="contain"
                  style={[
                    styles.logoSign,
                    index === 0 && styles.logoSignDot,
                    index === 3 && styles.logoSignDivide,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.heroHeadline}>
              READY FOR THE GYM{'\n'}IN YOUR POCKET?
            </Text>
            <Text style={styles.heroSubtitle}>
              {"We've got you covered with workouts,\nvirtual tours, tutorials, and activity tracking."}
            </Text>
          </View>

          <View pointerEvents="none" style={styles.carouselDots}>
            {carouselSlides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.carouselDot,
                  activeSlide === index && styles.carouselDotActive,
                ]}
              />
            ))}
          </View>

          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={({ pressed }) => [
              styles.guestButtonWrap,
              pressed && styles.buttonPressed,
            ]}>
            <LinearGradient
              colors={['#FF2638', '#B11226', '#2A0308']}
              locations={[0, 0.58, 1]}
              start={{ x: 0.08, y: 0 }}
              end={{ x: 0.92, y: 1 }}
              style={styles.guestButton}>
              <View pointerEvents="none" style={styles.guestGloss} />
              <View pointerEvents="none" style={styles.guestRedEdge} />
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.push('/login')}
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.signInButtonText}>Sign In</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
    backgroundColor: '#16040A',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 414 : undefined,
    overflow: 'hidden',
    backgroundColor: '#050507',
    borderColor: Platform.OS === 'web' ? '#2a1117' : 'transparent',
    borderRadius: Platform.OS === 'web' ? 34 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    marginVertical: Platform.OS === 'web' ? 22 : 0,
  },
  heroCarousel: {
    ...StyleSheet.absoluteFillObject,
  },
  heroSlide: {
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#050507',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  redWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '76%',
  },
  photoRedFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '30%',
    height: '46%',
  },
  redBloom: {
    position: 'absolute',
    left: -70,
    right: -70,
    bottom: -120,
    height: 300,
    borderRadius: 240,
    opacity: 0.42,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'web' ? 24 : 18,
  },
  copyBlock: {
    marginBottom: 0,
  },
  signStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  logoSign: {
    width: 20,
    height: 20,
    opacity: 0.82,
    tintColor: accentBright,
  },
  logoSignDot: {
    width: 9,
    height: 9,
  },
  logoSignDivide: {
    width: 22,
  },
  heroHeadline: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0,
    lineHeight: 52,
    textShadowColor: 'rgba(0, 0, 0, 0.42)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 26,
    marginTop: 20,
    maxWidth: 350,
  },
  carouselDots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 12,
    marginTop: 26,
    marginBottom: 28,
  },
  carouselDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
  carouselDotActive: {
    width: 10,
    backgroundColor: '#FFFFFF',
  },
  guestButtonWrap: {
    borderRadius: 999,
    shadowColor: accentBright,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 9,
  },
  guestButton: {
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 91, 106, 0.72)',
    borderRadius: 999,
  },
  guestGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(255, 255, 255, 0.075)',
  },
  guestRedEdge: {
    position: 'absolute',
    left: 1,
    right: 1,
    bottom: 1,
    height: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 94, 110, 0.5)',
  },
  guestButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  signInButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: 'rgba(255, 35, 55, 0.78)',
    borderRadius: 999,
    backgroundColor: 'rgba(7, 2, 5, 0.45)',
    marginTop: 14,
    shadowColor: accentBright,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
