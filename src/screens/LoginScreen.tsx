import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
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
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
    clearFeedback();
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const loginFailureMessage =
      loginMode === 'phone'
        ? 'Phone number or password is invalid.'
        : 'Email or password is invalid.';

    if (loginMode === 'phone' && normalizedPhone.length !== 8) {
      showFeedback('Enter an 8-digit phone number.');
      return;
    }

    if (loginMode === 'email' && !emailPattern.test(normalizedEmail)) {
      showFeedback('Enter a valid email address.');
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
      showFeedback(loginFailureMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestAccess = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.phoneFrame}>
        <View style={styles.glowLarge} />
        <View style={styles.glowSmall} />

        <Pressable onPress={Keyboard.dismiss} style={styles.fixedContent}>
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
                  Access your Membership, Classes, and Gym Essentials.
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.loginCard, loginMode === 'email' && styles.loginCardEmail]}>
            <View style={styles.cardGloss} />
            <View style={styles.inputGroup}>
              <View style={styles.loginModeHeader}>
                <Text style={styles.label}>
                  {loginMode === 'phone' ? 'Phone Number' : 'Email'}
                </Text>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    setLoginMode((mode) => (mode === 'phone' ? 'email' : 'phone'));
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
                    selectionColor={accentColor}
                    style={styles.phoneInput}
                  />
                </View>
              ) : (
                <>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="member@marvelgym.com"
                    placeholderTextColor="#667282"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    selectionColor={accentColor}
                    style={styles.input}
                  />
                  <Text style={styles.emailNotice}>
                    Enter the email address associated to your account.
                  </Text>
                </>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#667282"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!isPasswordVisible}
                  textContentType="password"
                  selectionColor={accentColor}
                  style={styles.passwordInput}
                />
                <Pressable
                  onPress={() => setIsPasswordVisible((value) => !value)}
                  hitSlop={10}
                  style={styles.passwordToggle}>
                  <Text style={styles.passwordToggleText}>
                    {isPasswordVisible ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.actionStack}>
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
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
            onPress={(event) => event.stopPropagation()}
            style={styles.bottomActions}>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                showFeedback('Registration coming soon');
              }}>
              <Text style={styles.bottomActionText}>Create Account</Text>
            </Pressable>

            <View style={styles.footerDivider} />

            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                handleGuestAccess();
              }}>
              <Text style={styles.bottomActionText}>Continue as Guest</Text>
            </Pressable>
          </Pressable>
        </Pressable>
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
  glowLarge: {
    position: 'absolute',
    top: -96,
    right: -88,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: accentColor,
    opacity: 0.14,
  },
  glowSmall: {
    position: 'absolute',
    bottom: 88,
    left: -96,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: accentColor,
    opacity: 0.08,
  },
  fixedContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 52 : 38,
    paddingBottom: 24,
    transform: [{ translateY: 10 }],
  },
  brandingSection: {
    alignItems: 'center',
    flexShrink: 0,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 18,
    position: 'relative',
    transform: [{ translateY: 22 }],
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
  },
  subtitlePill: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    backgroundColor: 'rgba(18, 18, 20, 0.62)',
    paddingHorizontal: 18,
    paddingVertical: 13,
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
  },
  loginCard: {
    position: 'relative',
    gap: 16,
    flexShrink: 0,
    minHeight: 320,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.11)',
    borderRadius: 30,
    backgroundColor: 'rgba(18, 18, 20, 0.86)',
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 7,
  },
  loginCardEmail: {
    paddingBottom: 24,
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
    gap: 8,
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
  emailNotice: {
    color: '#8b96a6',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 16,
    paddingHorizontal: 16,
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
    minHeight: 34,
    alignSelf: 'flex-end',
    justifyContent: 'center',
  },
  actionStack: {
    position: 'relative',
    gap: 10,
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
    width: 1,
    height: 18,
    backgroundColor: '#263241',
  },
});
