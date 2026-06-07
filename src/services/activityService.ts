import { gymActivityLevels, gymActivitySchedule } from '../mock';
import type { GymActivityDay, GymActivityLevel } from '../types';

export const getGymActivityLevels = async (): Promise<GymActivityLevel[]> => {
  return gymActivityLevels;
};

export const getGymActivitySchedule = async (): Promise<GymActivityDay[]> => {
  return gymActivitySchedule;
};

export const activityService = {
  getGymActivityLevels,
  getGymActivitySchedule,
};
