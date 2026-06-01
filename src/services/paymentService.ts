import { paymentHistory } from '../mock';
import type { Payment } from '../types';

export const getPaymentHistory = async (): Promise<Payment[]> => {
  return paymentHistory;
};

export const paymentService = {
  getPaymentHistory,
};
