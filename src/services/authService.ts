import { currentMember } from '../mock';
import type { Member } from '../types';

export type RegisterMemberInput = Pick<
  Member,
  'firstName' | 'lastName' | 'email' | 'phone'
> &
  Partial<
    Pick<
      Member,
      | 'dateOfBirth'
      | 'emergencyContactName'
      | 'emergencyContactPhone'
    >
  >;

export type LoginMemberInput = {
  email: string;
  password: string;
};

const mockLoginPassword = 'password';
const mockLoginIdentifiers = [
  currentMember.email.toLowerCase(),
  currentMember.phone.replace(/\D/g, ''),
  currentMember.phone.replace(/\D/g, '').slice(-8),
  '79197997',
];

export const registerMember = async (
  _input: RegisterMemberInput,
): Promise<Member> => {
  return currentMember;
};

export const loginMember = async (
  input: LoginMemberInput,
): Promise<Member> => {
  const normalizedIdentifier = input.email.trim().toLowerCase().replace(/\s/g, '');
  const isKnownIdentifier = mockLoginIdentifiers.includes(normalizedIdentifier);
  const isValidPassword = input.password === mockLoginPassword;

  if (!isKnownIdentifier || !isValidPassword) {
    throw new Error('Invalid credentials');
  }

  return currentMember;
};

export const logoutMember = async (): Promise<void> => {
  return undefined;
};

export const authService = {
  registerMember,
  loginMember,
  logoutMember,
};
