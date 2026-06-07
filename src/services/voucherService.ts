import { vouchers } from '../mock';
import type { Voucher, VoucherStatus, VoucherType } from '../types';

type CreateVoucherInput = {
  type: VoucherType;
  amount: number;
  currency?: string;
  status: VoucherStatus;
  description: string;
};

let voucherRecords: Voucher[] = [...vouchers];

function createVoucherId() {
  return `voucher-${Date.now().toString(36)}`;
}

export const getVouchers = async (): Promise<Voucher[]> => {
  return [...voucherRecords].sort(
    (first, second) =>
      new Date(second.date).getTime() - new Date(first.date).getTime(),
  );
};

export const getPendingVouchers = async (): Promise<Voucher[]> => {
  return voucherRecords.filter((voucher) => voucher.status === 'Pending');
};

export const createVoucher = async ({
  type,
  amount,
  currency = 'USD',
  status,
  description,
}: CreateVoucherInput): Promise<Voucher> => {
  const voucher: Voucher = {
    id: createVoucherId(),
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
  paymentMode: 'Pay at Counter' | 'Pay with Card',
): Promise<Voucher> => {
  return createVoucher({
    type: 'Membership Renewal',
    amount,
    status: paymentMode === 'Pay at Counter' ? 'Pending' : 'Paid',
    description: `${months} Month${months > 1 ? 's' : ''} Membership - ${paymentMode}`,
  });
};

export const createMembershipFreezeVoucher = async (
  weeks: number,
  amount: number,
  paymentMode: 'Pay at Counter' | 'Pay with Card',
): Promise<Voucher> => {
  return createVoucher({
    type: 'Membership Freeze',
    amount,
    status: paymentMode === 'Pay at Counter' ? 'Pending' : 'Paid',
    description: `${weeks} Week${weeks > 1 ? 's' : ''} Freeze - ${paymentMode}`,
  });
};

export const createShopVoucher = async (
  productName: string,
  amount: number,
  paymentMode: 'Pay at Counter' | 'Pay with Card',
): Promise<Voucher> => {
  return createVoucher({
    type: 'Shop Reservation',
    amount,
    status: paymentMode === 'Pay at Counter' ? 'Pending' : 'Paid',
    description: `${productName} reservation - ${paymentMode}`,
  });
};

export const voucherService = {
  getVouchers,
  getPendingVouchers,
  createVoucher,
  createMembershipRenewalVoucher,
  createMembershipFreezeVoucher,
  createShopVoucher,
};
