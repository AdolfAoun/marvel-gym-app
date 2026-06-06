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
  PaymentMethod,
} from '../types';

export const getMembershipStatus = async (): Promise<MembershipStatus> => {
  return activeMembership.status;
};

export const getCurrentMembership = async (): Promise<Membership> => {
  return activeMembership;
};

export const getMembershipPlans = async (): Promise<MembershipPlan[]> => {
  return membershipPlans;
};

export const activateMembership = async (
  planId: string,
): Promise<Membership> => {
  return {
    ...activeMembership,
    planId,
    status: 'Active',
    updatedAt: new Date().toISOString(),
  };
};

export const freezeMembership = async (): Promise<Membership> => {
  return {
    ...activeMembership,
    status: 'Frozen',
    frozenUntil: '2026-06-15T23:59:59.000Z',
    updatedAt: new Date().toISOString(),
  };
};

export const unfreezeMembership = async (): Promise<Membership> => {
  return {
    ...activeMembership,
    status: 'Active',
    frozenUntil: undefined,
    updatedAt: new Date().toISOString(),
  };
};

export const payMembership = async (
  method: PaymentMethod = 'Pay at Counter',
): Promise<Payment> => {
  return {
    ...paymentHistory[0],
    method,
    status: 'Paid',
    paidAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const showQRCode = async (): Promise<string | undefined> => {
  if (activeMembership.status !== 'Active') {
    return undefined;
  }

  return activeMembership.qrCodeValue ?? activeMembership.id;
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
};
