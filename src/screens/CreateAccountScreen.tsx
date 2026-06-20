import { LinearGradient } from 'expo-linear-gradient';
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

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumGradients } from '@/constants/premiumTheme';
import { authService } from '@/services';
import type { RegisterMemberInput } from '@/services';

const accentColor = premiumColors.redBright;
const genderOptions: RegisterMemberInput['gender'][] = ['Male', 'Female'];
const brandSigns = [
  require('@/assets/images/marvel-logo-startup-sign-dot.png'),
  require('@/assets/images/marvel-logo-startup-sign-x.png'),
  require('@/assets/images/marvel-logo-startup-sign-slash.png'),
  require('@/assets/images/marvel-logo-startup-sign-divide.png'),
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
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.brandBlock}>
            <View style={styles.brandSigns}>
              {brandSigns.map((source, index) => (
                <Image
                  key={index}
                  source={source}
                  resizeMode="contain"
                  style={[
                    styles.brandSign,
                    index === 0 && styles.brandSignDot,
                  ]}
                />
              ))}
            </View>
            <Image
              source={require('@/assets/images/marvel-logo-startup-wordmark.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandSubtitle}>Create your account</Text>
          </View>

          <View style={styles.card}>
            <View pointerEvents="none" style={styles.cardGloss} />
            <Text style={styles.kicker}>Member registration</Text>
            <Text style={styles.title}>Create Account</Text>

            <View style={styles.row}>
              <View style={styles.halfInputGroup}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Tony"
                  placeholderTextColor={premiumColors.textFaint}
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
                  placeholderTextColor={premiumColors.textFaint}
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
                placeholderTextColor={premiumColors.textFaint}
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
                  placeholderTextColor={premiumColors.textFaint}
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
                placeholderTextColor={premiumColors.textFaint}
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
                placeholderTextColor={premiumColors.textFaint}
                secureTextEntry
                selectionColor={accentColor}
                style={styles.input}
              />
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
              <Text style={styles.passwordGuidance}>
                Use at least 5 characters with one letter, one number, and one
                special sign.
              </Text>
            </View>

            <Pressable
              disabled={isSubmitting}
              onPress={handleCreateAccount}
              style={({ pressed }) => [
                styles.primaryButtonWrap,
                (pressed || isSubmitting) && styles.buttonPressed,
              ]}>
              <LinearGradient
                colors={premiumGradients.redButton}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.primaryButton}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
              </LinearGradient>
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
      </KeyboardAvoidingView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 36,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 20,
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
    width: 196,
    height: 62,
  },
  brandSubtitle: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 30,
    backgroundColor: 'rgba(14, 12, 16, 0.82)',
    paddingHorizontal: 20,
    paddingVertical: 22,
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
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 33,
    marginTop: 4,
    marginBottom: 16,
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
    color: premiumColors.text,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '700',
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
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    paddingHorizontal: 14,
  },
  countryCodeText: {
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  phoneInput: {
    minHeight: 54,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 14,
  },
  genderGrid: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  genderOption: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  genderOptionSelected: {
    borderColor: 'rgba(225, 29, 46, 0.6)',
    backgroundColor: 'rgba(177, 18, 38, 0.32)',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  genderOptionText: {
    color: premiumColors.textMuted,
    fontSize: 13,
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
    color: premiumColors.textMuted,
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
  primaryButtonWrap: {
    borderRadius: 20,
    marginTop: 4,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 8,
  },
  primaryButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 120, 130, 0.5)',
    borderRadius: 20,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  backButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
