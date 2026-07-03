import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
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

import { authService, entryContentService } from '@/services';
import type { EntrySlide } from '@/services/entryContentService';
import type { Member } from '@/types';

const accentBright = '#E11D2E';

export default function WelcomeScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [carouselSlides, setCarouselSlides] = useState<EntrySlide[]>([]);
  const [signedInMember, setSignedInMember] = useState<Member>();
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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadSession = async () => {
        const member = await authService.getCurrentSessionMember();

        if (isActive) {
          setSignedInMember(member);
        }
      };

      loadSession();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const activeCaption = carouselSlides[activeSlide]?.caption;
  const activeCaptionSub = carouselSlides[activeSlide]?.captionSub;

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

        {/* One smooth bottom fade */}
        <LinearGradient
          pointerEvents="none"
          colors={[
            'transparent',
            'rgba(120, 11, 24, 0.32)',
            'rgba(96, 7, 17, 0.74)',
            'rgba(58, 3, 9, 0.97)',
          ]}
          locations={[0, 0.4, 0.72, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.redFade}
        />

        {/* CTAs sit over the photo */}
        <SafeAreaView
          edges={['bottom']}
          pointerEvents="box-none"
          style={styles.overlay}>

          {/* Captions */}
          {activeCaption ? (
            <View pointerEvents="none" style={styles.captionBlock}>
              <Text style={styles.captionTitle}>{activeCaption}</Text>
              {activeCaptionSub ? (
                <Text style={styles.captionSub}>{activeCaptionSub}</Text>
              ) : null}
            </View>
          ) : null}

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

          {/* Sign In – now uses the filled red gradient style */}
          <Pressable
            onPress={() => {
              if (!signedInMember) {
                router.push('/login');
                return;
              }

              router.replace(signedInMember.role === 'Admin' ? '/admin' : '/(tabs)');
            }}
            style={({ pressed }) => [
              styles.signInButtonWrap,
              pressed && styles.buttonPressed,
            ]}>
            <LinearGradient
              colors={['#FF2638', '#B11226', '#2A0308']}
              locations={[0, 0.58, 1]}
              start={{ x: 0.08, y: 0 }}
              end={{ x: 0.92, y: 1 }}
              style={styles.signInGradientButton}>
              <View pointerEvents="none" style={styles.signInGloss} />
              <Text style={styles.signInGradientText}>
                {signedInMember ? 'Continue' : 'Sign In'}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Continue as Guest – now uses the outlined ghost style */}
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={({ pressed }) => [
              styles.guestButton,
              signedInMember && styles.hiddenButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
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
  redFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '56%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'web' ? 24 : 18,
  },
  captionBlock: {
    marginBottom: 28,
  },
  captionTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 38,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  captionSub: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  carouselDots: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 12,
    marginBottom: 24,
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
  signInButtonWrap: {
    borderRadius: 999,
    shadowColor: accentBright,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 9,
  },
  signInGradientButton: {
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 91, 106, 0.72)',
    borderRadius: 999,
  },
  signInGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(255, 255, 255, 0.075)',
  },
  signInGradientText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  guestButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: 'rgba(255, 35, 55, 0.78)',
    borderRadius: 999,
    backgroundColor: 'rgba(7, 2, 5, 0.45)',
    marginTop: 22,
    shadowColor: accentBright,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },
  guestButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  hiddenButton: {
    display: 'none',
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
