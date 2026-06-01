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

export const registerMember = async (
  _input: RegisterMemberInput,
): Promise<Member> => {
  return currentMember;
};

export const loginMember = async (
  _input: LoginMemberInput,
): Promise<Member> => {
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
