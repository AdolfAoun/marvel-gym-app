import {
  achievements,
  attendanceDays,
  journeyProfile,
  journeyStats,
} from '../mock';
import type {
  Achievement,
  AttendanceDay,
  JourneyProfile,
  JourneyStats,
} from '../types';

let profileRecord: JourneyProfile = { ...journeyProfile };

export const getJourneyProfile = async (): Promise<JourneyProfile> => {
  return profileRecord;
};

export const updateJourneyProfile = async (
  updates: Partial<JourneyProfile>,
): Promise<JourneyProfile> => {
  profileRecord = {
    ...profileRecord,
    ...updates,
  };

  return profileRecord;
};

export const getAttendanceDays = async (): Promise<AttendanceDay[]> => {
  return attendanceDays;
};

export const getJourneyStats = async (): Promise<JourneyStats> => {
  return journeyStats;
};

export const getAchievements = async (): Promise<Achievement[]> => {
  return achievements;
};

export const journeyService = {
  getJourneyProfile,
  updateJourneyProfile,
  getAttendanceDays,
  getJourneyStats,
  getAchievements,
};
