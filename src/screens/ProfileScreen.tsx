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
import { SafeAreaView } from 'react-native-safe-area-context';

import { memberService } from '@/services';
import type { Member, PaymentMethod } from '@/types';

const accentColor = '#E11D2E';
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

export default function ProfileScreen() {
  const [member, setMember] = useState<Member>();
  const [initialForm, setInitialForm] = useState<ProfileForm>();
  const [form, setForm] = useState<ProfileForm>();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  if (!member || !form) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const doneDisabled = !isEditing || !hasChanges || isSaving;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {member.firstName.slice(0, 1)}
              {member.lastName.slice(0, 1)}
            </Text>
          </View>
          <Text style={styles.nameText}>
            {member.firstName} {member.lastName}
          </Text>
          <Text style={styles.phoneText}>{member.phone}</Text>
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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Locked member details</Text>
          <View style={styles.lockedGrid}>
            <View style={styles.lockedField}>
              <Text style={styles.label}>First name</Text>
              <Text style={styles.lockedValue}>{member.firstName}</Text>
            </View>
            <View style={styles.lockedField}>
              <Text style={styles.label}>Family name</Text>
              <Text style={styles.lockedValue}>{member.lastName}</Text>
            </View>
            <View style={styles.lockedField}>
              <Text style={styles.label}>Phone number</Text>
              <Text style={styles.lockedValue}>{member.phone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Editable profile</Text>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 108,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#D7DEE8',
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
    borderColor: 'rgba(225, 29, 46, 0.62)',
    borderRadius: 54,
    backgroundColor: '#121214',
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 6,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 14,
  },
  phoneText: {
    color: '#A8B2C0',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  secondaryButton: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.5)',
    borderRadius: 16,
    backgroundColor: '#17171A',
  },
  cancelButton: {
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
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
    backgroundColor: '#30343B',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  doneButtonTextDisabled: {
    color: '#87919F',
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 24,
    backgroundColor: '#121214',
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 14,
  },
  lockedGrid: {
    gap: 10,
  },
  lockedField: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    backgroundColor: '#080809',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: {
    color: '#A8B2C0',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  lockedValue: {
    color: '#D7DEE8',
    fontSize: 15,
    fontWeight: '900',
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.48)',
    borderRadius: 16,
    backgroundColor: '#080809',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 14,
  },
  inputReadOnly: {
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: '#A8B2C0',
  },
  paymentGrid: {
    gap: 10,
  },
  paymentOption: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 16,
    backgroundColor: '#080809',
  },
  paymentOptionSelected: {
    borderColor: 'rgba(225, 29, 46, 0.65)',
    backgroundColor: 'rgba(225, 29, 46, 0.16)',
  },
  paymentOptionReadOnly: {
    opacity: 0.72,
  },
  paymentOptionText: {
    color: '#A8B2C0',
    fontSize: 14,
    fontWeight: '900',
  },
  paymentOptionTextSelected: {
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.78,
  },
});
