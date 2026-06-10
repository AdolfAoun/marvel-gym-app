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
  profileImageUri?: string;
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
  category?: ProductCategory;
  isAvailable: boolean;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductCategory = 'Gym Equipment' | 'Beverages' | 'Snacks';

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

export type GymActivityIntensity = 'Low' | 'Medium' | 'High';

export type GymActivityLevel = {
  id: string;
  label: string;
  count: number;
  intensity: GymActivityIntensity;
};

export type GymActivityDay = {
  id: string;
  dayLabel: string;
  scheduleLabel: string;
  levels: GymActivityLevel[];
};

export type VoucherStatus = 'Pending' | 'Confirmed' | 'Canceled';

export type VoucherType =
  | 'Membership Renewal'
  | 'Membership Freeze'
  | 'Shop Reservation';

export type Voucher = {
  id: string;
  date: string;
  type: VoucherType;
  amount: number;
  currency: string;
  status: VoucherStatus;
  description: string;
};

export type JourneyProfile = {
  biography: string;
  gymPlan: string;
};

export type AttendanceDay = {
  id: string;
  date: string;
  hasVisit: boolean;
};

export type JourneyStats = {
  averageWorkoutDuration: string;
  visitsThisMonth: number;
  visitsThisYear: number;
  consecutiveStreak: number;
  estimatedCaloriesBurned: number;
};

export type JourneyStatKey =
  | 'averageWorkoutDuration'
  | 'visitsThisMonth'
  | 'estimatedCaloriesBurned'
  | 'visitsThisYear';

export type WorkoutSession = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  estimatedCaloriesBurned: number;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  isUnlocked: boolean;
};

export type MachineGuide = {
  id: string;
  name: string;
  muscleGroup: 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core';
  target: string;
  description: string;
  imageLabel: string;
  instructions: string[];
};
