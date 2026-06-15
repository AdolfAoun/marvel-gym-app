import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumShadow } from '@/constants/premiumTheme';
import { authService, avatarService, memberService } from '@/services';
import type { Member } from '@/types';

const accentColor = premiumColors.red;

type ProfileForm = {
  email: string;
  location: string;
  dateOfBirth: string;
};

function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return [day, month, year].filter(Boolean).join('/');
}

function toDisplayDate(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  return `${day}/${month}/${date.getFullYear()}`;
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

  return `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function createProfileForm(member: Member): ProfileForm {
  return {
    email: member.email,
    location: member.location ?? '',
    dateOfBirth: toDisplayDate(member.dateOfBirth),
  };
}

export default function ProfileScreen() {
  const router = useRouter();
  const [member, setMember] = useState<Member>();
  const [initialForm, setInitialForm] = useState<ProfileForm>();
  const [form, setForm] = useState<ProfileForm>();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPhotoSheetVisible, setIsPhotoSheetVisible] = useState(false);
  const [isSignOutVisible, setIsSignOutVisible] = useState(false);
  const [initialProfileImageUri, setInitialProfileImageUri] = useState('');
  const [draftProfileImageUri, setDraftProfileImageUri] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const loadMember = async () => {
      const currentMember = await memberService.getCurrentMember();
      const nextForm = createProfileForm(currentMember);

      setMember(currentMember);
      setInitialForm(nextForm);
      setForm(nextForm);
      setInitialProfileImageUri(currentMember.profileImageUri ?? '');
      setDraftProfileImageUri(currentMember.profileImageUri ?? '');
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
      form.dateOfBirth.trim() !== initialForm.dateOfBirth.trim()
    );
  }, [form, initialForm]);
  const hasPhotoChange = draftProfileImageUri !== initialProfileImageUri;

  const updateForm = (updates: Partial<ProfileForm>) => {
    setForm((current) => (current ? { ...current, ...updates } : current));
    setFormError('');
  };

  const handleEditOrCancel = () => {
    if (isEditing || hasPhotoChange) {
      setForm(initialForm);
      setDraftProfileImageUri(initialProfileImageUri);
      setFormError('');
      setIsEditing(false);
      return;
    }

    setIsEditing(true);
  };

  const handleDone = async () => {
    if (!form || (!hasChanges && !hasPhotoChange)) {
      return;
    }

    const cleanEmail = form.email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const parsedDateOfBirth = parseDateOfBirth(form.dateOfBirth);

    if (isEditing && cleanEmail && !emailPattern.test(cleanEmail)) {
      setFormError('Enter a valid email address.');
      return;
    }

    if (isEditing && form.dateOfBirth.trim() && !parsedDateOfBirth) {
      setFormError('Enter date of birth as DD/MM/YYYY.');
      return;
    }

    setIsSaving(true);

    try {
      const updatedMember = await memberService.updateProfile({
        ...(isEditing
          ? {
              email: cleanEmail,
              location: form.location.trim(),
              dateOfBirth: parsedDateOfBirth,
            }
          : {}),
        ...(hasPhotoChange ? { profileImageUri: draftProfileImageUri } : {}),
      });
      const nextForm = createProfileForm(updatedMember);

      setMember(updatedMember);
      setInitialForm(nextForm);
      setForm(nextForm);
      setInitialProfileImageUri(updatedMember.profileImageUri ?? '');
      setDraftProfileImageUri(updatedMember.profileImageUri ?? '');
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChooseProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setIsPhotoSheetVisible(false);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });

    if (!result.canceled) {
      setDraftProfileImageUri(result.assets[0].uri);
    }

    setIsPhotoSheetVisible(false);
  };

  const handleTakeProfilePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setIsPhotoSheetVisible(false);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });

    if (!result.canceled) {
      setDraftProfileImageUri(result.assets[0].uri);
    }

    setIsPhotoSheetVisible(false);
  };

  const handleSignOut = async () => {
    await authService.logoutMember();
    setIsSignOutVisible(false);
    router.replace('/welcome');
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

  const doneDisabled = (!hasChanges && !hasPhotoChange) || isSaving;
  const avatar = avatarService.getMemberAvatarDisplay({
    ...member,
    profileImageUri: draftProfileImageUri,
  });

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.profileTop}>
          <Pressable
            onPress={() => setIsPhotoSheetVisible(true)}
            style={({ pressed }) => [styles.avatar, pressed && styles.buttonPressed]}>
            {avatar.imageUri ? (
              <Image
                source={{ uri: avatar.imageUri }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>{avatar.fallbackLabel}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => setIsPhotoSheetVisible(true)}
            style={({ pressed }) => [
              styles.photoButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.photoButtonText}>
              {draftProfileImageUri ? 'Change' : 'Add'}
            </Text>
          </Pressable>
          <Text style={styles.nameText}>
            {member.firstName} {member.lastName}
          </Text>
          <Text style={styles.phoneText}>{member.phone || 'Member profile'}</Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={handleEditOrCancel}
            style={({ pressed }) => [
              styles.secondaryButton,
              (isEditing || hasPhotoChange) && styles.cancelButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.secondaryButtonText}>
              {isEditing || hasPhotoChange ? 'Cancel' : 'Edit Profile'}
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
                <Text style={styles.disabledValue}>{member.lastName || '-'}</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone number</Text>
              <View style={styles.disabledField}>
                <Text style={styles.disabledValue}>{member.phone || '-'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of birth</Text>
            <TextInput
              value={form.dateOfBirth}
              onChangeText={(dateOfBirth) =>
                updateForm({ dateOfBirth: formatDateInput(dateOfBirth) })
              }
              editable={isEditing}
              keyboardType="number-pad"
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#667282"
              selectionColor={accentColor}
              style={[styles.input, !isEditing && styles.inputReadOnly]}
            />
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

          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
        </View>

        <Pressable
          onPress={() => setIsSignOutVisible(true)}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.buttonPressed,
          ]}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <Modal transparent visible={isPhotoSheetVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsPhotoSheetVisible(false)}
          />
          <View style={styles.photoSheet}>
            <Text style={styles.sheetKicker}>Profile picture</Text>
            <Text style={styles.sheetTitle}>Update photo</Text>
            <View style={styles.photoPreviewWrap}>
              <View style={styles.photoPreview}>
                {draftProfileImageUri ? (
                  <Image
                    source={{ uri: draftProfileImageUri }}
                    style={styles.photoPreviewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.photoPreviewText}>
                    {avatar.fallbackLabel}
                  </Text>
                )}
              </View>
              <Text style={styles.photoPreviewHint}>
                Preview matches the circular profile avatar.
              </Text>
            </View>
            <View style={styles.photoChoiceStack}>
              <Pressable
                onPress={handleChooseProfilePhoto}
                style={({ pressed }) => [
                  styles.photoChoiceButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.photoChoiceText}>Choose from Gallery</Text>
              </Pressable>
              <Pressable
                onPress={handleTakeProfilePhoto}
                style={({ pressed }) => [
                  styles.photoChoiceButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.photoChoiceText}>Take Photo</Text>
              </Pressable>
              <Pressable
                disabled={!draftProfileImageUri}
                onPress={() => {
                  setDraftProfileImageUri('');
                  setIsPhotoSheetVisible(false);
                }}
                style={({ pressed }) => [
                  styles.removePhotoButton,
                  !draftProfileImageUri && styles.removePhotoButtonDisabled,
                  pressed && draftProfileImageUri && styles.buttonPressed,
                ]}>
                <Text
                  style={[
                    styles.removePhotoText,
                    !draftProfileImageUri && styles.removePhotoTextDisabled,
                  ]}>
                  Remove Profile Picture
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setIsPhotoSheetVisible(false)}
                style={({ pressed }) => [
                  styles.photoCancelButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.photoCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={isSignOutVisible} animationType="fade">
        <View style={styles.centerModalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsSignOutVisible(false)}
          />
          <View style={styles.confirmCard}>
            <Text style={styles.sheetKicker}>Profile</Text>
            <Text style={styles.sheetTitle}>Sign out?</Text>
            <Text style={styles.sheetBody}>
              You will return to the Entry Page.
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                onPress={() => setIsSignOutVisible(false)}
                style={({ pressed }) => [
                  styles.confirmSecondary,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.confirmSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.confirmPrimary,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.confirmPrimaryText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 22,
    paddingTop: 72,
    paddingBottom: 92,
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
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 26,
    backgroundColor: 'rgba(18, 20, 28, 0.72)',
    marginBottom: 10,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    ...premiumShadow,
  },
  avatar: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 54,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: accentColor,
    fontSize: 34,
    fontWeight: '900',
  },
  photoButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
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
    marginTop: 14,
  },
  phoneText: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 5,
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
  label: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
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
  errorText: {
    color: '#F2B8BF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  actionRow: {
    width: '100%',
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
  signOutButton: {
    minHeight: 50,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.2)',
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 46,
  },
  signOutText: {
    color: premiumColors.redBright,
    fontSize: 14,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  centerModalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  photoSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: premiumColors.border,
    backgroundColor: premiumColors.surface,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 30,
    ...premiumShadow,
  },
  photoPreviewWrap: {
    alignItems: 'center',
    marginTop: 18,
  },
  photoPreview: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 48,
    backgroundColor: premiumColors.surfaceSoft,
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  photoPreviewText: {
    color: accentColor,
    fontSize: 28,
    fontWeight: '900',
  },
  photoPreviewHint: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 9,
    textAlign: 'center',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 28,
    backgroundColor: premiumColors.surface,
    padding: 22,
    ...premiumShadow,
  },
  sheetKicker: {
    color: premiumColors.redBright,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sheetTitle: {
    color: premiumColors.text,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
  },
  sheetBody: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
  },
  photoChoiceStack: {
    gap: 10,
    marginTop: 18,
  },
  photoChoiceButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.22)',
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
  },
  photoChoiceText: {
    color: premiumColors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  removePhotoButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.2)',
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
  },
  removePhotoButtonDisabled: {
    borderColor: 'rgba(148, 163, 184, 0.16)',
    opacity: 0.54,
  },
  removePhotoText: {
    color: premiumColors.redBright,
    fontSize: 14,
    fontWeight: '900',
  },
  removePhotoTextDisabled: {
    color: premiumColors.textFaint,
  },
  photoCancelButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: accentColor,
  },
  photoCancelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  confirmSecondary: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.24)',
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
  },
  confirmSecondaryText: {
    color: premiumColors.redBright,
    fontSize: 13,
    fontWeight: '900',
  },
  confirmPrimary: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: accentColor,
  },
  confirmPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.78,
  },
});
