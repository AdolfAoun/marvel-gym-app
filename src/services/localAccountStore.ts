import type { Member } from '../types';

export type LocalRegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  password: string;
};

type StoredAccount = {
  member: Member;
  password: string;
  gender: LocalRegisterInput['gender'];
};

const now = () => new Date().toISOString();

let guestMember: Member = {
  id: 'guest-member',
  firstName: 'Guest',
  lastName: '',
  email: '',
  phone: '',
  location: '',
  createdAt: now(),
  updatedAt: now(),
};
let accounts: StoredAccount[] = [];
let activeMemberId: string | undefined;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '').slice(-8);
}

function findAccountByIdentifier(identifier: string) {
  const normalizedEmail = normalizeEmail(identifier);
  const normalizedPhone = normalizePhone(identifier);

  return accounts.find((account) => {
    const accountEmail = normalizeEmail(account.member.email);
    const accountPhone = normalizePhone(account.member.phone);

    return (
      (normalizedEmail.includes('@') && accountEmail === normalizedEmail) ||
      (normalizedPhone.length > 0 && accountPhone === normalizedPhone)
    );
  });
}

export const registerLocalMember = async (
  input: LocalRegisterInput,
): Promise<Member> => {
  if (findAccountByIdentifier(input.email) || findAccountByIdentifier(input.phone)) {
    throw new Error('An account already exists with this email or phone number.');
  }

  const timestamp = now();
  const member: Member = {
    id: `member-${Date.now().toString(36)}`,
    firstName: input.firstName,
    lastName: input.lastName,
    email: normalizeEmail(input.email),
    phone: input.phone,
    dateOfBirth: input.dateOfBirth,
    location: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  accounts = [{ member, password: input.password, gender: input.gender }, ...accounts];

  return member;
};

export const loginLocalMember = async (
  identifier: string,
  password: string,
): Promise<Member> => {
  const account = findAccountByIdentifier(identifier);

  if (!account || account.password !== password) {
    throw new Error('Invalid credentials');
  }

  activeMemberId = account.member.id;

  return account.member;
};

export const logoutLocalMember = async (): Promise<void> => {
  activeMemberId = undefined;
};

export const getActiveMember = async (): Promise<Member> => {
  const account = accounts.find((item) => item.member.id === activeMemberId);

  return account?.member ?? guestMember;
};

export const updateActiveMember = async (
  updates: Partial<Member>,
): Promise<Member> => {
  const timestamp = now();
  const account = accounts.find((item) => item.member.id === activeMemberId);

  if (!account) {
    guestMember = {
      ...guestMember,
      ...updates,
      updatedAt: timestamp,
    };

    return guestMember;
  }

  account.member = {
    ...account.member,
    ...updates,
    email: updates.email ? normalizeEmail(updates.email) : account.member.email,
    updatedAt: timestamp,
  };

  return account.member;
};
