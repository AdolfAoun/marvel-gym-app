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
  getCurrentMembership,
  updateMemberMembership,
} from './membershipService';
import { getLocalMemberById, searchLocalMemberByPhone } from './localAccountStore';
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

export const getAdminMemberSummary = async (
  memberId: string,
): Promise<AdminMemberSummary | undefined> => {
  const member = await getLocalMemberById(memberId);

  if (!member) {
    return undefined;
  }

  const [membership, vouchers, studentVerification] = await Promise.all([
    getCurrentMembership(),
    getMemberVouchers(),
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
  getAdminMemberSummary,
  extendMembership,
  freezeMembershipForMember,
  unfreezeMembershipForMember,
  changeMembershipStatus,
};
