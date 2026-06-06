export type MembershipStatus =
  | 'Active'
  | 'Expired'
  | 'Frozen'
  | 'Suspended'
  | 'Pending Approval';

export type PaymentMethod =
  | 'Visa'
  | 'Mastercard'
  | 'Whish Money'
  | 'Pay at Counter';

export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export type NotificationType = 'Info' | 'Success' | 'Warning' | 'Error';

export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location?: string;
  preferredPaymentMethod?: PaymentMethod;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: string;
  updatedAt: string;
};

export type MembershipPlan = {
  id: string;
  name: string;
  description?: string;
  durationInMonths: number;
  durationInDays: number;
  price: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Membership = {
  id: string;
  memberId: string;
  planId: string;
  status: MembershipStatus;
  startDate: string;
  endDate: string;
  frozenUntil?: string;
  qrCodeValue?: string;
  createdAt: string;
  updatedAt: string;
};

export type GymClass = {
  id: string;
  title: string;
  description?: string;
  instructorName: string;
  startTime: string;
  endTime: string;
  price: number;
  currency: string;
  isPaid: boolean;
  status: 'Available' | 'Full';
  isRegistered?: boolean;
  capacity: number;
  enrolledCount: number;
  location?: string;
  isActive: boolean;
};

export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  isAvailable: boolean;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Payment = {
  id: string;
  memberId?: string;
  membershipId?: string;
  productId?: string;
  classId?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AppNotification = {
  id: string;
  memberId?: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
};

export type GymActivityLevel = {
  id: string;
  label: string;
  count: number;
  intensity: 'Low' | 'Medium' | 'High';
};
