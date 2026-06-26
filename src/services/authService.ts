import type { Member } from '../types';
import {
  getSignedInMember,
  loginLocalMember,
  logoutLocalMember,
  registerLocalMember,
} from './localAccountStore';

export type RegisterMemberInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  password: string;
};

export type LoginMemberInput = {
  email: string;
  password: string;
};

export const registerMember = async (
  input: RegisterMemberInput,
): Promise<Member> => {
  return registerLocalMember(input);
};

export const loginMember = async (
  input: LoginMemberInput,
): Promise<Member> => {
  return loginLocalMember(input.email, input.password);
};

export const logoutMember = async (): Promise<void> => {
  return logoutLocalMember();
};

export const getCurrentSessionMember = async (): Promise<Member | undefined> => {
  return getSignedInMember();
};

export const authService = {
  getCurrentSessionMember,
  registerMember,
  loginMember,
  logoutMember,
};
