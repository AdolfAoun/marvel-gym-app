import type {
  Member,
  Membership,
  MembershipStatus,
  StudentVerificationRequest,
  Voucher,
} from '@/types';

import {
  extendMemberMembership,
  freezeMemberMembership,
  getMembershipForMember,
  updateMemberMembership,
} from './membershipService';
import {
  getLocalMemberById,
  listLocalMembers,
  searchLocalMemberByPhone,
} from './localAccountStore';
import { getMemberStudentVerification } from './studentVerificationService';
import { getMemberVouchers } from './voucherService';

export type AdminMemberSummary = {
  member: Member;
  membership: Membership;
  pendingVouchersCount: number;
  remainingDays: number;
  studentVerification?: StudentVerificationRequest;
  vouchers: Voucher[];
};

function calculateRemainingDays(endDate: string) {
  const endTime = new Date(endDate).getTime();

  if (Number.isNaN(endTime)) {
    return 0;
  }

  return Math.max(0, Math.ceil((endTime - Date.now()) / 86_400_000));
}

export const searchMemberByPhone = async (
  phone: string,
): Promise<Member | undefined> => {
  return searchLocalMemberByPhone(phone);
};

export const searchMembers = async (query: string): Promise<Member[]> => {
  const members = await listLocalMembers();
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    return members;
  }

  const digits = trimmed.replace(/\D/g, '');

  return members.filter((member) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const phoneDigits = member.phone.replace(/\D/g, '');
    const matchesName = fullName.includes(trimmed);
    const matchesEmail = member.email.toLowerCase().includes(trimmed);
    const matchesPhone = digits.length > 0 && phoneDigits.includes(digits);

    return matchesName || matchesEmail || matchesPhone;
  });
};

export const getAdminMemberSummary = async (
  memberId: string,
): Promise<AdminMemberSummary | undefined> => {
  const member = await getLocalMemberById(memberId);

  if (!member) {
    return undefined;
  }

  const [membership, vouchers, studentVerification] = await Promise.all([
    getMembershipForMember(memberId),
    getMemberVouchers(memberId),
    getMemberStudentVerification(memberId),
  ]);

  return {
    member,
    membership,
    pendingVouchersCount: vouchers.filter((voucher) => voucher.status === 'Pending').length,
    remainingDays: calculateRemainingDays(membership.endDate),
    studentVerification,
    vouchers,
  };
};

export const extendMembership = async (
  memberId: string,
  months: number,
): Promise<Membership> => {
  return extendMemberMembership(memberId, months);
};

export const freezeMembershipForMember = async (
  memberId: string,
  weeks: number,
): Promise<Membership> => {
  return freezeMemberMembership(memberId, weeks);
};

export const unfreezeMembershipForMember = async (
  memberId: string,
): Promise<Membership> => {
  return updateMemberMembership(memberId, {
    frozenUntil: undefined,
    status: 'Active',
  });
};

export const changeMembershipStatus = async (
  memberId: string,
  status: MembershipStatus,
): Promise<Membership> => {
  return updateMemberMembership(memberId, { status });
};

export const adminMemberService = {
  searchMemberByPhone,
  searchMembers,
  getAdminMemberSummary,
  extendMembership,
  freezeMembershipForMember,
  unfreezeMembershipForMember,
  changeMembershipStatus,
};
