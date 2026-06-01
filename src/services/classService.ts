import { gymClasses } from '../mock';
import type { GymClass } from '../types';

export const getScheduledClasses = async (): Promise<GymClass[]> => {
  return gymClasses;
};

export const registerForClass = async (
  classId: string,
): Promise<GymClass | undefined> => {
  const selectedClass = gymClasses.find((gymClass) => gymClass.id === classId);

  if (!selectedClass) {
    return undefined;
  }

  return {
    ...selectedClass,
    isRegistered: true,
  };
};

export const cancelClassRegistration = async (
  classId: string,
): Promise<GymClass | undefined> => {
  const selectedClass = gymClasses.find((gymClass) => gymClass.id === classId);

  if (!selectedClass) {
    return undefined;
  }

  return {
    ...selectedClass,
    isRegistered: false,
  };
};

export const classService = {
  getScheduledClasses,
  registerForClass,
  cancelClassRegistration,
};
