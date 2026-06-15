import {
  activeMembership,
  membershipPlans,
  paymentHistory,
} from '../mock';
import type {
  Membership,
  MembershipPlan,
  MembershipStatus,
  Payment,
} from '../types';
import { getStudentVerificationStatus } from './studentVerificationService';

const monthlyMembershipPrice = 85;
const studentMonthlyMembershipPrice = 70;
let membershipRecord: Membership = { ...activeMembership };

export const getMembershipStatus = async (): Promise<MembershipStatus> => {
  return membershipRecord.status;
};

export const getCurrentMembership = async (): Promise<Membership> => {
  return membershipRecord;
};

export const getMembershipPlans = async (): Promise<MembershipPlan[]> => {
  return membershipPlans.map((plan) => ({
    ...plan,
    price: plan.durationInMonths * monthlyMembershipPrice,
  }));
};

export const getMembershipMonthlyRenewalPrice = async (): Promise<number> => {
  return monthlyMembershipPrice;
};

export type RenewalPricing = {
  monthlyPrice: number;
  standardMonthlyPrice: number;
  studentMonthlyPrice: number;
  studentStatus: Awaited<ReturnType<typeof getStudentVerificationStatus>>;
};

export const getMembershipRenewalPricing = async (
  memberId: string,
): Promise<RenewalPricing> => {
  const studentStatus = await getStudentVerificationStatus(memberId);
  const monthlyPrice =
    studentStatus === 'Confirmed'
      ? studentMonthlyMembershipPrice
      : monthlyMembershipPrice;

  return {
    monthlyPrice,
    standardMonthlyPrice: monthlyMembershipPrice,
    studentMonthlyPrice: studentMonthlyMembershipPrice,
    studentStatus,
  };
};

export const activateMembership = async (
  planId: string,
): Promise<Membership> => {
  membershipRecord = {
    ...membershipRecord,
    planId,
    status: 'Active',
    updatedAt: new Date().toISOString(),
  };

  return membershipRecord;
};

export const freezeMembership = async (): Promise<Membership> => {
  membershipRecord = {
    ...membershipRecord,
    status: 'Frozen',
    frozenUntil: '2026-06-15T23:59:59.000Z',
    updatedAt: new Date().toISOString(),
  };

  return membershipRecord;
};

export const unfreezeMembership = async (): Promise<Membership> => {
  membershipRecord = {
    ...membershipRecord,
    status: 'Active',
    frozenUntil: undefined,
    updatedAt: new Date().toISOString(),
  };

  return membershipRecord;
};

export const payMembership = async (): Promise<Payment> => {
  return {
    ...paymentHistory[0],
    method: 'Cash',
    status: 'Paid',
    paidAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const showQRCode = async (): Promise<string | undefined> => {
  if (membershipRecord.status !== 'Active') {
    return undefined;
  }

  return membershipRecord.qrCodeValue ?? membershipRecord.id;
};

export const updateMemberMembership = async (
  memberId: string,
  updates: Partial<Pick<Membership, 'endDate' | 'frozenUntil' | 'startDate' | 'status'>>,
): Promise<Membership> => {
  // TODO: Replace this mock mutation with a backend/Gmind admin-authorized update.
  membershipRecord = {
    ...membershipRecord,
    ...updates,
    memberId,
    updatedAt: new Date().toISOString(),
  };

  return membershipRecord;
};

export const extendMemberMembership = async (
  memberId: string,
  months: number,
): Promise<Membership> => {
  const currentEndDate = new Date(membershipRecord.endDate);
  const baseDate = Number.isNaN(currentEndDate.getTime())
    ? new Date()
    : currentEndDate;
  const nextEndDate = new Date(baseDate);

  nextEndDate.setMonth(nextEndDate.getMonth() + months);

  return updateMemberMembership(memberId, {
    endDate: nextEndDate.toISOString(),
    status: 'Active',
    frozenUntil: undefined,
  });
};

export const freezeMemberMembership = async (
  memberId: string,
  weeks: number,
): Promise<Membership> => {
  const frozenUntil = new Date();

  frozenUntil.setDate(frozenUntil.getDate() + weeks * 7);

  return updateMemberMembership(memberId, {
    status: 'Frozen',
    frozenUntil: frozenUntil.toISOString(),
  });
};

export const membershipService = {
  getMembershipStatus,
  getCurrentMembership,
  getMembershipPlans,
  getMembershipMonthlyRenewalPrice,
  getMembershipRenewalPricing,
  activateMembership,
  freezeMembership,
  unfreezeMembership,
  payMembership,
  showQRCode,
  updateMemberMembership,
  extendMemberMembership,
  freezeMemberMembership,
};
