import { gymActivityLevels } from '../mock';
import type { GymActivityLevel } from '../types';

export const getGymActivityLevels = async (): Promise<GymActivityLevel[]> => {
  return gymActivityLevels;
};

export const activityService = {
  getGymActivityLevels,
};
