import {
  achievements,
  attendanceDays,
  journeyProfile,
} from '../mock';
import type {
  Achievement,
  AttendanceDay,
  JourneyHistoryRecord,
  JourneyMetricKey,
  JourneyMetrics,
  JourneyProfile,
  JourneyStatKey,
  JourneyStats,
  WorkoutSession,
} from '../types';

let profileRecord: JourneyProfile = { ...journeyProfile };
let attendanceRecords: AttendanceDay[] = createYearAttendanceDays(2026);
const initialPeriodStart = '2026-06-01T00:00:00.000Z';
let activePeriodStarts: Record<JourneyStatKey, string> = {
  averageWorkoutDuration: initialPeriodStart,
  estimatedCaloriesBurned: initialPeriodStart,
  visitsThisMonth: initialPeriodStart,
  visitsThisWeek: initialPeriodStart,
};
let historyRecords: JourneyHistoryRecord[] = [];
let resetSnapshots: {
  historyRecord: JourneyHistoryRecord;
  previousStarts: Partial<Record<JourneyStatKey, string>>;
  statKeys: JourneyStatKey[];
}[] = [];
const timerTrackerRetentionMs = 3 * 24 * 60 * 60 * 1000;
let timerWorkoutSessionIds = new Set<string>();
let workoutSessions: WorkoutSession[] = [
  {
    id: 'workout-2026-04-02',
    startedAt: '2026-04-02T17:45:00.000Z',
    endedAt: '2026-04-02T18:42:00.000Z',
    durationSeconds: 3420,
    estimatedCaloriesBurned: 456,
  },
  {
    id: 'workout-2026-04-10',
    startedAt: '2026-04-10T18:05:00.000Z',
    endedAt: '2026-04-10T19:18:00.000Z',
    durationSeconds: 4380,
    estimatedCaloriesBurned: 584,
  },
  {
    id: 'workout-2026-04-22',
    startedAt: '2026-04-22T17:30:00.000Z',
    endedAt: '2026-04-22T18:38:00.000Z',
    durationSeconds: 4080,
    estimatedCaloriesBurned: 544,
  },
  {
    id: 'workout-2026-05-05',
    startedAt: '2026-05-05T18:00:00.000Z',
    endedAt: '2026-05-05T19:05:00.000Z',
    durationSeconds: 3900,
    estimatedCaloriesBurned: 520,
  },
  {
    id: 'workout-2026-05-14',
    startedAt: '2026-05-14T18:20:00.000Z',
    endedAt: '2026-05-14T19:35:00.000Z',
    durationSeconds: 4500,
    estimatedCaloriesBurned: 600,
  },
  {
    id: 'workout-2026-05-28',
    startedAt: '2026-05-28T10:15:00.000Z',
    endedAt: '2026-05-28T11:08:00.000Z',
    durationSeconds: 3180,
    estimatedCaloriesBurned: 424,
  },
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
  {
    id: 'workout-2026-06-12',
    startedAt: '2026-06-12T17:55:00.000Z',
    endedAt: '2026-06-12T19:03:00.000Z',
    durationSeconds: 4080,
    estimatedCaloriesBurned: 544,
  },
  {
    id: 'workout-2026-07-01',
    startedAt: '2026-07-01T18:15:00.000Z',
    endedAt: '2026-07-01T19:10:00.000Z',
    durationSeconds: 3300,
    estimatedCaloriesBurned: 440,
  },
  {
    id: 'workout-2026-07-02',
    startedAt: '2026-07-02T07:30:00.000Z',
    endedAt: '2026-07-02T08:22:00.000Z',
    durationSeconds: 3120,
    estimatedCaloriesBurned: 416,
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

  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
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

const profileNumberWords: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
};

function parseProfileNumber(value?: string) {
  if (!value) return undefined;
  const normalizedValue = value.toLowerCase();
  if (profileNumberWords[normalizedValue] !== undefined) {
    return profileNumberWords[normalizedValue];
  }
  const numericValue = Number.parseInt(value, 10);
  return Number.isNaN(numericValue) ? undefined : numericValue;
}

function estimateProfileCalories(durationSeconds: number) {
  const bio = profileRecord.biography.toLowerCase();
  const durationMinutes = Math.max(0, durationSeconds / 60);
  const weightKgMatch = bio.match(/(\d{2,3})\s?(kg|kgs|kilograms?)/);
  const weightLbMatch = bio.match(/(\d{2,3})\s?(lb|lbs|pounds?)/);
  const heightCmMatch = bio.match(/(\d{3})\s?(cm|centimeters?)/);
  const frequencyMatch = bio.match(
    /(\d+|one|two|three|four|five|six|seven)\s+(?:days?|times?)\s+(?:a|per)\s+week/,
  );
  const weightKg = weightKgMatch
    ? Number.parseInt(weightKgMatch[1], 10)
    : weightLbMatch
      ? Math.round(Number.parseInt(weightLbMatch[1], 10) * 0.453592)
      : undefined;
  const heightCm = heightCmMatch ? Number.parseInt(heightCmMatch[1], 10) : undefined;
  const sessionsPerWeek = parseProfileNumber(frequencyMatch?.[1]);
  let caloriesPerMinute = 6.6;

  if (weightKg) {
    caloriesPerMinute += (weightKg - 70) * 0.025;
  }
  if (heightCm) {
    caloriesPerMinute += (heightCm - 170) * 0.004;
  }
  if (sessionsPerWeek) {
    caloriesPerMinute += sessionsPerWeek >= 5 ? 0.25 : -0.12;
  }
  if (bio.includes('fat loss') || bio.includes('lose weight') || bio.includes('weight loss')) {
    caloriesPerMinute += 0.35;
  } else if (bio.includes('endurance') || bio.includes('cardio')) {
    caloriesPerMinute += 0.5;
  } else if (bio.includes('strength') || bio.includes('muscle') || bio.includes('lean')) {
    caloriesPerMinute += 0.12;
  }

  const clampedCaloriesPerMinute = Math.min(9.2, Math.max(5, caloriesPerMinute));
  return Math.round(durationMinutes * clampedCaloriesPerMinute);
}

function buildLocalDateTime(date: string, time: string) {
  return new Date(`${date.slice(0, 10)}T${time}:00`);
}

function pruneTimerWorkoutTracker(now = Date.now()) {
  const trackedIds = new Set<string>();

  workoutSessions.forEach((session) => {
    if (!timerWorkoutSessionIds.has(session.id)) return;
    const endedAt = new Date(session.endedAt).getTime();
    if (!Number.isNaN(endedAt) && now - endedAt <= timerTrackerRetentionMs) {
      trackedIds.add(session.id);
    }
  });

  timerWorkoutSessionIds = trackedIds;
}

function sessionOverlapsRange(session: WorkoutSession, startedAt: Date, endedAt: Date) {
  const sessionStartedAt = new Date(session.startedAt).getTime();
  const sessionEndedAt = new Date(session.endedAt).getTime();

  return sessionStartedAt < endedAt.getTime() && sessionEndedAt > startedAt.getTime();
}

function isOnOrAfter(value: string, baseline: string) {
  return new Date(value).getTime() >= new Date(baseline).getTime();
}

function formatPeriodDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getPeriodSummary(stats: JourneyStats) {
  return [
    `Avg Duration: ${stats.averageWorkoutDuration}`,
    `Monthly visits: ${stats.visitsThisMonth}`,
    `Calories Burned: ${stats.estimatedCaloriesBurned}`,
    `Weekly visits: ${stats.visitsThisWeek}`,
  ].join('\n');
}

const journeyDashboardStatKeys: JourneyStatKey[] = [
  'averageWorkoutDuration',
  'visitsThisMonth',
  'estimatedCaloriesBurned',
  'visitsThisWeek',
];

function getCurrentWeekStart() {
  const now = new Date();
  const weekStart = new Date(now);
  const dayOfWeek = weekStart.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);

  return weekStart;
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

  return attendanceRecords;
};

export const getWorkoutSessions = async (): Promise<WorkoutSession[]> => {
  pruneTimerWorkoutTracker();
  return workoutSessions;
};

export const completeWorkoutSession = async (
  durationSeconds: number,
): Promise<WorkoutSession> => {
  pruneTimerWorkoutTracker();
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - durationSeconds * 1000);
  const session: WorkoutSession = {
    id: `workout-${Date.now().toString(36)}`,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationSeconds,
    estimatedCaloriesBurned: estimateProfileCalories(durationSeconds),
  };

  workoutSessions = [session, ...workoutSessions];
  timerWorkoutSessionIds.add(session.id);

  return session;
};

export const logWorkoutSessionForDay = async (input: {
  date: string;
  endTime: string;
  startTime: string;
}): Promise<WorkoutSession> => {
  pruneTimerWorkoutTracker();
  const dateKey = input.date.slice(0, 10);
  const startedAt = buildLocalDateTime(input.date, input.startTime);
  const endedAt = buildLocalDateTime(input.date, input.endTime);

  if (
    Number.isNaN(startedAt.getTime()) ||
    Number.isNaN(endedAt.getTime()) ||
    endedAt.getTime() <= startedAt.getTime()
  ) {
    throw new Error('Invalid workout session time range.');
  }

  const durationSeconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
  const session: WorkoutSession = {
    id: `workout-${Date.now().toString(36)}`,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationSeconds,
    estimatedCaloriesBurned: estimateProfileCalories(durationSeconds),
  };
  const overlappingTimerIds = new Set(
    workoutSessions
      .filter(
        (existingSession) =>
          timerWorkoutSessionIds.has(existingSession.id) &&
          existingSession.startedAt.slice(0, 10) === dateKey &&
          sessionOverlapsRange(existingSession, startedAt, endedAt),
      )
      .map((existingSession) => existingSession.id),
  );

  workoutSessions = [
    session,
    ...workoutSessions.filter((existingSession) => !overlappingTimerIds.has(existingSession.id)),
  ];
  timerWorkoutSessionIds = new Set(
    [...timerWorkoutSessionIds].filter((sessionId) => !overlappingTimerIds.has(sessionId)),
  );
  attendanceRecords = attendanceRecords.map((day) =>
    day.date.slice(0, 10) === dateKey ? { ...day, hasVisit: true } : day,
  );

  return session;
};

const resetJourneyStats = async (
  statKeys: JourneyStatKey[],
): Promise<JourneyStats> => {
  const endedAt = new Date().toISOString();
  const previousStarts = statKeys.reduce<Partial<Record<JourneyStatKey, string>>>(
    (starts, statKey) => ({
      ...starts,
      [statKey]: activePeriodStarts[statKey],
    }),
    {},
  );
  const earliestPreviousStart = statKeys
    .map((statKey) => previousStarts[statKey])
    .filter(Boolean)
    .sort()[0] ?? initialPeriodStart;
  const statsBeforeReset = await getJourneyStats();
  const historyRecord: JourneyHistoryRecord = {
    id: `journey-history-${Date.now().toString(36)}`,
    statKey: statKeys.length === 1 ? statKeys[0] : 'all',
    startedAt: earliestPreviousStart,
    endedAt,
    summary: getPeriodSummary(statsBeforeReset),
  };

  resetSnapshots = [
    {
      historyRecord,
      previousStarts,
      statKeys,
    },
    ...resetSnapshots.filter(
      (snapshot) =>
        !snapshot.statKeys.some((snapshotKey) => statKeys.includes(snapshotKey)),
    ),
  ];
  activePeriodStarts = statKeys.reduce(
    (starts, statKey) => ({
      ...starts,
      [statKey]: endedAt,
    }),
    activePeriodStarts,
  );

  return getJourneyStats();
};

export const resetJourneyStat = async (
  statKey: JourneyStatKey,
): Promise<JourneyStats> => resetJourneyStats([statKey]);

export const resetAllJourneyStats = async (): Promise<JourneyStats> =>
  resetJourneyStats(journeyDashboardStatKeys);

export const undoResetJourneyStat = async (
  statKey: JourneyStatKey,
): Promise<JourneyStats> => {
  const snapshot = resetSnapshots.find((item) => item.statKeys.includes(statKey));

  if (!snapshot) {
    return getJourneyStats();
  }

  activePeriodStarts = {
    ...activePeriodStarts,
    ...snapshot.previousStarts,
  };
  resetSnapshots = resetSnapshots.filter((item) => item !== snapshot);

  return getJourneyStats();
};

export const undoResetAllJourneyStats = async (): Promise<JourneyStats> => {
  const snapshot = resetSnapshots.find((item) =>
    journeyDashboardStatKeys.every((statKey) => item.statKeys.includes(statKey)),
  );

  if (!snapshot) {
    return getJourneyStats();
  }

  activePeriodStarts = {
    ...activePeriodStarts,
    ...snapshot.previousStarts,
  };
  resetSnapshots = resetSnapshots.filter((item) => item !== snapshot);

  return getJourneyStats();
};

export const saveJourneyReset = async (
  statKey: JourneyStatKey,
): Promise<JourneyHistoryRecord[]> => {
  const snapshot = resetSnapshots.find((item) => item.statKeys.includes(statKey));

  if (!snapshot) {
    return historyRecords;
  }

  historyRecords = [snapshot.historyRecord, ...historyRecords];
  resetSnapshots = resetSnapshots.filter((item) => item !== snapshot);

  return historyRecords;
};

export const saveAllJourneyReset = async (): Promise<JourneyHistoryRecord[]> => {
  const snapshot = resetSnapshots.find((item) =>
    journeyDashboardStatKeys.every((statKey) => item.statKeys.includes(statKey)),
  );

  if (!snapshot) {
    return historyRecords;
  }

  historyRecords = [snapshot.historyRecord, ...historyRecords];
  resetSnapshots = resetSnapshots.filter((item) => item !== snapshot);

  return historyRecords;
};

export const getJourneyHistory = async (): Promise<JourneyHistoryRecord[]> => {
  return historyRecords;
};

export const clearJourneyHistory = async (): Promise<JourneyHistoryRecord[]> => {
  historyRecords = [];
  return historyRecords;
};

export const getJourneyStats = async (): Promise<JourneyStats> => {
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentWeekStart = getCurrentWeekStart();
  const attendanceForMonth = attendanceRecords.filter(
    (day) =>
      day.date.startsWith(currentMonthKey) &&
      day.hasVisit &&
      isOnOrAfter(day.date, activePeriodStarts.visitsThisMonth),
  );
  const attendanceForWeek = attendanceRecords.filter(
    (day) =>
      day.hasVisit &&
      new Date(day.date).getTime() >= currentWeekStart.getTime() &&
      isOnOrAfter(day.date, activePeriodStarts.visitsThisWeek),
  );
  const durationSessions = workoutSessions.filter((session) =>
    isOnOrAfter(session.endedAt, activePeriodStarts.averageWorkoutDuration),
  );
  const calorieSessions = workoutSessions.filter((session) =>
    isOnOrAfter(session.endedAt, activePeriodStarts.estimatedCaloriesBurned),
  );
  const totalSeconds = durationSessions.reduce(
    (total, session) => total + session.durationSeconds,
    0,
  );
  const averageSeconds =
    durationSessions.length > 0 ? totalSeconds / durationSessions.length : 0;
  const estimatedCaloriesBurned = calorieSessions.reduce(
    (total, session) => total + session.estimatedCaloriesBurned,
    0,
  );

  return {
    averageWorkoutDuration: formatAverageDuration(averageSeconds),
    visitsThisMonth: attendanceForMonth.length,
    visitsThisWeek: attendanceForWeek.length,
    consecutiveStreak: calculateStreak(attendanceRecords),
    estimatedCaloriesBurned,
  };
};

export const formatJourneyHistoryRange = (
  historyRecord: JourneyHistoryRecord,
): string => {
  return `${formatPeriodDate(historyRecord.startedAt)} - ${formatPeriodDate(
    historyRecord.endedAt,
  )}`;
};

// ---------------------------------------------------------------------------
// All-time metrics with reset/undo/save history (parallel to the period stats).
// Resetting a metric advances its baseline date so older data stops counting,
// while the pre-reset snapshot is preserved and can be saved to history.
// ---------------------------------------------------------------------------

const initialMetricStart = '2026-01-01T00:00:00.000Z';
const journeyMetricKeys: JourneyMetricKey[] = [
  'averageMonthlyVisits',
  'totalVisits',
  'averageCaloriesBurned',
  'averageWorkoutDuration',
];
let metricPeriodStarts: Record<JourneyMetricKey, string> = {
  averageMonthlyVisits: initialMetricStart,
  totalVisits: initialMetricStart,
  averageCaloriesBurned: initialMetricStart,
  averageWorkoutDuration: initialMetricStart,
};
let metricResetSnapshots: {
  historyRecord: JourneyHistoryRecord;
  previousStarts: Partial<Record<JourneyMetricKey, string>>;
  metricKeys: JourneyMetricKey[];
}[] = [];

function getMetricSummary(metrics: JourneyMetrics) {
  return [
    `Avg monthly visits: ${metrics.averageMonthlyVisits}`,
    `Total visits: ${metrics.totalVisits}`,
    `Avg calories: ${metrics.averageCaloriesBurned}`,
    `Avg duration: ${metrics.averageWorkoutDuration}`,
  ].join('\n');
}

export const getJourneyMetrics = async (): Promise<JourneyMetrics> => {
  const totalVisitDays = attendanceRecords.filter(
    (day) => day.hasVisit && isOnOrAfter(day.date, metricPeriodStarts.totalVisits),
  );
  const monthlyVisitDays = attendanceRecords.filter(
    (day) =>
      day.hasVisit &&
      isOnOrAfter(day.date, metricPeriodStarts.averageMonthlyVisits),
  );
  const trackedMonths = new Set(
    monthlyVisitDays.map((day) => day.date.slice(0, 7)),
  );
  const averageMonthlyVisits =
    trackedMonths.size > 0 ? monthlyVisitDays.length / trackedMonths.size : 0;

  const calorieSessions = workoutSessions.filter((session) =>
    isOnOrAfter(session.endedAt, metricPeriodStarts.averageCaloriesBurned),
  );
  const durationSessions = workoutSessions.filter((session) =>
    isOnOrAfter(session.endedAt, metricPeriodStarts.averageWorkoutDuration),
  );
  const averageCaloriesBurned =
    calorieSessions.length > 0
      ? Math.round(
          calorieSessions.reduce(
            (total, session) => total + session.estimatedCaloriesBurned,
            0,
          ) / calorieSessions.length,
        )
      : 0;
  const averageDurationSeconds =
    durationSessions.length > 0
      ? durationSessions.reduce(
          (total, session) => total + session.durationSeconds,
          0,
        ) / durationSessions.length
      : 0;

  return {
    averageMonthlyVisits: Number.isInteger(averageMonthlyVisits)
      ? `${averageMonthlyVisits}`
      : averageMonthlyVisits.toFixed(1),
    totalVisits: totalVisitDays.length,
    averageCaloriesBurned,
    averageWorkoutDuration: formatAverageDuration(averageDurationSeconds),
  };
};

const resetJourneyMetrics = async (
  metricKeys: JourneyMetricKey[],
): Promise<JourneyMetrics> => {
  const endedAt = new Date().toISOString();
  const previousStarts = metricKeys.reduce<
    Partial<Record<JourneyMetricKey, string>>
  >(
    (starts, metricKey) => ({
      ...starts,
      [metricKey]: metricPeriodStarts[metricKey],
    }),
    {},
  );
  const earliestPreviousStart =
    metricKeys
      .map((metricKey) => previousStarts[metricKey])
      .filter(Boolean)
      .sort()[0] ?? initialMetricStart;
  const metricsBeforeReset = await getJourneyMetrics();
  const historyRecord: JourneyHistoryRecord = {
    id: `journey-metric-history-${Date.now().toString(36)}`,
    statKey: metricKeys.length === 1 ? metricKeys[0] : 'all',
    startedAt: earliestPreviousStart,
    endedAt,
    summary: getMetricSummary(metricsBeforeReset),
  };

  metricResetSnapshots = [
    {
      historyRecord,
      previousStarts,
      metricKeys,
    },
    ...metricResetSnapshots.filter(
      (snapshot) =>
        !snapshot.metricKeys.some((snapshotKey) =>
          metricKeys.includes(snapshotKey),
        ),
    ),
  ];
  metricPeriodStarts = metricKeys.reduce(
    (starts, metricKey) => ({
      ...starts,
      [metricKey]: endedAt,
    }),
    metricPeriodStarts,
  );

  return getJourneyMetrics();
};

export const resetJourneyMetric = async (
  metricKey: JourneyMetricKey,
): Promise<JourneyMetrics> => resetJourneyMetrics([metricKey]);

export const resetAllJourneyMetrics = async (): Promise<JourneyMetrics> =>
  resetJourneyMetrics(journeyMetricKeys);

export const undoResetJourneyMetric = async (
  metricKey: JourneyMetricKey,
): Promise<JourneyMetrics> => {
  const snapshot = metricResetSnapshots.find((item) =>
    item.metricKeys.includes(metricKey),
  );

  if (!snapshot) {
    return getJourneyMetrics();
  }

  metricPeriodStarts = {
    ...metricPeriodStarts,
    ...snapshot.previousStarts,
  };
  metricResetSnapshots = metricResetSnapshots.filter(
    (item) => item !== snapshot,
  );

  return getJourneyMetrics();
};

export const undoResetAllJourneyMetrics = async (): Promise<JourneyMetrics> => {
  const snapshot = metricResetSnapshots.find((item) =>
    journeyMetricKeys.every((metricKey) => item.metricKeys.includes(metricKey)),
  );

  if (!snapshot) {
    return getJourneyMetrics();
  }

  metricPeriodStarts = {
    ...metricPeriodStarts,
    ...snapshot.previousStarts,
  };
  metricResetSnapshots = metricResetSnapshots.filter(
    (item) => item !== snapshot,
  );

  return getJourneyMetrics();
};

export const saveJourneyMetricReset = async (
  metricKey: JourneyMetricKey,
): Promise<JourneyHistoryRecord[]> => {
  const snapshot = metricResetSnapshots.find((item) =>
    item.metricKeys.includes(metricKey),
  );

  if (!snapshot) {
    return historyRecords;
  }

  historyRecords = [snapshot.historyRecord, ...historyRecords];
  metricResetSnapshots = metricResetSnapshots.filter(
    (item) => item !== snapshot,
  );

  return historyRecords;
};

export const saveAllJourneyMetricReset = async (): Promise<
  JourneyHistoryRecord[]
> => {
  const snapshot = metricResetSnapshots.find((item) =>
    journeyMetricKeys.every((metricKey) => item.metricKeys.includes(metricKey)),
  );

  if (!snapshot) {
    return historyRecords;
  }

  historyRecords = [snapshot.historyRecord, ...historyRecords];
  metricResetSnapshots = metricResetSnapshots.filter(
    (item) => item !== snapshot,
  );

  return historyRecords;
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
  logWorkoutSessionForDay,
  resetJourneyStat,
  resetAllJourneyStats,
  undoResetJourneyStat,
  undoResetAllJourneyStats,
  saveJourneyReset,
  saveAllJourneyReset,
  getJourneyHistory,
  clearJourneyHistory,
  formatJourneyHistoryRange,
  getJourneyStats,
  getJourneyMetrics,
  resetJourneyMetric,
  resetAllJourneyMetrics,
  undoResetJourneyMetric,
  undoResetAllJourneyMetrics,
  saveJourneyMetricReset,
  saveAllJourneyMetricReset,
  getAchievements,
};
