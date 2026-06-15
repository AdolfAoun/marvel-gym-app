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

const accentColor = '#B11226';

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
      <View style={styles.phoneFrame}>
        <View
          style={styles.heroArea}
          onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)}>
          <ScrollView
            horizontal
            pagingEnabled
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={updateActiveSlide}
            onScroll={updateActiveSlide}
            style={styles.heroCarousel}>
            {carouselSlides.map((slide, index) => (
              <View key={slide.id} style={[styles.heroSlide, { width: slideWidth }]}>
                <Image
                  source={slide.image}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
                <View pointerEvents="none" style={styles.heroVeil} />
              </View>
            ))}
          </ScrollView>
          <View style={styles.carouselDots}>
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
        </View>

        <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.actionPanel}>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={({ pressed }) => [
              styles.guestButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
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
    backgroundColor: '#080809',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 414 : undefined,
    overflow: 'hidden',
    backgroundColor: '#090A0E',
    borderColor: Platform.OS === 'web' ? '#1d2733' : 'transparent',
    borderRadius: Platform.OS === 'web' ? 34 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    marginVertical: Platform.OS === 'web' ? 22 : 0,
  },
  heroArea: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: '#050507',
  },
  heroCarousel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroSlide: {
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#050507',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  carouselDots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 202,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  carouselDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  carouselDotActive: {
    width: 22,
    backgroundColor: accentColor,
  },
  actionPanel: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 20,
    flexShrink: 0,
    justifyContent: 'center',
    gap: 12,
  },
  guestButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 2,
  },
  guestButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  signInButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: accentColor,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.78,
  },
});
