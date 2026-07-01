import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { journeyService, memberService } from '@/services';
import { useAppTheme, type AppTheme } from '@/theme/useAppTheme';
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

type TimerState = 'idle' | 'running' | 'paused';

const journeyTimerStorageKey = 'marvel-gym:journey-workout-timer';
const accentColor = '#B11226';
const accentBright = '#E11D2E';
const neonGreen = '#4ADE80';
const neonBlue = '#3B82F6';
const neonYellow = '#FDE68A';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const monthRailItemWidth = 116;

type RingMetric = {
  accent: string;
  detail: string;
  label: string;
  progress: number;
  symbol: SFSymbol;
  value: string;
};

type StoredTimerState = {
  elapsedSeconds: number;
  startedAt?: number;
  state: TimerState;
};

type ChartPoint = {
  calories: number;
  duration: number;
  label: string;
};

type PlotPoint = {
  x: number;
  y: number;
};

function formatDay(value: string) {
  return new Intl.DateTimeFormat('en', { day: '2-digit' }).format(new Date(value));
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(value));
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

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

function parseDurationMinutes(value?: string) {
  if (!value) return 0;
  const numericValue = Number.parseInt(value, 10);
  return Number.isNaN(numericValue) ? 0 : numericValue;
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

function buildDurationPlotPoints(
  points: ChartPoint[],
  width: number,
  height: number,
  maxDuration: number,
  maxCalories: number,
) {
  return points.map((point) => ({
    x: (point.duration / maxDuration) * width,
    y: height - (point.calories / maxCalories) * height,
  }));
}

function buildCurvePath(points: PlotPoint[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX.toFixed(1)} ${previous.y.toFixed(1)}, ${controlX.toFixed(
      1,
    )} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }, '');
}

function buildAreaPath(points: PlotPoint[], height: number) {
  const curve = buildCurvePath(points);
  if (!curve || points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${curve} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`;
}

function MetricRing({ metric, size = 138 }: { metric: RingMetric; size?: number }) {
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0.04, metric.progress));
  const dashOffset = circumference * (1 - clampedProgress);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const animatedDashOffset = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, dashOffset],
  });

  useEffect(() => {
    progressAnimation.setValue(0);
    Animated.timing(progressAnimation, {
      duration: 900,
      toValue: 1,
      useNativeDriver: false,
    }).start();
  }, [dashOffset, progressAnimation]);

  return (
    <View style={styles.staticRingCard}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id={`ring-${metric.label}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
            <Stop offset="0.42" stopColor={metric.accent} stopOpacity="1" />
            <Stop offset="1" stopColor={metric.accent} stopOpacity="0.62" />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#ring-${metric.label})`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={animatedDashOffset as unknown as number}
          strokeLinecap="round"
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View pointerEvents="none" style={styles.ringCenter}>
        <SymbolView
          name={metric.symbol}
          size={18}
          tintColor={metric.accent}
          fallback={<Text style={[styles.ringIconFallback, { color: metric.accent }]}>*</Text>}
        />
        <Text style={styles.ringValue}>{metric.value}</Text>
        <Text style={styles.ringDetail}>{metric.detail}</Text>
      </View>
      <Text style={styles.ringLabel}>{metric.label}</Text>
    </View>
  );
}

function TrendChart({ points }: { points: ChartPoint[] }) {
  const width = 310;
  const height = 126;
  const maxDuration = 30;
  const sortedPoints = [
    { calories: 0, duration: 0, label: 'Start' },
    ...[...points].sort((left, right) => left.duration - right.duration),
  ];
  const maxCalories = Math.max(
    100,
    Math.ceil(Math.max(...sortedPoints.map((point) => point.calories), 100) / 100) * 100,
  );
  const caloriePoints = buildDurationPlotPoints(
    sortedPoints,
    width,
    height,
    maxDuration,
    maxCalories,
  );
  const caloriePath = buildCurvePath(caloriePoints);
  const areaPath = buildAreaPath(caloriePoints, height);
  const durationTicks = Array.from({ length: maxDuration / 30 + 1 }, (_, index) => index * 30);
  const calorieTicks = [maxCalories, Math.round(maxCalories / 2), 0];

  return (
    <View style={styles.chartRow}>
      <View style={styles.chartYAxisTitleCol}>
        <Text style={styles.chartYAxisTitle}>Calories burned</Text>
      </View>
      <View style={styles.chartCanvas}>
        <View pointerEvents="none" style={styles.chartGrid}>
          {[0, 1, 2, 3].map((line) => (
            <View key={line} style={styles.chartGridLine} />
          ))}
        </View>
        <View style={styles.chartYAxisLabels}>
          {calorieTicks.map((tick) => (
            <Text key={tick} style={styles.chartAxisLabel}>
              {tick}
            </Text>
          ))}
        </View>
        <Svg width="100%" height={156} viewBox={`0 0 ${width} ${height + 28}`}>
          <Defs>
            <SvgLinearGradient id="journey-area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={accentBright} stopOpacity="0.34" />
              <Stop offset="1" stopColor={accentBright} stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          <Path d={`M 0 ${height} H ${width}`} stroke="rgba(255,255,255,0.24)" strokeWidth="1.4" />
          <Path d={`M 0 0 V ${height}`} stroke="rgba(255,255,255,0.24)" strokeWidth="1.4" />
          {durationTicks.map((tick) => {
            const x = (tick / maxDuration) * width;
            return (
              <Path
                key={tick}
                d={`M ${x.toFixed(1)} 0 V ${height}`}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="1"
              />
            );
          })}
          <Path d={areaPath} fill="url(#journey-area)" />
          <Path
            d={caloriePath}
            fill="none"
            stroke={accentBright}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {caloriePoints.map((point, index) => (
            <Circle key={`calorie-${index}`} cx={point.x} cy={point.y} r={3.5} fill={accentBright} />
          ))}
        </Svg>
        <View style={styles.chartXAxis}>
          {durationTicks.map((tick) => (
            <Text key={tick} style={styles.chartXAxisLabel} numberOfLines={1}>
              {tick}m
            </Text>
          ))}
        </View>
        <Text style={styles.chartXAxisTitle}>Time duration</Text>
        <View style={styles.chartLegendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: accentBright }]} />
            <Text style={styles.legendText}>Calories</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function JourneyScreen() {
  const theme = useAppTheme();
  const [member, setMember] = useState<Member>();
  const [profile, setProfile] = useState<JourneyProfile>();

  const [attendanceDays, setAttendanceDays] = useState<AttendanceDay[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [historyRecords, setHistoryRecords] = useState<JourneyHistoryRecord[]>([]);
  const [stats, setStats] = useState<JourneyStats>();
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const [isCalendarEditorOpen, setIsCalendarEditorOpen] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const stylesForTheme = useStyles(theme, timerState);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastCalories, setLastCalories] = useState(0);
  const [pendingVisitDate, setPendingVisitDate] = useState('');
  const [metrics, setMetrics] = useState<JourneyMetrics>();
  const [pendingMetricResetKey, setPendingMetricResetKey] = useState<JourneyMetricKey>();
  const [isPendingMetricResetAll, setIsPendingMetricResetAll] = useState(false);
  const [undoableMetricKeys, setUndoableMetricKeys] = useState<JourneyMetricKey[]>([]);
  const [isAllMetricResetUndoable, setIsAllMetricResetUndoable] = useState(false);
  const [pendingTimerSeconds, setPendingTimerSeconds] = useState(0);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const timerStartedAtRef = useRef<number | undefined>(undefined);
  const pausedElapsedRef = useRef(0);
  const breathe = useRef(new Animated.Value(0)).current;
  const monthRailRef = useRef<ScrollView>(null);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          duration: timerState === 'running' ? 1200 : 1900,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          duration: timerState === 'running' ? 1200 : 1900,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, timerState]);

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

      return () => {
        isActive = false;
      };
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
  const selectedMonthVisitCount = selectedMonth?.days.filter((day) => day.hasVisit).length ?? 0;
  const selectedMonthSessions = useMemo(
    () =>
      workoutSessions
        .filter((session) => session.endedAt.startsWith(selectedMonthKey))
        .sort((left, right) => left.endedAt.localeCompare(right.endedAt)),
    [selectedMonthKey, workoutSessions],
  );
  const selectedMonthCompletionRate = selectedMonth
    ? Math.round((selectedMonthVisitCount / Math.max(1, selectedMonth.days.length)) * 100)
    : 0;
  const selectedMonthVisitedDays = useMemo(
    () => selectedMonth?.days.filter((day) => day.hasVisit) ?? [],
    [selectedMonth],
  );

  const timerCalories = estimateCalories(elapsedSeconds);

  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (selectedMonthSessions.length === 0) {
      return [
        { calories: 190, duration: 24, label: 'W1' },
        { calories: 280, duration: 34, label: 'W2' },
        { calories: 230, duration: 29, label: 'W3' },
        { calories: 350, duration: 43, label: 'W4' },
      ];
    }

    return selectedMonthSessions.map((session) => ({
      calories: Math.max(1, session.estimatedCaloriesBurned),
      duration: Math.max(1, Math.round(session.durationSeconds / 60)),
      label: formatDay(session.endedAt),
    }));
  }, [selectedMonthSessions]);

  const metricCards: { accent: string; key: JourneyMetricKey; label: string; value: string | number }[] =
    [
      { accent: accentBright, key: 'totalVisits', label: 'Total visits', value: metrics?.totalVisits ?? 0 },
      {
        accent: neonBlue,
        key: 'averageMonthlyVisits',
        label: 'Monthly avg',
        value: metrics?.averageMonthlyVisits ?? '0',
      },
      {
        accent: neonYellow,
        key: 'averageCaloriesBurned',
        label: 'Avg calories burned per session',
        value: metrics?.averageCaloriesBurned ?? 0,
      },
      {
        accent: neonGreen,
        key: 'averageWorkoutDuration',
        label: 'Avg duration',
        value: metrics?.averageWorkoutDuration ?? '0 min',
      },
    ];

  const ringMetrics: RingMetric[] = [
    {
      accent: accentBright,
      detail: 'visits',
      label: 'Visits',
      progress: selectedMonthCompletionRate / 100,
      symbol: 'calendar',
      value: `${selectedMonthVisitCount}`,
    },
    {
      accent: neonGreen,
      detail: 'day streak',
      label: 'Streak',
      progress: Math.min(1, (stats?.consecutiveStreak ?? 0) / 12),
      symbol: 'flame.fill',
      value: `${stats?.consecutiveStreak ?? 0}`,
    },
    {
      accent: neonYellow,
      detail: 'kcal',
      label: 'Energy',
      progress: Math.min(1, (stats?.estimatedCaloriesBurned ?? 0) / 900),
      symbol: 'bolt.fill',
      value: `${stats?.estimatedCaloriesBurned ?? 0}`,
    },
    {
      accent: neonBlue,
      detail: 'avg',
      label: 'Duration',
      progress: Math.min(1, parseDurationMinutes(stats?.averageWorkoutDuration) / 90),
      symbol: 'timer',
      value: stats?.averageWorkoutDuration ?? '0 min',
    },
  ];

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

  const confirmToggleVisit = async () => {
    if (!pendingVisitDate) return;
    await Haptics.selectionAsync();
    const nextAttendance = await journeyService.toggleAttendanceDay(pendingVisitDate);
    setAttendanceDays(nextAttendance);
    setPendingVisitDate('');
    await refreshStats();
    await refreshMetrics();
  };

  const handleStartTimer = () => {
    if (timerState === 'running') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const handlePauseTimer = () => {
    if (!timerStartedAtRef.current) return;
    Haptics.selectionAsync();
    const liveSeconds = Math.floor((Date.now() - timerStartedAtRef.current) / 1000);
    pausedElapsedRef.current += liveSeconds;
    setElapsedSeconds(pausedElapsedRef.current);
    timerStartedAtRef.current = undefined;
    setTimerState('paused');
    saveStoredTimerState({ elapsedSeconds: pausedElapsedRef.current, state: 'paused' });
  };

  const handleEndWorkout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
    saveStoredTimerState({ elapsedSeconds: liveElapsedSeconds, state: 'paused' });
  };

  const confirmSaveWorkout = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    Haptics.selectionAsync();
    setTimerState('idle');
    setElapsedSeconds(0);
    setPendingTimerSeconds(0);
    timerStartedAtRef.current = undefined;
    pausedElapsedRef.current = 0;
    clearStoredTimerState();
  };

  const confirmResetMetric = async () => {
    if (!pendingMetricResetKey && !isPendingMetricResetAll) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

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
    await Haptics.selectionAsync();
    const nextMetrics = await journeyService.undoResetJourneyMetric(metricKey);
    setMetrics(nextMetrics);
    setUndoableMetricKeys((current) => current.filter((key) => key !== metricKey));
    await refreshJourneyHistory();
  };

  const handleUndoMetricAll = async () => {
    await Haptics.selectionAsync();
    const nextMetrics = await journeyService.undoResetAllJourneyMetrics();
    setMetrics(nextMetrics);
    setIsAllMetricResetUndoable(false);
    await refreshJourneyHistory();
  };

  const handleSaveMetric = async (metricKey: JourneyMetricKey) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const nextHistory = await journeyService.saveJourneyMetricReset(metricKey);
    setHistoryRecords(nextHistory);
    setUndoableMetricKeys((current) => current.filter((key) => key !== metricKey));
  };

  const handleSaveMetricAll = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const nextHistory = await journeyService.saveAllJourneyMetricReset();
    setHistoryRecords(nextHistory);
    setIsAllMetricResetUndoable(false);
  };

  const timerBreathStyle = {
    transform: [
      {
        scale: breathe.interpolate({
          inputRange: [0, 1],
          outputRange: [1, timerState === 'running' ? 1.025 : 1.012],
        }),
      },
    ],
    opacity: breathe.interpolate({
      inputRange: [0, 1],
      outputRange: [0.88, 1],
    }),
  };

  useEffect(() => {
    monthRailRef.current?.scrollTo({
      animated: true,
      x: activeMonthIndex * monthRailItemWidth,
    });
  }, [activeMonthIndex]);

  const handleMonthRailMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (attendanceByMonth.length === 0) return;
      const nextIndex = Math.min(
        attendanceByMonth.length - 1,
        Math.max(0, Math.round(event.nativeEvent.contentOffset.x / monthRailItemWidth)),
      );
      setSelectedMonthIndex(nextIndex);
    },
    [attendanceByMonth.length],
  );

  if (isLoading || !profile || !stats || !metrics) {
    return (
      <PremiumScreenBackground>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <View style={stylesForTheme.loadingState}>
          <ActivityIndicator color={accentBright} />
          <Text style={stylesForTheme.loadingText}>Loading journey...</Text>
        </View>
      </PremiumScreenBackground>
    );
  }

  return (
    <PremiumScreenBackground>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={stylesForTheme.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={stylesForTheme.header}>
          <Text style={stylesForTheme.headerTitle}>My Journey</Text>
          <Text style={stylesForTheme.headerTagline}>Track your progress</Text>
        </View>

        <View style={stylesForTheme.calendarPanel}>
          <View style={stylesForTheme.panelTopRow}>
            <View>
              <Text style={stylesForTheme.panelKicker}>Attendance</Text>
              <Text style={stylesForTheme.panelTitle}>{selectedMonth?.month ?? 'Calendar'}</Text>
            </View>
            <Pressable
              onPress={() => setIsCalendarEditorOpen((value) => !value)}
              style={({ pressed }) => [
                stylesForTheme.iconPillButton,
                pressed && stylesForTheme.buttonPressed,
              ]}>
              <SymbolView
                name={isCalendarEditorOpen ? 'xmark' : 'calendar'}
                size={17}
                tintColor={theme.colors.text}
                fallback={<Text style={stylesForTheme.iconFallback}>+</Text>}
              />
            </Pressable>
          </View>
          <View style={stylesForTheme.monthSwitcher}>
            <Pressable
              disabled={activeMonthIndex === 0}
              onPress={() => setSelectedMonthIndex((value) => Math.max(0, value - 1))}
              style={[
                stylesForTheme.monthArrowButton,
                activeMonthIndex === 0 && stylesForTheme.disabledButton,
              ]}>
              <Text style={stylesForTheme.monthArrowText}>{'<'}</Text>
            </Pressable>
            <Text style={stylesForTheme.monthTitle}>{selectedMonth?.month ?? 'Month'}</Text>
            <Pressable
              disabled={activeMonthIndex === attendanceByMonth.length - 1}
              onPress={() =>
                setSelectedMonthIndex((value) =>
                  Math.min(attendanceByMonth.length - 1, value + 1),
                )
              }
              style={[
                stylesForTheme.monthArrowButton,
                activeMonthIndex === attendanceByMonth.length - 1 && stylesForTheme.disabledButton,
              ]}>
              <Text style={stylesForTheme.monthArrowText}>{'>'}</Text>
            </Pressable>
          </View>
          {isCalendarEditorOpen ? (
            <View style={stylesForTheme.calendarGrid}>
              {selectedMonth?.days.map((day) => (
                <Pressable
                  key={day.id}
                  onPress={() => setPendingVisitDate(day.date)}
                  style={({ pressed }) => [
                    stylesForTheme.calendarDay,
                    day.hasVisit && stylesForTheme.calendarDayActive,
                    pressed && stylesForTheme.buttonPressed,
                  ]}>
                  <Text
                    style={[
                      stylesForTheme.calendarDayText,
                      day.hasVisit && stylesForTheme.calendarDayTextActive,
                    ]}>
                    {formatDay(day.date)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={stylesForTheme.calendarSummaryCard}>
              <View style={stylesForTheme.calendarSummaryStat}>
                <Text style={stylesForTheme.calendarSummaryValue}>{selectedMonthVisitCount}</Text>
                <Text style={stylesForTheme.calendarSummaryLabel}>
                  {selectedMonthVisitCount === 1 ? 'visit logged' : 'visits logged'}
                </Text>
              </View>
              <View style={stylesForTheme.calendarSummaryBody}>
                <Text style={stylesForTheme.calendarSummaryTitle}>Active days</Text>
                {selectedMonthVisitedDays.length > 0 ? (
                  <View style={stylesForTheme.visitDayChips}>
                    {selectedMonthVisitedDays.slice(0, 6).map((day) => (
                      <View key={day.id} style={stylesForTheme.visitDayChip}>
                        <Text style={stylesForTheme.visitDayChipText}>{formatDay(day.date)}</Text>
                      </View>
                    ))}
                    {selectedMonthVisitedDays.length > 6 ? (
                      <Text style={stylesForTheme.visitMoreText}>
                        +{selectedMonthVisitedDays.length - 6}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={stylesForTheme.calendarEmptyText}>No visits recorded this month.</Text>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={stylesForTheme.timerDock}>
          <Animated.View style={[stylesForTheme.timerBreathGlow, timerBreathStyle]} />
          <BlurView
            intensity={theme.scheme === 'dark' ? 70 : 45}
            tint={theme.scheme === 'dark' ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
            style={stylesForTheme.timerBlur}>
            <LinearGradient
              pointerEvents="none"
              colors={
                theme.scheme === 'dark'
                  ? ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.05)', 'rgba(177,18,38,0.18)']
                  : ['rgba(255,255,255,0.86)', 'rgba(255,255,255,0.48)', 'rgba(177,18,38,0.10)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={stylesForTheme.timerReadout}>
              <Text style={stylesForTheme.timerValue}>{formatDuration(elapsedSeconds)}</Text>
              <Text style={stylesForTheme.timerMeta}>{timerCalories} kcal live</Text>
            </View>
            <View style={stylesForTheme.timerControls}>
              <Pressable
                onPress={timerState === 'running' ? handlePauseTimer : handleStartTimer}
                style={({ pressed }) => [
                  stylesForTheme.timerMainButton,
                  timerState === 'running' && stylesForTheme.timerPauseButton,
                  pressed && stylesForTheme.buttonPressed,
                ]}>
                <SymbolView
                  name={timerState === 'running' ? 'pause.fill' : 'play.fill'}
                  size={18}
                  tintColor="#FFFFFF"
                  fallback={
                    <Text style={stylesForTheme.timerButtonFallback}>
                      {timerState === 'running' ? 'II' : '>'}
                    </Text>
                  }
                />
              </Pressable>
              {timerState !== 'idle' ? (
                <Pressable
                  onPress={handleEndWorkout}
                  style={({ pressed }) => [
                    stylesForTheme.timerStopButton,
                    pressed && stylesForTheme.buttonPressed,
                  ]}>
                  <SymbolView
                    name="checkmark"
                    size={16}
                    tintColor={theme.colors.text}
                    fallback={<Text style={stylesForTheme.iconFallback}>✓</Text>}
                  />
                </Pressable>
              ) : null}
            </View>
          </BlurView>
          {lastCalories > 0 ? (
            <Text style={stylesForTheme.lastSessionText}>Last saved: {lastCalories} kcal</Text>
          ) : null}
        </View>

        <View style={stylesForTheme.dashboardShell}>
          {theme.scheme === 'dark' ? (
            <BlurView
              intensity={40}
              tint="systemThinMaterialDark"
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View pointerEvents="none" style={stylesForTheme.shellGlowRed} />
          <View pointerEvents="none" style={stylesForTheme.shellGlowBlue} />

          <View style={stylesForTheme.journeyTitleWrap}>
            <Text style={stylesForTheme.journeyTitle}>Guest Journey</Text>
            <View style={stylesForTheme.journeyTitleUnderline} />
          </View>

          <View style={stylesForTheme.ringsGrid}>
            {ringMetrics.map((metric) => (
              <MetricRing key={metric.label} metric={metric} />
            ))}
          </View>
        </View>

        <View style={stylesForTheme.analyticsPanel}>
          <View style={stylesForTheme.panelTopRow}>
            <View>
              <Text style={stylesForTheme.panelKicker}>Analytics</Text>
              <Text style={stylesForTheme.panelTitle}>Calories / duration</Text>
            </View>
            <ScrollView
              ref={monthRailRef}
              horizontal
              decelerationRate="fast"
              onMomentumScrollEnd={handleMonthRailMomentumEnd}
              showsHorizontalScrollIndicator={false}
              snapToInterval={monthRailItemWidth}
              style={stylesForTheme.chartMonthRail}
              contentContainerStyle={stylesForTheme.chartMonthRailContent}>
              {attendanceByMonth.map((month, index) => {
                const isActive = index === activeMonthIndex;
                return (
                  <Pressable
                    key={month.month}
                    onPress={() => setSelectedMonthIndex(index)}
                    style={[
                      stylesForTheme.chartMonthChip,
                      isActive && stylesForTheme.chartMonthChipActive,
                    ]}>
                    <Text
                      style={[
                        stylesForTheme.chartMonthChipText,
                        isActive && stylesForTheme.chartMonthChipTextActive,
                      ]}>
                      {month.month}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <TrendChart points={chartPoints} />
        </View>

        <View style={stylesForTheme.metricHeader}>
          <View>
            <Text style={stylesForTheme.panelKicker}>All-time</Text>
            <Text style={stylesForTheme.panelTitle}>Metrics</Text>
          </View>
          <View style={stylesForTheme.metricHeaderActions}>
            {isAllMetricResetUndoable ? (
              <>
                <Pressable
                  onPress={handleSaveMetricAll}
                  style={({ pressed }) => [
                    stylesForTheme.tinyGreenButton,
                    pressed && stylesForTheme.buttonPressed,
                  ]}>
                  <Text style={stylesForTheme.tinyGreenText}>Save</Text>
                </Pressable>
                <Pressable
                  onPress={handleUndoMetricAll}
                  style={({ pressed }) => [
                    stylesForTheme.tinyUndoButton,
                    pressed && stylesForTheme.buttonPressed,
                  ]}>
                  <Text style={stylesForTheme.tinyUndoText}>Undo</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => setIsPendingMetricResetAll(true)}
                style={({ pressed }) => [
                  stylesForTheme.tinyResetButton,
                  pressed && stylesForTheme.buttonPressed,
                ]}>
                <Text style={stylesForTheme.tinyResetText}>Reset</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setIsHistoryVisible(true)}
              style={({ pressed }) => [
                stylesForTheme.historyButton,
                pressed && stylesForTheme.buttonPressed,
              ]}>
              <Text style={stylesForTheme.historyButtonText}>History</Text>
            </Pressable>
          </View>
        </View>

        <View style={stylesForTheme.metricsGrid}>
          {metricCards.map((metric) => {
            const canUndo = undoableMetricKeys.includes(metric.key);
            return (
              <View key={metric.key} style={stylesForTheme.metricModule}>
                <View style={[stylesForTheme.metricModuleAccent, { backgroundColor: metric.accent }]} />
                <Text style={[stylesForTheme.metricModuleValue, { color: metric.accent }]}>
                  {metric.value}
                </Text>
                <Text style={stylesForTheme.metricModuleLabel}>{metric.label}</Text>
                <View style={stylesForTheme.metricActions}>
                  <Pressable
                    onPress={() =>
                      canUndo ? handleUndoMetric(metric.key) : setPendingMetricResetKey(metric.key)
                    }
                    style={({ pressed }) => [
                      stylesForTheme.metricGhostButton,
                      canUndo && stylesForTheme.metricUndoButton,
                      pressed && stylesForTheme.buttonPressed,
                    ]}>
                    <Text
                      style={[
                        stylesForTheme.metricGhostText,
                        canUndo && stylesForTheme.metricUndoText,
                      ]}>
                      {canUndo ? 'Undo' : 'Reset'}
                    </Text>
                  </Pressable>
                  {canUndo ? (
                    <Pressable
                      onPress={() => handleSaveMetric(metric.key)}
                      style={({ pressed }) => [
                        stylesForTheme.metricSaveButton,
                        pressed && stylesForTheme.buttonPressed,
                      ]}>
                      <Text style={stylesForTheme.metricSaveText}>Save</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <View style={stylesForTheme.achievementHeader}>
          <View>
            <Text style={stylesForTheme.panelKicker}>Milestones</Text>
            <Text style={stylesForTheme.panelTitle}>Achievements</Text>
          </View>
          <Text style={stylesForTheme.achievementCount}>
            {unlockedCount}/{achievements.length}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={stylesForTheme.achievementsRail}>
          {achievements.map((achievement) => (
            <View
              key={achievement.id}
              style={[
                stylesForTheme.achievementCard,
                achievement.isUnlocked && stylesForTheme.achievementCardUnlocked,
              ]}>
              <View
                style={[
                  stylesForTheme.achievementIcon,
                  achievement.isUnlocked && stylesForTheme.achievementIconUnlocked,
                ]}>
                <SymbolView
                  name={achievement.isUnlocked ? 'checkmark.seal.fill' : 'lock.fill'}
                  size={20}
                  tintColor={achievement.isUnlocked ? '#FFFFFF' : theme.colors.textMuted}
                  fallback={
                    <Text style={stylesForTheme.iconFallback}>
                      {achievement.isUnlocked ? 'OK' : 'L'}
                    </Text>
                  }
                />
              </View>
              <Text
                style={[
                  stylesForTheme.achievementTitle,
                  achievement.isUnlocked && stylesForTheme.achievementTitleUnlocked,
                ]}>
                {achievement.title}
              </Text>
              <Text style={stylesForTheme.achievementDesc}>{achievement.description}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      <Modal transparent visible={Boolean(pendingVisitDate)} animationType="fade">
        <View style={stylesForTheme.centerModalOverlay}>
          <Pressable style={stylesForTheme.modalBackdrop} onPress={() => setPendingVisitDate('')} />
          <View style={stylesForTheme.confirmCard}>
            <Text style={stylesForTheme.modalKicker}>Attendance</Text>
            <Text style={stylesForTheme.confirmTitle}>Update this day?</Text>
            <Text style={stylesForTheme.confirmBody}>
              This toggles the selected date in your attendance matrix.
            </Text>
            <View style={stylesForTheme.confirmRow}>
              <Pressable
                onPress={() => setPendingVisitDate('')}
                style={({ pressed }) => [
                  stylesForTheme.confirmSecondary,
                  pressed && stylesForTheme.buttonPressed,
                ]}>
                <Text style={stylesForTheme.confirmSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmToggleVisit}
                style={({ pressed }) => [
                  stylesForTheme.confirmPrimary,
                  pressed && stylesForTheme.buttonPressed,
                ]}>
                <Text style={stylesForTheme.confirmPrimaryText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={Boolean(pendingMetricResetKey) || isPendingMetricResetAll}
        animationType="fade">
        <View style={stylesForTheme.centerModalOverlay}>
          <Pressable
            style={stylesForTheme.modalBackdrop}
            onPress={() => {
              setPendingMetricResetKey(undefined);
              setIsPendingMetricResetAll(false);
            }}
          />
          <View style={stylesForTheme.confirmCard}>
            <Text style={stylesForTheme.modalKicker}>Journey</Text>
            <Text style={stylesForTheme.confirmTitle}>
              {isPendingMetricResetAll ? 'Reset all metrics?' : 'Reset this metric?'}
            </Text>
            <Text style={stylesForTheme.confirmBody}>
              Resetting starts a fresh count from now. Your previous total can still be
              saved to history.
            </Text>
            <View style={stylesForTheme.confirmRow}>
              <Pressable
                onPress={() => {
                  setPendingMetricResetKey(undefined);
                  setIsPendingMetricResetAll(false);
                }}
                style={({ pressed }) => [
                  stylesForTheme.confirmSecondary,
                  pressed && stylesForTheme.buttonPressed,
                ]}>
                <Text style={stylesForTheme.confirmSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmResetMetric}
                style={({ pressed }) => [
                  stylesForTheme.confirmPrimary,
                  pressed && stylesForTheme.buttonPressed,
                ]}>
                <Text style={stylesForTheme.confirmPrimaryText}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={isHistoryVisible} animationType="fade">
        <View style={stylesForTheme.historyOverlay}>
          <Pressable style={stylesForTheme.modalBackdrop} onPress={() => setIsHistoryVisible(false)} />
          <View style={stylesForTheme.historyPanel}>
            <View style={stylesForTheme.historyTopBar}>
              <View>
                <Text style={stylesForTheme.modalKicker}>Journey History</Text>
                <Text style={stylesForTheme.historyPanelTitle}>Recorded periods</Text>
              </View>
              <Pressable
                onPress={() => setIsHistoryVisible(false)}
                style={({ pressed }) => [
                  stylesForTheme.historyIconClose,
                  pressed && stylesForTheme.buttonPressed,
                ]}>
                <Text style={stylesForTheme.historyIconCloseText}>X</Text>
              </Pressable>
            </View>

            <ScrollView
              style={stylesForTheme.historyList}
              contentContainerStyle={stylesForTheme.historyListContent}
              showsVerticalScrollIndicator={false}>
              {historyRecords.length === 0 ? (
                <View style={stylesForTheme.historyEmptyCard}>
                  <Text style={stylesForTheme.historyEmptyTitle}>No history yet</Text>
                  <Text style={stylesForTheme.historyEmptyBody}>
                    Saved training periods will appear here.
                  </Text>
                </View>
              ) : (
                historyRecords.map((record) => (
                  <View key={record.id} style={stylesForTheme.historyCard}>
                    <View style={stylesForTheme.historyCardRail} />
                    <View style={stylesForTheme.historyCardContent}>
                      <Text style={stylesForTheme.historyRange}>{formatHistoryRange(record)}</Text>
                      <Text style={stylesForTheme.historySummary}>{record.summary}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={pendingTimerSeconds > 0} animationType="fade">
        <View style={stylesForTheme.centerModalOverlay}>
          <View style={stylesForTheme.confirmCard}>
            <Text style={stylesForTheme.modalKicker}>Workout Timer</Text>
            <Text style={stylesForTheme.confirmTitle}>Save this workout?</Text>
            <Text style={stylesForTheme.confirmBody}>
              Save {formatDuration(pendingTimerSeconds)} to include it in duration and
              calorie calculations.
            </Text>
            <View style={stylesForTheme.confirmRow}>
              <Pressable
                onPress={discardWorkoutTime}
                style={({ pressed }) => [
                  stylesForTheme.confirmSecondary,
                  pressed && stylesForTheme.buttonPressed,
                ]}>
                <Text style={stylesForTheme.confirmSecondaryText}>Do Not Save</Text>
              </Pressable>
              <Pressable
                onPress={confirmSaveWorkout}
                style={({ pressed }) => [
                  stylesForTheme.confirmPrimary,
                  pressed && stylesForTheme.buttonPressed,
                ]}>
                <Text style={stylesForTheme.confirmPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  staticRingCard: {
    width: '48%',
    minHeight: 196,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 24,
    backgroundColor: 'rgba(9, 10, 15, 0.62)',
    paddingVertical: 14,
  },
  ringCenter: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  ringIconFallback: {
    fontSize: 13,
    fontWeight: '900',
  },
  ringValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 8,
  },
  ringDetail: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  ringLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  chartYAxisTitleCol: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCanvas: {
    flex: 1,
    minHeight: 208,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 22,
    backgroundColor: 'rgba(3, 5, 10, 0.54)',
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 14,
    paddingLeft: 36,
  },
  chartGrid: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-evenly',
    paddingHorizontal: 18,
    paddingTop: 30,
    paddingBottom: 78,
  },
  chartGridLine: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  chartLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 8,
  },
  chartYAxisLabels: {
    position: 'absolute',
    left: 9,
    top: 30,
    bottom: 70,
    justifyContent: 'space-between',
  },
  chartAxisLabel: {
    color: 'rgba(255,255,255,0.46)',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'right',
  },
  chartYAxisTitle: {
    width: 130,
    color: 'rgba(255,255,255,0.42)',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    transform: [{ rotate: '-90deg' }],
  },
  chartXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: -6,
    paddingHorizontal: 2,
  },
  chartXAxisLabel: {
    flex: 1,
    color: 'rgba(255,255,255,0.46)',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  chartXAxisTitle: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 3,
    textAlign: 'center',
    textTransform: 'uppercase',
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
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontWeight: '800',
  },
});

function useStyles(theme: AppTheme, timerState: TimerState) {
  return useMemo(
    () =>
      StyleSheet.create({
        content: {
          paddingHorizontal: 16,
          paddingTop: 60,
          paddingBottom: 136,
        },
        header: {
          marginBottom: 22,
        },
        headerTitle: {
          color: theme.colors.text,
          fontSize: 52,
          fontWeight: '900',
          fontStyle: 'italic',
          letterSpacing: -1,
          lineHeight: 56,
        },
        headerTagline: {
          color: theme.colors.textMuted,
          fontSize: 14,
          fontWeight: '600',
          marginTop: 4,
          lineHeight: 20,
        },
        loadingState: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        },
        loadingText: {
          color: theme.colors.textMuted,
          fontSize: 14,
          fontWeight: '700',
        },
        dashboardShell: {
          position: 'relative',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor:
            theme.scheme === 'dark' ? 'rgba(255,255,255,0.13)' : 'rgba(10,11,15,0.12)',
          borderRadius: 30,
          backgroundColor: 'transparent',
          padding: 14,
          marginBottom: 14,
          ...theme.shadow,
        },
        shellGlowRed: {
          position: 'absolute',
          right: -70,
          top: -80,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: 'rgba(225,29,46,0.16)',
        },
        shellGlowBlue: {
          position: 'absolute',
          left: -90,
          bottom: 40,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(59,130,246,0.10)',
        },
        journeyTitleWrap: {
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
          paddingTop: 3,
        },
        journeyTitle: {
          color: theme.colors.text,
          fontSize: 25,
          fontWeight: '900',
          letterSpacing: 0,
          textAlign: 'center',
        },
        journeyTitleUnderline: {
          width: 64,
          height: 4,
          borderRadius: 999,
          backgroundColor: accentBright,
          marginTop: 8,
          shadowColor: accentBright,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.45,
          shadowRadius: 10,
        },
        ringsGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'space-between',
        },
        analyticsPanel: {
          borderWidth: 1,
          borderColor: theme.ink(0.11),
          borderRadius: 28,
          backgroundColor:
            theme.scheme === 'dark' ? 'rgba(16,18,26,0.78)' : 'rgba(255,255,255,0.78)',
          padding: 16,
          marginBottom: 16,
          ...theme.shadow,
        },
        panelTopRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        },
        panelKicker: {
          color: accentBright,
          fontSize: 11,
          fontWeight: '900',
          letterSpacing: 1,
          marginBottom: 3,
          textTransform: 'uppercase',
        },
        panelTitle: {
          color: theme.colors.text,
          fontSize: 20,
          fontWeight: '900',
        },
        panelPill: {
          minHeight: 32,
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.ink(0.12),
          borderRadius: 999,
          backgroundColor: theme.ink(0.05),
          paddingHorizontal: 11,
        },
        panelPillText: {
          color: theme.colors.textMuted,
          fontSize: 11,
          fontWeight: '900',
        },
        chartMonthRail: {
          width: 138,
          maxHeight: 36,
        },
        chartMonthRailContent: {
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 8,
        },
        chartMonthChip: {
          width: monthRailItemWidth - 8,
          minHeight: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.ink(0.12),
          borderRadius: 999,
          backgroundColor: theme.ink(0.05),
          paddingHorizontal: 12,
        },
        chartMonthChipActive: {
          borderColor: 'rgba(225,29,46,0.45)',
          backgroundColor: 'rgba(177,18,38,0.16)',
        },
        chartMonthChipText: {
          color: theme.colors.textMuted,
          fontSize: 11,
          fontWeight: '900',
        },
        chartMonthChipTextActive: {
          color: theme.colors.text,
        },
        metricHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 10,
          paddingHorizontal: 2,
        },
        metricHeaderActions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        historyButton: {
          minHeight: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(177,18,38,0.24)',
          borderRadius: 999,
          backgroundColor: theme.colors.surfaceSoft,
          paddingHorizontal: 12,
        },
        historyButtonText: {
          color: accentBright,
          fontSize: 11,
          fontWeight: '900',
        },
        tinyResetButton: {
          minHeight: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(177,18,38,0.30)',
          borderRadius: 999,
          backgroundColor: 'rgba(177,18,38,0.10)',
          paddingHorizontal: 11,
        },
        tinyResetText: {
          color: accentColor,
          fontSize: 10,
          fontWeight: '900',
          textTransform: 'uppercase',
        },
        tinyUndoButton: {
          minHeight: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(245,158,11,0.35)',
          borderRadius: 999,
          backgroundColor: 'rgba(245,158,11,0.10)',
          paddingHorizontal: 11,
        },
        tinyUndoText: {
          color: '#F8C471',
          fontSize: 10,
          fontWeight: '900',
          textTransform: 'uppercase',
        },
        tinyGreenButton: {
          minHeight: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          backgroundColor: '#16A34A',
          paddingHorizontal: 11,
        },
        tinyGreenText: {
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: '900',
          textTransform: 'uppercase',
        },
        metricsGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'space-between',
          marginBottom: 16,
        },
        metricModule: {
          width: '48%',
          minHeight: 130,
          borderWidth: 1,
          borderColor: theme.ink(0.1),
          borderRadius: 22,
          backgroundColor: theme.colors.surface,
          padding: 14,
          ...theme.shadow,
        },
        metricModuleAccent: {
          width: 34,
          height: 4,
          borderRadius: 999,
          marginBottom: 12,
        },
        metricModuleValue: {
          fontSize: 25,
          fontWeight: '900',
        },
        metricModuleLabel: {
          color: theme.colors.textMuted,
          fontSize: 11,
          fontWeight: '800',
          marginTop: 4,
          textTransform: 'uppercase',
        },
        metricActions: {
          flexDirection: 'row',
          gap: 7,
          marginTop: 'auto',
          paddingTop: 12,
        },
        metricGhostButton: {
          minHeight: 28,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(177,18,38,0.28)',
          borderRadius: 999,
          backgroundColor: 'rgba(177,18,38,0.09)',
          paddingHorizontal: 10,
        },
        metricGhostText: {
          color: accentColor,
          fontSize: 10,
          fontWeight: '900',
          textTransform: 'uppercase',
        },
        metricUndoButton: {
          borderColor: 'rgba(245,158,11,0.34)',
          backgroundColor: 'rgba(245,158,11,0.10)',
        },
        metricUndoText: {
          color: '#F8C471',
        },
        metricSaveButton: {
          minHeight: 28,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          backgroundColor: '#16A34A',
          paddingHorizontal: 10,
        },
        metricSaveText: {
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: '900',
          textTransform: 'uppercase',
        },
        calendarPanel: {
          borderWidth: 1,
          borderColor: theme.ink(0.11),
          borderRadius: 28,
          backgroundColor: theme.colors.surface,
          padding: 16,
          marginBottom: 16,
          ...theme.shadow,
        },
        iconPillButton: {
          width: 42,
          height: 42,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.ink(0.12),
          borderRadius: 21,
          backgroundColor: theme.colors.surfaceSoft,
        },
        iconFallback: {
          color: theme.colors.text,
          fontSize: 12,
          fontWeight: '900',
        },
        monthSwitcher: {
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: theme.ink(0.1),
          borderRadius: 999,
          backgroundColor: theme.ink(0.045),
          marginBottom: 12,
          paddingHorizontal: 8,
        },
        monthArrowButton: {
          width: 34,
          height: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 17,
          backgroundColor: theme.colors.surfaceSoft,
        },
        disabledButton: {
          opacity: 0.32,
        },
        monthArrowText: {
          color: theme.colors.text,
          fontSize: 18,
          fontWeight: '900',
        },
        monthTitle: {
          color: theme.colors.text,
          fontSize: 16,
          fontWeight: '900',
        },
        calendarGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 7,
        },
        calendarDay: {
          width: 38,
          height: 38,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.ink(0.11),
          borderRadius: 14,
          backgroundColor: theme.ink(0.045),
        },
        calendarDayActive: {
          borderColor: accentBright,
          backgroundColor: accentColor,
          shadowColor: accentBright,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 4,
        },
        calendarDayText: {
          color: theme.colors.textMuted,
          fontSize: 12,
          fontWeight: '900',
        },
        calendarDayTextActive: {
          color: '#FFFFFF',
        },
        calendarSummaryCard: {
          minHeight: 92,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          borderWidth: 1,
          borderColor: theme.ink(0.1),
          borderRadius: 22,
          backgroundColor: theme.ink(0.045),
          padding: 14,
        },
        calendarSummaryStat: {
          width: 92,
          alignItems: 'center',
          justifyContent: 'center',
          borderRightWidth: 1,
          borderRightColor: theme.ink(0.1),
          paddingRight: 14,
        },
        calendarSummaryValue: {
          color: accentBright,
          fontSize: 32,
          fontWeight: '900',
          lineHeight: 36,
        },
        calendarSummaryLabel: {
          color: theme.colors.textMuted,
          fontSize: 10,
          fontWeight: '900',
          textAlign: 'center',
          textTransform: 'uppercase',
        },
        calendarSummaryBody: {
          flex: 1,
        },
        calendarSummaryTitle: {
          color: theme.colors.text,
          fontSize: 13,
          fontWeight: '900',
          marginBottom: 9,
        },
        visitDayChips: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 7,
        },
        visitDayChip: {
          minWidth: 34,
          minHeight: 28,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          backgroundColor: 'rgba(177,18,38,0.12)',
          paddingHorizontal: 9,
        },
        visitDayChipText: {
          color: accentBright,
          fontSize: 11,
          fontWeight: '900',
        },
        visitMoreText: {
          color: theme.colors.textMuted,
          fontSize: 11,
          fontWeight: '900',
          paddingTop: 6,
        },
        calendarEmptyText: {
          color: theme.colors.textMuted,
          fontSize: 12,
          fontWeight: '800',
          lineHeight: 17,
        },
        timerDock: {
          marginBottom: 18,
        },
        timerBreathGlow: {
          position: 'absolute',
          left: 18,
          right: 18,
          top: 8,
          height: 70,
          borderRadius: 999,
          backgroundColor:
            timerState === 'running' ? 'rgba(34,197,94,0.22)' : 'rgba(225,29,46,0.18)',
        },
        timerBlur: {
          minHeight: 84,
          overflow: 'hidden',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: theme.ink(0.18),
          borderRadius: 999,
          paddingLeft: 20,
          paddingRight: 12,
        },
        timerReadout: {
          flex: 1,
        },
        timerValue: {
          color: theme.colors.text,
          fontSize: 34,
          fontWeight: '900',
          letterSpacing: 0,
        },
        timerMeta: {
          color: theme.colors.textMuted,
          fontSize: 11,
          fontWeight: '900',
          marginTop: 1,
          textTransform: 'uppercase',
        },
        timerControls: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
        },
        timerMainButton: {
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 28,
          backgroundColor: accentColor,
          shadowColor: accentBright,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.36,
          shadowRadius: 16,
          elevation: 7,
        },
        timerPauseButton: {
          backgroundColor: '#16A34A',
          shadowColor: '#16A34A',
        },
        timerStopButton: {
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.ink(0.15),
          borderRadius: 22,
          backgroundColor: theme.colors.surfaceSoft,
        },
        timerButtonFallback: {
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: '900',
        },
        lastSessionText: {
          color: theme.colors.textMuted,
          fontSize: 11,
          fontWeight: '800',
          marginTop: 8,
          textAlign: 'center',
        },
        achievementHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          paddingHorizontal: 2,
        },
        achievementCount: {
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(177,18,38,0.26)',
          borderRadius: 999,
          backgroundColor: 'rgba(177,18,38,0.10)',
          color: accentBright,
          fontSize: 11,
          fontWeight: '900',
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        achievementsRail: {
          gap: 12,
          paddingBottom: 20,
          paddingRight: 4,
        },
        achievementCard: {
          width: 166,
          minHeight: 142,
          borderWidth: 1,
          borderColor: theme.ink(0.1),
          borderRadius: 22,
          backgroundColor: 'transparent',
          opacity: 0.54,
          padding: 16,
        },
        achievementCardUnlocked: {
          opacity: 1,
          borderColor: 'rgba(177,18,38,0.30)',
          backgroundColor: 'transparent',
        },
        achievementIcon: {
          width: 42,
          height: 42,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 15,
          backgroundColor: theme.colors.surfaceSoft,
          marginBottom: 12,
        },
        achievementIconUnlocked: {
          backgroundColor: accentColor,
        },
        achievementTitle: {
          color: theme.colors.text,
          fontSize: 14,
          fontWeight: '900',
          lineHeight: 18,
        },
        achievementTitleUnlocked: {
          color: theme.colors.text,
        },
        achievementDesc: {
          color: theme.colors.textMuted,
          fontSize: 11,
          fontWeight: '700',
          lineHeight: 16,
          marginTop: 5,
        },
        buttonPressed: {
          opacity: 0.76,
        },
        centerModalOverlay: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.58)',
          padding: 20,
        },
        modalBackdrop: {
          ...StyleSheet.absoluteFillObject,
        },
        confirmCard: {
          width: '100%',
          maxWidth: 420,
          borderWidth: 1,
          borderColor: theme.ink(0.13),
          borderRadius: 28,
          backgroundColor: theme.colors.surface,
          padding: 22,
          ...theme.shadow,
        },
        modalKicker: {
          color: accentColor,
          fontSize: 12,
          fontWeight: '900',
          marginBottom: 6,
          textTransform: 'uppercase',
        },
        confirmTitle: {
          color: theme.colors.text,
          fontSize: 24,
          fontWeight: '900',
          lineHeight: 29,
        },
        confirmBody: {
          color: theme.colors.textMuted,
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
          borderColor: 'rgba(177,18,38,0.24)',
          borderRadius: 18,
          backgroundColor: theme.colors.surfaceSoft,
        },
        confirmSecondaryText: {
          color: accentBright,
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
          backgroundColor: 'rgba(0,0,0,0.70)',
          paddingHorizontal: 16,
          paddingTop: 72,
          paddingBottom: 28,
        },
        historyPanel: {
          flex: 1,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          borderRadius: 24,
          backgroundColor: theme.scheme === 'dark' ? '#101116' : '#F7F8FA',
          padding: 18,
          ...theme.shadow,
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
          color: theme.colors.text,
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
          borderColor: theme.ink(0.12),
          borderRadius: 18,
          backgroundColor: theme.colors.surfaceSoft,
        },
        historyIconCloseText: {
          color: theme.colors.textMuted,
          fontSize: 12,
          fontWeight: '900',
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
          borderColor: theme.ink(0.1),
          borderRadius: 16,
          backgroundColor: theme.ink(0.05),
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
          color: theme.colors.text,
          fontSize: 14,
          fontWeight: '900',
        },
        historySummary: {
          color: theme.colors.textMuted,
          fontSize: 12,
          fontWeight: '800',
          lineHeight: 17,
          marginTop: 5,
        },
        historyEmptyCard: {
          borderWidth: 1,
          borderColor: theme.ink(0.12),
          borderRadius: 18,
          backgroundColor: theme.colors.surfaceSoft,
          padding: 14,
        },
        historyEmptyTitle: {
          color: theme.colors.text,
          fontSize: 14,
          fontWeight: '900',
        },
        historyEmptyBody: {
          color: theme.colors.textMuted,
          fontSize: 12,
          fontWeight: '800',
          lineHeight: 17,
          marginTop: 5,
        },
      }),
    [theme, timerState],
  );
}
