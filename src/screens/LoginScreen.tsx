import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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
import type { ImageSourcePropType } from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumGradients } from '@/constants/premiumTheme';
import { authService, entryContentService } from '@/services';

const accentColor = premiumColors.redBright;

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
  const [identifierMessage, setIdentifierMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [backgroundPhoto, setBackgroundPhoto] = useState<ImageSourcePropType>();
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

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
    <PremiumScreenBackground>
      <StatusBar style="light" />
      {backgroundPhoto ? (
        <Image
          source={backgroundPhoto}
          style={styles.heroPhoto}
          resizeMode="cover"
        />
      ) : null}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(7, 8, 12, 0.4)', 'rgba(7, 8, 12, 0.86)', '#070203']}
        locations={[0, 0.55, 1]}
        style={styles.heroFade}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.brandBlock}>
            <Image
              source={require('@/assets/images/marvel-logo-transparent.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.card}>
            <View pointerEvents="none" style={styles.cardGloss} />
            <Text style={styles.kicker}>Member access</Text>
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
              <Text style={styles.label}>Password</Text>
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
                  onPress={() => setIsPasswordVisible((value) => !value)}
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
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.bottomActions}>
            <Text style={styles.accountPromptText}>Don&apos;t have an account?</Text>
            <Pressable
              hitSlop={8}
              onPress={() => router.push('/create-account')}>
              <Text style={styles.bottomActionText}>Create Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  heroPhoto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
    opacity: 0.4,
  },
  heroFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '58%',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 22,
  },
  brandLogo: {
    width: 150,
    height: 92,
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 30,
    backgroundColor: 'rgba(14, 12, 16, 0.82)',
    paddingHorizontal: 22,
    paddingVertical: 24,
    shadowColor: premiumColors.red,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 12,
  },
  cardGloss: {
    position: 'absolute',
    top: 0,
    left: 22,
    right: 22,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
  },
  kicker: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 35,
    marginTop: 4,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 14,
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
    fontSize: 13,
    fontWeight: '800',
  },
  modeToggleText: {
    color: premiumColors.redBright,
    fontSize: 12,
    fontWeight: '900',
  },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: premiumColors.text,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  phoneRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countryCodeBox: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
  },
  countryCodeText: {
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  phoneInput: {
    minHeight: 56,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: premiumColors.text,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  passwordRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  passwordInput: {
    flex: 1,
    color: premiumColors.text,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
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
    marginBottom: 6,
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
    borderRadius: 20,
    marginTop: 4,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 8,
  },
  loginButton: {
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 120, 130, 0.5)',
    borderRadius: 20,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.84,
  },
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
  bottomActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
