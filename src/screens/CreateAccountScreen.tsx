import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import type { RegisterMemberInput } from '@/services';

const accentColor = '#B11226';
const genderOptions: RegisterMemberInput['gender'][] = [
  'Male',
  'Female',
];

type FormErrors = Partial<
  Record<
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phone'
    | 'dateOfBirth'
    | 'gender'
    | 'password',
    string
  >
>;

function formatLebanesePhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const first = digits.slice(0, 2);
  const second = digits.slice(2, 5);
  const third = digits.slice(5, 8);

  return [first, second, third].filter(Boolean).join(' ');
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function isValidName(value: string) {
  return /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(value);
}

function parseDateOfBirth(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());

  if (!match) {
    return undefined;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  const now = new Date();
  let age = now.getFullYear() - year;
  const hasHadBirthday =
    now.getMonth() > month - 1 ||
    (now.getMonth() === month - 1 && now.getDate() >= day);

  if (!hasHadBirthday) {
    age -= 1;
  }

  if (age < 10 || age > 100) {
    return undefined;
  }

  return `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return [day, month, year].filter(Boolean).join('/');
}

function getPasswordErrors(value: string) {
  const missing: string[] = [];

  if (value.length < 5) {
    missing.push('Too short');
  }

  if (!/[A-Za-z]/.test(value)) {
    missing.push('Missing letter');
  }

  if (!/\d/.test(value)) {
    missing.push('Missing number');
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    missing.push('Missing special character');
  }

  return missing;
}

export default function CreateAccountScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<RegisterMemberInput['gender']>();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const nextErrors: FormErrors = {};
    const cleanFirstName = normalizeName(firstName);
    const cleanLastName = normalizeName(lastName);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanDateOfBirth = parseDateOfBirth(dateOfBirth);
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanFirstName || !isValidName(cleanFirstName)) {
      nextErrors.firstName = 'Enter a valid first name using letters only.';
    }

    if (!cleanLastName || !isValidName(cleanLastName)) {
      nextErrors.lastName = 'Enter a valid family name using letters only.';
    }

    if (!emailPattern.test(cleanEmail)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (cleanPhone.length !== 8) {
      nextErrors.phone = 'Enter an 8-digit Lebanese phone number.';
    }

    if (!cleanDateOfBirth) {
      nextErrors.dateOfBirth = 'Enter a real date as DD/MM/YYYY.';
    }

    if (!gender) {
      nextErrors.gender = 'Select a gender option.';
    }

    const passwordErrors = getPasswordErrors(password.trim());

    if (passwordErrors.length > 0) {
      nextErrors.password = passwordErrors.join(', ');
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !gender || !cleanDateOfBirth) {
      return undefined;
    }

    return {
      firstName: cleanFirstName,
      lastName: cleanLastName,
      email: cleanEmail,
      phone: `+961 ${formatLebanesePhone(cleanPhone)}`,
      dateOfBirth: cleanDateOfBirth,
      gender,
      password: password.trim(),
    };
  };

  const handleCreateAccount = async () => {
    const payload = validate();

    if (!payload) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await authService.registerMember(payload);
      router.replace({
        pathname: '/login',
        params: { created: '1' },
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Could not create the account. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.phoneFrame}>
        <View pointerEvents="none" style={styles.backgroundLayer}>
          <Image
            source={require('@/assets/images/prototype-three-finger-back-pose-background.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          <View style={styles.backgroundVeil} />
          <View style={styles.backgroundFade} />
        </View>
        <View pointerEvents="none" style={styles.redGlow} />
        <View pointerEvents="none" style={styles.blade} />

        <SafeAreaView style={styles.contentSafeArea}>
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
              <View style={styles.brandCopy}>
                <Text style={styles.brandTitle}>MARVEL GYM</Text>
                <Text style={styles.brandSubtitle}>Create your account</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.kicker}>Member registration</Text>
              <Text style={styles.title}>Create Account</Text>

              <View style={styles.row}>
                <View style={styles.halfInputGroup}>
                  <Text style={styles.label}>First name</Text>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Tony"
                    placeholderTextColor="#667282"
                    autoCapitalize="words"
                    selectionColor={accentColor}
                    style={styles.input}
                  />
                  {errors.firstName ? (
                    <Text style={styles.errorText}>{errors.firstName}</Text>
                  ) : null}
                </View>

                <View style={styles.halfInputGroup}>
                  <Text style={styles.label}>Family name</Text>
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Stark"
                    placeholderTextColor="#667282"
                    autoCapitalize="words"
                    selectionColor={accentColor}
                    style={styles.input}
                  />
                  {errors.lastName ? (
                    <Text style={styles.errorText}>{errors.lastName}</Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="member@marvelgym.com"
                  placeholderTextColor="#667282"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  selectionColor={accentColor}
                  style={styles.input}
                />
                {errors.email ? (
                  <Text style={styles.errorText}>{errors.email}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>+961</Text>
                  </View>
                  <TextInput
                    value={formatLebanesePhone(phone)}
                    onChangeText={(value) =>
                      setPhone(value.replace(/\D/g, '').slice(0, 8))
                    }
                    placeholder="70 123 456"
                    placeholderTextColor="#667282"
                    keyboardType="number-pad"
                    selectionColor={accentColor}
                    style={styles.phoneInput}
                  />
                </View>
                {errors.phone ? (
                  <Text style={styles.errorText}>{errors.phone}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date of birth</Text>
                <TextInput
                  value={dateOfBirth}
                  onChangeText={(value) => setDateOfBirth(formatDateInput(value))}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#667282"
                  keyboardType="number-pad"
                  selectionColor={accentColor}
                  style={styles.input}
                />
                {errors.dateOfBirth ? (
                  <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.genderGrid}>
                  {genderOptions.map((option) => {
                    const isSelected = gender === option;

                    return (
                      <Pressable
                        key={option}
                        onPress={() => setGender(option)}
                        style={({ pressed }) => [
                          styles.genderOption,
                          isSelected && styles.genderOptionSelected,
                          pressed && styles.buttonPressed,
                        ]}>
                        <Text
                          style={[
                            styles.genderOptionText,
                            isSelected && styles.genderOptionTextSelected,
                          ]}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.gender ? (
                  <Text style={styles.errorText}>{errors.gender}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Example: Gym@1"
                  placeholderTextColor="#667282"
                  secureTextEntry
                  selectionColor={accentColor}
                  style={styles.input}
                />
                {errors.password ? (
                  <Text style={styles.errorText}>{errors.password}</Text>
                ) : null}
                <Text style={styles.passwordGuidance}>
                  Use at least 5 characters with one letter, one number, and one special sign.
                </Text>
              </View>

              <Pressable
                disabled={isSubmitting}
                onPress={handleCreateAccount}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (pressed || isSubmitting) && styles.buttonPressed,
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
              </Pressable>
              {submitError ? (
                <Text style={styles.submitErrorText}>{submitError}</Text>
              ) : null}
            </View>

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.backButtonText}>Back to Sign In</Text>
            </Pressable>
          </ScrollView>
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
  },
  backgroundLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.42,
  },
  backgroundVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  backgroundFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
  },
  redGlow: {
    position: 'absolute',
    top: -72,
    right: -72,
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: '#5A0711',
    opacity: 0.22,
  },
  blade: {
    position: 'absolute',
    top: 64,
    right: -68,
    width: 92,
    height: 520,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: [{ rotate: '24deg' }],
  },
  contentSafeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 28,
  },
  brandBlock: {
    zIndex: 2,
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  brandLogo: {
    width: 88,
    height: 68,
  },
  brandCopy: {
    flex: 1,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandSubtitle: {
    color: '#F7D6DC',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  card: {
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 30,
    backgroundColor: 'rgba(12, 13, 17, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 21,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.46,
    shadowRadius: 32,
    elevation: 10,
  },
  kicker: {
    color: '#F7D6DC',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 32,
    marginTop: 2,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInputGroup: {
    flex: 1,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#EDF2F7',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.075)',
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 14,
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
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    paddingHorizontal: 14,
  },
  countryCodeText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '900',
  },
  phoneInput: {
    minHeight: 54,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.075)',
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 14,
  },
  genderGrid: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-start',
  },
  genderOption: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.075)',
    paddingHorizontal: 18,
  },
  genderOptionSelected: {
    borderColor: 'rgba(225, 29, 46, 0.58)',
    backgroundColor: 'rgba(177, 18, 38, 0.32)',
  },
  genderOptionText: {
    color: '#D8DEE8',
    fontSize: 11,
    fontWeight: '900',
  },
  genderOptionTextSelected: {
    color: '#FFFFFF',
  },
  errorText: {
    color: '#F2B8BF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 6,
  },
  passwordGuidance: {
    color: '#A8B2C0',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 15,
    marginTop: 7,
  },
  submitErrorText: {
    color: '#F2B8BF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: accentColor,
    marginTop: 2,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  backButton: {
    zIndex: 2,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  backButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.78,
  },
});
