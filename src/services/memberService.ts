import { currentMember } from '../mock';
import type { Member } from '../types';

export type SavedPaymentMethod =
  | {
      id: string;
      type: 'Credit Card';
      provider: 'Visa' | 'Mastercard';
      last4: string;
      displayLabel: string;
    }
  | {
      id: string;
      type: 'Whish Money';
      displayLabel: string;
    };

export type UpdateProfileInput = Partial<
  Pick<
    Member,
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phone'
    | 'location'
    | 'preferredPaymentMethod'
    | 'profileImageUri'
    | 'dateOfBirth'
    | 'emergencyContactName'
    | 'emergencyContactPhone'
  >
>;

let memberRecord: Member = { ...currentMember };
let savedPaymentMethod: SavedPaymentMethod | undefined =
  currentMember.preferredPaymentMethod === 'Whish Money'
    ? {
        id: 'payment-whish',
        type: 'Whish Money',
        displayLabel: 'Whish Money',
      }
    : undefined;

export const getCurrentMember = async (): Promise<Member> => {
  return memberRecord;
};

export const updateProfile = async (
  updates: UpdateProfileInput,
): Promise<Member> => {
  memberRecord = {
    ...memberRecord,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return memberRecord;
};

export const getSavedPaymentMethod = async (): Promise<
  SavedPaymentMethod | undefined
> => {
  return savedPaymentMethod;
};

export const addCreditCardPaymentMethod = async ({
  last4,
  provider,
}: {
  last4: string;
  provider: 'Visa' | 'Mastercard';
}): Promise<SavedPaymentMethod> => {
  savedPaymentMethod = {
    id: `payment-card-${last4}`,
    type: 'Credit Card',
    provider,
    last4,
    displayLabel: `${provider} ending in ${last4}`,
  };
  memberRecord = {
    ...memberRecord,
    preferredPaymentMethod: provider,
    updatedAt: new Date().toISOString(),
  };

  return savedPaymentMethod;
};

export const addWhishMoneyPaymentMethod = async (): Promise<SavedPaymentMethod> => {
  savedPaymentMethod = {
    id: 'payment-whish',
    type: 'Whish Money',
    displayLabel: 'Whish Money',
  };
  memberRecord = {
    ...memberRecord,
    preferredPaymentMethod: 'Whish Money',
    updatedAt: new Date().toISOString(),
  };

  return savedPaymentMethod;
};

export const updateProfileImage = async (
  profileImageUri: string,
): Promise<Member> => {
  memberRecord = {
    ...memberRecord,
    profileImageUri,
    updatedAt: new Date().toISOString(),
  };

  return memberRecord;
};

export const memberService = {
  getCurrentMember,
  updateProfile,
  updateProfileImage,
  getSavedPaymentMethod,
  addCreditCardPaymentMethod,
  addWhishMoneyPaymentMethod,
};
