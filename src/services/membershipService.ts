import {
  activeMembership,
  membershipPlans,
} from '../mock';
import type {
  Membership,
  MembershipPlan,
  MembershipStatus,
  Payment,
} from '../types';
import { getActiveMember } from './localAccountStore';
import {
  MONTHLY_MEMBERSHIP_PRICE,
  STUDENT_MONTHLY_MEMBERSHIP_PRICE,
} from './pricingService';
import { getStudentVerificationStatus } from './studentVerificationService';

// Memberships are keyed by member id so that admin edits to one member never
// affect another. Members without a record yet inherit a default active
// membership (mirrors the Phase 1 demo where every member can use the app).
const membershipsByMember: Record<string, Membership> = {
  [activeMembership.memberId]: { ...activeMembership },
};

function getOrCreateMembership(memberId: string): Membership {
  const existing = membershipsByMember[memberId];

  if (existing) {
    return existing;
  }

  const created: Membership = {
    ...activeMembership,
    id: `membership-${memberId}`,
    memberId,
  };

  membershipsByMember[memberId] = created;

  return created;
}

function applyMembershipUpdate(
  memberId: string,
  updates: Partial<Membership>,
): Membership {
  const updated: Membership = {
    ...getOrCreateMembership(memberId),
    ...updates,
    memberId,
    updatedAt: new Date().toISOString(),
  };

  membershipsByMember[memberId] = updated;

  return updated;
}

async function getActiveMembership(): Promise<Membership> {
  const member = await getActiveMember();

  return getOrCreateMembership(member.id);
}

export const getMembershipStatus = async (): Promise<MembershipStatus> => {
  return (await getActiveMembership()).status;
};

export const getCurrentMembership = async (): Promise<Membership> => {
  return getActiveMembership();
};

export const getMembershipForMember = async (
  memberId: string,
): Promise<Membership> => {
  return getOrCreateMembership(memberId);
};

export const getMembershipPlans = async (): Promise<MembershipPlan[]> => {
  return membershipPlans.map((plan) => ({
    ...plan,
    price: plan.durationInMonths * MONTHLY_MEMBERSHIP_PRICE,
  }));
};

export const getMembershipMonthlyRenewalPrice = async (): Promise<number> => {
  return MONTHLY_MEMBERSHIP_PRICE;
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
      ? STUDENT_MONTHLY_MEMBERSHIP_PRICE
      : MONTHLY_MEMBERSHIP_PRICE;

  return {
    monthlyPrice,
    standardMonthlyPrice: MONTHLY_MEMBERSHIP_PRICE,
    studentMonthlyPrice: STUDENT_MONTHLY_MEMBERSHIP_PRICE,
    studentStatus,
  };
};

export const activateMembership = async (
  planId: string,
): Promise<Membership> => {
  const member = await getActiveMember();

  return applyMembershipUpdate(member.id, {
    planId,
    status: 'Active',
  });
};

export const freezeMembership = async (): Promise<Membership> => {
  const member = await getActiveMember();

  return applyMembershipUpdate(member.id, {
    status: 'Frozen',
    frozenUntil: '2026-06-15T23:59:59.000Z',
  });
};

export const unfreezeMembership = async (): Promise<Membership> => {
  const member = await getActiveMember();

  return applyMembershipUpdate(member.id, {
    status: 'Active',
    frozenUntil: undefined,
  });
};

export const payMembership = async (): Promise<Payment> => {
  const member = await getActiveMember();
  const membership = getOrCreateMembership(member.id);
  const timestamp = new Date().toISOString();

  return {
    id: `payment-${Date.now().toString(36)}`,
    memberId: member.id,
    membershipId: membership.id,
    amount: MONTHLY_MEMBERSHIP_PRICE,
    currency: 'USD',
    method: 'Cash',
    status: 'Paid',
    paidAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const showQRCode = async (): Promise<string | undefined> => {
  const membership = await getActiveMembership();

  if (membership.status !== 'Active') {
    return undefined;
  }

  return membership.qrCodeValue ?? membership.id;
};

export const updateMemberMembership = async (
  memberId: string,
  updates: Partial<Pick<Membership, 'endDate' | 'frozenUntil' | 'startDate' | 'status'>>,
): Promise<Membership> => {
  // TODO: Replace this mock mutation with a backend/Gmind admin-authorized update.
  return applyMembershipUpdate(memberId, updates);
};

export const extendMemberMembership = async (
  memberId: string,
  months: number,
): Promise<Membership> => {
  const currentEndDate = new Date(getOrCreateMembership(memberId).endDate);
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
  getMembershipForMember,
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
