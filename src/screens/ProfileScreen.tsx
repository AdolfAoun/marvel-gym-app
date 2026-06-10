import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import type { SavedPaymentMethod } from '@/services/memberService';
import type { Member } from '@/types';

const accentColor = premiumColors.red;

type ProfileForm = {
  email: string;
  location: string;
};

function createProfileForm(member: Member): ProfileForm {
  return {
    email: member.email,
    location: member.location ?? '',
  };
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function formatCardExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  const month = digits.slice(0, 2);
  const year = digits.slice(2, 4);

  return [month, year].filter(Boolean).join('/');
}

function detectCardProvider(value: string): 'Visa' | 'Mastercard' | undefined {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('4')) {
    return 'Visa';
  }

  if (/^(5[1-5]|2[2-7])/.test(digits)) {
    return 'Mastercard';
  }

  return undefined;
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
  const [savedPayment, setSavedPayment] = useState<SavedPaymentMethod>();
  const [paymentStep, setPaymentStep] = useState<'choice' | 'card'>();
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [photoTone, setPhotoTone] = useState(0);
  const [isPhotoSheetVisible, setIsPhotoSheetVisible] = useState(false);

  useEffect(() => {
    const loadMember = async () => {
      const [currentMember, currentPayment] = await Promise.all([
        memberService.getCurrentMember(),
        memberService.getSavedPaymentMethod(),
      ]);
      const nextForm = createProfileForm(currentMember);

      setMember(currentMember);
      setSavedPayment(currentPayment);
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
      form.location.trim() !== initialForm.location.trim()
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
    setIsPhotoSheetVisible(true);
  };

  const updateProfilePhoto = async (uri: string) => {
    const updatedMember = await memberService.updateProfileImage(uri);

    setMember(updatedMember);
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
      await updateProfilePhoto(result.assets[0].uri);
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
      await updateProfilePhoto(result.assets[0].uri);
    }

    setPhotoTone((value) => (value + 1) % 3);
    setIsPhotoSheetVisible(false);
  };

  const closePaymentModal = () => {
    setPaymentStep(undefined);
    setPaymentError('');
    setCardName('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
  };

  const handleAddWhishMoney = async () => {
    const payment = await memberService.addWhishMoneyPaymentMethod();

    setSavedPayment(payment);
    closePaymentModal();
  };

  const handleAddCard = async () => {
    const digits = cardNumber.replace(/\D/g, '');
    const provider = detectCardProvider(cardNumber);
    const expiryDigits = cardExpiry.replace(/\D/g, '');

    if (!cardName.trim()) {
      setPaymentError('Enter the cardholder name.');
      return;
    }

    if (!provider || digits.length < 13) {
      setPaymentError('Enter a valid Visa or Mastercard number.');
      return;
    }

    if (expiryDigits.length !== 4) {
      setPaymentError('Enter expiry as MM/YY.');
      return;
    }

    if (cardCvv.replace(/\D/g, '').length < 3) {
      setPaymentError('Enter a valid CVV.');
      return;
    }

    const payment = await memberService.addCreditCardPaymentMethod({
      provider,
      last4: digits.slice(-4),
    });

    setSavedPayment(payment);
    closePaymentModal();
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
            {member.profileImageUri ? (
              <Image
                source={{ uri: member.profileImageUri }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>
                {member.firstName.slice(0, 1)}
                {member.lastName.slice(0, 1)}
              </Text>
            )}
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
            <View style={styles.savedPaymentCard}>
              <View>
                <Text style={styles.savedPaymentTitle}>
                  {savedPayment?.displayLabel ?? 'No payment method saved'}
                </Text>
                <Text style={styles.savedPaymentBody}>
                  Full card details are never shown after saving.
                </Text>
              </View>
              <Pressable
                onPress={() => setPaymentStep('choice')}
                style={({ pressed }) => [
                  styles.addPaymentButton,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.addPaymentButtonText}>
                  {savedPayment ? 'Change' : 'Add'}
                </Text>
              </Pressable>
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

      <Modal transparent visible={Boolean(paymentStep)} animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={-58}
          style={styles.modalKeyboardLayer}>
          <View
            style={[
              styles.modalOverlay,
              paymentStep === 'card' && styles.modalOverlayCentered,
            ]}>
            <Pressable style={styles.modalBackdrop} onPress={closePaymentModal} />
            <View
              style={[
                styles.paymentSheet,
                paymentStep === 'card' && styles.paymentSheetCentered,
              ]}>
            <Pressable
              onPress={closePaymentModal}
              style={({ pressed }) => [
                styles.sheetCloseButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityLabel="Close payment method sheet">
              <Text style={styles.sheetCloseText}>X</Text>
            </Pressable>
            {paymentStep === 'choice' ? (
              <>
                <Text style={styles.sheetKicker}>Payment method</Text>
                <Text style={styles.sheetTitle}>Choose a method</Text>
                <Text style={styles.sheetBody}>
                  Add a preferred payment method for faster checkout later.
                </Text>
                <View style={styles.paymentChoiceGrid}>
                  <Pressable
                    onPress={() => setPaymentStep('card')}
                    style={({ pressed }) => [
                      styles.paymentChoice,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.paymentChoiceTitle}>Credit Card</Text>
                    <Text style={styles.paymentChoiceBody}>Visa or Mastercard</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleAddWhishMoney}
                    style={({ pressed }) => [
                      styles.paymentChoice,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.paymentChoiceTitle}>Whish Money</Text>
                    <Text style={styles.paymentChoiceBody}>Save as preferred method</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sheetKicker}>Credit Card</Text>
                <Text style={styles.sheetTitle}>Add card details</Text>
                <Text style={styles.sheetBody}>
                  Visa and Mastercard are accepted.
                </Text>
                <TextInput
                  value={cardName}
                  onChangeText={setCardName}
                  placeholder="Cardholder name"
                  placeholderTextColor="#667282"
                  selectionColor={accentColor}
                  style={styles.sheetInput}
                />
                <TextInput
                  value={formatCardNumber(cardNumber)}
                  onChangeText={setCardNumber}
                  placeholder="4111 1111 1111 1234"
                  placeholderTextColor="#667282"
                  keyboardType="number-pad"
                  selectionColor={accentColor}
                  style={styles.sheetInput}
                />
                <View style={styles.sheetInputRow}>
                  <TextInput
                    value={cardExpiry}
                    onChangeText={(value) => setCardExpiry(formatCardExpiry(value))}
                    placeholder="MM/YY"
                    placeholderTextColor="#667282"
                    keyboardType="number-pad"
                    selectionColor={accentColor}
                    style={[styles.sheetInput, styles.sheetHalfInput]}
                  />
                  <TextInput
                    value={cardCvv}
                    onChangeText={(value) => setCardCvv(value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="CVV"
                    placeholderTextColor="#667282"
                    keyboardType="number-pad"
                    secureTextEntry
                    selectionColor={accentColor}
                    style={[styles.sheetInput, styles.sheetHalfInput]}
                  />
                </View>
                {paymentError ? (
                  <Text style={styles.paymentErrorText}>{paymentError}</Text>
                ) : null}
                <Pressable
                  onPress={handleAddCard}
                  style={({ pressed }) => [
                    styles.sheetPrimaryButton,
                    pressed && styles.buttonPressed,
                  ]}>
                  <Text style={styles.sheetPrimaryText}>Save payment method</Text>
                </Pressable>
              </>
            )}
          </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal transparent visible={isPhotoSheetVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsPhotoSheetVisible(false)}
          />
          <View style={styles.photoSheet}>
            <Text style={styles.sheetKicker}>Profile picture</Text>
            <Text style={styles.sheetTitle}>Update photo</Text>
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
    paddingTop: 72,
    paddingBottom: 72,
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
  savedPaymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 14,
  },
  savedPaymentTitle: {
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  savedPaymentBody: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 4,
    maxWidth: 210,
  },
  addPaymentButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: accentColor,
    marginRight: 6,
    paddingHorizontal: 16,
  },
  addPaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  modalKeyboardLayer: {
    flex: 1,
  },
  modalOverlayCentered: {
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  paymentSheet: {
    position: 'relative',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: premiumColors.border,
    backgroundColor: premiumColors.surface,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 30,
    ...premiumShadow,
  },
  paymentSheetCentered: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    borderRadius: 30,
    paddingBottom: 24,
    transform: [{ translateY: 22 }],
  },
  sheetCloseButton: {
    position: 'absolute',
    right: 18,
    top: 14,
    zIndex: 2,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: premiumColors.surfaceSoft,
  },
  sheetCloseText: {
    color: premiumColors.text,
    fontSize: 13,
    fontWeight: '900',
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
  paymentChoiceGrid: {
    gap: 10,
    marginTop: 18,
  },
  paymentChoice: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 20,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 16,
  },
  paymentChoiceTitle: {
    color: premiumColors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  paymentChoiceBody: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  sheetInput: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
    paddingHorizontal: 14,
  },
  sheetInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sheetHalfInput: {
    flex: 1,
  },
  paymentErrorText: {
    color: '#F2B8BF',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  sheetPrimaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: accentColor,
    marginTop: 16,
  },
  sheetPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
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
  buttonPressed: {
    opacity: 0.78,
  },
});
