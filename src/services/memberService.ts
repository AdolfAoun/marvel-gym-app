import type { Member } from '../types';
import { getActiveMember, updateActiveMember } from './localAccountStore';

export type UpdateProfileInput = Partial<
  Pick<
    Member,
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phone'
    | 'location'
    | 'profileImageUri'
    | 'dateOfBirth'
    | 'emergencyContactName'
    | 'emergencyContactPhone'
  >
>;

export const getCurrentMember = async (): Promise<Member> => {
  return getActiveMember();
};

export const updateProfile = async (
  updates: UpdateProfileInput,
): Promise<Member> => {
  return updateActiveMember(updates);
};

export const memberService = {
  getCurrentMember,
  updateProfile,
};
