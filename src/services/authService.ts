import { currentMember } from '../mock';
import type { Member } from '../types';

export type RegisterMemberInput = {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Prefer not to say';
  password: string;
};

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
  input: RegisterMemberInput,
): Promise<Member> => {
  return {
    ...currentMember,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    dateOfBirth: input.dateOfBirth,
  };
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
