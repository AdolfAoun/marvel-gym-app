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
  'Prefer not to say',
];

type FormErrors = Partial<
  Record<
    | 'firstName'
    | 'lastName'
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

function isStrongPassword(value: string) {
  return (
    value.length >= 5 &&
    /[A-Za-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export default function CreateAccountScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<RegisterMemberInput['gender']>();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = () => {
    const nextErrors: FormErrors = {};
    const cleanFirstName = normalizeName(firstName);
    const cleanLastName = normalizeName(lastName);
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanDateOfBirth = parseDateOfBirth(dateOfBirth);

    if (!cleanFirstName || !isValidName(cleanFirstName)) {
      nextErrors.firstName = 'Enter a valid first name using letters only.';
    }

    if (!cleanLastName || !isValidName(cleanLastName)) {
      nextErrors.lastName = 'Enter a valid family name using letters only.';
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

    if (!isStrongPassword(password.trim())) {
      nextErrors.password =
        'Use at least 5 characters with a letter, number, and special sign.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !gender || !cleanDateOfBirth) {
      return undefined;
    }

    return {
      firstName: cleanFirstName,
      lastName: cleanLastName,
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

    try {
      await authService.registerMember(payload);
      router.replace({
        pathname: '/login',
        params: { created: '1' },
      });
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
            resizeMode="contain"
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
                <Text style={styles.brandSubtitle}>Create member access</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.kicker}>Secure registration</Text>
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
                  onChangeText={(value) =>
                    setDateOfBirth(value.replace(/[^\d/]/g, '').slice(0, 10))
                  }
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
    height: 470,
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: -96,
    left: -300,
    right: 12,
    height: 690,
    opacity: 0.28,
  },
  backgroundVeil: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.56)',
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
    top: -84,
    right: -84,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#5A0711',
    opacity: 0.32,
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
    width: 72,
    height: 58,
  },
  brandCopy: {
    flex: 1,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 20,
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
    gap: 9,
  },
  genderOption: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.075)',
  },
  genderOptionSelected: {
    borderColor: 'rgba(225, 29, 46, 0.58)',
    backgroundColor: 'rgba(177, 18, 38, 0.32)',
  },
  genderOptionText: {
    color: '#D8DEE8',
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
