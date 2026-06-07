import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumShadow } from '@/constants/premiumTheme';
import { memberService } from '@/services';
import type { Member, PaymentMethod } from '@/types';

const accentColor = premiumColors.red;
const paymentMethods = ['Visa', 'Mastercard', 'Whish Money'] as const;

type ProfilePaymentMethod = Extract<
  PaymentMethod,
  'Visa' | 'Mastercard' | 'Whish Money'
>;

type ProfileForm = {
  email: string;
  location: string;
  preferredPaymentMethod: ProfilePaymentMethod;
};

function getProfilePaymentMethod(
  method?: PaymentMethod,
): ProfilePaymentMethod {
  if (
    method === 'Visa' ||
    method === 'Mastercard' ||
    method === 'Whish Money'
  ) {
    return method;
  }

  return 'Visa';
}

function createProfileForm(member: Member): ProfileForm {
  return {
    email: member.email,
    location: member.location ?? '',
    preferredPaymentMethod: getProfilePaymentMethod(member.preferredPaymentMethod),
  };
}

function formatProfileDate(value?: string) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export default function ProfileScreen() {
  const [member, setMember] = useState<Member>();
  const [initialForm, setInitialForm] = useState<ProfileForm>();
  const [form, setForm] = useState<ProfileForm>();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [photoTone, setPhotoTone] = useState(0);

  useEffect(() => {
    const loadMember = async () => {
      const currentMember = await memberService.getCurrentMember();
      const nextForm = createProfileForm(currentMember);

      setMember(currentMember);
      setInitialForm(nextForm);
      setForm(nextForm);
    };

    loadMember();
  }, []);

  const hasChanges = useMemo(() => {
    if (!form || !initialForm) {
      return false;
    }

    return (
      form.email.trim() !== initialForm.email.trim() ||
      form.location.trim() !== initialForm.location.trim() ||
      form.preferredPaymentMethod !== initialForm.preferredPaymentMethod
    );
  }, [form, initialForm]);

  const updateForm = (updates: Partial<ProfileForm>) => {
    setForm((current) => (current ? { ...current, ...updates } : current));
  };

  const handleEditOrCancel = () => {
    if (isEditing) {
      setForm(initialForm);
      setIsEditing(false);
      return;
    }

    setIsEditing(true);
  };

  const handleDone = async () => {
    if (!form || !hasChanges || !isEditing) {
      return;
    }

    setIsSaving(true);

    try {
      const updatedMember = await memberService.updateProfile({
        email: form.email.trim(),
        location: form.location.trim(),
        preferredPaymentMethod: form.preferredPaymentMethod,
      });
      const nextForm = createProfileForm(updatedMember);

      setMember(updatedMember);
      setInitialForm(nextForm);
      setForm(nextForm);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePhoto = () => {
    setPhotoTone((value) => (value + 1) % 3);
  };

  if (!member || !form) {
    return (
      <PremiumScreenBackground>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </PremiumScreenBackground>
    );
  }

  const doneDisabled = !isEditing || !hasChanges || isSaving;

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.profileTop}>
          <Pressable
            onPress={handleChangePhoto}
            style={({ pressed }) => [
              styles.avatar,
              photoTone === 1 && styles.avatarAltOne,
              photoTone === 2 && styles.avatarAltTwo,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.avatarText}>
              {member.firstName.slice(0, 1)}
              {member.lastName.slice(0, 1)}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleChangePhoto}
            style={({ pressed }) => [
              styles.photoButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.photoButtonText}>Change Profile Picture</Text>
          </Pressable>
          <Text style={styles.nameText}>
            {member.firstName} {member.lastName}
          </Text>
          <Text style={styles.phoneText}>{member.phone}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.detailsGrid}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>First name</Text>
              <View style={styles.disabledField}>
                <Text style={styles.disabledValue}>{member.firstName}</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Family name</Text>
              <View style={styles.disabledField}>
                <Text style={styles.disabledValue}>{member.lastName}</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone number</Text>
              <View style={styles.disabledField}>
                <Text style={styles.disabledValue}>{member.phone}</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Date of birth</Text>
              <View style={styles.disabledField}>
                <Text style={styles.disabledValue}>
                  {formatProfileDate(member.dateOfBirth)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={form.email}
              onChangeText={(email) => updateForm({ email })}
              editable={isEditing}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="member@marvelgym.com"
              placeholderTextColor="#667282"
              selectionColor={accentColor}
              style={[styles.input, !isEditing && styles.inputReadOnly]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Place of living</Text>
            <TextInput
              value={form.location}
              onChangeText={(location) => updateForm({ location })}
              editable={isEditing}
              placeholder="City, country"
              placeholderTextColor="#667282"
              selectionColor={accentColor}
              style={[styles.input, !isEditing && styles.inputReadOnly]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payment method</Text>
            <View style={styles.paymentGrid}>
              {paymentMethods.map((method) => {
                const isSelected = form.preferredPaymentMethod === method;

                return (
                  <Pressable
                    key={method}
                    disabled={!isEditing}
                    onPress={() =>
                      updateForm({
                        preferredPaymentMethod: method,
                      })
                    }
                    style={({ pressed }) => [
                      styles.paymentOption,
                      isSelected && styles.paymentOptionSelected,
                      !isEditing && styles.paymentOptionReadOnly,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text
                      style={[
                        styles.paymentOptionText,
                        isSelected && styles.paymentOptionTextSelected,
                      ]}>
                      {method}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={handleEditOrCancel}
            style={({ pressed }) => [
              styles.secondaryButton,
              isEditing && styles.cancelButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.secondaryButtonText}>
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Text>
          </Pressable>

          <Pressable
            disabled={doneDisabled}
            onPress={handleDone}
            style={({ pressed }) => [
              styles.doneButton,
              doneDisabled && styles.doneButtonDisabled,
              pressed && !doneDisabled && styles.buttonPressed,
            ]}>
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.doneButtonText,
                  doneDisabled && styles.doneButtonTextDisabled,
                ]}>
                Done
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: premiumColors.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 42,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  profileTop: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: premiumColors.borderStrong,
    borderRadius: 54,
    backgroundColor: premiumColors.surface,
    ...premiumShadow,
  },
  avatarAltOne: {
    backgroundColor: premiumColors.surfaceAlt,
  },
  avatarAltTwo: {
    backgroundColor: premiumColors.surfaceSoft,
  },
  avatarText: {
    color: accentColor,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  photoButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.16)',
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    marginTop: 12,
    paddingHorizontal: 14,
  },
  photoButtonText: {
    color: accentColor,
    fontSize: 12,
    fontWeight: '900',
  },
  nameText: {
    color: premiumColors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 14,
  },
  phoneText: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
    marginBottom: 14,
  },
  secondaryButton: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.28)',
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
  },
  cancelButton: {
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  secondaryButtonText: {
    color: accentColor,
    fontSize: 14,
    fontWeight: '900',
  },
  doneButton: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: accentColor,
  },
  doneButtonDisabled: {
    backgroundColor: premiumColors.surfaceSoft,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  doneButtonTextDisabled: {
    color: premiumColors.textFaint,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 24,
    backgroundColor: premiumColors.surface,
    padding: 18,
    marginBottom: 14,
    ...premiumShadow,
  },
  sectionTitle: {
    color: premiumColors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 14,
  },
  detailsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  disabledField: {
    minHeight: 54,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(102, 112, 133, 0.14)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
    paddingHorizontal: 14,
  },
  label: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  disabledValue: {
    color: premiumColors.textMuted,
    fontSize: 15,
    fontWeight: '900',
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.28)',
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 14,
  },
  inputReadOnly: {
    borderColor: 'rgba(177, 18, 38, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    color: premiumColors.textMuted,
  },
  paymentGrid: {
    gap: 10,
  },
  paymentOption: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
  },
  paymentOptionSelected: {
    borderColor: 'rgba(177, 18, 38, 0.48)',
    backgroundColor: 'rgba(177, 18, 38, 0.18)',
  },
  paymentOptionReadOnly: {
    opacity: 0.72,
  },
  paymentOptionText: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '900',
  },
  paymentOptionTextSelected: {
    color: accentColor,
  },
  buttonPressed: {
    opacity: 0.78,
  },
});
