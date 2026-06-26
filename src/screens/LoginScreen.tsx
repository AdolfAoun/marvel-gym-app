import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { premiumColors, premiumGradients } from '@/constants/premiumTheme';
import { authService, entryContentService } from '@/services';

const accentColor = premiumColors.redBright;
// Change this number to resize the entire login glass card and its contents.
const loginCardScale = 1;
const brandSigns = [
  require('@/assets/images/marvel-logo-startup-sign-dot.png'),
  require('@/assets/images/marvel-logo-startup-sign-x.png'),
  require('@/assets/images/marvel-logo-startup-sign-slash.png'),
  require('@/assets/images/marvel-logo-startup-sign-divide.png'),
];

function formatLebanesePhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const first = digits.slice(0, 2);
  const second = digits.slice(2, 5);
  const third = digits.slice(5, 8);
  return [first, second, third].filter(Boolean).join(' ');
}

function GlassCard({ children }: { children: ReactNode }) {
  return (
    <View style={styles.cardShadow}>
      <BlurView
        intensity={38}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={styles.card}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255, 255, 255, 0.03)', 'rgba(255,255,255,0)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.cardInnerHighlight}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,66,84,0)', 'rgba(255,66,84,0.92)', 'rgba(255,66,84,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.cardBottomGlow}
        />
        <View pointerEvents="none" style={styles.cardGrabber} />
        <View style={styles.cardContent}>{children}</View>
      </BlurView>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ created?: string }>();
  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identifierMessage, setIdentifierMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [backgroundPhoto, setBackgroundPhoto] = useState<ImageSourcePropType>();
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const loadSignInWallpaper = async () => {
      const wallpaper = await entryContentService.getSignInWallpaper();
      setBackgroundPhoto(wallpaper.image);
    };
    loadSignInWallpaper();
  }, []);

  const hideFeedback = () => {
    Animated.timing(feedbackOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setFeedbackMessage(''));
  };

  const clearFeedback = () => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackOpacity.setValue(0);
    setFeedbackMessage('');
  };

  const showFeedback = (message: string) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedbackMessage(message);
    Animated.timing(feedbackOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
    feedbackTimeoutRef.current = setTimeout(hideFeedback, 2500);
  };

  useEffect(() => {
    if (params.created === '1') {
      showFeedback('Account created successfully. Please log in.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.created]);

  const handleLogin = async () => {
    clearFeedback();
    setIdentifierMessage('');
    setPasswordMessage('');
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const loginFailureMessage =
      loginMode === 'phone'
        ? 'Invalid Phone number or Password.'
        : 'Invalid Email or Password.';

    if (loginMode === 'phone' && normalizedPhone.length !== 8) {
      showFeedback('Enter an 8-digit phone number.');
      return;
    }
    if (loginMode === 'email' && !emailPattern.test(normalizedEmail)) {
      setIdentifierMessage('Enter a valid email address.');
      return;
    }
    if (!password.trim()) {
      showFeedback('Enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const member = await authService.loginMember({
        email: loginMode === 'phone' ? normalizedPhone : normalizedEmail,
        password,
      });
      // TODO: Enforce admin authentication and permissions from the backend.
      if (member.role === 'Admin') {
        router.replace('/admin' as Href);
        return;
      }
      router.replace('/(tabs)');
    } catch {
      setPasswordMessage(loginFailureMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Pressable
        accessibilityLabel="Go back"
        hitSlop={12}
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
            return;
          }

          router.replace('/welcome');
        }}
        style={({ pressed }) => [styles.loginBackButton, pressed && styles.loginBackButtonPressed]}>
        <SymbolView
          name="chevron.left"
          size={22}
          tintColor="#FFFFFF"
          weight="bold"
          fallback={<Text style={styles.loginBackFallback}>&lt;</Text>}
        />
      </Pressable>

      {/*
        ┌─────────────────────────────────────────────────────────────────┐
        │  BACKGROUND PHOTO                                               │
        │  The image source comes from entryContentService.getSignInWallpaper()
        │  To swap the photo: edit src/services/entryContentService.ts   │
        │  → change the require() inside `signInWallpaper`               │
        │                                                                 │
        │  heroPhoto style controls positioning on screen:               │
        │    right: -40   → how far past the right edge the image goes   │
        │    width: '118%'→ wider than screen so athlete fills the right  │
        │    top/bottom   → vertical crop / zoom                         │
        └─────────────────────────────────────────────────────────────────┘
      */}
      {backgroundPhoto ? (
        <View pointerEvents="none" style={styles.heroPhotoFrame}>
          <Image
            source={backgroundPhoto}
            style={styles.heroPhoto}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {/*
        ┌─────────────────────────────────────────────────────────────────┐
        │  GRADIENT OVERLAYS  (stack on top of the photo)                │
        │                                                                 │
        │  GRADIENT 1 — top-to-bottom darkness                          │
        │    colors[0] = top opacity   (raise to darken top)            │
        │    colors[1] = mid opacity                                     │
        │    colors[2] = bottom opacity (raise to darken bottom)        │
        │                                                                 │
        │  GRADIENT 2 — left-to-right darkness (left side stays dark)  │
        │    colors[0] = left opacity  (raise to push athlete further right)
        │    colors[1] = centre fade                                     │
        │    colors[2] = right opacity (keep low so photo shows on right)│
        └─────────────────────────────────────────────────────────────────┘
      */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.36)', 'rgba(5,5,8,0.54)', 'rgba(7,2,3,0.94)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0.88)', 'rgba(0,0,0,0.34)', 'rgba(0,0,0,0.08)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/*
            ┌──────────────────────────────────────────────────────────────┐
            │  LOGO BLOCK                                                  │
            │  brandBlock  → spacing above/below the logo area            │
            │  brandLogo   → width/height of the MARVEL wordmark          │
            │  brandSign   → size of the 4 small icons (· × / ÷)         │
            └──────────────────────────────────────────────────────────────┘
          */}
          <View style={styles.brandBlock}>
            <View style={styles.brandSigns}>
              {brandSigns.map((source, index) => (
                <Image
                  key={index}
                  source={source}
                  resizeMode="contain"
                  style={[styles.brandSign, index === 0 && styles.brandSignDot]}
                />
              ))}
            </View>
            <Image
              source={require('@/assets/images/marvel-logo-startup-wordmark.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>

          {/*
            ┌──────────────────────────────────────────────────────────────┐
            │  WELCOME TEXT  (sits above the glass card)                  │
            │  Edit the strings directly below to change the copy.        │
            │  welcomeTitle    → big heading ("Welcome back")             │
            │  welcomeSubtitle → small tagline below it                   │
            │  welcomeAccent   → the small red underline bar              │
            │  welcomeBlock paddingHorizontal → indent from screen edge   │
            └──────────────────────────────────────────────────────────────┘
          */}
          <View style={styles.welcomeBlock}>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            <Text style={styles.welcomeSubtitle}>
              Your journey to a stronger{'\n'}you starts here.
            </Text>
            <View style={styles.welcomeAccent} />
          </View>

          {/*
            ┌──────────────────────────────────────────────────────────────┐
            │  GLASS CARD                                                  │
            │  GlassCard component is defined above (search "GlassCard"). │
            │                                                              │
            │  To adjust the card look, edit styles:                      │
            │    card.backgroundColor  → rgba darkness/opacity of card    │
            │    card.borderColor      → edge border visibility            │
            │    card.borderRadius     → corner roundness                  │
            │    BlurView intensity    → blur strength (higher = more blur)│
            │    cardShadow.shadowOpacity → red glow beneath card         │
            │    cardInnerHighlight    → white sheen at top of card       │
            │    cardBottomGlow        → red line at bottom edge of card  │
            │                                                              │
            │  cardContent paddingTop controls how far down the content   │
            │  starts inside the card (currently 58).                     │
            └──────────────────────────────────────────────────────────────┘
          */}
          <GlassCard>
            <Text style={styles.title}>Sign in</Text>

            <View style={styles.inputGroup}>
              <View style={styles.modeHeader}>
                <Text style={styles.label}>
                  {loginMode === 'phone' ? 'Phone number' : 'Email'}
                </Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setLoginMode((mode) => (mode === 'phone' ? 'email' : 'phone'));
                    setIdentifierMessage('');
                    setPasswordMessage('');
                    clearFeedback();
                  }}>
                  <Text style={styles.modeToggleText}>
                    {loginMode === 'phone' ? 'Use email instead' : 'Use phone instead'}
                  </Text>
                </Pressable>
              </View>

              {loginMode === 'phone' ? (
                <View style={styles.phoneRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>+961</Text>
                    <Text style={styles.countryCodeChevron}>∨</Text>
                  </View>
                  <TextInput
                    value={formatLebanesePhone(phoneNumber)}
                    onChangeText={(value) =>
                      setPhoneNumber(value.replace(/\D/g, '').slice(0, 8))
                    }
                    placeholder="70 123 456"
                    placeholderTextColor={premiumColors.textFaint}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="number-pad"
                    textContentType="telephoneNumber"
                    selectionColor={accentColor}
                    style={styles.phoneInput}
                  />
                </View>
              ) : (
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="member@marvelgym.com"
                  placeholderTextColor={premiumColors.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  selectionColor={accentColor}
                  style={styles.input}
                />
              )}

              {identifierMessage.length > 0 ? (
                <Text style={styles.errorText}>{identifierMessage}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, styles.passwordLabel]}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={premiumColors.textFaint}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!isPasswordVisible}
                  textContentType="password"
                  selectionColor={accentColor}
                  style={styles.passwordInput}
                />
                <Pressable
                  hitSlop={10}
                  onPress={() => setIsPasswordVisible((v) => !v)}
                  style={styles.passwordToggle}>
                  <Text style={styles.passwordToggleText}>
                    {isPasswordVisible ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
              {passwordMessage.length > 0 ? (
                <Text style={styles.errorText}>{passwordMessage}</Text>
              ) : null}
            </View>

            <Pressable
              onPress={() => showFeedback('Password reset mail sent')}
              style={styles.forgotButton}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </Pressable>

            {feedbackMessage.length > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[styles.formFeedback, { opacity: feedbackOpacity }]}>
                <Text style={styles.formFeedbackText}>{feedbackMessage}</Text>
              </Animated.View>
            ) : null}

            <Pressable
              disabled={isSubmitting}
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.loginButtonWrap,
                (pressed || isSubmitting) && styles.buttonPressed,
              ]}>
              <LinearGradient
                colors={premiumGradients.redButton}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.loginButton}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <Text style={styles.loginButtonArrow}>→</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </GlassCard>

          <View style={styles.bottomActions}>
            <Text style={styles.accountPromptText}>Don&apos;t have an account?</Text>
            <Pressable
              hitSlop={8}
              onPress={() => router.push('/create-account')}
              style={styles.createAccountRow}>
              <Text style={styles.bottomActionText}>Create Account</Text>
              <Text style={styles.bottomActionChevron}>›</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070203',
  },
  loginBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 42,
    left: 20,
    zIndex: 20,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: 21,
    backgroundColor: 'rgba(10,10,14,0.42)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  loginBackButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  loginBackFallback: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 26,
  },
  flex: {
    flex: 1,
  },
  heroPhotoFrame: {
    // Full-screen container for the background photo — don't touch this
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  heroPhoto: {
    // Controls where the athlete sits on screen.
    // right: negative value pushes image past the right edge (bleed)
    // width: '100%' = fills screen width. Go higher to zoom in, lower to zoom out.
    // top/bottom: shift image up or down (negative top = image starts above screen)
    // To push athlete to the right: lower the width + keep right negative
    // To push athlete to the left:  increase width significantly
    position: 'absolute',
    top: 0,
    right: -20,
    bottom: 0,
    width: '60%',
    height: '80%',
    opacity: 2,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingTop: 42,
    paddingBottom: 34,
  },
  // ── Brand / logo ─────────────────────────────────────────────────────────
  // brandBlock.marginBottom = gap between logo and welcome text
  // brandBlock.alignItems = 'flex-start' to left-align logo, 'center' to center it
  brandBlock: {
    //alignItems: 'center',
    marginBottom: 26,
  },
  brandSigns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 7,
  },
  brandSign: {
    width: 16,
    height: 16,
    tintColor: premiumColors.redBright,
  },
  brandSignDot: {
    width: 8,
    height: 8,
  },
  brandLogo: {
    width: 220,
    height: 70,
  },
  // ── Welcome text ─────────────────────────────────────────────────────────
  // welcomeBlock.marginBottom = gap between welcome text and the glass card
  // welcomeBlock.paddingHorizontal = left indent of the welcome text
  // welcomeTitle.fontSize / fontWeight = size and boldness of "Welcome back"
  // welcomeSubtitle color comes from premiumColors.textMuted (grey)
  // welcomeAccent = the small red bar under the subtitle (width/height/color)
  welcomeBlock: {
    marginBottom: 24,
    paddingHorizontal: 28,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 33,
  },
  welcomeSubtitle: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 6,
  },
  welcomeAccent: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: accentColor,
    marginTop: 14,
  },
  // ── Card ─────────────────────────────────────────────────────────────────
  // cardShadow.shadowOpacity  = how strong the red glow is under the card
  // cardShadow.shadowRadius   = how spread out the red glow is
  // card.backgroundColor      = the card's base darkness (rgba last number = opacity, lower = more transparent)
  // card.borderColor           = the card edge highlight (rgba last number = how visible the border is)
  // card.borderRadius          = corner roundness of the card
  // BlurView intensity (in GlassCard component above) = background blur strength, higher = more frosted glass
  // cardContent.paddingTop     = how far from the top of the card the "Sign in" title starts
  cardShadow: {
    borderRadius: 34,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 34,
    elevation: 14,
    transform: [{ scale: loginCardScale }],
  },
  card: {
    //position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 34,
    backgroundColor: 'rgba(10,10,14,0.55)',
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  cardInnerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 190,
  },
  cardBottomGlow: {
    position: 'absolute',
    left: 42,
    right: 42,
    bottom: 0,
    height: 3,
  },
  cardGrabber: {
    position: 'absolute',
    top: 18,
    alignSelf: 'center',
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.46)',
  },

  // ── Form ─────────────────────────────────────────────────────────────────
  // title = "Sign in" heading inside the card
  // input / phoneRow / passwordRow = the input field boxes (borderRadius rounds them, borderColor = border visibility)
  // countryCodeBox.backgroundColor = the +961 button tint
  // loginButtonWrap.shadowOpacity  = red glow under the Sign In button
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
    marginBottom: 22,
  },
  inputGroup: {
    marginBottom: 17,
  },
  modeHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  label: {
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  passwordLabel: {
    marginBottom: 9,
  },
  modeToggleText: {
    color: premiumColors.redBright,
    fontSize: 13,
    fontWeight: '900',
  },
  input: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    color: premiumColors.text,
    fontSize: 17,
    fontWeight: '800',
    paddingHorizontal: 18,
  },
  phoneRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
  },
  countryCodeBox: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(225, 29, 46, 0.10)',
    paddingHorizontal: 18,
    gap: 6,
  },
  countryCodeText: {
    color: premiumColors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  countryCodeChevron: {
    color: premiumColors.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },
  phoneInput: {
    minHeight: 58,
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: premiumColors.text,
    fontSize: 17,
    fontWeight: '800',
    paddingHorizontal: 18,
  },
  passwordRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
  },
  passwordInput: {
    flex: 1,
    color: premiumColors.text,
    fontSize: 17,
    fontWeight: '800',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  passwordToggle: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  passwordToggleText: {
    color: premiumColors.redBright,
    fontSize: 14,
    fontWeight: '900',
  },
  errorText: {
    color: '#F2B8BF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 7,
    paddingHorizontal: 4,
  },
  forgotButton: {
    minHeight: 24,
    alignSelf: 'flex-end',
    justifyContent: 'center',
    marginTop: 1,
    marginBottom: 22,
  },
  linkText: {
    color: premiumColors.redBright,
    fontSize: 13,
    fontWeight: '900',
  },
  formFeedback: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.4)',
    borderRadius: 999,
    backgroundColor: 'rgba(12, 12, 14, 0.96)',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  formFeedbackText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
    textAlign: 'center',
  },
  loginButtonWrap: {
    borderRadius: 24,
    marginTop: 0,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.56,
    shadowRadius: 24,
    elevation: 10,
  },
  loginButton: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 160, 170, 0.52)',
    borderRadius: 24,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  loginButtonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8,
  },
  buttonPressed: {
    opacity: 0.84,
  },
  // ── Bottom row ────────────────────────────────────────────────────────────
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 24,
  },
  accountPromptText: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  createAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bottomActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  bottomActionChevron: {
    color: accentColor,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
});
