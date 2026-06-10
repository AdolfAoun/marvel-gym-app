import {
  achievements,
  attendanceDays,
  journeyProfile,
} from '../mock';
import type {
  Achievement,
  AttendanceDay,
  JourneyProfile,
  JourneyStatKey,
  JourneyStats,
  WorkoutSession,
} from '../types';

let profileRecord: JourneyProfile = { ...journeyProfile };
let attendanceRecords: AttendanceDay[] = createYearAttendanceDays(2026);
let resetStats = new Set<JourneyStatKey>();
let workoutSessions: WorkoutSession[] = [
  {
    id: 'workout-001',
    startedAt: '2026-06-01T17:30:00.000Z',
    endedAt: '2026-06-01T18:42:00.000Z',
    durationSeconds: 4320,
    estimatedCaloriesBurned: 576,
  },
  {
    id: 'workout-002',
    startedAt: '2026-06-04T18:20:00.000Z',
    endedAt: '2026-06-04T19:18:00.000Z',
    durationSeconds: 3480,
    estimatedCaloriesBurned: 464,
  },
];

function createYearAttendanceDays(year: number): AttendanceDay[] {
  const seedVisits = new Set(
    attendanceDays
      .filter((day) => day.hasVisit)
      .map((day) => day.date.slice(0, 10)),
  );
  const days: AttendanceDay[] = [];
  const current = new Date(Date.UTC(year, 0, 1));

  while (current.getUTCFullYear() === year) {
    const dateKey = current.toISOString().slice(0, 10);

    days.push({
      id: `visit-${dateKey}`,
      date: `${dateKey}T12:00:00.000Z`,
      hasVisit: seedVisits.has(dateKey),
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

function formatAverageDuration(seconds: number) {
  if (seconds <= 0) {
    return '0 min';
  }

  return `${Math.round(seconds / 60)} min`;
}

function calculateStreak(days: AttendanceDay[]) {
  const visitedDays = [...days]
    .sort((first, second) => second.date.localeCompare(first.date))
    .filter((day) => day.date <= new Date().toISOString());
  let streak = 0;

  for (const day of visitedDays) {
    if (!day.hasVisit && streak > 0) {
      break;
    }

    if (day.hasVisit) {
      streak += 1;
    }
  }

  return streak;
}

function estimateCalories(durationSeconds: number) {
  return Math.max(0, Math.round((durationSeconds / 60) * 8));
}

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
  return attendanceRecords;
};

export const toggleAttendanceDay = async (
  date: string,
): Promise<AttendanceDay[]> => {
  const dateKey = date.slice(0, 10);

  attendanceRecords = attendanceRecords.map((day) =>
    day.date.slice(0, 10) === dateKey
      ? { ...day, hasVisit: !day.hasVisit }
      : day,
  );
  resetStats.delete('visitsThisMonth');
  resetStats.delete('visitsThisYear');

  return attendanceRecords;
};

export const markAttendanceDay = async (
  date: string,
  hasVisit = true,
): Promise<AttendanceDay[]> => {
  const dateKey = date.slice(0, 10);

  attendanceRecords = attendanceRecords.map((day) =>
    day.date.slice(0, 10) === dateKey ? { ...day, hasVisit } : day,
  );
  resetStats.delete('visitsThisMonth');
  resetStats.delete('visitsThisYear');

  return attendanceRecords;
};

export const getWorkoutSessions = async (): Promise<WorkoutSession[]> => {
  return workoutSessions;
};

export const completeWorkoutSession = async (
  durationSeconds: number,
): Promise<WorkoutSession> => {
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - durationSeconds * 1000);
  const session: WorkoutSession = {
    id: `workout-${Date.now().toString(36)}`,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationSeconds,
    estimatedCaloriesBurned: estimateCalories(durationSeconds),
  };

  workoutSessions = [session, ...workoutSessions];
  resetStats.delete('averageWorkoutDuration');
  resetStats.delete('estimatedCaloriesBurned');

  return session;
};

export const resetJourneyStat = async (
  statKey: JourneyStatKey,
): Promise<JourneyStats> => {
  resetStats.add(statKey);

  return getJourneyStats();
};

export const getJourneyStats = async (): Promise<JourneyStats> => {
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const visitsThisMonth = attendanceRecords.filter(
    (day) => day.date.startsWith(currentMonthKey) && day.hasVisit,
  ).length;
  const visitsThisYear = attendanceRecords.filter((day) => day.hasVisit).length;
  const totalSeconds = workoutSessions.reduce(
    (total, session) => total + session.durationSeconds,
    0,
  );
  const averageSeconds =
    workoutSessions.length > 0 ? totalSeconds / workoutSessions.length : 0;
  const estimatedCaloriesBurned = workoutSessions.reduce(
    (total, session) => total + session.estimatedCaloriesBurned,
    0,
  );

  return {
    averageWorkoutDuration: resetStats.has('averageWorkoutDuration')
      ? '0 min'
      : formatAverageDuration(averageSeconds),
    visitsThisMonth: resetStats.has('visitsThisMonth') ? 0 : visitsThisMonth,
    visitsThisYear: resetStats.has('visitsThisYear') ? 0 : visitsThisYear,
    consecutiveStreak: calculateStreak(attendanceRecords),
    estimatedCaloriesBurned: resetStats.has('estimatedCaloriesBurned')
      ? 0
      : estimatedCaloriesBurned,
  };
};

export const getAchievements = async (): Promise<Achievement[]> => {
  return achievements;
};

export const journeyService = {
  getJourneyProfile,
  updateJourneyProfile,
  getAttendanceDays,
  toggleAttendanceDay,
  markAttendanceDay,
  getWorkoutSessions,
  completeWorkoutSession,
  resetJourneyStat,
  getJourneyStats,
  getAchievements,
};
