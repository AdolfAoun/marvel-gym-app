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

const profileListeners = new Set<(member: Member) => void>();

export const subscribeToMemberUpdates = (
  listener: (member: Member) => void,
): (() => void) => {
  profileListeners.add(listener);

  return () => {
    profileListeners.delete(listener);
  };
};

const notifyMemberUpdated = (member: Member) => {
  profileListeners.forEach((listener) => listener(member));
};

export const getCurrentMember = async (): Promise<Member> => {
  return getActiveMember();
};

export const updateProfile = async (
  updates: UpdateProfileInput,
): Promise<Member> => {
  const member = await updateActiveMember(updates);
  notifyMemberUpdated(member);

  return member;
};

export const memberService = {
  getCurrentMember,
  subscribeToMemberUpdates,
  updateProfile,
};
