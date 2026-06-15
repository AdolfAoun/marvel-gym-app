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

let membershipRecord: Membership = { ...activeMembership };

export const getMembershipStatus = async (): Promise<MembershipStatus> => {
  return membershipRecord.status;
};

export const getCurrentMembership = async (): Promise<Membership> => {
  return membershipRecord;
};

export const getMembershipPlans = async (): Promise<MembershipPlan[]> => {
  return membershipPlans;
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
  activateMembership,
  freezeMembership,
  unfreezeMembership,
  payMembership,
  showQRCode,
  updateMemberMembership,
  extendMemberMembership,
  freezeMemberMembership,
};
