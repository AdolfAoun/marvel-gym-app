import type {
  AppNotification,
  ClassCategory,
  GymClass,
  NotificationType,
} from '../types';
import { createClassVoucher, cancelVoucher as cancelVoucherById } from './voucherService';

const classVoucherMap = new Map<string, string>();

type ScheduleCategory = ClassCategory;

type ScheduleSeed = {
  category: ScheduleCategory;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  time: string;
  title: string;
  coach: string;
};

const dayDates = {
  Monday: '2026-06-08',
  Tuesday: '2026-06-09',
  Wednesday: '2026-06-10',
  Thursday: '2026-06-11',
  Friday: '2026-06-12',
  Saturday: '2026-06-13',
} satisfies Record<ScheduleSeed['day'], string>;

const scheduleSeeds: ScheduleSeed[] = [
  { category: 'Fitness Classes', day: 'Monday', time: '9:00 AM', title: 'Strong', coach: 'Jolyss' },
  { category: 'Fitness Classes', day: 'Monday', time: '10:00 AM', title: 'Stretching', coach: 'Olga' },
  { category: 'Fitness Classes', day: 'Monday', time: '5:00 PM', title: 'Oriental Dance', coach: 'Maria' },
  { category: 'Fitness Classes', day: 'Monday', time: '6:00 PM', title: 'Circuit Training', coach: 'Jolyss' },
  { category: 'Fitness Classes', day: 'Monday', time: '7:00 PM', title: 'Fight', coach: 'Elie.S' },
  { category: 'Fitness Classes', day: 'Tuesday', time: '9:00 AM', title: 'Topride', coach: 'Chady' },
  { category: 'Fitness Classes', day: 'Tuesday', time: '10:00 AM', title: 'Animal Flow', coach: 'Olga' },
  { category: 'Fitness Classes', day: 'Tuesday', time: '10:00 AM', title: 'Yoga Fusion', coach: 'Elise Asbo' },
  { category: 'Fitness Classes', day: 'Tuesday', time: '5:00 PM', title: 'Animal Flow', coach: 'Olga' },
  { category: 'Fitness Classes', day: 'Tuesday', time: '6:00 PM', title: 'Stretching', coach: 'Olga' },
  { category: 'Fitness Classes', day: 'Tuesday', time: '7:00 PM', title: 'Sculpt', coach: 'Roula' },
  { category: 'Fitness Classes', day: 'Tuesday', time: '8:00 PM', title: 'Dance Fusion', coach: 'Sahar' },
  { category: 'Fitness Classes', day: 'Wednesday', time: '9:00 AM', title: 'Fit', coach: 'Jolyss' },
  { category: 'Fitness Classes', day: 'Wednesday', time: '10:00 AM', title: 'Pilates', coach: 'Jocelyne' },
  { category: 'Fitness Classes', day: 'Wednesday', time: '6:00 PM', title: 'TRX & Abs', coach: 'Jolyss' },
  { category: 'Fitness Classes', day: 'Wednesday', time: '7:00 PM', title: 'Pump', coach: 'Elie.S' },
  { category: 'Fitness Classes', day: 'Thursday', time: '9:00 AM', title: 'Core, Abs & Cardio', coach: 'Christian' },
  { category: 'Fitness Classes', day: 'Thursday', time: '5:00 PM', title: 'Animal Flow', coach: 'Olga' },
  { category: 'Fitness Classes', day: 'Thursday', time: '5:00 PM', title: 'Topride', coach: 'Chady' },
  { category: 'Fitness Classes', day: 'Thursday', time: '6:00 PM', title: 'Dance Fusion', coach: 'Sahar' },
  { category: 'Fitness Classes', day: 'Thursday', time: '7:00 PM', title: 'Sculpt', coach: 'Roula' },
  { category: 'Fitness Classes', day: 'Friday', time: '9:00 AM', title: 'Classic', coach: 'Jolyss' },
  { category: 'Fitness Classes', day: 'Friday', time: '10:00 AM', title: 'Stretching', coach: 'Olga' },
  { category: 'Fitness Classes', day: 'Friday', time: '5:30 PM', title: 'Yoga Fusion', coach: 'Elise Asbo' },
  { category: 'Fitness Classes', day: 'Friday', time: '6:00 PM', title: 'Glutes & Core', coach: 'Jolyss' },
  { category: 'Fitness Classes', day: 'Friday', time: '7:00 PM', title: 'Bootcamp', coach: 'Elie.S' },
  { category: 'Fitness Classes', day: 'Friday', time: '7:00 PM', title: 'Stretching', coach: 'Olga' },
  { category: 'Fitness Classes', day: 'Saturday', time: '9:00 AM', title: 'Animal Flow', coach: 'Olga' },
  { category: 'Fitness Classes', day: 'Saturday', time: '10:00 AM', title: 'Topride', coach: 'Chady' },
  { category: 'Fitness Classes', day: 'Saturday', time: '11:00 AM', title: 'Fit', coach: 'Jolyss' },
  { category: 'Fitness Classes', day: 'Saturday', time: '12:00 PM', title: 'Dance Fusion', coach: 'Sahar' },
  { category: 'Martial Arts', day: 'Thursday', time: '10:00 AM', title: 'Fitness Boxing', coach: 'Michel' },
  { category: 'Martial Arts', day: 'Saturday', time: '10:00 AM', title: 'Kungfu Junior', coach: 'Elie.S' },
  { category: 'Martial Arts', day: 'Tuesday', time: '12:00 PM', title: 'Taekwondo & Boxing', coach: 'Jolyss' },
  { category: 'Martial Arts', day: 'Thursday', time: '12:00 PM', title: 'Taekwondo & Boxing', coach: 'Jolyss' },
  { category: 'Martial Arts', day: 'Saturday', time: '12:00 PM', title: 'MMA Junior', coach: 'Elie.S' },
  { category: 'Martial Arts', day: 'Monday', time: '5:00 PM', title: 'Taekwondo', coach: 'Sascha' },
  { category: 'Martial Arts', day: 'Tuesday', time: '5:00 PM', title: 'Taekwondo', coach: 'Jolyss' },
  { category: 'Martial Arts', day: 'Thursday', time: '5:00 PM', title: 'Taekwondo', coach: 'Jolyss' },
  { category: 'Martial Arts', day: 'Friday', time: '5:00 PM', title: 'Taekwondo', coach: 'Sascha' },
  { category: 'Martial Arts', day: 'Wednesday', time: '5:30 PM', title: 'MMA Junior', coach: 'Elie.S' },
  { category: 'Martial Arts', day: 'Monday', time: '6:00 PM', title: 'MMA Junior', coach: 'Elie.S' },
  { category: 'Martial Arts', day: 'Tuesday', time: '6:00 PM', title: 'Taekwondo', coach: 'Jolyss' },
  { category: 'Martial Arts', day: 'Thursday', time: '6:00 PM', title: 'Taekwondo', coach: 'Jolyss' },
  { category: 'Martial Arts', day: 'Wednesday', time: '6:30 PM', title: 'Boxing Kids', coach: 'Michel' },
  { category: 'Martial Arts', day: 'Monday', time: '7:00 PM', title: 'Boxing Kids', coach: 'Michel' },
  { category: 'Martial Arts', day: 'Tuesday', time: '7:00 PM', title: 'Thai Boxing', coach: 'Michel' },
  { category: 'Martial Arts', day: 'Thursday', time: '7:00 PM', title: 'Thai Boxing', coach: 'Michel' },
  { category: 'Martial Arts', day: 'Monday', time: '8:00 PM', title: 'MMA + BBJ', coach: 'Elie.S' },
  { category: 'Martial Arts', day: 'Tuesday', time: '8:00 PM', title: 'Kickboxing', coach: 'Elie.S' },
  { category: 'Martial Arts', day: 'Wednesday', time: '8:00 PM', title: 'MMA + BBJ', coach: 'Elie.S' },
  { category: 'Martial Arts', day: 'Thursday', time: '8:00 PM', title: 'Kickboxing', coach: 'Elie.S' },
  { category: 'Extra Classes', day: 'Monday', time: '11:00 AM', title: 'Dance Fusion', coach: 'Sahar' },
  { category: 'Extra Classes', day: 'Thursday', time: '11:00 AM', title: 'Dance Fusion', coach: 'Sahar' },
  { category: 'Extra Classes', day: 'Monday', time: '6:00 PM', title: 'Mixed Dance for Kids', coach: 'Sarah Beiny' },
  { category: 'Extra Classes', day: 'Wednesday', time: '6:00 PM', title: 'Mixed Dance for Kids', coach: 'Sarah Beiny' },
  { category: 'Extra Classes', day: 'Monday', time: '7:00 PM', title: 'Mixed Dance for Teens', coach: 'Sarah Beiny' },
  { category: 'Extra Classes', day: 'Wednesday', time: '7:00 PM', title: 'Mixed Dance for Teens', coach: 'Sarah Beiny' },
  { category: 'Gymnastics', day: 'Saturday', time: '9:00 AM', title: 'Gymnastics', coach: 'Christina' },
  { category: 'Gymnastics', day: 'Tuesday', time: '6:00 PM', title: 'Gymnastics', coach: 'Christina' },
];

function parseTimeLabel(time: string) {
  const [rawHour, rawMinuteMeridiem] = time.split(':');
  const [rawMinute, meridiem] = rawMinuteMeridiem.split(' ');
  let hour = Number(rawHour);
  const minute = Number(rawMinute);

  if (meridiem === 'PM' && hour !== 12) {
    hour += 12;
  }

  if (meridiem === 'AM' && hour === 12) {
    hour = 0;
  }

  return { hour, minute };
}

function createIsoDate(day: ScheduleSeed['day'], time: string, durationMinutes = 50) {
  const { hour, minute } = parseTimeLabel(time);
  const start = new Date(`${dayDates[day]}T00:00:00.000Z`);

  start.setUTCHours(hour, minute, 0, 0);

  const end = new Date(start.getTime() + durationMinutes * 60_000);

  return {
    endTime: end.toISOString(),
    startTime: start.toISOString(),
  };
}

const unsplash = (id: string, w = 600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

// Category cover art keeps each session visually grounded in its discipline.
const categoryCovers: Record<ScheduleCategory, string[]> = {
  'Fitness Classes': [
    unsplash('1518611012118-696072aa579a'),
    unsplash('1599058917765-a780eda07a3e'),
    unsplash('1534438327276-14e5300c3a48'),
  ],
  'Martial Arts': [
    unsplash('1594381898411-846e7d193883'),
    unsplash('1549060279-7e168fcee0c2'),
  ],
  Gymnastics: [unsplash('1530021232320-687d8e3dba54'), unsplash('1571902943202-507ec2618e8f')],
  'Extra Classes': [unsplash('1571902943202-507ec2618e8f'), unsplash('1571019613454-1cb2f99b2d8b')],
};

const coachAvatars = [
  unsplash('1507003211169-0a1dd7228f2d', 200),
  unsplash('1500648767791-00dcc994a43e', 200),
  unsplash('1494790108377-be9c29b29330', 200),
  unsplash('1599566150163-29194dcaad36', 200),
];

const categoryCalories: Record<ScheduleCategory, number> = {
  'Fitness Classes': 520,
  'Martial Arts': 610,
  Gymnastics: 340,
  'Extra Classes': 380,
};

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getClassLevel(seed: ScheduleSeed): GymClass['level'] {
  if (seed.category === 'Martial Arts') return 'Advanced';
  if (seed.category === 'Gymnastics' || seed.title.includes('Junior') || seed.title.includes('Kids'))
    return 'Beginner';
  if (seed.category === 'Extra Classes') return 'All Levels';
  return hashString(seed.title) % 2 === 0 ? 'Intermediate' : 'All Levels';
}

function createClass(seed: ScheduleSeed, index: number): GymClass {
  const { startTime, endTime } = createIsoDate(seed.day, seed.time);
  const capacity =
    seed.category === 'Martial Arts' ? 16 : seed.category === 'Gymnastics' ? 10 : 18;
  const enrolledCount = Math.min(capacity - 1, 7 + (index % 8));
  const covers = categoryCovers[seed.category];
  const baseCalories = categoryCalories[seed.category];

  return {
    id: `class-${index.toString().padStart(3, '0')}`,
    title: seed.title,
    description: `${seed.category} session with Coach ${seed.coach}.`,
    instructorName: seed.coach,
    instructorImageUrl: coachAvatars[hashString(seed.coach) % coachAvatars.length],
    coverImageUrl: covers[index % covers.length],
    startTime,
    endTime,
    price: 0,
    currency: 'USD',
    isPaid: false,
    status: enrolledCount >= capacity ? 'Full' : 'Available',
    isRegistered: false,
    capacity,
    enrolledCount,
    caloriesBurned: baseCalories + ((hashString(seed.title) % 8) - 4) * 10,
    level: getClassLevel(seed),
    isPopular: index % 7 === 0,
    category: seed.category,
    isActive: true,
  };
}

let classRecords: GymClass[] = scheduleSeeds.map(createClass);
let latestClassUpdate: AppNotification | undefined;

export type ClassMutationInput = {
  capacity: number;
  instructorName: string;
  instructorImageUrl?: string;
  category: ClassCategory;
  startTime: string;
  status: GymClass['status'];
  title: string;
};

function createClassUpdate(
  gymClass: GymClass,
  action: 'reserved' | 'canceled',
): AppNotification {
  const type: NotificationType = action === 'reserved' ? 'Success' : 'Warning';
  const title = action === 'reserved' ? 'Class reserved' : 'Class reservation canceled';
  const verb = action === 'reserved' ? 'reserved' : 'canceled';

  return {
    id: `class-update-${Date.now().toString(36)}`,
    title,
    message: `You ${verb} ${gymClass.title} with Coach ${gymClass.instructorName}.`,
    type,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
}

export const getScheduledClasses = async (): Promise<GymClass[]> => {
  return [...classRecords];
};

export const getAdminClasses = async (): Promise<GymClass[]> => {
  return [...classRecords];
};

export const createAdminClass = async (
  input: ClassMutationInput,
): Promise<GymClass> => {
  const start = new Date(input.startTime);
  const end = new Date(start.getTime() + 50 * 60_000);
  const gymClass: GymClass = {
    id: `class-${Date.now().toString(36)}`,
    title: input.title,
    description: `${input.category} session with Coach ${input.instructorName}.`,
    instructorName: input.instructorName,
    instructorImageUrl: input.instructorImageUrl,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    price: 0,
    currency: 'USD',
    isPaid: false,
    status: input.status,
    isRegistered: false,
    capacity: input.capacity,
    enrolledCount: 0,
    category: input.category,
    isActive: true,
  };

  classRecords = [gymClass, ...classRecords];

  return gymClass;
};

export const updateAdminClass = async (
  classId: string,
  updates: Partial<ClassMutationInput>,
): Promise<GymClass | undefined> => {
  let updatedClass: GymClass | undefined;

  classRecords = classRecords.map((gymClass) => {
    if (gymClass.id !== classId) {
      return gymClass;
    }

    const startTime = updates.startTime
      ? new Date(updates.startTime).toISOString()
      : gymClass.startTime;
    const endTime = updates.startTime
      ? new Date(new Date(updates.startTime).getTime() + 50 * 60_000).toISOString()
      : gymClass.endTime;

    updatedClass = {
      ...gymClass,
      ...updates,
      startTime,
      endTime,
      description: `${updates.category ?? gymClass.category} session with Coach ${
        updates.instructorName ?? gymClass.instructorName
      }.`,
    };

    return updatedClass;
  });

  return updatedClass;
};

export const deleteAdminClass = async (
  classId: string,
): Promise<GymClass | undefined> => {
  const deletedClass = classRecords.find((gymClass) => gymClass.id === classId);

  classRecords = classRecords.filter((gymClass) => gymClass.id !== classId);

  return deletedClass;
};

export const registerForClass = async (
  classId: string,
): Promise<GymClass | undefined> => {
  let updatedClass: GymClass | undefined;

  classRecords = classRecords.map((gymClass) => {
    if (gymClass.id !== classId || gymClass.isRegistered) {
      return gymClass;
    }

    updatedClass = {
      ...gymClass,
      enrolledCount: Math.min(gymClass.capacity, gymClass.enrolledCount + 1),
      isRegistered: true,
      status:
        gymClass.enrolledCount + 1 >= gymClass.capacity ? 'Full' : 'Available',
    };

    return updatedClass;
  });

  if (updatedClass) {
    latestClassUpdate = createClassUpdate(updatedClass, 'reserved');
    const voucher = await createClassVoucher(updatedClass.title, updatedClass.instructorName, 0);
    classVoucherMap.set(classId, voucher.id);
  }

  return updatedClass;
};

export const cancelClassRegistration = async (
  classId: string,
): Promise<GymClass | undefined> => {
  let updatedClass: GymClass | undefined;

  classRecords = classRecords.map((gymClass) => {
    if (gymClass.id !== classId || !gymClass.isRegistered) {
      return gymClass;
    }

    updatedClass = {
      ...gymClass,
      enrolledCount: Math.max(0, gymClass.enrolledCount - 1),
      isRegistered: false,
      status: 'Available',
    };

    return updatedClass;
  });

  if (updatedClass) {
    latestClassUpdate = createClassUpdate(updatedClass, 'canceled');
    const voucherId = classVoucherMap.get(classId);
    if (voucherId) {
      await cancelVoucherById(voucherId);
      classVoucherMap.delete(classId);
    }
  }

  return updatedClass;
};

export const getLatestClassUpdate = async (): Promise<
  AppNotification | undefined
> => {
  return latestClassUpdate;
};

export const classService = {
  getScheduledClasses,
  getAdminClasses,
  createAdminClass,
  updateAdminClass,
  deleteAdminClass,
  registerForClass,
  cancelClassRegistration,
  getLatestClassUpdate,
};
