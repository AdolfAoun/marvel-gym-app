import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authService } from '@/services';

const accentColor = '#E11D2E';

function formatLebanesePhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const first = digits.slice(0, 2);
  const second = digits.slice(2, 5);
  const third = digits.slice(5, 8);

  return [first, second, third].filter(Boolean).join(' ');
}

export default function LoginScreen() {
  const router = useRouter();
  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [identifierMessage, setIdentifierMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const contactRaysProgress = useRef(new Animated.Value(0)).current;
  const keyboardLift = useRef(new Animated.Value(0)).current;
  const phoneInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setIsPasswordFocused(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(keyboardLift, {
      toValue: isPasswordFocused && isKeyboardVisible ? -51 : 0,
      duration: isPasswordFocused && isKeyboardVisible ? 220 : 180,
      useNativeDriver: true,
    }).start();
  }, [isKeyboardVisible, isPasswordFocused, keyboardLift]);

  const setContactHubOpen = (open: boolean) => {
    setIsContactOpen(open);
    Animated.spring(contactRaysProgress, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
  };

  const closeContactHub = () => {
    if (isContactOpen) {
      setContactHubOpen(false);
    }
  };

  const clearInputFocus = () => {
    phoneInputRef.current?.blur();
    emailInputRef.current?.blur();
    passwordInputRef.current?.blur();
    Keyboard.dismiss();
    keyboardLift.stopAnimation();
    keyboardLift.setValue(0);
    setIsPasswordFocused(false);
    setIsKeyboardVisible(false);
  };

  const handleContactHubPress = () => {
    const shouldOpen = !isContactOpen;

    clearInputFocus();
    setContactHubOpen(shouldOpen);
  };

  const hideFeedback = () => {
    Animated.timing(feedbackOpacity, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setFeedbackMessage(''));
  };

  const clearFeedback = () => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    feedbackOpacity.setValue(0);
    setFeedbackMessage('');
  };

  const showFeedback = (message: string) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    setFeedbackMessage(message);
    Animated.timing(feedbackOpacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    feedbackTimeoutRef.current = setTimeout(hideFeedback, 2500);
  };

  const handleLogin = async () => {
    closeContactHub();
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
      await authService.loginMember({
        email: loginMode === 'phone' ? normalizedPhone : normalizedEmail,
        password,
      });
      router.replace('/(tabs)');
    } catch {
      setPasswordMessage(loginFailureMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestAccess = () => {
    closeContactHub();
    router.replace('/(tabs)');
  };

  const handleContactOption = async (url: string) => {
    setContactHubOpen(false);

    try {
      await Linking.openURL(url);
    } catch {
      showFeedback('Unable to open contact option.');
    }
  };

  const contactRayScale = contactRaysProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });
  const whatsappRayStyle = {
    opacity: contactRaysProgress,
    transform: [
      { scale: contactRayScale },
      {
        translateX: contactRaysProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };
  const callRayStyle = {
    opacity: contactRaysProgress,
    transform: [
      { scale: contactRayScale },
      {
        translateY: contactRaysProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-18, 0],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.phoneFrame}>
        <View pointerEvents="none" style={styles.prototypeAtmosphereLayer}>
          <Image
            source={require('@/assets/images/prototype-three-finger-back-pose-background.png')}
            style={styles.prototypeAtmosphereImage}
            resizeMode="contain"
          />
          <View style={styles.prototypeAtmosphereVeil} />
          <View style={styles.prototypeAtmosphereLowerFade} />
        </View>
        <View pointerEvents="none" style={styles.glowSmall} />

        <View pointerEvents="box-none" style={styles.contactHubLayer}>
          <View pointerEvents="none" style={styles.contactHubGlow} />

          <Animated.View
            pointerEvents={isContactOpen ? 'auto' : 'none'}
            style={[styles.contactRay, styles.whatsappRay, whatsappRayStyle]}>
            <Pressable
              hitSlop={10}
              onPress={() => handleContactOption('https://wa.me/96179197997')}
              style={({ pressed }) => [
                styles.contactRayButton,
                pressed && styles.contactPressed,
              ]}>
              <Text style={styles.contactRayText}>WhatsApp</Text>
            </Pressable>
          </Animated.View>

          <Animated.View
            pointerEvents={isContactOpen ? 'auto' : 'none'}
            style={[styles.contactRay, styles.callRay, callRayStyle]}>
            <Pressable
              hitSlop={10}
              onPress={() => handleContactOption('tel:+96179197997')}
              style={({ pressed }) => [
                styles.contactRayButton,
                styles.callRayButton,
                pressed && styles.contactPressed,
              ]}>
              <Text style={styles.contactRayText}>Call</Text>
            </Pressable>
          </Animated.View>

          <Pressable
            hitSlop={12}
            onPress={handleContactHubPress}
            style={({ pressed }) => [
              styles.contactHub,
              isContactOpen && styles.contactHubOpen,
              pressed && styles.contactPressed,
            ]}>
            <Text style={styles.contactHubText}>Contact Us</Text>
          </Pressable>
        </View>

        <Animated.View
          style={[
            styles.keyboardLiftLayer,
            {
              transform: [{ translateY: keyboardLift }],
            },
          ]}>
          <Pressable
            onPress={() => {
              closeContactHub();
              clearInputFocus();
            }}
            style={styles.fixedContent}>
          <View style={styles.brandingSection}>
            <View style={styles.brandBlock}>
              <View style={styles.logoGlow} />
              <Image
                source={require('@/assets/images/marvel-logo-transparent.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.heroBlock}>
              <View style={styles.subtitlePill}>
                <Text style={styles.heroSubtitle}>
                  View Membership, Classes, and Gym Essentials.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.loginCard}>
            <View style={styles.cardGloss} />
            <View style={styles.inputGroup}>
              <View style={styles.loginModeHeader}>
                <Text style={styles.label}>
                  {loginMode === 'phone' ? 'Phone Number' : 'Email'}
                </Text>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    closeContactHub();
                    setLoginMode((mode) => (mode === 'phone' ? 'email' : 'phone'));
                    setIdentifierMessage('');
                    setPasswordMessage('');
                    clearFeedback();
                  }}
                  hitSlop={8}>
                  <Text style={styles.modeToggleText}>
                    {loginMode === 'phone' ? 'Use email instead' : 'Use phone instead'}
                  </Text>
                </Pressable>
              </View>

              {loginMode === 'phone' ? (
                <View style={styles.phoneRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>+961</Text>
                  </View>
                  <TextInput
                    ref={phoneInputRef}
                    value={formatLebanesePhone(phoneNumber)}
                    onChangeText={(value) =>
                      setPhoneNumber(value.replace(/\D/g, '').slice(0, 8))
                    }
                    placeholder="70 123 456"
                    placeholderTextColor="#667282"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="number-pad"
                    textContentType="telephoneNumber"
                    onFocus={() => {
                      closeContactHub();
                      setIsPasswordFocused(false);
                    }}
                    selectionColor={accentColor}
                    style={styles.phoneInput}
                  />
                </View>
              ) : (
                <TextInput
                  ref={emailInputRef}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="member@marvelgym.com"
                  placeholderTextColor="#667282"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  onFocus={() => {
                    closeContactHub();
                    setIsPasswordFocused(false);
                  }}
                  selectionColor={accentColor}
                  style={styles.input}
                />
              )}

              <View style={styles.identifierMessageArea}>
                {identifierMessage.length > 0 && (
                  <Text style={styles.identifierMessageText}>{identifierMessage}</Text>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  ref={passwordInputRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#667282"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!isPasswordVisible}
                  textContentType="password"
                  onFocus={() => {
                    closeContactHub();
                    setIsPasswordFocused(true);
                  }}
                  onBlur={() => setIsPasswordFocused(false)}
                  selectionColor={accentColor}
                  style={styles.passwordInput}
                />
                <Pressable
                  onPress={() => {
                    closeContactHub();
                    setIsPasswordVisible((value) => !value);
                  }}
                  hitSlop={10}
                  style={styles.passwordToggle}>
                  <Text style={styles.passwordToggleText}>
                    {isPasswordVisible ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.passwordMessageArea}>
                {passwordMessage.length > 0 && (
                  <Text style={styles.passwordMessageText}>{passwordMessage}</Text>
                )}
              </View>
            </View>

            <View style={styles.actionStack}>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  closeContactHub();
                  showFeedback('Password reset mail sent');
                }}
                style={styles.forgotButton}>
                <Text style={styles.linkText}>Forgot password?</Text>
              </Pressable>

              {feedbackMessage.length > 0 && (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.formFeedback, { opacity: feedbackOpacity }]}>
                  <Text style={styles.formFeedbackText}>{feedbackMessage}</Text>
                </Animated.View>
              )}

              <Pressable
                disabled={isSubmitting}
                onPress={(event) => {
                  event.stopPropagation();
                  handleLogin();
                }}
                style={({ pressed }) => [
                  styles.loginButton,
                  (pressed || isSubmitting) && styles.loginButtonPressed,
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color="#031018" />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              closeContactHub();
            }}
            style={styles.bottomActions}>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                closeContactHub();
                showFeedback('Registration coming soon');
              }}>
              <Text style={styles.bottomActionText}>Create Account</Text>
            </Pressable>

            <Image
              accessible={false}
              source={require('@/assets/images/marvel-x-red-separator.png')}
              style={styles.footerDivider}
              resizeMode="contain"
            />

            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                handleGuestAccess();
              }}>
              <Text style={styles.bottomActionText}>Continue as Guest</Text>
            </Pressable>
          </Pressable>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
    backgroundColor: '#030405',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 414 : undefined,
    overflow: 'hidden',
    backgroundColor: '#06080a',
    borderColor: Platform.OS === 'web' ? '#1d2733' : 'transparent',
    borderRadius: Platform.OS === 'web' ? 34 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    marginVertical: Platform.OS === 'web' ? 22 : 0,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: Platform.OS === 'web' ? 0.2 : 0,
    shadowRadius: 42,
  },
  glowSmall: {
    position: 'absolute',
    zIndex: 1,
    bottom: 88,
    left: -96,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: accentColor,
    opacity: 0.08,
  },
  prototypeAtmosphereLayer: {
    position: 'absolute',
    zIndex: 0,
    top: 0,
    left: 0,
    right: 0,
    height: 460,
    overflow: 'hidden',
    opacity: 1,
  },
  prototypeAtmosphereImage: {
    position: 'absolute',
    top: -90,
    left: -300,
    right: 12,
    height: 650,
    opacity: 0.5,//0.12
    
  },
  prototypeAtmosphereVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 4, 5, 0.22)',
  },
  prototypeAtmosphereLowerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    backgroundColor: 'rgba(6, 8, 10, 0.66)',
  },
  contactHubLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 20,
    width: 230,
    height: 176,
  },
  contactHubGlow: {
    position: 'absolute',
    top: -108,
    right: -108,
    zIndex: 0,
    width: 212,
    height: 212,
    borderRadius: 106,
    backgroundColor: accentColor,
    opacity: 0.14,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.34,
    shadowRadius: 36,
  },
  contactHub: {
    position: 'absolute',
    top: -88,
    right: -88,
    zIndex: 2,
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.34)',
    borderRadius: 90,
    backgroundColor: 'rgba(225, 29, 46, 0.32)',
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 8,
  },
  contactHubOpen: {
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: 'rgba(225, 29, 46, 0.34)',
  },
  contactHubText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 14,
    marginTop: 83,
    marginRight: 70,
    maxWidth: 58,
    textAlign: 'center',
  },
  contactRay: {
    position: 'absolute',
    zIndex: 1,
  },
  whatsappRay: {
    top: 28,
    right: 100,
  },
  callRay: {
    top: 92,
    right: 47,
  },
  contactRayButton: {
    width: 70,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.56)',
    borderRadius: 14,
    backgroundColor: 'rgba(8, 8, 9, 0.08)',
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 16,
    elevation: 7,
  },
  callRayButton: {
    width: 52,
  },
  contactRayText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  contactPressed: {
    opacity: 0.8,
  },
  keyboardLiftLayer: {
    zIndex: 2,
    flex: 1,
  },
  fixedContent: {
    zIndex: 2,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 52 : 38,
    paddingBottom: 24,
    transform: [{ translateY: 30 }],//Move whole content up or down
  },
  brandingSection: {
    alignItems: 'center',
    flexShrink: 0,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 18,
    position: 'relative',
    transform: [{ translateY: 28 }],
  },
  logoGlow: {
    position: 'absolute',
    top: 0,
    width: 158,
    height: 158,
    borderRadius: 79,
    backgroundColor: accentColor,
    opacity: 0.18,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.62,
    shadowRadius: 36,
  },
  logoImage: {
    width: 150,
    height: 150,
    transform: [{ translateY: 6 }, { translateX: 0.3 }],
  },
  heroBlock: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 22,
    paddingHorizontal: 10,
    transform: [{ translateY: 5 }],
  },
  subtitlePill: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    backgroundColor: 'rgba(18, 18, 20, 0.62)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
  },
  heroSubtitle: {
    color: '#d5d9df',
    fontSize: 11,
    lineHeight: 18,
    maxWidth: 300,
    textAlign: 'center',
    transform: [{ translateY: 0}],
  },
  loginCard: {
    position: 'relative',
    gap: 8,
    flexShrink: 0,
    minHeight: 320,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.11)',
    borderRadius: 30,
    backgroundColor: 'rgba(18, 18, 20, 0.86)',
    paddingHorizontal: 22,
    paddingVertical: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 7,
  },
  cardGloss: {
    position: 'absolute',
    top: 0,
    left: 22,
    right: 22,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  formFeedback: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 70,
    zIndex: 10,
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.4)',
    borderRadius: 999,
    backgroundColor: 'rgba(12, 12, 14, 0.96)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },
  formFeedbackText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 16,
    textAlign: 'center',
  },
  inputGroup: {
    gap: 4,
  },
  loginModeHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    color: '#e7edf5',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  modeToggleText: {
    color: accentColor,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#30272b',
    borderRadius: 16,
    backgroundColor: '#080809',
    color: '#f8fafc',
    fontSize: 16,
    paddingHorizontal: 16,
  },
  identifierMessageArea: {
    minHeight: 14,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  identifierMessageText: {
    color: '#f2b8bf',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 14,
  },
  passwordMessageArea: {
    minHeight: 16,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  passwordMessageText: {
    color: '#f2b8bf',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 14,
  },
  phoneRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countryCodeBox: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#30272b',
    borderRadius: 16,
    backgroundColor: '#111113',
    paddingHorizontal: 14,
  },
  countryCodeText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  phoneInput: {
    minHeight: 54,
    flex: 1,
    borderWidth: 1,
    borderColor: '#30272b',
    borderRadius: 16,
    backgroundColor: '#080809',
    color: '#f8fafc',
    fontSize: 16,
    paddingHorizontal: 16,
  },
  passwordRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#30272b',
    borderRadius: 16,
    backgroundColor: '#080809',
  },
  passwordInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  passwordToggle: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  passwordToggleText: {
    color: accentColor,
    fontSize: 14,
    fontWeight: '900',
  },
  forgotButton: {
    minHeight: 24,
    alignSelf: 'flex-end',
    justifyContent: 'center',
  },
  actionStack: {
    position: 'relative',
    gap: 6,
  },
  linkText: {
    color: accentColor,
    fontSize: 14,
    fontWeight: '900',
  },
  loginButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: accentColor,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 5,
  },
  loginButtonPressed: {
    opacity: 0.84,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  bottomActions: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 22,
  },
  bottomActionText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
  footerDivider: {
    width: 12,
    height: 18,
    tintColor: accentColor,
    opacity: 0.62,
  },
});
