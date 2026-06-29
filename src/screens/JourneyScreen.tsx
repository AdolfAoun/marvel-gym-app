import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
  premiumGlow,
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
const textColor = premiumColors.text;
const mutedColor = premiumColors.textMuted;

type TimerState = 'idle' | 'running' | 'paused';

// Metric widget = 236 wide + 12 gap; one "page" for the scale carousel.
const METRIC_PAGE_W = 248;

const journeyTimerStorageKey = 'marvel-gym:journey-workout-timer';

type StoredTimerState = {
  elapsedSeconds: number;
  startedAt?: number;
  state: TimerState;
};

function formatDay(value: string) {
  return new Intl.DateTimeFormat('en', { day: '2-digit' }).format(new Date(value));
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(value));
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
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
  return `${formatter.format(new Date(historyRecord.startedAt))} - ${formatter.format(new Date(historyRecord.endedAt))}`;
}

async function saveStoredTimerState(timer: StoredTimerState) {
  await AsyncStorage.setItem(journeyTimerStorageKey, JSON.stringify(timer));
}

async function clearStoredTimerState() {
  await AsyncStorage.removeItem(journeyTimerStorageKey);
}

async function getStoredTimerState() {
  const storedValue = await AsyncStorage.getItem(journeyTimerStorageKey);
  if (!storedValue) return undefined;
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
  const [isCalendarEditorOpen, setIsCalendarEditorOpen] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastCalories, setLastCalories] = useState(0);
  const [pendingVisitDate, setPendingVisitDate] = useState('');
  const [metrics, setMetrics] = useState<JourneyMetrics>();
  const [pendingMetricResetKey, setPendingMetricResetKey] = useState<JourneyMetricKey>();
  const [isPendingMetricResetAll, setIsPendingMetricResetAll] = useState(false);
  const [undoableMetricKeys, setUndoableMetricKeys] = useState<JourneyMetricKey[]>([]);
  const [isAllMetricResetUndoable, setIsAllMetricResetUndoable] = useState(false);
  const [pendingTimerSeconds, setPendingTimerSeconds] = useState(0);
  const metricsScrollX = useRef(new Animated.Value(0)).current;
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

        if (!isActive) return;

        setAttendanceDays(attendance);
        setWorkoutSessions(sessions);
        setHistoryRecords(history);
        setStats(journeyStats);
        setMetrics(journeyMetrics);
        setSelectedMonthIndex(new Date().getMonth());
      };

      syncJourney();

      return () => { isActive = false; };
    }, []),
  );

  useEffect(() => {
    if (timerState !== 'running') return undefined;

    const interval = setInterval(() => {
      if (!timerStartedAtRef.current) return;
      const liveSeconds = Math.floor((Date.now() - timerStartedAtRef.current) / 1000);
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
      if (group) { group.days.push(day); return; }
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
  const selectedMonthVisitCount = selectedMonth?.days.filter((day) => day.hasVisit).length ?? 0;
  const selectedMonthSessions = useMemo(
    () => workoutSessions.filter((session) => session.endedAt.startsWith(selectedMonthKey)),
    [selectedMonthKey, workoutSessions],
  );
  const selectedMonthAverageCalories =
    selectedMonthSessions.length > 0
      ? Math.round(
          selectedMonthSessions.reduce((total, session) => total + session.estimatedCaloriesBurned, 0) /
            selectedMonthSessions.length,
        )
      : 0;
  const selectedMonthCompletionRate = selectedMonth
    ? Math.round((selectedMonthVisitCount / Math.max(1, selectedMonth.days.length)) * 100)
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
    if (!pendingVisitDate) return;
    const nextAttendance = await journeyService.toggleAttendanceDay(pendingVisitDate);
    setAttendanceDays(nextAttendance);
    setPendingVisitDate('');
    await refreshStats();
    await refreshMetrics();
  };

  const handleStartTimer = () => {
    if (timerState === 'running') return;
    const startedAt = Date.now();
    if (timerState === 'idle') {
      setElapsedSeconds(0);
      setLastCalories(0);
      pausedElapsedRef.current = 0;
    }
    timerStartedAtRef.current = startedAt;
    setTimerState('running');
    saveStoredTimerState({ elapsedSeconds: pausedElapsedRef.current, startedAt, state: 'running' });
  };

  const handleEndWorkout = async () => {
    const liveElapsedSeconds = timerStartedAtRef.current
      ? pausedElapsedRef.current + Math.max(0, Math.round((Date.now() - timerStartedAtRef.current) / 1000))
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
    saveStoredTimerState({ elapsedSeconds: liveElapsedSeconds, state: 'paused' });
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
    if (!timerStartedAtRef.current) return;
    const liveSeconds = Math.floor((Date.now() - timerStartedAtRef.current) / 1000);
    pausedElapsedRef.current += liveSeconds;
    setElapsedSeconds(pausedElapsedRef.current);
    timerStartedAtRef.current = undefined;
    setTimerState('paused');
    saveStoredTimerState({ elapsedSeconds: pausedElapsedRef.current, state: 'paused' });
  };

  const confirmResetMetric = async () => {
    if (!pendingMetricResetKey && !isPendingMetricResetAll) return;

    const nextMetrics = isPendingMetricResetAll
      ? await journeyService.resetAllJourneyMetrics()
      : await journeyService.resetJourneyMetric(pendingMetricResetKey as JourneyMetricKey);

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
    setUndoableMetricKeys((current) => current.filter((key) => key !== metricKey));
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
    setUndoableMetricKeys((current) => current.filter((key) => key !== metricKey));
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

  const metricCards: { key: JourneyMetricKey; label: string; value: string | number }[] = [
    { key: 'totalVisits', label: 'Total Visits', value: metrics.totalVisits },
    { key: 'averageMonthlyVisits', label: 'Avg Monthly', value: metrics.averageMonthlyVisits },
    { key: 'averageCaloriesBurned', label: 'Avg Calories', value: metrics.averageCaloriesBurned },
    { key: 'averageWorkoutDuration', label: 'Avg Duration', value: metrics.averageWorkoutDuration },
  ];

  const timerCalories = estimateCalories(elapsedSeconds);

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Journey cockpit */}
        <LinearGradient
          colors={premiumGradients.redPanel}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGloss} />
          <View pointerEvents="none" style={styles.heroOrbitOne} />
          <View pointerEvents="none" style={styles.heroOrbitTwo} />
          <MarvelMarks variant="corner" color="#FFFFFF" />
          <View style={styles.heroTopRow}>
            <View style={styles.heroIdentity}>
              <Text style={styles.kicker}>Journey</Text>
              <Text style={styles.heroTitle}>
                {member?.firstName ?? 'Member'}'s Command Center
              </Text>
              <Text style={styles.heroBody}>
                Live consistency, session energy, and long-term momentum in one place.
              </Text>
            </View>
            <View style={styles.heroSignal}>
              <Text style={styles.heroSignalValue}>{selectedMonthCompletionRate}%</Text>
              <Text style={styles.heroSignalLabel}>this month</Text>
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatValue}>{selectedMonthVisitCount}</Text>
              <Text style={styles.heroStatLabel}>visits</Text>
            </View>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatValue}>{stats.consecutiveStreak}</Text>
              <Text style={styles.heroStatLabel}>streak</Text>
            </View>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatValue}>{unlockedCount}</Text>
              <Text style={styles.heroStatLabel}>badges</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.commandGrid}>
          <View style={styles.commandTile}>
            <Text style={styles.commandValue}>{selectedMonthAverageCalories}</Text>
            <Text style={styles.commandLabel}>Avg kcal</Text>
          </View>
          <View style={styles.commandTile}>
            <Text style={styles.commandValue}>{selectedMonthSessions.length}</Text>
            <Text style={styles.commandLabel}>Sessions</Text>
          </View>
          <View style={styles.commandTile}>
            <Text style={styles.commandValue}>{formatDuration(elapsedSeconds)}</Text>
            <Text style={styles.commandLabel}>Live clock</Text>
          </View>
        </View>

        {/* Swipeable Metrics Widgets */}
        <View style={styles.sectionHeader}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionEyebrow}>All-time</Text>
            <Text style={styles.sectionTitle}>Performance</Text>
          </View>
          <View style={styles.metricHeaderActions}>
            {isAllMetricResetUndoable ? (
              <>
                <Pressable
                  onPress={handleSaveMetricAll}
                  style={({ pressed }) => [styles.tinyGreenButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.tinyGreenText}>Save</Text>
                </Pressable>
                <Pressable
                  onPress={handleUndoMetricAll}
                  style={({ pressed }) => [styles.tinyUndoButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.tinyUndoText}>Undo</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => setIsPendingMetricResetAll(true)}
                style={({ pressed }) => [styles.tinyResetButton, pressed && styles.buttonPressed]}>
                <Text style={styles.tinyResetText}>Reset All</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setIsHistoryVisible(true)}
              style={({ pressed }) => [styles.historyButton, pressed && styles.buttonPressed]}>
              <Text style={styles.historyButtonText}>History</Text>
            </Pressable>
          </View>
        </View>

        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={METRIC_PAGE_W}
          snapToAlignment="start"
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: metricsScrollX } } }],
            { useNativeDriver: true },
          )}
          contentContainerStyle={styles.metricsRail}>
          {metricCards.map((metric, i) => {
            const canUndo = undoableMetricKeys.includes(metric.key);
            const scale = metricsScrollX.interpolate({
              inputRange: [(i - 1) * METRIC_PAGE_W, i * METRIC_PAGE_W, (i + 1) * METRIC_PAGE_W],
              outputRange: [0.92, 1, 0.92],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={metric.key}
                style={[styles.metricCard, { transform: [{ scale }] }]}>
                <View pointerEvents="none" style={styles.metricCardGloss} />
                <View pointerEvents="none" style={styles.metricPulse} />
                <View style={styles.metricAccent} />
                <Text style={styles.metricWidgetEyebrow}>All-time</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <View style={styles.metricActions}>
                  <Pressable
                    onPress={() =>
                      canUndo
                        ? handleUndoMetric(metric.key)
                        : setPendingMetricResetKey(metric.key)
                    }
                    style={({ pressed }) => [
                      styles.metricResetButton,
                      canUndo && styles.metricUndoButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={[styles.metricResetText, canUndo && styles.metricUndoText]}>
                      {canUndo ? 'Undo' : 'Reset'}
                    </Text>
                  </Pressable>
                  {canUndo ? (
                    <Pressable
                      onPress={() => handleSaveMetric(metric.key)}
                      style={({ pressed }) => [styles.metricSaveButton, pressed && styles.buttonPressed]}>
                      <Text style={styles.metricSaveText}>Save</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Animated.View>
            );
          })}
        </Animated.ScrollView>

        {/* Attendance Calendar Launcher */}
        <View style={styles.calendarCommandCard}>
          <View pointerEvents="none" style={styles.calendarGlow} />
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Attendance Calendar</Text>
              <Text style={styles.cardTitle}>
                {selectedMonth ? `${selectedMonth.month} editor` : '2026 visits'}
              </Text>
            </View>
            <Pressable
              onPress={() => setIsCalendarEditorOpen((value) => !value)}
              style={({ pressed }) => [styles.calendarToggleButton, pressed && styles.buttonPressed]}>
              <Text style={styles.calendarToggleText}>
                {isCalendarEditorOpen ? 'Close days' : 'Edit days'}
              </Text>
            </Pressable>
          </View>

          {selectedMonth ? (
            <View>
              <Pressable
                onPress={() => setIsCalendarEditorOpen((value) => !value)}
                style={({ pressed }) => [styles.calendarLaunchButton, pressed && styles.buttonPressed]}>
                <View style={styles.calendarLaunchTop}>
                  <View style={styles.calendarLaunchBadge}>
                    <Text style={styles.calendarLaunchMonth}>{selectedMonth.month.slice(0, 3)}</Text>
                    <Text style={styles.calendarLaunchDay}>{selectedMonthVisitCount}</Text>
                  </View>
                  <View style={styles.calendarLaunchCopy}>
                    <Text style={styles.calendarLaunchTitle}>Open monthly day editor</Text>
                    <Text style={styles.calendarLaunchBody}>
                      Tap to reveal the day grid, then select a date to update attendance.
                    </Text>
                  </View>
                  <Text style={styles.calendarLaunchArrow}>
                    {isCalendarEditorOpen ? '^' : 'v'}
                  </Text>
                </View>
                <View style={styles.calendarStatsRow}>
                  <View style={styles.calendarStatChip}>
                    <Text style={styles.calendarStatValue}>{selectedMonthVisitCount}</Text>
                    <Text style={styles.calendarStatLabel}>visits</Text>
                  </View>
                  <View style={styles.calendarStatChip}>
                    <Text style={styles.calendarStatValue}>{selectedMonthAverageCalories}</Text>
                    <Text style={styles.calendarStatLabel}>avg kcal</Text>
                  </View>
                  <View style={styles.calendarStatChip}>
                    <Text style={styles.calendarStatValue}>{selectedMonthSessions.length}</Text>
                    <Text style={styles.calendarStatLabel}>sessions</Text>
                  </View>
                </View>
              </Pressable>

              {isCalendarEditorOpen ? (
                <View style={styles.calendarEditorPanel}>
              <View style={styles.monthSwitcher}>
                <Pressable
                  disabled={activeMonthIndex === 0}
                  onPress={() => setSelectedMonthIndex((v) => Math.max(0, v - 1))}
                  style={[
                    styles.monthArrowButton,
                    activeMonthIndex === 0 && styles.monthArrowButtonDisabled,
                  ]}>
                  <Text style={styles.monthArrowText}>{'‹'}</Text>
                </Pressable>
                <Text style={styles.monthTitle}>{selectedMonth.month}</Text>
                <Pressable
                  disabled={activeMonthIndex === attendanceByMonth.length - 1}
                  onPress={() =>
                    setSelectedMonthIndex((v) => Math.min(attendanceByMonth.length - 1, v + 1))
                  }
                  style={[
                    styles.monthArrowButton,
                    activeMonthIndex === attendanceByMonth.length - 1 && styles.monthArrowButtonDisabled,
                  ]}>
                  <Text style={styles.monthArrowText}>{'›'}</Text>
                </Pressable>
              </View>
              <View style={styles.calendarLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: premiumColors.red }]} />
                  <Text style={styles.legendText}>Attended</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: premiumColors.surfaceSoft }]} />
                  <Text style={styles.legendText}>Not attended</Text>
                </View>
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
          ) : null}
        </View>

        {/* Workout Timer */}
        <View style={styles.timerCard}>
          <View pointerEvents="none" style={styles.timerCardGlow} />
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Workout Timer</Text>
              <Text style={styles.cardTitle}>Session clock</Text>
            </View>
            <Text style={styles.cardHint}>
              {timerState === 'running' ? 'Running' : timerState === 'paused' ? 'Paused' : 'Ready'}
            </Text>
          </View>

          <View style={styles.timerDisplayRow}>
            <View style={styles.timerCircleWrap}>
              <View style={styles.timerCircleBackground} />
              <View style={styles.timerCircleInner}>
                <Text style={styles.timerValue}>{formatDuration(elapsedSeconds)}</Text>
                <Text style={styles.timerSubLabel}>
                  {timerState === 'running' ? 'Active' : 'Paused'}
                </Text>
              </View>
            </View>
            <View style={styles.timerStats}>
              <View style={styles.timerStatCard}>
                <Text style={styles.timerStatValue}>{timerCalories}</Text>
                <Text style={styles.timerStatLabel}>Live kcal</Text>
              </View>
              {lastCalories > 0 && (
                <View style={[styles.timerStatCard, styles.timerStatCardGreen]}>
                  <Text style={[styles.timerStatValue, { color: premiumColors.success }]}>{lastCalories}</Text>
                  <Text style={styles.timerStatLabel}>Last session</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.timerButtonRow}>
            <Pressable
              onPress={handleStartTimer}
              disabled={timerState === 'running'}
              style={({ pressed }) => [
                styles.timerPrimaryButton,
                timerState === 'running' && styles.timerButtonDimmed,
                pressed && timerState !== 'running' && styles.buttonPressed,
              ]}>
              <Text style={styles.timerPrimaryText}>
                {timerState === 'paused' ? 'Resume' : 'Start'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handlePauseTimer}
              disabled={timerState !== 'running'}
              style={({ pressed }) => [
                styles.timerSecondaryButton,
                timerState !== 'running' && styles.timerButtonDimmed,
                pressed && timerState === 'running' && styles.buttonPressed,
              ]}>
              <Text style={styles.timerSecondaryText}>Pause</Text>
            </Pressable>
            <Pressable
              onPress={handleEndWorkout}
              style={({ pressed }) => [
                styles.timerSecondaryButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.timerSecondaryText}>End</Text>
            </Pressable>
          </View>
        </View>

        {/* Achievements & Badges */}
        <View style={styles.sectionHeader}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionEyebrow}>Consistency</Text>
            <Text style={styles.sectionTitle}>Achievements & Badges</Text>
          </View>
          <Text style={styles.sectionHintPill}>
            {unlockedCount}/{achievements.length}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementsRail}>
          {achievements.map((achievement) => (
            <View
              key={achievement.id}
              style={[
                styles.achievementCard,
                achievement.isUnlocked && styles.achievementCardUnlocked,
              ]}>
              <View
                style={[
                  styles.achievementIcon,
                  achievement.isUnlocked && styles.achievementIconUnlocked,
                ]}>
                <Text style={styles.achievementIconText}>
                  {achievement.isUnlocked ? '✓' : '–'}
                </Text>
              </View>
              <Text
                style={[
                  styles.achievementTitle,
                  achievement.isUnlocked && styles.achievementTitleUnlocked,
                ]}>
                {achievement.title}
              </Text>
              <Text style={styles.achievementDesc}>{achievement.description}</Text>
            </View>
          ))}
        </ScrollView>

        {/* AI Assistant */}
        <View style={styles.aiCard}>
          <View pointerEvents="none" style={styles.aiCardGlow} />
          <Text style={styles.cardLabel}>AI Assistant</Text>
          <Text style={styles.cardTitle}>Tailored training guidance</Text>
          <Text style={styles.aiBody}>
            Your About Me and Training Note help tailor AI guidance around your body type, goals, injuries, and preferences.
          </Text>
          <Pressable
            onPress={() => undefined}
            style={({ pressed }) => [styles.aiButton, pressed && styles.buttonPressed]}>
            <Text style={styles.aiButtonText}>Start Chat</Text>
          </Pressable>
        </View>

        {/* About Me / Training Note */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>About Me</Text>
              <Text style={styles.cardTitle}>Training note</Text>
              <Text style={styles.cardSubtitle}>
                Edit to improve your tailored AI plan.
              </Text>
            </View>
            <Pressable
              onPress={() => (isEditingBio ? handleSaveBiography() : setIsEditingBio(true))}
              style={({ pressed }) => [styles.editButton, pressed && styles.buttonPressed]}>
              <Text style={styles.editButtonText}>{isEditingBio ? 'Save' : 'Edit'}</Text>
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

      {/* Modals */}

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
                style={({ pressed }) => [styles.confirmSecondary, pressed && styles.buttonPressed]}>
                <Text style={styles.confirmSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmToggleVisit}
                style={({ pressed }) => [styles.confirmPrimary, pressed && styles.buttonPressed]}>
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
              Resetting starts a fresh count from now. Your previous total is kept and can be saved to History.
            </Text>
            <View style={styles.confirmRow}>
              <Pressable
                onPress={() => {
                  setPendingMetricResetKey(undefined);
                  setIsPendingMetricResetAll(false);
                }}
                style={({ pressed }) => [styles.confirmSecondary, pressed && styles.buttonPressed]}>
                <Text style={styles.confirmSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmResetMetric}
                style={({ pressed }) => [styles.confirmPrimary, pressed && styles.buttonPressed]}>
                <Text style={styles.confirmPrimaryText}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={isHistoryVisible} animationType="fade">
        <View style={styles.historyOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsHistoryVisible(false)} />
          <View style={styles.historyPanel}>
            <View style={styles.historyTopBar}>
              <View>
                <Text style={styles.modalKicker}>Journey History</Text>
                <Text style={styles.historyPanelTitle}>Recorded periods</Text>
              </View>
              <Pressable
                onPress={() => setIsHistoryVisible(false)}
                style={({ pressed }) => [styles.historyIconClose, pressed && styles.buttonPressed]}>
                <Text style={styles.historyIconCloseText}>✕</Text>
              </Pressable>
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
                      <Text style={styles.historyRange}>{formatHistoryRange(record)}</Text>
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
                style={({ pressed }) => [styles.confirmSecondary, pressed && styles.buttonPressed]}>
                <Text style={styles.confirmSecondaryText}>Do Not Save</Text>
              </Pressable>
              <Pressable
                onPress={confirmSaveWorkout}
                style={({ pressed }) => [styles.confirmPrimary, pressed && styles.buttonPressed]}>
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
    borderRadius: 30,
    padding: 22,
    marginBottom: 12,
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
  heroOrbitOne: {
    position: 'absolute',
    right: -70,
    top: -44,
    width: 178,
    height: 178,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 89,
  },
  heroOrbitTwo: {
    position: 'absolute',
    right: -28,
    top: 18,
    width: 104,
    height: 104,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 52,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  heroIdentity: {
    flex: 1,
  },
  heroSignal: {
    width: 86,
    minHeight: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
  },
  heroSignalValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  heroSignalLabel: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
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
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 33,
    marginTop: 6,
  },
  heroBody: {
    color: 'rgba(255, 255, 255, 0.86)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  heroStatPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 12,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  commandGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  commandTile: {
    flex: 1,
    minHeight: 74,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.065)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  commandValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  commandLabel: {
    color: mutedColor,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    marginTop: 4,
  },
  accentBar: {
    width: 4,
    height: 36,
    borderRadius: 999,
    backgroundColor: wineColor,
    shadowColor: wineColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.36,
    shadowRadius: 8,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionEyebrow: {
    color: wineColor,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: textColor,
    fontSize: 21,
    fontWeight: '900',
  },
  sectionHintPill: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.3)',
    borderRadius: 999,
    backgroundColor: 'rgba(177, 18, 38, 0.12)',
    color: wineColor,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metricHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.2)',
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 12,
  },
  historyButtonText: {
    color: wineColor,
    fontSize: 11,
    fontWeight: '900',
  },
  tinyResetButton: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.34)',
    borderRadius: 999,
    backgroundColor: 'rgba(177, 18, 38, 0.12)',
    paddingHorizontal: 10,
  },
  tinyResetText: {
    color: accentColor,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  tinyUndoButton: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.32)',
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 10,
  },
  tinyUndoText: {
    color: '#F8C471',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  tinyGreenButton: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
  },
  tinyGreenText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricsRail: {
    gap: 12,
    paddingBottom: 20,
    paddingRight: 4,
  },
  metricCard: {
    position: 'relative',
    overflow: 'hidden',
    width: 236,
    minHeight: 174,
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 26,
    backgroundColor: premiumColors.surface,
    padding: 16,
    justifyContent: 'flex-start',
    ...premiumShadow,
  },
  metricCardGloss: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  metricPulse: {
    position: 'absolute',
    right: -42,
    top: -38,
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: 'rgba(225, 29, 46, 0.08)',
  },
  metricAccent: {
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: premiumColors.redBright,
    marginBottom: 12,
  },
  metricWidgetEyebrow: {
    color: 'rgba(255, 255, 255, 0.46)',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 0,
  },
  metricLabel: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 6,
    flex: 1,
  },
  metricActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  metricResetButton: {
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.34)',
    borderRadius: 999,
    backgroundColor: 'rgba(177, 18, 38, 0.12)',
    paddingHorizontal: 9,
  },
  metricUndoButton: {
    borderColor: 'rgba(245, 158, 11, 0.32)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  metricResetText: {
    color: accentColor,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricUndoText: {
    color: '#F8C471',
  },
  metricSaveButton: {
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#16A34A',
    paddingHorizontal: 9,
  },
  metricSaveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  card: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 26,
    backgroundColor: premiumColors.surface,
    padding: 18,
    marginBottom: 16,
    ...premiumShadow,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  cardLabel: {
    color: accentColor,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: textColor,
    fontSize: 18,
    fontWeight: '900',
  },
  cardSubtitle: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 4,
  },
  cardHint: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
  calendarCommandCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.18)',
    borderRadius: 28,
    backgroundColor: 'rgba(18, 20, 28, 0.86)',
    padding: 18,
    marginBottom: 16,
    ...premiumShadow,
  },
  calendarGlow: {
    position: 'absolute',
    right: -50,
    top: -54,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(225, 29, 46, 0.08)',
  },
  calendarToggleButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.32)',
    borderRadius: 999,
    backgroundColor: 'rgba(225, 29, 46, 0.12)',
    paddingHorizontal: 14,
  },
  calendarToggleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  calendarLaunchButton: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.065)',
    padding: 14,
  },
  calendarLaunchTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarLaunchBadge: {
    width: 58,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 18,
    backgroundColor: premiumColors.red,
    ...premiumGlow,
  },
  calendarLaunchMonth: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  calendarLaunchDay: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 1,
  },
  calendarLaunchCopy: {
    flex: 1,
  },
  calendarLaunchTitle: {
    color: textColor,
    fontSize: 15,
    fontWeight: '900',
  },
  calendarLaunchBody: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 4,
  },
  calendarLaunchArrow: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 18,
    fontWeight: '900',
  },
  calendarEditorPanel: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    marginTop: 12,
    padding: 12,
  },
  monthSwitcher: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  monthArrowButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  monthArrowButtonDisabled: {
    opacity: 0.36,
  },
  monthArrowText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  monthTitle: {
    color: textColor,
    fontSize: 16,
    fontWeight: '900',
  },
  calendarLegendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calendarDay: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  calendarDayActive: {
    borderColor: premiumColors.redBright,
    backgroundColor: premiumColors.red,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 4,
  },
  calendarDayText: {
    color: 'rgba(255, 255, 255, 0.62)',
    fontSize: 12,
    fontWeight: '900',
  },
  calendarDayTextActive: {
    color: '#FFFFFF',
  },
  calendarStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  calendarStatChip: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  calendarStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  calendarStatLabel: {
    color: mutedColor,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  timerCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.18)',
    borderRadius: 28,
    backgroundColor: premiumColors.surface,
    padding: 18,
    marginBottom: 20,
    overflow: 'hidden',
    ...premiumShadow,
  },
  timerCardGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(177, 18, 38, 0.08)',
  },
  timerDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  timerCircleWrap: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircleBackground: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: 'rgba(177, 18, 38, 0.18)',
    borderRadius: 65,
  },
  timerCircleInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerValue: {
    color: textColor,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
  },
  timerSubLabel: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  timerStats: {
    flex: 1,
    gap: 10,
  },
  timerStatCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 12,
  },
  timerStatCardGreen: {
    borderColor: 'rgba(34, 197, 94, 0.15)',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  timerStatValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  timerStatLabel: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  timerButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timerPrimaryButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: accentColor,
    ...premiumGlow,
  },
  timerPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  timerSecondaryButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.18)',
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
  },
  timerSecondaryText: {
    color: wineColor,
    fontSize: 14,
    fontWeight: '900',
  },
  timerButtonDimmed: {
    opacity: 0.4,
  },
  achievementsRail: {
    gap: 12,
    paddingBottom: 20,
    paddingRight: 4,
  },
  achievementCard: {
    width: 160,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 22,
    backgroundColor: premiumColors.surface,
    padding: 16,
    opacity: 0.54,
    ...premiumShadow,
  },
  achievementCardUnlocked: {
    opacity: 1,
    borderColor: 'rgba(177, 18, 38, 0.3)',
    backgroundColor: 'rgba(177, 18, 38, 0.06)',
  },
  achievementIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: premiumColors.surfaceSoft,
    marginBottom: 12,
  },
  achievementIconUnlocked: {
    backgroundColor: accentColor,
  },
  achievementIconText: {
    color: textColor,
    fontSize: 18,
    fontWeight: '900',
  },
  achievementTitle: {
    color: textColor,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  achievementTitleUnlocked: {
    color: '#FFFFFF',
  },
  achievementDesc: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 5,
  },
  aiCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.11)',
    borderRadius: 26,
    backgroundColor: 'rgba(18, 20, 28, 0.86)',
    padding: 18,
    marginBottom: 16,
    ...premiumShadow,
  },
  aiCardGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(177, 18, 38, 0.06)',
  },
  aiBody: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 14,
  },
  aiButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: accentColor,
    ...premiumGlow,
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  editButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 999,
    backgroundColor: premiumColors.surfaceSoft,
    paddingHorizontal: 16,
  },
  editButtonText: {
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
    minHeight: 120,
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
    marginBottom: 12,
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
  historyIntro: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 14,
  },
  historyList: {
    flex: 1,
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
