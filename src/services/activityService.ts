import { gymActivityLevels } from '../mock';
import type { GymActivityDay, GymActivityLevel } from '../types';

export const getGymActivityLevels = async (): Promise<GymActivityLevel[]> => {
  return gymActivityLevels;
};

const weekdayHours = [
  '7 AM',
  '8 AM',
  '9 AM',
  '10 AM',
  '11 AM',
  '12 PM',
  '1 PM',
  '2 PM',
  '3 PM',
  '4 PM',
  '5 PM',
  '6 PM',
  '7 PM',
  '8 PM',
  '9 PM',
  '10 PM',
  '11 PM',
];

const saturdayHours = [
  '8 AM',
  '9 AM',
  '10 AM',
  '11 AM',
  '12 PM',
  '1 PM',
  '2 PM',
  '3 PM',
  '4 PM',
  '5 PM',
  '6 PM',
  '7 PM',
  '8 PM',
];

const sundayHours = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM'];

function getIntensity(count: number): GymActivityLevel['intensity'] {
  if (count >= 75) {
    return 'High';
  }

  if (count >= 40) {
    return 'Medium';
  }

  return 'Low';
}

function createHourlyLevels(dayPrefix: string, hours: string[]): GymActivityLevel[] {
  return hours.map((label, index) => {
    const isPeak = label === '5 PM' || label === '6 PM';
    const count = isPeak
      ? 100
      : Math.min(92, Math.max(12, 18 + ((index * 19 + dayPrefix.length * 7) % 58)));

    return {
      id: `${dayPrefix}-${index}`,
      label,
      count,
      intensity: getIntensity(count),
    };
  });
}

export const getGymActivitySchedule = async (): Promise<GymActivityDay[]> => {
  return [
    {
      id: 'activity-day-monday',
      dayLabel: 'Monday',
      scheduleLabel: '7:00 AM - 11:00 PM',
      levels: createHourlyLevels('monday', weekdayHours),
    },
    {
      id: 'activity-day-tuesday',
      dayLabel: 'Tuesday',
      scheduleLabel: '7:00 AM - 11:00 PM',
      levels: createHourlyLevels('tuesday', weekdayHours),
    },
    {
      id: 'activity-day-wednesday',
      dayLabel: 'Wednesday',
      scheduleLabel: '7:00 AM - 11:00 PM',
      levels: createHourlyLevels('wednesday', weekdayHours),
    },
    {
      id: 'activity-day-thursday',
      dayLabel: 'Thursday',
      scheduleLabel: '7:00 AM - 11:00 PM',
      levels: createHourlyLevels('thursday', weekdayHours),
    },
    {
      id: 'activity-day-friday',
      dayLabel: 'Friday',
      scheduleLabel: '7:00 AM - 11:00 PM',
      levels: createHourlyLevels('friday', weekdayHours),
    },
    {
      id: 'activity-day-saturday',
      dayLabel: 'Saturday',
      scheduleLabel: '8:00 AM - 8:00 PM',
      levels: createHourlyLevels('saturday', saturdayHours),
    },
    {
      id: 'activity-day-sunday',
      dayLabel: 'Sunday',
      scheduleLabel: '8:00 AM - 1:00 PM',
      levels: createHourlyLevels('sunday', sundayHours),
    },
  ];
};

export const activityService = {
  getGymActivityLevels,
  getGymActivitySchedule,
};
