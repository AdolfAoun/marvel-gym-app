// Central source of truth for Phase 1 mock pricing.
// These values currently live in the frontend; after backend integration they
// should be loaded from Gmind/backend instead of being hardcoded here.
export const MONTHLY_MEMBERSHIP_PRICE = 85;
export const STUDENT_MONTHLY_MEMBERSHIP_PRICE = 70;
export const FREEZE_WEEKLY_PRICE = 10;

export const getMonthlyMembershipPrice = async (): Promise<number> => {
  return MONTHLY_MEMBERSHIP_PRICE;
};

export const getStudentMonthlyMembershipPrice = async (): Promise<number> => {
  return STUDENT_MONTHLY_MEMBERSHIP_PRICE;
};

export const getFreezeWeeklyPrice = async (): Promise<number> => {
  return FREEZE_WEEKLY_PRICE;
};

export const pricingService = {
  getMonthlyMembershipPrice,
  getStudentMonthlyMembershipPrice,
  getFreezeWeeklyPrice,
};
