import { vouchers } from '../mock';
import type { Voucher, VoucherStatus, VoucherType } from '../types';
import { getActiveMember } from './localAccountStore';

type CreateVoucherInput = {
  type: VoucherType;
  amount: number;
  currency?: string;
  status: VoucherStatus;
  description: string;
};

let voucherRecords: Voucher[] = [...vouchers];
const shopVoucherPin = '00';

function createVoucherId() {
  return `voucher-${Date.now().toString(36)}`;
}

function sortVouchers(records: Voucher[]): Voucher[] {
  const statusOrder: Record<VoucherStatus, number> = {
    Pending: 0,
    Confirmed: 1,
    Canceled: 2,
  };

  return [...records].sort((first, second) => {
    const statusDifference = statusOrder[first.status] - statusOrder[second.status];

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return new Date(second.date).getTime() - new Date(first.date).getTime();
  });
}

// Member-facing: vouchers belonging to the currently signed-in member.
export const getVouchers = async (): Promise<Voucher[]> => {
  const member = await getActiveMember();

  return getMemberVouchers(member.id);
};

// Admin-facing: every voucher across all members (the staff queue).
export const getAllVouchers = async (): Promise<Voucher[]> => {
  return sortVouchers(voucherRecords);
};

export const getMemberVouchers = async (
  memberId: string,
): Promise<Voucher[]> => {
  return sortVouchers(
    voucherRecords.filter((voucher) => voucher.memberId === memberId),
  );
};

export const getPendingVouchers = async (): Promise<Voucher[]> => {
  return voucherRecords.filter((voucher) => voucher.status === 'Pending');
};

export const getVouchersByStatus = async (
  status: VoucherStatus,
): Promise<Voucher[]> => {
  return voucherRecords.filter((voucher) => voucher.status === status);
};

export const getShopVouchers = async (): Promise<Voucher[]> => {
  return voucherRecords.filter((voucher) => voucher.type === 'Shop Reservation');
};

export const createVoucher = async ({
  type,
  amount,
  currency = 'USD',
  status,
  description,
}: CreateVoucherInput): Promise<Voucher> => {
  const member = await getActiveMember();
  const voucher: Voucher = {
    id: createVoucherId(),
    memberId: member.id,
    date: new Date().toISOString(),
    type,
    amount,
    currency,
    status,
    description,
  };

  voucherRecords = [voucher, ...voucherRecords];

  return voucher;
};

export const createMembershipRenewalVoucher = async (
  months: number,
  amount: number,
): Promise<Voucher> => {
  return createVoucher({
    type: 'Membership Renewal',
    amount,
    status: 'Pending',
    description: `${months} Month${months > 1 ? 's' : ''} Membership - Cash at counter`,
  });
};

export const createMembershipFreezeVoucher = async (
  weeks: number,
  amount: number,
): Promise<Voucher> => {
  return createVoucher({
    type: 'Membership Freeze',
    amount,
    status: 'Pending',
    description: `${weeks} Week${weeks > 1 ? 's' : ''} Freeze - Cash at counter`,
  });
};

export const createShopVoucher = async (
  productName: string,
  amount: number,
): Promise<Voucher> => {
  return createVoucher({
    type: 'Shop Reservation',
    amount,
    status: 'Pending',
    description: `${productName} reservation - Cash at counter`,
  });
};

export const createClassVoucher = async (
  className: string,
  instructorName: string,
  amount: number,
): Promise<Voucher> => {
  return createVoucher({
    type: 'Class Reservation',
    amount,
    status: 'Pending',
    description: `${className} with Coach ${instructorName} - Pending approval`,
  });
};

export const getClassVouchers = async (): Promise<Voucher[]> => {
  return voucherRecords.filter((voucher) => voucher.type === 'Class Reservation');
};

export const getAllClassVouchers = async (): Promise<Voucher[]> => {
  return sortVouchers(
    voucherRecords.filter((voucher) => voucher.type === 'Class Reservation'),
  );
};

export const confirmShopVoucher = async (
  voucherId: string,
  pin: string,
): Promise<Voucher | undefined> => {
  const voucher = voucherRecords.find((item) => item.id === voucherId);

  if (!voucher || voucher.type !== 'Shop Reservation' || pin !== shopVoucherPin) {
    return undefined;
  }

  const confirmedVoucher: Voucher = {
    ...voucher,
    status: 'Confirmed',
  };

  voucherRecords = voucherRecords.map((item) =>
    item.id === voucherId ? confirmedVoucher : item,
  );

  return confirmedVoucher;
};

export const confirmVoucher = async (
  voucherId: string,
): Promise<Voucher | undefined> => {
  const voucher = voucherRecords.find((item) => item.id === voucherId);

  if (!voucher) {
    return undefined;
  }

  const confirmedVoucher: Voucher = {
    ...voucher,
    status: 'Confirmed',
  };

  voucherRecords = voucherRecords.map((item) =>
    item.id === voucherId ? confirmedVoucher : item,
  );

  return confirmedVoucher;
};

export const cancelVoucher = async (
  voucherId: string,
): Promise<Voucher | undefined> => {
  const voucher = voucherRecords.find((item) => item.id === voucherId);

  if (!voucher) {
    return undefined;
  }

  const canceledVoucher: Voucher = {
    ...voucher,
    status: 'Canceled',
  };

  voucherRecords = voucherRecords.map((item) =>
    item.id === voucherId ? canceledVoucher : item,
  );

  return canceledVoucher;
};

export const voucherService = {
  getVouchers,
  getAllVouchers,
  getMemberVouchers,
  getPendingVouchers,
  getVouchersByStatus,
  getShopVouchers,
  getClassVouchers,
  getAllClassVouchers,
  createVoucher,
  createMembershipRenewalVoucher,
  createMembershipFreezeVoucher,
  createShopVoucher,
  createClassVoucher,
  confirmShopVoucher,
  confirmVoucher,
  cancelVoucher,
};
