import { currentMember } from '../mock';
import type { Member } from '../types';

export type UpdateProfileInput = Partial<
  Pick<
    Member,
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phone'
    | 'dateOfBirth'
    | 'emergencyContactName'
    | 'emergencyContactPhone'
  >
>;

export const getCurrentMember = async (): Promise<Member> => {
  return currentMember;
};

export const updateProfile = async (
  updates: UpdateProfileInput,
): Promise<Member> => {
  return {
    ...currentMember,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
};

export const memberService = {
  getCurrentMember,
  updateProfile,
};
