import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  Alert,
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
import { useAppTheme } from '@/theme/useAppTheme';
import {
  authService,
  avatarService,
  memberService,
  studentVerificationService,
} from '@/services';
import type { Member, StudentVerificationRequest } from '@/types';

const accentColor = premiumColors.red;
const profileRingColor = '#7C5CE6';

type ProfileForm = {
  firstName: string;
  email: string;
  location: string;
  dateOfBirth: string;
};

type EditableField = keyof ProfileForm;

// Masks a DD/MM/YYYY date. Slashes are inserted proactively the moment a
// section fills (so the user types digits only and never the "/"), but not
// while deleting — otherwise backspacing a slash would immediately re-add it.
function formatDateInput(next: string, prev: string) {
  const deleting = next.length < prev.length;
  const digits = next.replace(/\D/g, '').slice(0, 8);

  let out = digits.slice(0, 2);
  if (digits.length > 2 || (digits.length === 2 && !deleting)) out += '/';
  out += digits.slice(2, 4);
  if (digits.length > 4 || (digits.length === 4 && !deleting)) out += '/';
  out += digits.slice(4, 8);

  return out;
}

// Returns a short error message for the given field, or '' if valid.
function getFieldError(field: EditableField, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (field === 'firstName') {
    return /\d/.test(trimmed) ? 'Name can’t contain numbers.' : '';
  }

  if (field === 'location') {
    return /\d/.test(trimmed) ? 'Place can’t contain numbers.' : '';
  }

  if (field === 'email') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(trimmed.toLowerCase()) ? '' : 'Enter a valid email.';
  }

  if (field === 'dateOfBirth') {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (!match) return 'Use DD/MM/YYYY.';

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return 'Enter a real date.';
    }

    const today = new Date();
    if (date.getTime() > today.getTime()) return 'Date can’t be in the future.';

    let age = today.getFullYear() - year;
    const hadBirthday =
      today.getMonth() > month - 1 ||
      (today.getMonth() === month - 1 && today.getDate() >= day);
    if (!hadBirthday) age -= 1;

    if (age > 100) return 'Age can’t exceed 100 years.';
    if (age < 3) return 'Must be at least 3 years old.';
  }

  return '';
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
    firstName: member.firstName,
    email: member.email,
    location: member.location ?? '',
    dateOfBirth: toDisplayDate(member.dateOfBirth),
  };
}

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const isLight = theme.scheme === 'light';
  const mutedTextStyle = isLight ? { color: theme.colors.textMuted } : undefined;
  const [member, setMember] = useState<Member>();
  const [initialForm, setInitialForm] = useState<ProfileForm>();
  const [form, setForm] = useState<ProfileForm>();
  const [userEditedFields, setUserEditedFields] = useState<Set<EditableField>>(new Set());
  const [editingField, setEditingField] = useState<EditableField>();
  const [isSaving, setIsSaving] = useState(false);
  const [isSignOutVisible, setIsSignOutVisible] = useState(false);
  const [initialProfileImageUri, setInitialProfileImageUri] = useState('');
  const [draftProfileImageUri, setDraftProfileImageUri] = useState('');
  const [studentVerification, setStudentVerification] =
    useState<StudentVerificationRequest>();
  const [studentVerificationMessage, setStudentVerificationMessage] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const loadMember = async () => {
      const currentMember = await memberService.getCurrentMember();
      const [nextVerification] = await Promise.all([
        studentVerificationService.getMemberStudentVerification(currentMember.id),
      ]);
      const nextForm = createProfileForm(currentMember);

      setMember(currentMember);
      setInitialForm(nextForm);
      setForm(nextForm);
      setUserEditedFields(new Set());
      setInitialProfileImageUri(currentMember.profileImageUri ?? '');
      setDraftProfileImageUri(currentMember.profileImageUri ?? '');
      setStudentVerification(nextVerification);
    };

    loadMember();
  }, []);

  const hasPhotoChange = draftProfileImageUri !== initialProfileImageUri;

  const updateForm = (updates: Partial<ProfileForm>) => {
    setForm((current) => (current ? { ...current, ...updates } : current));
    setFormError('');
  };

  const handleEditField = (field: EditableField) => {
    void Haptics.selectionAsync().catch(() => undefined);
    setEditingField(field);
    setFormError('');
  };

  const handleCancelField = (field: EditableField) => {
    void Haptics.selectionAsync().catch(() => undefined);
    if (initialForm) {
      setForm((current) =>
        current ? { ...current, [field]: initialForm[field] } : current,
      );
    }
    setFormError('');
    setEditingField(undefined);
  };

  const applyProfilePhoto = async (profileImageUri: string) => {
    setDraftProfileImageUri(profileImageUri);
    setIsSaving(true);

    try {
      const updatedMember = await memberService.updateProfile({ profileImageUri });

      setMember(updatedMember);
      setInitialProfileImageUri(updatedMember.profileImageUri ?? '');
      setDraftProfileImageUri(updatedMember.profileImageUri ?? '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDone = async () => {
    if (!form || (!editingField && !hasPhotoChange)) {
      return;
    }

    const cleanEmail = form.email.trim().toLowerCase();
    const parsedDateOfBirth = parseDateOfBirth(form.dateOfBirth);

    if (editingField) {
      const fieldError = getFieldError(editingField, form[editingField]);
      if (fieldError) {
        setFormError(fieldError);
        return;
      }
    }

    setIsSaving(true);

    try {
      const updatedMember = await memberService.updateProfile({
        ...(editingField === 'firstName' ? { firstName: form.firstName.trim() } : {}),
        ...(editingField === 'email' ? { email: cleanEmail } : {}),
        ...(editingField === 'location' ? { location: form.location.trim() } : {}),
        ...(editingField === 'dateOfBirth' ? { dateOfBirth: parsedDateOfBirth } : {}),
        ...(hasPhotoChange ? { profileImageUri: draftProfileImageUri } : {}),
      });
      const nextForm = createProfileForm(updatedMember);

      setMember(updatedMember);
      setInitialForm(nextForm);
      setForm(nextForm);
      if (editingField) {
        setUserEditedFields((current) => new Set(current).add(editingField));
      }
      setInitialProfileImageUri(updatedMember.profileImageUri ?? '');
      setDraftProfileImageUri(updatedMember.profileImageUri ?? '');
      setEditingField(undefined);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChooseProfilePhoto = async () => {
    void Haptics.selectionAsync().catch(() => undefined);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });

    if (!result.canceled) {
      await applyProfilePhoto(result.assets[0].uri);
    }

  };

  const handleTakeProfilePhoto = async () => {
    void Haptics.selectionAsync().catch(() => undefined);
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });

    if (!result.canceled) {
      await applyProfilePhoto(result.assets[0].uri);
    }

  };

  const submitStudentIdProof = async (
    asset: ImagePicker.ImagePickerAsset,
    proofLabel: string,
  ) => {
    const request =
      await studentVerificationService.submitCurrentMemberStudentVerification({
        proofLabel: asset.fileName ?? proofLabel,
        proofUri: asset.uri,
      });

    setStudentVerification(request);
    setStudentVerificationMessage('Student ID submitted for admin verification.');
  };

  const handleUploadStudentId = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted || !member) {
      setStudentVerificationMessage('Gallery permission is required to upload student ID proof.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });

    if (result.canceled) {
      return;
    }

    await submitStudentIdProof(result.assets[0], 'Student ID proof');
  };

  const handleTakeStudentIdPicture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted || !member) {
      setStudentVerificationMessage('Camera permission is required to take a student ID picture.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });

    if (result.canceled) {
      return;
    }

    await submitStudentIdProof(result.assets[0], 'Student ID picture');
  };

  const handleStudentUploadPress = () => {
    Alert.alert('Upload Student ID', 'Choose how to upload student ID.', [
      {
        text: 'Take Picture',
        onPress: handleTakeStudentIdPicture,
      },
      {
        text: 'Choose from Gallery',
        onPress: handleUploadStudentId,
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const handleAddPhotoPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    Alert.alert('Profile Picture', 'Choose how to add a photo.', [
      { text: 'Take Photo', onPress: handleTakeProfilePhoto },
      { text: 'Choose from Gallery', onPress: handleChooseProfilePhoto },
      ...(draftProfileImageUri
        ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: () => { void applyProfilePhoto(''); } }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleSignOut = async () => {
    await authService.logoutMember();
    setIsSignOutVisible(false);
    router.replace('/welcome');
  };

  if (!member || !form) {
    return (
      <PremiumScreenBackground redHorizonHeight={400}>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </PremiumScreenBackground>
    );
  }

  const editingFieldHasChanges =
    !!editingField &&
    !!form &&
    !!initialForm &&
    form[editingField].trim() !== initialForm[editingField].trim();
  const doneDisabled = (!editingFieldHasChanges && !hasPhotoChange) || isSaving;
  const avatar = avatarService.getMemberAvatarDisplay({
    ...member,
    profileImageUri: draftProfileImageUri,
  });
  const studentStatus = studentVerification?.status ?? 'Not Submitted';
  const getEditableFieldTextStyle = (field: EditableField) => {
    if (!isLight) return undefined;
    if (editingField === field) return styles.inputEditingLight;
    if (userEditedFields.has(field)) return styles.inputSavedLight;
    return styles.inputPreviewLight;
  };

  const renderFieldActions = (field: EditableField) => {
    const isFieldEditing = editingField === field;

    if (isFieldEditing) {
      return (
        <View style={styles.fieldActionRow}>
          <Pressable
            accessibilityLabel={`Cancel ${field} change`}
            onPress={() => handleCancelField(field)}
            style={({ pressed }) => [
              styles.fieldActionButton,
              styles.fieldCancelButton,
              isLight && styles.fieldActionButtonLight,
              pressed && styles.buttonPressed,
            ]}>
            <SymbolView name="xmark.circle.fill" size={18} tintColor="#C4C9D1" weight="regular" />
          </Pressable>
          <Pressable
            accessibilityLabel={`Save ${field} change`}
            disabled={doneDisabled}
            onPress={handleDone}
            style={({ pressed }) => [
              styles.fieldActionButton,
              isLight && styles.fieldActionButtonLight,
              isLight && styles.fieldConfirmButtonLight,
              doneDisabled && styles.fieldActionButtonDisabled,
              pressed && !doneDisabled && styles.buttonPressed,
            ]}>
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <SymbolView
                name="checkmark"
                size={16}
                tintColor={
                  doneDisabled
                    ? isLight
                      ? '#9CA3AF'
                      : premiumColors.textFaint
                    : isLight
                      ? '#111827'
                      : '#FFFFFF'
                }
                weight="bold"
              />
            )}
          </Pressable>
        </View>
      );
    }

    return (
      <Pressable
        accessibilityLabel={`Edit ${field}`}
        onPress={() => handleEditField(field)}
        style={({ pressed }) => [
          styles.fieldActionButton,
          styles.fieldEditButton,
          isLight && styles.fieldActionButtonLight,
          isLight && styles.fieldEditButtonLight,
          pressed && styles.buttonPressed,
        ]}>
        <SymbolView name="pencil" size={15} tintColor="#E6E8ED" weight="regular" />
      </Pressable>
    );
  };

  return (
    <PremiumScreenBackground redHorizonHeight={400}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.profileTop}>
          <Pressable
            onPress={handleAddPhotoPress}
            style={({ pressed }) => [styles.avatarRing, pressed && styles.buttonPressed]}>
            <View style={styles.avatar}>
              {avatar.imageUri ? (
                <Image
                  source={{ uri: avatar.imageUri }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{avatar.fallbackLabel}</Text>
              )}
            </View>
          </Pressable>
          <Pressable
            onPress={handleAddPhotoPress}
            style={({ pressed }) => [
              styles.photoButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={[styles.photoButtonText, mutedTextStyle]}>
              {draftProfileImageUri ? 'Change' : 'Add'}
            </Text>
          </Pressable>
          <Text style={[styles.nameText, mutedTextStyle]}>
            {member.firstName} {member.lastName}
          </Text>
          <Text style={[styles.phoneText, mutedTextStyle]}>{member.phone || 'Member profile'}</Text>
        </View>

        <View style={[styles.card, isLight && styles.cardLight]}>
          <Text style={[styles.sectionTitle, isLight && styles.textStrongLight]}>Details</Text>

          <View style={styles.detailsGrid}>
            <View style={styles.fieldGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={[styles.label, styles.inputLabel, isLight && styles.textStrongLight]}>First name</Text>
                {renderFieldActions('firstName')}
              </View>
              <TextInput
                value={form.firstName}
                onChangeText={(firstName) => updateForm({ firstName })}
                editable={editingField === 'firstName'}
                placeholder="First name"
                placeholderTextColor="#667282"
                selectionColor={accentColor}
                style={[
                  styles.input,
                  editingField !== 'firstName' && styles.inputReadOnly,
                  isLight && editingField !== 'firstName' && styles.inputReadOnlyLight,
                  getEditableFieldTextStyle('firstName'),
                ]}
              />
              {editingField === 'firstName' && formError ? (
                <Text style={styles.errorText}>{formError}</Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, isLight && styles.textStrongLight]}>Family name</Text>
              <View style={styles.disabledField}>
                <Text style={[styles.disabledValue, isLight && styles.textStrongLight]}>{member.lastName || '-'}</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, isLight && styles.textStrongLight]}>Phone number</Text>
              <View style={styles.disabledField}>
                <Text style={[styles.disabledValue, isLight && styles.textStrongLight]}>{member.phone || '-'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Text style={[styles.label, styles.inputLabel, isLight && styles.textStrongLight]}>Date of birth</Text>
              {renderFieldActions('dateOfBirth')}
            </View>
            <TextInput
              value={form.dateOfBirth}
              onChangeText={(dateOfBirth) =>
                updateForm({
                  dateOfBirth: formatDateInput(dateOfBirth, form.dateOfBirth),
                })
              }
              editable={editingField === 'dateOfBirth'}
              keyboardType="number-pad"
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#667282"
              selectionColor={accentColor}
              style={[
                styles.input,
                editingField !== 'dateOfBirth' && styles.inputReadOnly,
                isLight && editingField !== 'dateOfBirth' && styles.inputReadOnlyLight,
                getEditableFieldTextStyle('dateOfBirth'),
              ]}
            />
            {editingField === 'dateOfBirth' && formError ? (
              <Text style={styles.errorText}>{formError}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Text style={[styles.label, styles.inputLabel, isLight && styles.textStrongLight]}>Email</Text>
              {renderFieldActions('email')}
            </View>
            <TextInput
              value={form.email}
              onChangeText={(email) => updateForm({ email })}
              editable={editingField === 'email'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="member@marvelgym.com"
              placeholderTextColor="#667282"
              selectionColor={accentColor}
              style={[
                styles.input,
                editingField !== 'email' && styles.inputReadOnly,
                isLight && editingField !== 'email' && styles.inputReadOnlyLight,
                getEditableFieldTextStyle('email'),
              ]}
            />
            {editingField === 'email' && formError ? (
              <Text style={styles.errorText}>{formError}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Text style={[styles.label, styles.inputLabel, isLight && styles.textStrongLight]}>Place of living</Text>
              {renderFieldActions('location')}
            </View>
            <TextInput
              value={form.location}
              onChangeText={(location) => updateForm({ location })}
              editable={editingField === 'location'}
              placeholder="City, country"
              placeholderTextColor="#667282"
              selectionColor={accentColor}
              style={[
                styles.input,
                editingField !== 'location' && styles.inputReadOnly,
                isLight && editingField !== 'location' && styles.inputReadOnlyLight,
                getEditableFieldTextStyle('location'),
              ]}
            />
            {editingField === 'location' && formError ? (
              <Text style={styles.errorText}>{formError}</Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.card, isLight && styles.cardLight]}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInRow, isLight && styles.textStrongLight]}>
              Student Verification
            </Text>
            <View
              style={[
                styles.studentStatusChip,
                studentStatus === 'Confirmed' && styles.studentStatusConfirmed,
                studentStatus === 'Rejected' && styles.studentStatusRejected,
              ]}>
              <Text style={[styles.studentStatusText, isLight && styles.textStrongLight]}>
                {studentStatus === 'Not Submitted' ? 'Not Submitted' : studentStatus}
              </Text>
            </View>
          </View>
          <Text style={[styles.studentBody, isLight && styles.textStrongLight]}>
            {studentStatus === 'Confirmed'
              ? 'Student status confirmed. Membership renewal is $70/month.'
              : studentStatus === 'Pending Verification'
                ? 'Your student ID is pending verification. Admin approval is required before student pricing applies.'
                : studentStatus === 'Rejected'
                  ? 'Student ID could not be verified. Please upload a clearer proof.'
                  : 'Upload your student ID to benefit from our student discount.'}
          </Text>
          {studentVerificationMessage ? (
            <Text style={styles.studentMessageText}>{studentVerificationMessage}</Text>
          ) : null}
          {studentStatus === 'Not Submitted' || studentStatus === 'Rejected' ? (
            <Pressable
              onPress={handleStudentUploadPress}
              style={({ pressed }) => [
                styles.studentUploadButtonWrap,
                pressed && styles.buttonPressed,
              ]}>
              <LinearGradient
                colors={['#FF2638', '#B11226', '#2A0308']}
                locations={[0, 0.58, 1]}
                start={{ x: 0.08, y: 0 }}
                end={{ x: 0.92, y: 1 }}
                style={styles.studentUploadButton}>
                <View pointerEvents="none" style={styles.studentUploadGloss} />
                <Text style={styles.studentUploadText}>Upload</Text>
              </LinearGradient>
            </Pressable>
          ) : null}
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

      <Modal transparent visible={isSignOutVisible} animationType="fade">
        <View style={[styles.centerModalOverlay, isLight && styles.centerModalOverlayLight]}>
          <Pressable
            style={[styles.modalBackdrop, isLight && styles.modalBackdropLight]}
            onPress={() => setIsSignOutVisible(false)}
          />
          <View style={[styles.confirmCard, isLight && styles.confirmCardLight]}>
            <Text style={[styles.sheetKicker, isLight && styles.sheetKickerLight]}>Profile</Text>
            <Text style={[styles.sheetTitle, isLight && styles.textStrongLight]}>Sign out?</Text>
            <Text style={[styles.sheetBody, isLight && styles.sheetBodyLight]}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                onPress={() => setIsSignOutVisible(false)}
                style={({ pressed }) => [
                  styles.confirmSecondary,
                  isLight && styles.confirmSecondaryLight,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={[styles.confirmSecondaryText, isLight && styles.confirmSecondaryTextLight]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.confirmPrimaryWrap,
                  pressed && styles.buttonPressed,
                ]}>
                <LinearGradient
                  colors={['#FF2638', '#B11226', '#2A0308']}
                  locations={[0, 0.58, 1]}
                  start={{ x: 0.08, y: 0 }}
                  end={{ x: 0.92, y: 1 }}
                  style={styles.confirmPrimary}>
                  <View pointerEvents="none" style={styles.confirmPrimaryGloss} />
                  <Text style={styles.confirmPrimaryText}>Sign Out</Text>
                </LinearGradient>
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
    position: 'relative',
    alignItems: 'center',
    marginBottom: 14,
    marginHorizontal: 4,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  profileGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  profileSheen: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 120, 130, 0.2)',
  },
  avatarRing: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 60,
    borderWidth: 3,
    borderColor: profileRingColor,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    shadowColor: profileRingColor,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  avatar: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 54,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
  },
  photoButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 230, 0.78)',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    marginTop: 12,
    paddingHorizontal: 14,
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 14,
  },
  phoneText: {
    color: 'rgba(255, 255, 255, 0.85)',
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
  cardLight: {
    borderColor: 'rgba(10, 11, 15, 0.14)',
    backgroundColor: 'rgba(232, 234, 238, 0.78)',
    shadowOpacity: 0.12,
  },
  textStrongLight: {
    color: '#000000',
  },
  sectionTitle: {
    color: premiumColors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 14,
  },
  sectionTitleInRow: {
    flex: 1,
    marginBottom: 0,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  studentStatusChip: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.24)',
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  studentStatusConfirmed: {
    borderColor: 'rgba(34, 197, 94, 0.24)',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  studentStatusRejected: {
    borderColor: 'rgba(239, 68, 68, 0.24)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  studentStatusText: {
    color: premiumColors.text,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  studentBody: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  studentProofText: {
    color: premiumColors.textFaint,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 9,
  },
  studentMessageText: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: 9,
  },
  studentUploadButtonWrap: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    marginTop: 14,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  studentUploadButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,91,106,0.72)',
    borderRadius: 999,
    paddingHorizontal: 16,
  },
  studentUploadGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(255,255,255,0.075)',
  },
  studentUploadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  detailsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  inputLabel: {
    marginBottom: 0,
  },
  fieldActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldActionButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  fieldActionButtonLight: {
    borderWidth: 1,
    borderColor: 'rgba(107,114,128,0.42)',
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  fieldEditButton: {
    backgroundColor: 'rgba(148, 154, 166, 0.34)',
  },
  fieldEditButtonLight: {
    backgroundColor: 'rgba(100, 110, 130, 0.55)',
  },
  fieldConfirmButtonLight: {
    borderColor: 'rgba(107,114,128,0.55)',
  },
  fieldCancelButton: {
    backgroundColor: 'transparent',
  },
  fieldActionButtonDisabled: {
    opacity: 0.45,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
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
    gap: 8,
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
  inputReadOnlyLight: {
    color: '#6B7280',
  },
  inputPreviewLight: {
    color: '#6B7280',
  },
  inputEditingLight: {
    color: '#374151',
  },
  inputSavedLight: {
    color: '#000000',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 6,
  },
  signOutButton: {
    minHeight: 52,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: 'rgba(225,29,46,0.55)',
    borderRadius: 999,
    backgroundColor: 'rgba(7,2,5,0.45)',
    paddingHorizontal: 52,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 6,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  centerModalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    padding: 20,
  },
  centerModalOverlayLight: {
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBackdropLight: {
    backgroundColor: 'rgba(248,250,252,0.44)',
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
  confirmCardLight: {
    borderColor: '#FFFFFF',
    borderRadius: 26,
    backgroundColor: 'rgba(232,234,238,0.90)',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetKicker: {
    color: premiumColors.redBright,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sheetKickerLight: {
    color: '#6B7280',
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
  sheetBodyLight: {
    color: '#4B5563',
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  confirmSecondary: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: 'rgba(225,29,46,0.55)',
    borderRadius: 999,
    backgroundColor: 'rgba(7,2,5,0.45)',
  },
  confirmSecondaryLight: {
    borderColor: 'rgba(107,114,128,0.30)',
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  confirmSecondaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  confirmSecondaryTextLight: {
    color: '#111827',
  },
  confirmPrimaryWrap: {
    flex: 1,
    borderRadius: 999,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmPrimary: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,91,106,0.72)',
    borderRadius: 999,
  },
  confirmPrimaryGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(255,255,255,0.075)',
  },
  confirmPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  buttonPressed: {
    opacity: 0.78,
  },
});
