import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
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
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setStatusMessage('');
    setErrorMessage('');
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (loginMode === 'phone' && normalizedPhone.length !== 8) {
      setErrorMessage('Phone number must be 8-digits.');
      return;
    }

    if (loginMode === 'email' && !emailPattern.test(normalizedEmail)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.loginMember({
        email: loginMode === 'phone' ? normalizedPhone : normalizedEmail,
        password,
      });
      router.replace('/(tabs)');
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

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
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

            <View style={styles.loginCard}>
              <View style={styles.cardGloss} />
              <View style={styles.inputGroup}>
                <View style={styles.loginModeHeader}>
                  <Text style={styles.label}>
                    {loginMode === 'phone' ? 'Phone Number' : 'Email'}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setLoginMode((mode) => (mode === 'phone' ? 'email' : 'phone'));
                      setErrorMessage('');
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
                      onChangeText={(value) => setPhoneNumber(value.replace(/\D/g, '').slice(0, 8))}
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
                )}

                <Text style={styles.helperText}>
                  {loginMode === 'phone'
                    ? 'Use the phone number linked to your membership.'
                    : 'Login via email only if email is linked to account.'}
                </Text>
                {errorMessage.length > 0 && (
                  <Text style={styles.errorText}>{errorMessage}</Text>
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

              <Pressable
                onPress={() => setStatusMessage('Password reset is coming soon.')}
                style={styles.forgotButton}>
                <Text style={styles.linkText}>Forgot password?</Text>
              </Pressable>

              <Pressable
                disabled={isSubmitting}
                onPress={handleLogin}
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

              {statusMessage.length > 0 && (
                <Text style={styles.statusMessage}>{statusMessage}</Text>
              )}
            </View>

            <View style={styles.quickAccessWrapper}>
              <QuickAccessButton
                label="Chat with us"
                onPress={() => setStatusMessage('Support is coming soon.')}
              />
            </View>

            <View style={styles.bottomActions}>
              <Pressable onPress={() => setStatusMessage('Account creation is coming soon.')}>
                <Text style={styles.bottomActionText}>Create Account</Text>
              </Pressable>

              <View style={styles.footerDivider} />

              <Pressable onPress={handleGuestAccess}>
                <Text style={styles.bottomActionText}>Continue as Guest</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

type QuickAccessButtonProps = {
  label: string;
  onPress: () => void;
};

function QuickAccessButton({ label, onPress }: QuickAccessButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAccessButton,
        pressed && styles.quickAccessButtonPressed,
      ]}>
      <View style={styles.quickAccessIcon} />
      <Text style={styles.quickAccessText}>{label}</Text>
    </Pressable>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 18,
    position: 'relative',
    transform: [{ translateY: 5 }],

  },
  logoGlow: {
    position: 'absolute',
    top: 0,
    width:158,
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
    transform: [{ translateY: 6 },{ translateX: 0.3 }],
   
  },
  heroBlock: {
    alignItems: 'center',
    marginTop:20,
    marginBottom: 15,
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
    lineHeight: 22,
    maxWidth: 300,
    textAlign: 'center',
  },
  loginCard: {
    gap: 17,
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
    elevation: 6,
  },
  cardGloss: {
    position: 'absolute',
    top: 0,
    left: 22,
    right: 22,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
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
  helperText: {
    color: '#8f98a6',
    fontSize: 12,
    lineHeight: 16,
  },
  errorText: {
    color: '#ff6875',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
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
  statusMessage: {
    color: '#a9b4c2',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  quickAccessWrapper: {
    marginTop: 18,
  },
  quickAccessButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#332429',
    borderRadius: 18,
    backgroundColor: '#0d0d0f',
  },
  quickAccessButtonPressed: {
    borderColor: accentColor,
    opacity: 0.82,
  },
  quickAccessIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: accentColor,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },
  quickAccessText: {
    color: '#dbe5ef',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  bottomActions: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
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
