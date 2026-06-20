import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { MarvelMarks } from '@/components/PremiumUI';
import {
  premiumColors,
  premiumGradients,
  premiumShadow,
} from '@/constants/premiumTheme';
import { journeyService, memberService } from '@/services';
import type {
  Achievement,
  AttendanceDay,
  JourneyHistoryRecord,
  JourneyMetricKey,
  JourneyMetrics,
  JourneyProfile,
  JourneyStats,
  Member,
  WorkoutSession,
} from '@/types';

const accentColor = premiumColors.red;
const wineColor = premiumColors.redBright;
const backgroundColor = premiumColors.background;
const surfaceColor = premiumColors.surface;
const textColor = premiumColors.text;
const mutedColor = premiumColors.textMuted;

type TimerState = 'idle' | 'running' | 'paused';

const journeyTimerStorageKey = 'marvel-gym:journey-workout-timer';

type StoredTimerState = {
  elapsedSeconds: number;
  startedAt?: number;
  state: TimerState;
};

function formatDay(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
  }).format(new Date(value));
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
  }).format(new Date(value));
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`;
}

function estimateCalories(durationSeconds: number) {
  return Math.max(0, Math.round((durationSeconds / 60) * 8));
}

function formatHistoryRange(historyRecord: JourneyHistoryRecord) {
  const formatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return `${formatter.format(new Date(historyRecord.startedAt))} - ${formatter.format(
    new Date(historyRecord.endedAt),
  )}`;
}

async function saveStoredTimerState(timer: StoredTimerState) {
  await AsyncStorage.setItem(journeyTimerStorageKey, JSON.stringify(timer));
}

async function clearStoredTimerState() {
  await AsyncStorage.removeItem(journeyTimerStorageKey);
}

async function getStoredTimerState() {
  const storedValue = await AsyncStorage.getItem(journeyTimerStorageKey);

  if (!storedValue) {
    return undefined;
  }

  try {
    return JSON.parse(storedValue) as StoredTimerState;
  } catch {
    await clearStoredTimerState();
    return undefined;
  }
}

export default function JourneyScreen() {
  const [member, setMember] = useState<Member>();
  const [profile, setProfile] = useState<JourneyProfile>();
  const [biographyDraft, setBiographyDraft] = useState('');
  const [attendanceDays, setAttendanceDays] = useState<AttendanceDay[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [historyRecords, setHistoryRecords] = useState<JourneyHistoryRecord[]>([]);
  const [stats, setStats] = useState<JourneyStats>();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastCalories, setLastCalories] = useState(0);
  const [pendingVisitDate, setPendingVisitDate] = useState('');
  const [metrics, setMetrics] = useState<JourneyMetrics>();
  const [pendingMetricResetKey, setPendingMetricResetKey] =
    useState<JourneyMetricKey>();
  const [isPendingMetricResetAll, setIsPendingMetricResetAll] = useState(false);
  const [undoableMetricKeys, setUndoableMetricKeys] = useState<
    JourneyMetricKey[]
  >([]);
  const [isAllMetricResetUndoable, setIsAllMetricResetUndoable] =
    useState(false);
  const [pendingTimerSeconds, setPendingTimerSeconds] = useState(0);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const timerStartedAtRef = useRef<number | undefined>(undefined);
  const pausedElapsedRef = useRef(0);

  useEffect(() => {
    const loadJourney = async () => {
      const [
        currentMember,
        journeyProfile,
        attendance,
        sessions,
        history,
        journeyStats,
        journeyMetrics,
        nextAchievements,
        storedTimer,
      ] = await Promise.all([
        memberService.getCurrentMember(),
        journeyService.getJourneyProfile(),
        journeyService.getAttendanceDays(),
        journeyService.getWorkoutSessions(),
        journeyService.getJourneyHistory(),
        journeyService.getJourneyStats(),
        journeyService.getJourneyMetrics(),
        journeyService.getAchievements(),
        getStoredTimerState(),
      ]);

      setMember(currentMember);
      setProfile(journeyProfile);
      setBiographyDraft(journeyProfile.biography);
      setAttendanceDays(attendance);
      setWorkoutSessions(sessions);
      setHistoryRecords(history);
      setStats(journeyStats);
      setMetrics(journeyMetrics);
      setAchievements(nextAchievements);

      if (storedTimer?.state === 'running' && storedTimer.startedAt) {
        timerStartedAtRef.current = storedTimer.startedAt;
        pausedElapsedRef.current = storedTimer.elapsedSeconds;
        setElapsedSeconds(
          storedTimer.elapsedSeconds +
            Math.max(0, Math.floor((Date.now() - storedTimer.startedAt) / 1000)),
        );
        setTimerState('running');
      } else if (storedTimer?.state === 'paused') {
        pausedElapsedRef.current = storedTimer.elapsedSeconds;
        setElapsedSeconds(storedTimer.elapsedSeconds);
        setTimerState('paused');
      }

      setIsLoading(false);
    };

    loadJourney();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const syncJourney = async () => {
        const [attendance, sessions, history, journeyStats, journeyMetrics] =
          await Promise.all([
            journeyService.getAttendanceDays(),
            journeyService.getWorkoutSessions(),
            journeyService.getJourneyHistory(),
            journeyService.getJourneyStats(),
            journeyService.getJourneyMetrics(),
          ]);

        if (!isActive) {
          return;
        }

        setAttendanceDays(attendance);
        setWorkoutSessions(sessions);
        setHistoryRecords(history);
        setStats(journeyStats);
        setMetrics(journeyMetrics);
        setSelectedMonthIndex(new Date().getMonth());
      };

      syncJourney();

      return () => {
        isActive = false;
      };
    }, []),
  );

  useEffect(() => {
    if (timerState !== 'running') {
      return undefined;
    }

    const interval = setInterval(() => {
      if (!timerStartedAtRef.current) {
        return;
      }

      const liveSeconds = Math.floor(
        (Date.now() - timerStartedAtRef.current) / 1000,
      );

      setElapsedSeconds(pausedElapsedRef.current + liveSeconds);
    }, 250);

    return () => clearInterval(interval);
  }, [timerState]);

  const unlockedCount = useMemo(
    () => achievements.filter((item) => item.isUnlocked).length,
    [achievements],
  );

  const attendanceByMonth = useMemo(() => {
    const groups: { month: string; days: AttendanceDay[] }[] = [];

    attendanceDays.forEach((day) => {
      const month = formatMonth(day.date);
      const group = groups.find((item) => item.month === month);

      if (group) {
        group.days.push(day);
        return;
      }

      groups.push({ month, days: [day] });
    });

    return groups;
  }, [attendanceDays]);
  const activeMonthIndex = Math.min(
    Math.max(0, selectedMonthIndex),
    Math.max(0, attendanceByMonth.length - 1),
  );
  const selectedMonth = attendanceByMonth[activeMonthIndex];
  const selectedMonthKey = selectedMonth?.days[0]?.date.slice(0, 7) ?? '';
  const selectedMonthVisitCount =
    selectedMonth?.days.filter((day) => day.hasVisit).length ?? 0;
  const selectedMonthSessions = useMemo(
    () =>
      workoutSessions.filter((session) =>
        session.endedAt.startsWith(selectedMonthKey),
      ),
    [selectedMonthKey, workoutSessions],
  );
  const selectedMonthAverageCalories =
    selectedMonthSessions.length > 0
      ? Math.round(
          selectedMonthSessions.reduce(
            (total, session) => total + session.estimatedCaloriesBurned,
            0,
          ) / selectedMonthSessions.length,
        )
      : 0;

  const refreshMetrics = async () => {
    const nextMetrics = await journeyService.getJourneyMetrics();

    setMetrics(nextMetrics);
  };

  const refreshStats = async () => {
    const nextStats = await journeyService.getJourneyStats();

    setStats(nextStats);
  };

  const refreshJourneyHistory = async () => {
    const nextHistory = await journeyService.getJourneyHistory();

    setHistoryRecords(nextHistory);
  };

  const handleSaveBiography = async () => {
    const nextProfile = await journeyService.updateJourneyProfile({
      biography: biographyDraft.trim(),
    });

    setProfile(nextProfile);
    setBiographyDraft(nextProfile.biography);
    setIsEditingBio(false);
  };

  const confirmToggleVisit = async () => {
    if (!pendingVisitDate) {
      return;
    }

    const nextAttendance = await journeyService.toggleAttendanceDay(pendingVisitDate);

    setAttendanceDays(nextAttendance);
    setPendingVisitDate('');
    await refreshStats();
    await refreshMetrics();
  };

  const handleStartTimer = () => {
    if (timerState === 'running') {
      return;
    }

    const startedAt = Date.now();

    if (timerState === 'idle') {
      setElapsedSeconds(0);
      setLastCalories(0);
      pausedElapsedRef.current = 0;
    }

    timerStartedAtRef.current = startedAt;
    setTimerState('running');
    saveStoredTimerState({
      elapsedSeconds: pausedElapsedRef.current,
      startedAt,
      state: 'running',
    });
  };

  const handleEndWorkout = async () => {
    const liveElapsedSeconds = timerStartedAtRef.current
      ? pausedElapsedRef.current +
        Math.max(0, Math.round((Date.now() - timerStartedAtRef.current) / 1000))
      : elapsedSeconds;

    if (liveElapsedSeconds <= 0) {
      setTimerState('idle');
      timerStartedAtRef.current = undefined;
      pausedElapsedRef.current = 0;
      clearStoredTimerState();
      return;
    }

    setElapsedSeconds(liveElapsedSeconds);
    setPendingTimerSeconds(liveElapsedSeconds);
    setTimerState('paused');
    timerStartedAtRef.current = undefined;
    pausedElapsedRef.current = liveElapsedSeconds;
    saveStoredTimerState({
      elapsedSeconds: liveElapsedSeconds,
      state: 'paused',
    });
  };

  const confirmSaveWorkout = async () => {
    const session = await journeyService.completeWorkoutSession(pendingTimerSeconds);

    setLastCalories(session.estimatedCaloriesBurned);
    setWorkoutSessions((current) => [session, ...current]);
    setTimerState('idle');
    setElapsedSeconds(0);
    setPendingTimerSeconds(0);
    timerStartedAtRef.current = undefined;
    pausedElapsedRef.current = 0;
    await clearStoredTimerState();
    await refreshStats();
    await refreshMetrics();
  };

  const discardWorkoutTime = () => {
    setTimerState('idle');
    setElapsedSeconds(0);
    setPendingTimerSeconds(0);
    timerStartedAtRef.current = undefined;
    pausedElapsedRef.current = 0;
    clearStoredTimerState();
  };

  const handlePauseTimer = () => {
    if (!timerStartedAtRef.current) {
      return;
    }

    const liveSeconds = Math.floor(
      (Date.now() - timerStartedAtRef.current) / 1000,
    );

    pausedElapsedRef.current += liveSeconds;
    setElapsedSeconds(pausedElapsedRef.current);
    timerStartedAtRef.current = undefined;
    setTimerState('paused');
    saveStoredTimerState({
      elapsedSeconds: pausedElapsedRef.current,
      state: 'paused',
    });
  };

  const confirmResetMetric = async () => {
    if (!pendingMetricResetKey && !isPendingMetricResetAll) {
      return;
    }

    const nextMetrics = isPendingMetricResetAll
      ? await journeyService.resetAllJourneyMetrics()
      : await journeyService.resetJourneyMetric(
          pendingMetricResetKey as JourneyMetricKey,
        );

    setMetrics(nextMetrics);
    if (isPendingMetricResetAll) {
      setIsAllMetricResetUndoable(true);
      setUndoableMetricKeys([]);
    } else if (pendingMetricResetKey) {
      setIsAllMetricResetUndoable(false);
      setUndoableMetricKeys((current) => [
        pendingMetricResetKey,
        ...current.filter((key) => key !== pendingMetricResetKey),
      ]);
    }
    setPendingMetricResetKey(undefined);
    setIsPendingMetricResetAll(false);
  };

  const handleUndoMetric = async (metricKey: JourneyMetricKey) => {
    const nextMetrics = await journeyService.undoResetJourneyMetric(metricKey);

    setMetrics(nextMetrics);
    setUndoableMetricKeys((current) =>
      current.filter((key) => key !== metricKey),
    );
    await refreshJourneyHistory();
  };

  const handleUndoMetricAll = async () => {
    const nextMetrics = await journeyService.undoResetAllJourneyMetrics();

    setMetrics(nextMetrics);
    setIsAllMetricResetUndoable(false);
    await refreshJourneyHistory();
  };

  const handleSaveMetric = async (metricKey: JourneyMetricKey) => {
    const nextHistory = await journeyService.saveJourneyMetricReset(metricKey);

    setHistoryRecords(nextHistory);
    setUndoableMetricKeys((current) =>
      current.filter((key) => key !== metricKey),
    );
  };

  const handleSaveMetricAll = async () => {
    const nextHistory = await journeyService.saveAllJourneyMetricReset();

    setHistoryRecords(nextHistory);
    setIsAllMetricResetUndoable(false);
  };

  if (isLoading || !profile || !stats || !metrics) {
    return (
      <PremiumScreenBackground>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
          <Text style={styles.loadingText}>Loading journey...</Text>
        </View>
      </PremiumScreenBackground>
    );
  }

  const metricCards: {
    key: JourneyMetricKey;
    label: string;
    value: string | number;
  }[] = [
    {
      key: 'averageMonthlyVisits',
      label: 'Average monthly visits',
      value: metrics.averageMonthlyVisits,
    },
    {
      key: 'totalVisits',
      label: 'Total visits',
      value: metrics.totalVisits,
    },
    {
      key: 'averageCaloriesBurned',
      label: 'Average calories burned',
      value: metrics.averageCaloriesBurned,
    },
    {
      key: 'averageWorkoutDuration',
      label: 'Average workout duration',
      value: metrics.averageWorkoutDuration,
    },
  ];

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={premiumGradients.redPanel}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGloss} />
          <MarvelMarks variant="corner" color="#FFFFFF" />
          <Text style={styles.kicker}>Journey</Text>
          <Text style={styles.heroTitle}>
            {member?.firstName ?? 'Member'}'s Fitness Dashboard
          </Text>
          <Text style={styles.heroBody}>
            Tailor your plan with AI and track consistency through attendance and training time.
          </Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatValue}>{selectedMonthVisitCount}</Text>
              <Text style={styles.heroStatLabel}>this month&apos;s visits</Text>
            </View>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatValue}>{selectedMonthAverageCalories}</Text>
              <Text style={styles.heroStatLabel}>this month&apos;s calories/session</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.aiAssistantCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>AI Assistant</Text>
              <Text style={styles.sectionTitle}>Tailored training plan help</Text>
            </View>
          </View>
          <Text style={styles.aiAssistantBody}>
            Your About Me and Training Note help tailor guidance around body type,
            age, height, weight, gender, goals, ambitions, injuries, limitations,
            and training preferences.
          </Text>
          <Pressable
            onPress={() => undefined}
            style={({ pressed }) => [
              styles.aiChatButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.aiChatButtonText}>Start Chat</Text>
          </Pressable>
        </View>

        <View style={styles.timerCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Workout Timer</Text>
              <Text style={styles.sectionTitle}>Session clock</Text>
            </View>
            <Text style={styles.sectionHint}>Calories are estimated</Text>
          </View>

          <View style={styles.timerFace}>
            <Text style={styles.timerValue}>{formatDuration(elapsedSeconds)}</Text>
            <Text style={styles.timerCaption}>
              Live calories: {estimateCalories(elapsedSeconds)}
            </Text>
          </View>

          <View style={styles.timerButtons}>
            <Pressable
              onPress={handleStartTimer}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.primaryButtonText}>Start Timer</Text>
            </Pressable>
            <Pressable
              onPress={handlePauseTimer}
              disabled={timerState !== 'running'}
              style={({ pressed }) => [
                styles.secondaryButton,
                timerState !== 'running' && styles.disabledButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.secondaryButtonText}>Pause</Text>
            </Pressable>
            <Pressable
              onPress={handleEndWorkout}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.secondaryButtonText}>Stop / End Workout</Text>
            </Pressable>
          </View>

          {lastCalories > 0 && (
            <Text style={styles.estimateText}>
              {lastCalories} Calories Burned
            </Text>
          )}
        </View>

        <View style={styles.statsHeaderRow}>
          <View style={styles.dashboardTitleBlock}>
            <Text style={styles.cardLabel}>Dashboard</Text>
            <Text style={styles.sectionTitle}>All-time metrics</Text>
            <View style={styles.resetAllStack}>
              {isAllMetricResetUndoable ? (
                <>
                  <Pressable
                    onPress={handleSaveMetricAll}
                    style={({ pressed }) => [
                      styles.resetAllSaveButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.statSaveText}>Save</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleUndoMetricAll}
                    style={({ pressed }) => [
                      styles.resetAllButton,
                      styles.statResetButtonUndo,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text
                      style={[styles.resetAllButtonText, styles.statResetTextUndo]}>
                      Undo Reset
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => setIsPendingMetricResetAll(true)}
                  style={({ pressed }) => [
                    styles.resetAllButton,
                    pressed && styles.buttonPressed,
                  ]}>
                  <Text style={styles.resetAllButtonText}>Reset All</Text>
                </Pressable>
              )}
            </View>
          </View>
          <Pressable
            onPress={() => setIsHistoryVisible(true)}
            style={({ pressed }) => [
              styles.historyButton,
              pressed && styles.buttonPressed,
            ]}>
            <Text style={styles.historyButtonText}>History</Text>
          </Pressable>
        </View>

        <View style={styles.metricGrid}>
          {metricCards.map((metric) => {
            const canUndo = undoableMetricKeys.includes(metric.key);

            return (
              <View key={metric.key} style={styles.metricTile}>
                <View pointerEvents="none" style={styles.metricTileGloss} />
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <View style={styles.metricActionRow}>
                  <Pressable
                    onPress={() =>
                      canUndo
                        ? handleUndoMetric(metric.key)
                        : setPendingMetricResetKey(metric.key)
                    }
                    style={({ pressed }) => [
                      styles.statResetButton,
                      canUndo && styles.statResetButtonUndo,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text
                      style={[
                        styles.statResetText,
                        canUndo && styles.statResetTextUndo,
                      ]}>
                      {canUndo ? 'Undo Reset' : 'Reset'}
                    </Text>
                  </Pressable>
                  {canUndo ? (
                    <Pressable
                      onPress={() => handleSaveMetric(metric.key)}
                      style={({ pressed }) => [
                        styles.statSaveButton,
                        pressed && styles.buttonPressed,
                      ]}>
                      <Text style={styles.statSaveText}>Save</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Attendance Calendar</Text>
              <Text style={styles.sectionTitle}>2026 visits</Text>
            </View>
            <Text style={styles.sectionHint}>Tap to toggle</Text>
          </View>

          {selectedMonth ? (
            <View style={styles.monthBlock}>
              <View style={styles.monthSwitcher}>
                <Pressable
                  disabled={activeMonthIndex === 0}
                  onPress={() =>
                    setSelectedMonthIndex((value) => Math.max(0, value - 1))
                  }
                  style={[
                    styles.monthArrowButton,
                    activeMonthIndex === 0 && styles.monthArrowButtonDisabled,
                  ]}>
                  <Text style={styles.monthArrowText}>{'<'}</Text>
                </Pressable>
                <Text style={styles.monthTitle}>{selectedMonth.month}</Text>
                <Pressable
                  disabled={activeMonthIndex === attendanceByMonth.length - 1}
                  onPress={() =>
                    setSelectedMonthIndex((value) =>
                      Math.min(attendanceByMonth.length - 1, value + 1),
                    )
                  }
                  style={[
                    styles.monthArrowButton,
                    activeMonthIndex === attendanceByMonth.length - 1 &&
                      styles.monthArrowButtonDisabled,
                  ]}>
                  <Text style={styles.monthArrowText}>{'>'}</Text>
                </Pressable>
              </View>
              <View style={styles.calendarGrid}>
                {selectedMonth.days.map((day) => (
                  <Pressable
                    key={day.id}
                    onPress={() => setPendingVisitDate(day.date)}
                    style={[
                      styles.calendarDay,
                      day.hasVisit && styles.calendarDayActive,
                    ]}>
                    <Text
                      style={[
                        styles.calendarDayText,
                        day.hasVisit && styles.calendarDayTextActive,
                      ]}>
                      {formatDay(day.date)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Badges</Text>
              <Text style={styles.sectionTitle}>Consistency badges</Text>
            </View>
            <Text style={styles.sectionHint}>{unlockedCount} unlocked</Text>
          </View>

          <View style={styles.achievementList}>
            {achievements.map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementCard,
                  !achievement.isUnlocked && styles.achievementLocked,
                ]}>
                <View
                  style={[
                    styles.achievementIcon,
                    achievement.isUnlocked && styles.achievementIconUnlocked,
                  ]}>
                  <Text
                    style={[
                      styles.achievementIconText,
                      achievement.isUnlocked && styles.achievementIconTextUnlocked,
                    ]}>
                    {achievement.isUnlocked ? 'OK' : '--'}
                  </Text>
                </View>
                <View style={styles.achievementCopy}>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementBody}>
                    {achievement.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>About Me</Text>
              <Text style={styles.sectionTitle}>Training note</Text>
              <Text style={styles.trainingNoteSubtitle}>
                Edit About Me below to improve your tailored plan.
              </Text>
            </View>
            <Pressable
              onPress={() =>
                isEditingBio ? handleSaveBiography() : setIsEditingBio(true)
              }
              style={({ pressed }) => [
                styles.smallButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.smallButtonText}>
                {isEditingBio ? 'Save' : 'Edit'}
              </Text>
            </Pressable>
          </View>

          {isEditingBio ? (
            <TextInput
              multiline
              value={biographyDraft}
              onChangeText={setBiographyDraft}
              placeholder="Example: 28 years old, building lean strength, training 4 days weekly, protecting my lower back."
              placeholderTextColor="#9AA3AF"
              selectionColor={accentColor}
              style={styles.planInput}
            />
          ) : (
            <Text style={styles.bodyText}>{profile.biography}</Text>
          )}
        </View>
      </ScrollView>

      <Modal transparent visible={Boolean(pendingVisitDate)} animationType="fade">
        <View style={styles.centerModalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPendingVisitDate('')} />
          <View style={styles.confirmCard}>
            <Text style={styles.modalKicker}>Attendance</Text>
            <Text style={styles.confirmTitle}>Update this day?</Text>
            <Text style={styles.confirmBody}>
              This will toggle the selected day in your attendance calendar.
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                onPress={() => setPendingVisitDate('')}
                style={({ pressed }) => [
                  styles.confirmSecondary,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.confirmSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmToggleVisit}
                style={({ pressed }) => [
                  styles.confirmPrimary,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.confirmPrimaryText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={Boolean(pendingMetricResetKey) || isPendingMetricResetAll}
        animationType="fade">
        <View style={styles.centerModalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setPendingMetricResetKey(undefined);
              setIsPendingMetricResetAll(false);
            }}
          />
          <View style={styles.confirmCard}>
            <Text style={styles.modalKicker}>Journey</Text>
            <Text style={styles.confirmTitle}>
              {isPendingMetricResetAll ? 'Reset all metrics?' : 'Reset this metric?'}
            </Text>
            <Text style={styles.confirmBody}>
              Resetting starts a fresh count from now. Your previous total is kept
              and can be saved to History so you can always look back at it.
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                onPress={() => {
                  setPendingMetricResetKey(undefined);
                  setIsPendingMetricResetAll(false);
                }}
                style={({ pressed }) => [
                  styles.confirmSecondary,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.confirmSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmResetMetric}
                style={({ pressed }) => [
                  styles.confirmPrimary,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.confirmPrimaryText}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={isHistoryVisible} animationType="fade">
        <View style={styles.historyOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsHistoryVisible(false)}
          />
          <View style={styles.historyPanel}>
            <View style={styles.historyTopBar}>
              <View>
                <Text style={styles.modalKicker}>Journey History</Text>
                <Text style={styles.historyPanelTitle}>Recorded periods</Text>
              </View>
              <Pressable
                onPress={() => setIsHistoryVisible(false)}
                style={({ pressed }) => [
                  styles.historyIconClose,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.historyIconCloseText}>X</Text>
              </Pressable>
            </View>

            <View style={styles.historyTabs}>
              <View style={[styles.historyTab, styles.historyTabActive]}>
                <Text style={styles.historyTabTextActive}>History</Text>
              </View>
            </View>

            <Text style={styles.historyIntro}>
              See completed training periods and the progress saved for each one.
            </Text>

            <ScrollView
              style={styles.historyList}
              contentContainerStyle={styles.historyListContent}
              showsVerticalScrollIndicator={false}>
              {historyRecords.length === 0 ? (
                <View style={styles.historyEmptyCard}>
                  <Text style={styles.historyEmptyTitle}>No history yet</Text>
                  <Text style={styles.historyEmptyBody}>
                    Your saved training periods will appear here.
                  </Text>
                </View>
              ) : (
                historyRecords.map((record) => (
                  <View key={record.id} style={styles.historyCard}>
                    <View style={styles.historyCardRail} />
                    <View style={styles.historyCardContent}>
                      <Text style={styles.historyRange}>
                        {formatHistoryRange(record)}
                      </Text>
                      <Text style={styles.historySummary}>{record.summary}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={pendingTimerSeconds > 0} animationType="fade">
        <View style={styles.centerModalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.modalKicker}>Workout Timer</Text>
            <Text style={styles.confirmTitle}>Save this workout?</Text>
            <Text style={styles.confirmBody}>
              Save {formatDuration(pendingTimerSeconds)} to include it in duration and calorie calculations.
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                onPress={discardWorkoutTime}
                style={({ pressed }) => [
                  styles.confirmSecondary,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.confirmSecondaryText}>Do Not Save</Text>
              </Pressable>
              <Pressable
                onPress={confirmSaveWorkout}
                style={({ pressed }) => [
                  styles.confirmPrimary,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.confirmPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 132,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: mutedColor,
    fontSize: 14,
    fontWeight: '700',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 26,
    padding: 22,
    marginBottom: 16,
    shadowColor: premiumColors.red,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 26,
    elevation: 10,
  },
  heroGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroSheen: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 120, 130, 0.2)',
  },
  kicker: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 35,
    marginTop: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroBody: {
    color: 'rgba(255, 255, 255, 0.86)',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  heroStatPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 15,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  card: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 26,
    backgroundColor: surfaceColor,
    padding: 16,
    marginBottom: 16,
    ...premiumShadow,
  },
  timerCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 28,
    backgroundColor: surfaceColor,
    padding: 16,
    marginBottom: 16,
    ...premiumShadow,
  },
  aiAssistantCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.11)',
    borderRadius: 26,
    backgroundColor: 'rgba(18, 20, 28, 0.86)',
    padding: 16,
    marginBottom: 16,
    ...premiumShadow,
  },
  aiAssistantBody: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  aiChatButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: accentColor,
    marginTop: 14,
  },
  aiChatButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  cardLabel: {
    color: accentColor,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: textColor,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionHint: {
    color: mutedColor,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  timerFace: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.1)',
    borderRadius: 26,
    backgroundColor: premiumColors.surfaceSoft,
    paddingVertical: 22,
  },
  timerValue: {
    color: textColor,
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 0,
  },
  timerCaption: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  timerButtons: {
    gap: 10,
    marginTop: 14,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: accentColor,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.18)',
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
  },
  secondaryButtonText: {
    color: wineColor,
    fontSize: 13,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.48,
  },
  estimateText: {
    color: wineColor,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  statsRail: {
    gap: 12,
    paddingRight: 4,
    marginBottom: 16,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricTile: {
    position: 'relative',
    overflow: 'hidden',
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 148,
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 22,
    backgroundColor: surfaceColor,
    padding: 16,
    shadowColor: premiumColors.red,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 8,
  },
  metricActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 'auto',
    paddingTop: 12,
  },
  metricTileGloss: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  metricValue: {
    color: premiumColors.redBright,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  metricLabel: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 10,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 12,
  },
  dashboardTitleBlock: {
    flex: 1,
    alignItems: 'flex-start',
  },
  historyButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.2)',
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 16,
  },
  historyButtonText: {
    color: wineColor,
    fontSize: 12,
    fontWeight: '900',
  },
  resetAllStack: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  resetAllButton: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.34)',
    borderRadius: 999,
    backgroundColor: 'rgba(177, 18, 38, 0.12)',
    paddingHorizontal: 12,
  },
  resetAllButtonText: {
    color: accentColor,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  resetAllSaveButton: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
  },
  statCard: {
    width: 172,
    minHeight: 116,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 22,
    backgroundColor: surfaceColor,
    padding: 16,
    ...premiumShadow,
  },
  statValue: {
    color: textColor,
    fontSize: 26,
    fontWeight: '900',
  },
  statLabel: {
    flex: 1,
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  statFooterRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statActionStack: {
    alignItems: 'stretch',
    gap: 7,
  },
  statResetButton: {
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.34)',
    borderRadius: 999,
    backgroundColor: 'rgba(177, 18, 38, 0.12)',
    paddingHorizontal: 9,
  },
  statResetButtonUndo: {
    borderColor: 'rgba(245, 158, 11, 0.32)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statResetButtonDisabled: {
    borderColor: 'rgba(177, 18, 38, 0.14)',
    backgroundColor: 'rgba(177, 18, 38, 0.05)',
    opacity: 0.48,
  },
  statResetText: {
    color: accentColor,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statResetTextUndo: {
    color: '#F8C471',
  },
  statResetTextDisabled: {
    color: 'rgba(177, 18, 38, 0.72)',
  },
  statSaveButton: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#16A34A',
    paddingHorizontal: 11,
  },
  statSaveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  milestoneCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 28,
    backgroundColor: surfaceColor,
    padding: 16,
    marginBottom: 16,
    ...premiumShadow,
  },
  milestoneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  milestoneTile: {
    minHeight: 88,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.1)',
    borderRadius: 20,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 14,
  },
  milestoneValue: {
    color: accentColor,
    fontSize: 22,
    fontWeight: '900',
  },
  milestoneLabel: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  smallButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 16,
  },
  smallButtonText: {
    color: wineColor,
    fontSize: 12,
    fontWeight: '900',
  },
  bodyText: {
    color: mutedColor,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  planInput: {
    minHeight: 136,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.18)',
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
    color: textColor,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    padding: 14,
    textAlignVertical: 'top',
  },
  trainingNoteSubtitle: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 4,
    maxWidth: 230,
  },
  monthBlock: {
    marginBottom: 4,
  },
  monthSwitcher: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.1)',
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  monthArrowButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: premiumColors.surfaceSoft,
  },
  monthArrowButtonDisabled: {
    opacity: 0.36,
  },
  monthArrowText: {
    color: wineColor,
    fontSize: 16,
    fontWeight: '900',
  },
  monthTitle: {
    color: textColor,
    fontSize: 16,
    fontWeight: '900',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calendarDay: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.1)',
    borderRadius: 13,
    backgroundColor: premiumColors.surfaceSoft,
  },
  calendarDayActive: {
    borderColor: '#FF1744',
    backgroundColor: '#FF1744',
    shadowColor: '#FF1744',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26,
    shadowRadius: 10,
    elevation: 3,
  },
  calendarDayText: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '900',
  },
  calendarDayTextActive: {
    color: '#FFFFFF',
  },
  achievementList: {
    gap: 10,
  },
  achievementCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 12,
  },
  achievementLocked: {
    opacity: 0.58,
  },
  achievementIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: premiumColors.surfaceSoft,
  },
  achievementIconUnlocked: {
    backgroundColor: accentColor,
  },
  achievementIconText: {
    color: premiumColors.textFaint,
    fontSize: 11,
    fontWeight: '900',
  },
  achievementIconTextUnlocked: {
    color: '#FFFFFF',
  },
  achievementCopy: {
    flex: 1,
  },
  achievementTitle: {
    color: textColor,
    fontSize: 14,
    fontWeight: '900',
  },
  achievementBody: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
  buttonPressed: {
    opacity: 0.76,
  },
  centerModalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 28,
    backgroundColor: premiumColors.surface,
    padding: 22,
    ...premiumShadow,
  },
  modalKicker: {
    color: accentColor,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  confirmTitle: {
    color: textColor,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
  },
  confirmBody: {
    color: mutedColor,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  confirmSecondary: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.24)',
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
  },
  confirmSecondaryText: {
    color: wineColor,
    fontSize: 13,
    fontWeight: '900',
  },
  confirmPrimary: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: accentColor,
  },
  confirmPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  historyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingTop: 72,
    paddingBottom: 28,
  },
  historyPanel: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
    backgroundColor: '#101116',
    padding: 18,
    ...premiumShadow,
  },
  historyTopBar: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyPanelTitle: {
    color: textColor,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 30,
  },
  historyIconClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
  },
  historyIconCloseText: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '900',
  },
  historyTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 18,
  },
  historyTab: {
    minHeight: 42,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingHorizontal: 4,
    marginRight: 22,
  },
  historyTabActive: {
    borderBottomColor: accentColor,
  },
  historyTabTextActive: {
    color: textColor,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  historyIntro: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 14,
  },
  historyList: {
    flex: 1,
    marginTop: 18,
  },
  historyListContent: {
    gap: 11,
    paddingBottom: 8,
  },
  historyCard: {
    minHeight: 76,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
  },
  historyCardRail: {
    width: 4,
    backgroundColor: accentColor,
  },
  historyCardContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  historyRange: {
    color: textColor,
    fontSize: 14,
    fontWeight: '900',
  },
  historySummary: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 5,
  },
  historyEmptyCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 14,
  },
  historyEmptyTitle: {
    color: textColor,
    fontSize: 14,
    fontWeight: '900',
  },
  historyEmptyBody: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 5,
  },
});
