import type { Member } from '@/types';

export type AvatarDisplay = {
  fallbackLabel: string;
  imageUri: string;
};

const guestMemberId = 'guest-member';

export const getMemberAvatarDisplay = (member?: Member): AvatarDisplay => {
  const isGuest = !member || member.id === guestMemberId;
  const firstNameInitial = member?.firstName.trim().slice(0, 1).toUpperCase();

  return {
    fallbackLabel: isGuest ? 'G' : firstNameInitial || 'M',
    imageUri: member?.profileImageUri ?? '',
  };
};

export const avatarService = {
  getMemberAvatarDisplay,
};
