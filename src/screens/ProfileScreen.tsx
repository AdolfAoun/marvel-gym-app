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
import {
  authService,
  avatarService,
  memberService,
  studentVerificationService,
} from '@/services';
import type { Member, StudentVerificationRequest } from '@/types';

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
      setInitialProfileImageUri(currentMember.profileImageUri ?? '');
      setDraftProfileImageUri(currentMember.profileImageUri ?? '');
      setStudentVerification(nextVerification);
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
      aspect: [1, 1],
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
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });

    if (!result.canceled) {
      setDraftProfileImageUri(result.assets[0].uri);
    }

    setIsPhotoSheetVisible(false);
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
  const studentStatus = studentVerification?.status ?? 'Not Submitted';

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

        <View style={styles.card}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Student Verification</Text>
            <View
              style={[
                styles.studentStatusChip,
                studentStatus === 'Confirmed' && styles.studentStatusConfirmed,
                studentStatus === 'Rejected' && styles.studentStatusRejected,
              ]}>
              <Text style={styles.studentStatusText}>
                {studentStatus === 'Not Submitted' ? 'Not Submitted' : studentStatus}
              </Text>
            </View>
          </View>
          <Text style={styles.studentBody}>
            {studentStatus === 'Confirmed'
              ? 'Student status confirmed. Membership renewal is $70/month.'
              : studentStatus === 'Pending Verification'
                ? 'Your student ID is pending verification. Admin approval is required before student pricing applies.'
                : studentStatus === 'Rejected'
                  ? 'Student ID could not be verified. Please upload a clearer proof.'
                  : 'Upload your student ID to request student pricing.'}
          </Text>
          {studentVerification?.proofLabel ? (
            <Text style={styles.studentProofText}>
              Proof: {studentVerification.proofLabel}
            </Text>
          ) : null}
          {studentVerificationMessage ? (
            <Text style={styles.studentMessageText}>{studentVerificationMessage}</Text>
          ) : null}
          {studentStatus === 'Not Submitted' || studentStatus === 'Rejected' ? (
            <View style={styles.studentUploadRow}>
              <Pressable
                onPress={handleUploadStudentId}
                style={({ pressed }) => [
                  styles.studentUploadButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.studentUploadText}>
                  {studentStatus === 'Rejected' ? 'Choose Again' : 'Choose from Gallery'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleTakeStudentIdPicture}
                style={({ pressed }) => [
                  styles.studentUploadButton,
                  styles.studentCameraButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.studentUploadText}>Take Picture</Text>
              </Pressable>
            </View>
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
                Use the native crop screen, then save with Done.
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
    position: 'relative',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225,29,46,0.28)',
    borderRadius: 32,
    marginBottom: 14,
    marginHorizontal: 4,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
    backgroundColor: 'rgba(8,4,5,0.72)',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.32,
    shadowRadius: 32,
    elevation: 14,
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
  avatar: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 54,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
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
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
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
  sectionTitle: {
    color: premiumColors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 14,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
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
  studentUploadRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  studentUploadButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: accentColor,
    paddingHorizontal: 10,
  },
  studentCameraButton: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.32)',
    backgroundColor: premiumColors.surfaceSoft,
  },
  studentUploadText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
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
    borderWidth: 1.4,
    borderColor: 'rgba(225,29,46,0.55)',
    borderRadius: 999,
    backgroundColor: 'rgba(7,2,5,0.45)',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  cancelButton: {
    borderColor: 'rgba(225,29,46,0.72)',
    backgroundColor: 'rgba(177,18,38,0.12)',
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
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,91,106,0.72)',
    borderRadius: 999,
    backgroundColor: accentColor,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.42,
    shadowRadius: 22,
    elevation: 8,
  },
  doneButtonDisabled: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    shadowOpacity: 0,
    elevation: 0,
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
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: 'rgba(225,29,46,0.55)',
    borderRadius: 999,
    backgroundColor: 'rgba(7,2,5,0.45)',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  photoChoiceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  removePhotoButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225,29,46,0.28)',
    borderRadius: 999,
    backgroundColor: 'rgba(177,18,38,0.08)',
  },
  removePhotoButtonDisabled: {
    borderColor: 'rgba(148,163,184,0.12)',
    opacity: 0.40,
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
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,91,106,0.72)',
    borderRadius: 999,
    backgroundColor: accentColor,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 8,
  },
  photoCancelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
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
  confirmSecondaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  confirmPrimary: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255,91,106,0.72)',
    borderRadius: 999,
    backgroundColor: accentColor,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.40,
    shadowRadius: 18,
    elevation: 7,
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
