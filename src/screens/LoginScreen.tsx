import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
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

const accentColor = '#B11226';

function formatLebanesePhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const first = digits.slice(0, 2);
  const second = digits.slice(2, 5);
  const third = digits.slice(5, 8);

  return [first, second, third].filter(Boolean).join(' ');
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

  useEffect(() => {
    if (params.created === '1') {
      showFeedback('Account created successfully. Please log in.');
    }
  }, [params.created]);

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
    <View style={styles.safeArea}>
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
        <View pointerEvents="none" style={styles.glowLarge} />
        <View pointerEvents="none" style={styles.futuristicBlade} />

        <SafeAreaView style={styles.contentSafeArea}>
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
          <View style={styles.loginCard}>
            <View style={styles.cardGloss} />
            <View style={styles.loginCardHeader}>
              <Text style={styles.loginTitle}>Sign in</Text>
            </View>
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
                  <Text style={styles.loginButtonText}>Sign In</Text>
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
            <Text style={styles.accountPromptText}>Don't have an account?</Text>

            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                closeContactHub();
                router.push('/create-account');
            }}>
              <Text style={styles.bottomActionText}>Create Account</Text>
            </Pressable>
          </Pressable>
            </Pressable>
          </Animated.View>
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
    backgroundColor: '#000000',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 414 : undefined,
    overflow: 'hidden',
    backgroundColor: '#06070A',
    borderColor: Platform.OS === 'web' ? '#1d2733' : 'transparent',
    borderRadius: Platform.OS === 'web' ? 34 : 0,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    marginVertical: Platform.OS === 'web' ? 22 : 0,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: Platform.OS === 'web' ? 0.2 : 0,
    shadowRadius: 42,
  },
  contentSafeArea: {
    flex: 1,
  },
  glowSmall: {
    position: 'absolute',
    zIndex: 1,
    bottom: 70,
    left: -110,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: accentColor,
    opacity: 0.16,
  },
  glowLarge: {
    position: 'absolute',
    zIndex: 1,
    top: -76,
    right: -76,
    width: 186,
    height: 186,
    borderRadius: 93,
    backgroundColor: '#5A0711',
    opacity: 0.22,
  },
  futuristicBlade: {
    position: 'absolute',
    zIndex: 1,
    top: 64,
    right: -70,
    width: 102,
    height: 520,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: [{ rotate: '24deg' }],
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
    height: 680,
    opacity: 0.4,
  },
  prototypeAtmosphereVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
  },
  prototypeAtmosphereLowerFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  contactHubLayer: {
  position: 'absolute',
  top: 57,
  right: 0,
  zIndex: 20,
  width: 40,
  height: 210,
},

contactHubGlow: {
  position: 'absolute',
  top: 17,
  right: -135,
  zIndex: 0,
  width: 193,
  height: 130,
  borderRadius: 121,
  backgroundColor: accentColor,
  opacity: 0.14,
  shadowColor: accentColor,
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.34,
  shadowRadius: 36,
},

contactHub: {
  position: 'absolute',
  top: 22,
  right: -112,
  zIndex: 2,
  width: 165,
  height: 120,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: 'rgba(225, 29, 46, 0.34)',
  borderRadius: 104,
  backgroundColor: 'rgba(225, 29, 46, 0.32)',
  shadowColor: accentColor,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.3,
  shadowRadius: 22,
  elevation: 8,
},

contactHubOpen: {
  borderColor: 'rgba(225, 29, 46, 0.62)',
  backgroundColor: 'rgba(225, 29, 46, 0.42)',
},

contactHubText: {
  color: '#ffffff',
  fontSize: 11,
  fontWeight: '900',
  letterSpacing: 0,
  lineHeight: 14,
  marginRight: 107,
  maxWidth: 58,
  textAlign: 'center',
},

whatsappRay: {
  top: 40,
  right: 95,
},

callRay: {
  top: 55,
  right: 78,
},
  contactRay: {
    position: 'absolute',
    zIndex: 3,
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 36 : 26,
    paddingBottom: 24,
    transform: [{ translateY: Platform.OS === 'web' ? 22 : 30 }],
  },
  loginCard: {
    position: 'relative',
    gap: 11,
    flexShrink: 0,
    minHeight: 348,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 30,
    backgroundColor: 'rgba(12, 13, 17, 0.9)',
    paddingHorizontal: 21,
    paddingVertical: 21,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.46,
    shadowRadius: 32,
    elevation: 10,
  },
  cardGloss: {
    position: 'absolute',
    top: 0,
    left: 22,
    right: 22,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  loginCardHeader: {
    marginBottom: 2,
  },
  loginTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 32,
    marginTop: 2,
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
    color: '#EDF2F7',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  modeToggleText: {
    color: '#FF5A6A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.075)',
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
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    paddingHorizontal: 14,
  },
  countryCodeText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  phoneInput: {
    minHeight: 56,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.075)',
    color: '#f8fafc',
    fontSize: 16,
    paddingHorizontal: 16,
  },
  passwordRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.075)',
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
    color: '#FF5A6A',
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
    color: '#FF5A6A',
    fontSize: 14,
    fontWeight: '900',
  },
  loginButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
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
  accountPromptText: {
    color: '#A8B2C0',
    fontSize: 14,
    fontWeight: '800',
  },
  bottomActionText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
  },
});
