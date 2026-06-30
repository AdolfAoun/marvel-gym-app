export type MembershipStatus =
  | 'Active'
  | 'Expired'
  | 'Frozen'
  | 'Suspended'
  | 'Pending Approval';

export type PaymentMethod = 'Cash';

export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export type NotificationType = 'Info' | 'Success' | 'Warning' | 'Error';

export type Member = {
  id: string;
  role?: 'Member' | 'Admin';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location?: string;
  profileImageUri?: string;
  dateOfBirth?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentVerificationStatus =
  | 'Not Submitted'
  | 'Pending Verification'
  | 'Confirmed'
  | 'Rejected';

export type StudentVerificationRequest = {
  id: string;
  memberId: string;
  status: StudentVerificationStatus;
  submittedAt: string;
  reviewedAt?: string;
  proofUri?: string;
  proofLabel?: string;
  reviewerNote?: string;
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

export type ClassCategory =
  | 'Fitness Classes'
  | 'Martial Arts'
  | 'Gymnastics'
  | 'Extra Classes';

export type ClassLevel =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'All Levels';

export type GymClass = {
  id: string;
  title: string;
  description?: string;
  instructorName: string;
  instructorImageUrl?: string;
  coverImageUrl?: string;
  startTime: string;
  endTime: string;
  price: number;
  currency: string;
  isPaid: boolean;
  status: 'Available' | 'Full' | 'Upcoming';
  isRegistered?: boolean;
  capacity: number;
  enrolledCount: number;
  caloriesBurned?: number;
  level?: ClassLevel;
  isPopular?: boolean;
  category: ClassCategory;
  location?: string;
  isActive: boolean;
};

export type ProductBadge = 'NEW' | 'SALE' | 'BESTSELLER';

export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  category?: ProductCategory;
  isAvailable: boolean;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  badge?: ProductBadge;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductCategory =
  | 'Supplements'
  | 'Apparel'
  | 'Equipment'
  | 'Accessories'
  | 'Nutrition'
  | 'Beverages';

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
  | 'Shop Reservation'
  | 'Class Reservation';

export type Voucher = {
  id: string;
  memberId?: string;
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
  visitsThisWeek: number;
  consecutiveStreak: number;
  estimatedCaloriesBurned: number;
};

export type JourneyStatKey =
  | 'averageWorkoutDuration'
  | 'visitsThisMonth'
  | 'estimatedCaloriesBurned'
  | 'visitsThisWeek';

export type JourneyMetricKey =
  | 'averageMonthlyVisits'
  | 'totalVisits'
  | 'averageCaloriesBurned'
  | 'averageWorkoutDuration';

export type JourneyMetrics = {
  averageMonthlyVisits: string;
  totalVisits: number;
  averageCaloriesBurned: number;
  averageWorkoutDuration: string;
};

export type WorkoutSession = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  estimatedCaloriesBurned: number;
};

export type JourneyHistoryRecord = {
  id: string;
  statKey: JourneyStatKey | JourneyMetricKey | 'all';
  startedAt: string;
  endedAt: string;
  summary: string;
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
  muscleGroup:
    // Chest
    | 'Upper Chest'
    | 'Middle Chest'
    | 'Lower Chest'
    // Back
    | 'Latissimus Dorsi'
    | 'Upper Back'
    | 'Lower Back'
    // Traps
    | 'Upper Traps'
    | 'Lower Traps'
    // Shoulders
    | 'Anterior Deltoid'
    | 'Lateral Deltoid'
    | 'Posterior Deltoid'
    // Biceps
    | 'Bicep Long Head'
    | 'Bicep Short Head'
    | 'Brachialis'
    // Triceps
    | 'Tricep Long Head'
    | 'Tricep Lateral Head'
    | 'Tricep Medial Head'
    // Forearms
    | 'Forearm Extensors'
    | 'Forearm Flexors'
    // Quads
    | 'Rectus Femoris'
    | 'Vastus Medialis'
    | 'Vastus Lateralis'
    // Hamstrings
    | 'Hamstrings'
    // Glutes
    | 'Gluteus Maximus'
    | 'Gluteus Medius'
    | 'Gluteus Minimus'
    // Calves & shin
    | 'Gastrocnemius'
    | 'Soleus'
    | 'Tibialis Anterior'
    // Core
    | 'Upper Abs'
    | 'Lower Abs'
    | 'Transverse Abdominis'
    | 'Obliques'
    // Inner thigh
    | 'Adductors';
  target: string;
  description: string;
  imageUri?: string;
  imageLabel: string;
  instructions: string[];
};
