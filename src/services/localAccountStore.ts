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
const seedTimestamp = now();

let guestMember: Member = {
  id: 'guest-member',
  role: 'Member',
  firstName: 'Guest',
  lastName: '',
  email: '',
  phone: '',
  location: '',
  createdAt: now(),
  updatedAt: now(),
};
let accounts: StoredAccount[] = [
  {
    member: {
      id: 'admin-member',
      role: 'Admin',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@admin.com',
      phone: '+961 00 000 000',
      location: 'Marvel Gym',
      createdAt: seedTimestamp,
      updatedAt: seedTimestamp,
    },
    password: 'admin@1',
    gender: 'Male',
  },
  {
    member: {
      id: 'member-001',
      role: 'Member',
      firstName: 'Tony',
      lastName: 'Stark',
      email: 'tony.stark@example.com',
      phone: '+961 70 123 456',
      location: 'Beirut, Lebanon',
      dateOfBirth: '1985-05-29',
      emergencyContactName: 'Pepper Potts',
      emergencyContactPhone: '+961 70 654 321',
      createdAt: seedTimestamp,
      updatedAt: seedTimestamp,
    },
    password: 'member@1',
    gender: 'Male',
  },
];
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
    role: 'Member',
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

export const getLocalMemberById = async (
  memberId: string,
): Promise<Member | undefined> => {
  return accounts.find((item) => item.member.id === memberId)?.member;
};

export const searchLocalMemberByPhone = async (
  phone: string,
): Promise<Member | undefined> => {
  const normalizedPhone = normalizePhone(phone);

  if (normalizedPhone.length !== 8) {
    return undefined;
  }

  return accounts
    .filter((account) => account.member.role !== 'Admin')
    .find((account) => normalizePhone(account.member.phone) === normalizedPhone)
    ?.member;
};

export const listLocalMembers = async (): Promise<Member[]> => {
  return accounts
    .filter((account) => account.member.role !== 'Admin')
    .map((account) => account.member);
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
