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
  Easing,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import ReanimatedAnimated, {
  Easing as ReanimatedEasing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { journeyService, memberService } from '@/services';
import { useAppTheme, type AppTheme } from '@/theme/useAppTheme';
import type {
  Achievement,
  AttendanceDay,
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
const neonRed = '#FF3048';
const neonOrange = '#F97316';
const neonGreen = '#4ADE80';
const neonBlue = '#3B82F6';
const midnightPurple = '#6D4AB8';
const neonYellow = '#FDE68A';
// Drives the ring's strokeDashoffset on the UI thread (via Reanimated) so it
// can't block JS-thread work elsewhere in the app — e.g. the tab bar's own
// animations — the way react-native's JS-driven Animated API would.
const RingCircle = ReanimatedAnimated.createAnimatedComponent(Circle);
const monthRailItemWidth = 116;
const journeyMonthRailWidth = 84;
const calendarTimeOptionHeight = 38;
const calendarTimeWheelPadding = 0;
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

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

function getMonthKey(value: string | Date) {
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 7);
}

function formatCalendarDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatTimeOptionLabel(value: string) {
  const [hoursText, minutesText] = value.split(':');
  const hours = Number.parseInt(hoursText, 10);
  const minutes = Number.parseInt(minutesText, 10);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const normalizedHour = hours % 12 || 12;
  return `${normalizedHour}:${minutes.toString().padStart(2, '0')} ${suffix}`;
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`;
}

function formatLiveDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  const centiseconds = Math.floor((safeSeconds % 1) * 100);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

function estimateCalories(durationSeconds: number) {
  return Math.max(0, Math.round((durationSeconds / 60) * 8));
}

function parseDurationMinutes(value?: string) {
  if (!value) return 0;
  const numericValue = Number.parseInt(value, 10);
  return Number.isNaN(numericValue) ? 0 : numericValue;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function parseWordNumber(value?: string) {
  if (!value) return undefined;
  const lowerValue = value.toLowerCase();
  if (NUMBER_WORDS[lowerValue] !== undefined) {
    return NUMBER_WORDS[lowerValue];
  }
  const numericValue = Number.parseInt(value, 10);
  return Number.isNaN(numericValue) ? undefined : numericValue;
}

function extractPlannerProfileInsights(biography?: string) {
  const bio = biography?.toLowerCase() ?? '';
  const weightKgMatch = bio.match(/(\d{2,3})\s?(kg|kgs|kilograms?)/);
  const weightLbMatch = bio.match(/(\d{2,3})\s?(lb|lbs|pounds?)/);
  const heightCmMatch = bio.match(/(\d{3})\s?(cm|centimeters?)/);
  const heightFeetMatch = bio.match(/(\d)\s?(?:ft|feet|')\s?(\d{1,2})?/);
  const frequencyMatch = bio.match(
    /(\d+|one|two|three|four|five|six|seven)\s+(?:days?|times?)\s+(?:a|per)\s+week/,
  );

  const weightKg = weightKgMatch
    ? Number.parseInt(weightKgMatch[1], 10)
    : weightLbMatch
      ? Math.round(Number.parseInt(weightLbMatch[1], 10) * 0.453592)
      : undefined;
  const heightCm = heightCmMatch
    ? Number.parseInt(heightCmMatch[1], 10)
    : heightFeetMatch
      ? Math.round(
          Number.parseInt(heightFeetMatch[1], 10) * 30.48 +
            Number.parseInt(heightFeetMatch[2] ?? '0', 10) * 2.54,
        )
      : undefined;
  const sessionsPerWeek = parseWordNumber(frequencyMatch?.[1]);
  const goal =
    bio.includes('fat loss') || bio.includes('lose weight') || bio.includes('weight loss')
      ? 'fat-loss'
      : bio.includes('endurance') || bio.includes('cardio')
        ? 'endurance'
        : bio.includes('strength') || bio.includes('muscle') || bio.includes('lean')
          ? 'strength'
          : 'general';

  return {
    goal,
    heightCm,
    sessionsPerWeek,
    weightKg,
  };
}

function estimatePersonalizedCalories(durationMinutes: number, biography?: string) {
  const profileInsights = extractPlannerProfileInsights(biography);
  let caloriesPerMinute = 7.2;

  if (profileInsights.weightKg) {
    caloriesPerMinute += (profileInsights.weightKg - 70) * 0.035;
  }
  if (profileInsights.heightCm) {
    caloriesPerMinute += (profileInsights.heightCm - 170) * 0.006;
  }
  if (profileInsights.sessionsPerWeek) {
    caloriesPerMinute += profileInsights.sessionsPerWeek >= 5 ? 0.35 : -0.15;
  }

  switch (profileInsights.goal) {
    case 'fat-loss':
      caloriesPerMinute += 0.45;
      break;
    case 'endurance':
      caloriesPerMinute += 0.65;
      break;
    case 'strength':
      caloriesPerMinute += 0.15;
      break;
    default:
      break;
  }

  const clampedCaloriesPerMinute = Math.min(14, Math.max(5.5, caloriesPerMinute));
  return Math.round(durationMinutes * clampedCaloriesPerMinute);
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

function MetricRing({
  metric,
  size = 138,
  index = 0,
  seed = 0,
  trackColor = 'rgba(255,255,255,0.10)',
  valueColor = '#FFFFFF',
  detailColor = 'rgba(255,255,255,0.68)',
  labelColor = 'rgba(255,255,255,0.72)',
}: {
  metric: RingMetric;
  size?: number;
  index?: number;
  seed?: number;
  trackColor?: string;
  valueColor?: string;
  detailColor?: string;
  labelColor?: string;
}) {
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0.04, metric.progress));
  const dashOffset = circumference * (1 - clampedProgress);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    // Staggered per ring (rather than all four animating at once) — cheaper
    // to render one at a time and reads as a nicer cascading reveal. Runs on
    // the UI thread so it can't compete with JS-thread work elsewhere (the
    // tab bar's own animations, navigation, etc.).
    progress.value = withDelay(
      index * 110,
      withTiming(1, { duration: 700, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) }),
    );
    // dashOffset intentionally omitted — it derives from metric.progress,
    // which only changes alongside `seed` (a fresh data load).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, index]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - progress.value * (circumference - dashOffset),
  }));

  return (
    <View style={styles.staticRingCard}>
      {/* Glow via a real native shadow on the SVG's own layer (using its
          rendered alpha as the shadow shape) — a GPU-composited platform
          effect, not a software blur filter, so it hugs the exact arc
          without the per-frame cost that caused the app-wide lag. iOS only:
          Android ignores shadowColor/shadowRadius without `elevation`, and
          elevation would only add a plain grey box, so it's left off. */}
      <Svg
        width={size}
        height={size}
        style={{
          shadowColor: metric.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.85,
          shadowRadius: 8,
        }}>
        <Defs>
          <SvgLinearGradient id={`ring-${metric.label}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.92" />
            <Stop offset="0.34" stopColor={metric.accent} stopOpacity="1" />
            <Stop offset="1" stopColor={metric.accent} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <RingCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#ring-${metric.label})`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
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
        <Text style={[styles.ringValue, { color: valueColor }]}>{metric.value}</Text>
        <Text style={[styles.ringDetail, { color: detailColor }]}>{metric.detail}</Text>
      </View>
      <Text style={[styles.ringLabel, { color: labelColor }]}>{metric.label}</Text>
    </View>
  );
}

function TrendChart({
  axisTitleColor = 'rgba(255,255,255,0.48)',
  expanded = false,
  onLongPress,
  onPressIn,
  points,
}: {
  axisTitleColor?: string;
  expanded?: boolean;
  onLongPress?: () => void;
  onPressIn?: () => void;
  points: ChartPoint[];
}) {
  // Reference scale: at these baseline domains the plot exactly fills the visible
  // box (no scrolling). Sessions inside these ranges look identical to before;
  // anything beyond just extends the scrollable content, never the box itself.
  const defaultDuration = expanded ? 120 : 180;
  const baseWidth = expanded ? 260 : 310;
  const viewportHeight = expanded ? 190 : 126;
  const baseCalorieRange = 600;
  const calorieStep = 200;
  // Always keep at least this much room to scroll into, even for short/light
  // sessions, so there's headroom for a 4-hour workout.
  const minDurationDomain = 180;

  const sortedPoints = [
    { calories: 0, duration: 0, label: 'Start' },
    ...[...points].sort((left, right) => left.duration - right.duration),
  ];
  const longestDuration = Math.max(...sortedPoints.map((point) => point.duration), minDurationDomain);
  const maxDuration = Math.ceil(longestDuration / 60) * 60;
  const width = baseWidth * (maxDuration / defaultDuration);

  const maxCaloriesInData = Math.max(...sortedPoints.map((point) => point.calories), 0);
  const plotMaxCalories = Math.max(
    baseCalorieRange,
    Math.ceil(maxCaloriesInData / calorieStep) * calorieStep,
  );
  // The plot's own content height grows past the visible box once calories go
  // past the baseline range — that extra height is what makes it scrollable.
  const plotHeight = viewportHeight * (plotMaxCalories / baseCalorieRange);

  const caloriePoints = buildDurationPlotPoints(
    sortedPoints,
    width,
    plotHeight,
    maxDuration,
    plotMaxCalories,
  );
  const caloriePath = buildCurvePath(caloriePoints);
  const areaPath = buildAreaPath(caloriePoints, plotHeight);
  const durationTicks = Array.from({ length: Math.floor(maxDuration / 60) + 1 }, (_, index) => index * 60);
  // Checkpoints only, descending — the shared "0" is drawn once, separately, at
  // the corner where both axes meet.
  const calorieCheckpoints = Array.from(
    { length: plotMaxCalories / calorieStep },
    (_, index) => plotMaxCalories - index * calorieStep,
  );
  const svgHeight = plotHeight + 28;
  const viewportSvgHeight = viewportHeight + 28;
  const axisLabelWidth = 30;
  const calorieTickY = (tick: number) => plotHeight - (tick / plotMaxCalories) * plotHeight;
  // Open scrolled to the bottom so the familiar 0–400 kcal range is what shows by
  // default; scrolling up reveals whatever lies beyond it.
  const initialCalorieScrollY = Math.max(0, svgHeight - viewportSvgHeight);
  const formatDurationTick = (tick: number) => {
    if (tick === 0) return '0';
    return `${tick / 60}h`;
  };

  return (
    <View style={[styles.chartRow, expanded && styles.chartRowExpanded]}>
      <View style={[styles.chartCanvasGlow, expanded && styles.chartCanvasGlowExpanded]}>
        <View style={[styles.chartCanvas, expanded && styles.chartCanvasExpanded]}>
          {onLongPress ? (
            <Pressable
              delayLongPress={360}
              onLongPress={onLongPress}
              onPressIn={onPressIn}
              style={styles.chartPreviewHoldTarget}
              accessibilityLabel="Hold to open expanded chart"
              accessibilityRole="button">
              <View pointerEvents="none" style={StyleSheet.absoluteFillObject} />
            </Pressable>
          ) : null}
          <View style={[styles.chartCanvasInner, expanded && styles.chartCanvasInnerExpanded]}>
            <View style={[styles.chartYAxisTitleCol, expanded && styles.chartYAxisTitleColExpanded]}>
              <Svg
                width={expanded ? 34 : 20}
                height={expanded ? 178 : 136}
                viewBox={`0 0 ${expanded ? 34 : 20} ${expanded ? 178 : 136}`}>
                <SvgText
                  x={(expanded ? 34 : 20) / 2}
                  y={expanded ? 96 : 73}
                  fontSize={expanded ? 10 : 9}
                  fontWeight="900"
                  fill="rgba(160,170,185,0.85)"
                  textAnchor="middle"
                  transform={`rotate(-90 ${(expanded ? 34 : 20) / 2} ${expanded ? 96 : 73})`}>
                  Avg Calories Burned
                </SvgText>
              </Svg>
            </View>
          {/* Vertical scroll wraps the whole plot row (calorie axis + duration
              plot together, exactly like the duration axis already rides along
              inside the horizontal scroll) — that's what keeps the calorie
              labels and their checkpoint lines in sync while scrolling, and
              what lets the visible box stay the original size while the
              content behind it can run past 400 kcal. */}
          <ScrollView
            style={{ height: viewportSvgHeight }}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
            contentOffset={{ x: 0, y: initialCalorieScrollY }}>
            <View style={styles.chartPlotRow}>
              <Svg width={axisLabelWidth} height={svgHeight} viewBox={`0 0 ${axisLabelWidth} ${svgHeight}`}>
                {calorieCheckpoints.map((tick) => (
                  <SvgText
                    key={tick}
                    x={axisLabelWidth - 6}
                    y={calorieTickY(tick) + 3}
                    fontSize={9}
                    fontWeight="900"
                    fill="rgba(255,255,255,0.46)"
                    textAnchor="end">
                    {tick}
                  </SvgText>
                ))}
                {/* The single, shared "0" — sits diagonally right on the corner
                    where the calorie axis and duration axis intersect. */}
                <SvgText
                  x={axisLabelWidth - 6}
                  y={plotHeight - 2}
                  fontSize={9}
                  fontWeight="900"
                  fill="rgba(255,255,255,0.46)"
                  textAnchor="end">
                  0
                </SvgText>
              </Svg>
              <ScrollView
                horizontal
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                bounces={false}
                style={styles.chartPlotScroll}
                contentContainerStyle={[styles.chartPlotScrollContent, { width }]}>
                <View style={[styles.chartPlotInner, { width }]}>
                  <Svg width={width} height={svgHeight} viewBox={`0 0 ${width} ${svgHeight}`}>
                    <Defs>
                      <SvgLinearGradient id="journey-area" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={midnightPurple} stopOpacity="0.42" />
                        <Stop offset="1" stopColor={midnightPurple} stopOpacity="0" />
                      </SvgLinearGradient>
                      <SvgLinearGradient id="journey-line" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor="#9B7FF0" stopOpacity="1" />
                        <Stop offset="1" stopColor={midnightPurple} stopOpacity="1" />
                      </SvgLinearGradient>
                    </Defs>
                    {/* Checkpoint grid lines — one per calorie tick, always starting
                        right at the y-axis (x=0) and drawn at the tick's exact
                        pixel height, so they never float free of the axis. */}
                    {calorieCheckpoints.map((tick) => (
                      <Path
                        key={tick}
                        d={`M 0 ${calorieTickY(tick).toFixed(1)} H ${width}`}
                        stroke="rgba(255,255,255,0.07)"
                        strokeWidth="1"
                      />
                    ))}
                    <Path d={`M 0 ${plotHeight} H ${width}`} stroke="rgba(255,255,255,0.24)" strokeWidth="1.4" />
                    <Path d={`M 0 0 V ${plotHeight}`} stroke="rgba(255,255,255,0.24)" strokeWidth="1.4" />
                    {durationTicks.map((tick) => {
                      const x = (tick / maxDuration) * width;
                      return (
                        <Path
                          key={tick}
                          d={`M ${x.toFixed(1)} 0 V ${plotHeight}`}
                          stroke="rgba(255,255,255,0.07)"
                          strokeWidth="1"
                        />
                      );
                    })}
                    <Path d={areaPath} fill="url(#journey-area)" />
                    <Path
                      d={caloriePath}
                      fill="none"
                      stroke={midnightPurple}
                      strokeOpacity={0.45}
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d={caloriePath}
                      fill="none"
                      stroke="url(#journey-line)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {caloriePoints.map((point, index) => (
                      <Circle key={`calorie-${index}`} cx={point.x} cy={point.y} r={3.5} fill="#9B7FF0" />
                    ))}
                    {durationTicks
                      .filter((tick) => tick > 0)
                      .map((tick) => {
                        const x = (tick / maxDuration) * width;
                        return (
                          <SvgText
                            key={`duration-label-${tick}`}
                            x={x}
                            y={plotHeight + 18}
                            fontSize={9}
                            fontWeight="900"
                            fill="rgba(255,255,255,0.52)"
                            textAnchor="middle">
                            {formatDurationTick(tick)}
                          </SvgText>
                        );
                      })}
                  </Svg>
                </View>
              </ScrollView>
            </View>
          </ScrollView>
          </View>
          <Text style={[styles.chartXAxisTitle, { color: 'rgba(160,170,185,0.85)' }]}>
            Avg Workout Duration
          </Text>
          <View style={styles.chartLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: midnightPurple }]} />
              <Text style={styles.legendText}>Monthly average</Text>
            </View>
          </View>
          {onLongPress ? (
            <Text pointerEvents="none" style={styles.chartHoldHint}>
              Hold to view
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

type ChartZoomAPI = {
  stepZoomIn: () => void;
  stepZoomOut: () => void;
};

function FittedTrendChart({
  axisTitleColor = 'rgba(255,255,255,0.52)',
  onZoomChange,
  points,
  xAxisTitleColor = 'rgba(255,255,255,0.52)',
  zoomApiRef,
}: {
  axisTitleColor?: string;
  onZoomChange?: (zoom: number) => void;
  points: ChartPoint[];
  xAxisTitleColor?: string;
  zoomApiRef?: React.MutableRefObject<ChartZoomAPI>;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const viewportWidth = Math.min(620, Math.max(284, windowWidth * 0.98 - 58));
  const viewportHeight = 246;
  const topInset = 14;
  const titleWidth = 34;
  const axisLabelWidth = 34;
  const bottomAxisHeight = 54;
  const calorieStep = 100;
  const minDurationDomain = 240;
  const sortedPoints = [
    { calories: 0, duration: 0, label: 'Start' },
    ...[...points].sort((left, right) => left.duration - right.duration),
  ];
  const maxCalories = Math.max(
    600,
    Math.ceil(Math.max(...sortedPoints.map((point) => point.calories), 0) / calorieStep) * calorieStep,
  );
  const longestDuration = Math.max(...sortedPoints.map((point) => point.duration), minDurationDomain);
  const maxDuration = Math.ceil(longestDuration / 30) * 30;
  const plotOriginX = titleWidth + axisLabelWidth;
  const visiblePlotWidth = viewportWidth - plotOriginX;
  const plotWidth = Math.max(
    visiblePlotWidth * 1.45,
    310 * (maxDuration / 120),
  );
  const plotHeight = Math.max(286, viewportHeight * (maxCalories / 600));
  const plotPoints = buildDurationPlotPoints(
    sortedPoints,
    plotWidth,
    plotHeight,
    maxDuration,
    maxCalories,
  );
  const caloriePath = buildCurvePath(plotPoints);
  const areaPath = buildAreaPath(plotPoints, plotHeight);
  const calorieTicks = Array.from({ length: maxCalories / calorieStep + 1 }, (_, index) => index * calorieStep);
  const durationTicks = Array.from({ length: Math.floor(maxDuration / 30) + 1 }, (_, index) => index * 30);
  const svgWidth = plotOriginX + plotWidth;
  const svgHeight = topInset + plotHeight + bottomAxisHeight;
  const formatDurationTick = (tick: number) => {
    if (tick === 0) return '0';
    if (tick % 60 === 0) return `${tick / 60}h`;
    return `${Math.floor(tick / 60)}h30`;
  };
  const minZoom = 0.62;
  const normalZoom = 1;
  const doubleTapZoom = 1.65;
  const zoomSteps = [0.62, 0.80, 1.0, 1.3, 1.65];
  const [zoom, setZoom] = useState(1);
  const renderedSvgWidth = svgWidth * zoom;
  const renderedSvgHeight = svgHeight * zoom;
  const initialScrollY = Math.max(0, svgHeight - viewportHeight);
  const panOffsetRef = useRef({ x: 0, y: -initialScrollY });
  const panStartRef = useRef({ x: 0, y: -initialScrollY });
  const zoomRef = useRef(1);
  // Animated.ValueXY drives the pan transform natively — no React re-render per
  // touchmove frame (the old setState approach re-rendered the whole component
  // on every event, which is what caused the gesture lag).
  const animPan = useRef(new Animated.ValueXY({ x: 0, y: -initialScrollY })).current;
  const pinchStartDistanceRef = useRef(0);
  const pinchStartZoomRef = useRef(1);
  const pinchAnchorRef = useRef({ contentX: 0, contentY: 0, viewX: 0, viewY: 0 });
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });

  useEffect(() => {
    const nextOffset = { x: 0, y: -initialScrollY };
    panOffsetRef.current = nextOffset;
    panStartRef.current = nextOffset;
    animPan.setValue(nextOffset);
  }, [animPan, initialScrollY, svgHeight, svgWidth, viewportHeight, viewportWidth]);

  const clampPanOffset = useCallback(
    (x: number, y: number) => {
      const z = zoomRef.current;
      const mpx = Math.max(0, svgWidth * z - viewportWidth);
      const mpy = Math.max(0, svgHeight * z - viewportHeight);
      return {
        x: Math.min(0, Math.max(-mpx, x)),
        y: Math.min(0, Math.max(-mpy, y)),
      };
    },
    [svgHeight, svgWidth, viewportHeight, viewportWidth],
  );

  const applyZoomAtPoint = useCallback(
    (nextZoom: number, center: { x: number; y: number }) => {
      const currentZoom = zoomRef.current;
      const contentX = (center.x - panOffsetRef.current.x) / currentZoom;
      const contentY = (center.y - panOffsetRef.current.y) / currentZoom;
      const zoomedMaxPanX = Math.max(0, svgWidth * nextZoom - viewportWidth);
      const zoomedMaxPanY = Math.max(0, svgHeight * nextZoom - viewportHeight);
      const nextOffset = {
        x: Math.min(0, Math.max(-zoomedMaxPanX, center.x - contentX * nextZoom)),
        y: Math.min(0, Math.max(-zoomedMaxPanY, center.y - contentY * nextZoom)),
      };

      zoomRef.current = nextZoom;
      setZoom(nextZoom);
      panOffsetRef.current = nextOffset;
      panStartRef.current = nextOffset;
      animPan.setValue(nextOffset);
    },
    [animPan, svgHeight, svgWidth, viewportHeight, viewportWidth],
  );

  const resetZoom = useCallback(() => {
    const nextOffset = { x: 0, y: -initialScrollY };
    zoomRef.current = normalZoom;
    setZoom(normalZoom);
    panOffsetRef.current = nextOffset;
    panStartRef.current = nextOffset;
    animPan.setValue(nextOffset);
  }, [animPan, initialScrollY]);

  // Animated variants — used for double-tap and button presses so pan
  // transitions smoothly instead of jumping instantly (which caused the trembling).
  const applyZoomAtPointAnimated = useCallback(
    (nextZoom: number, center: { x: number; y: number }) => {
      const currentZoom = zoomRef.current;
      const contentX = (center.x - panOffsetRef.current.x) / currentZoom;
      const contentY = (center.y - panOffsetRef.current.y) / currentZoom;
      const zoomedMaxPanX = Math.max(0, svgWidth * nextZoom - viewportWidth);
      const zoomedMaxPanY = Math.max(0, svgHeight * nextZoom - viewportHeight);
      const nextOffset = {
        x: Math.min(0, Math.max(-zoomedMaxPanX, center.x - contentX * nextZoom)),
        y: Math.min(0, Math.max(-zoomedMaxPanY, center.y - contentY * nextZoom)),
      };
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
      panOffsetRef.current = nextOffset;
      panStartRef.current = nextOffset;
      animPan.stopAnimation();
      Animated.timing(animPan, {
        toValue: nextOffset,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [animPan, svgHeight, svgWidth, viewportHeight, viewportWidth],
  );

  const resetZoomAnimated = useCallback(() => {
    const nextOffset = { x: 0, y: -initialScrollY };
    zoomRef.current = normalZoom;
    setZoom(normalZoom);
    panOffsetRef.current = nextOffset;
    panStartRef.current = nextOffset;
    animPan.stopAnimation();
    Animated.timing(animPan, {
      toValue: nextOffset,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animPan, initialScrollY]);

  const getTouchDistance = (touches: unknown) => {
    const touchList = touches as { pageX: number; pageY: number }[];
    if (touchList.length < 2) return 0;
    const [first, second] = touchList;
    return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
  };
  const getTouchCenter = (touches: unknown) => {
    const touchList = touches as { locationX: number; locationY: number }[];
    if (touchList.length < 2) return { x: 0, y: 0 };
    const [first, second] = touchList;
    return {
      x: (first.locationX + second.locationX) / 2,
      y: (first.locationY + second.locationY) / 2,
    };
  };

  const chartPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (event, gesture) =>
          event.nativeEvent.touches.length > 1 ||
          Math.abs(gesture.dx) > 2 ||
          Math.abs(gesture.dy) > 2,
        onPanResponderGrant: (event) => {
          panStartRef.current = panOffsetRef.current;
          if (event.nativeEvent.touches.length > 1) {
            pinchStartDistanceRef.current = getTouchDistance(event.nativeEvent.touches);
            pinchStartZoomRef.current = zoomRef.current;
            const center = getTouchCenter(event.nativeEvent.touches);
            pinchAnchorRef.current = {
              contentX: (center.x - panOffsetRef.current.x) / zoomRef.current,
              contentY: (center.y - panOffsetRef.current.y) / zoomRef.current,
              viewX: center.x,
              viewY: center.y,
            };
          }
        },
        onPanResponderMove: (event, gesture) => {
          if (event.nativeEvent.touches.length > 1) {
            const distance = getTouchDistance(event.nativeEvent.touches);
            if (pinchStartDistanceRef.current <= 0) {
              pinchStartDistanceRef.current = distance;
              pinchStartZoomRef.current = zoomRef.current;
              const center = getTouchCenter(event.nativeEvent.touches);
              pinchAnchorRef.current = {
                contentX: (center.x - panOffsetRef.current.x) / zoomRef.current,
                contentY: (center.y - panOffsetRef.current.y) / zoomRef.current,
                viewX: center.x,
                viewY: center.y,
              };
              return;
            }
            if (pinchStartDistanceRef.current > 0 && distance > 0) {
              const center = getTouchCenter(event.nativeEvent.touches);
              if (pinchStartZoomRef.current > normalZoom + 0.02) {
                return;
              }
              const requestedZoom = pinchStartZoomRef.current * (pinchStartDistanceRef.current / distance);
              const nextZoom =
                pinchStartZoomRef.current >= normalZoom - 0.02
                  ? Math.min(normalZoom, Math.max(minZoom, requestedZoom))
                  : Math.min(normalZoom, Math.max(pinchStartZoomRef.current, requestedZoom));
              zoomRef.current = nextZoom;
              setZoom(nextZoom);
              const zoomedMaxPanX = Math.max(0, svgWidth * nextZoom - viewportWidth);
              const zoomedMaxPanY = Math.max(0, svgHeight * nextZoom - viewportHeight);
              const nextOffset = {
                x: Math.min(
                  0,
                  Math.max(-zoomedMaxPanX, center.x - pinchAnchorRef.current.contentX * nextZoom),
                ),
                y: Math.min(
                  0,
                  Math.max(-zoomedMaxPanY, center.y - pinchAnchorRef.current.contentY * nextZoom),
                ),
              };
              panOffsetRef.current = nextOffset;
              panStartRef.current = nextOffset;
              animPan.setValue(nextOffset);
            }
            return;
          }
          pinchStartDistanceRef.current = 0;
          pinchStartZoomRef.current = zoomRef.current;
          const nextOffset = clampPanOffset(
            panStartRef.current.x + gesture.dx,
            panStartRef.current.y + gesture.dy,
          );
          panOffsetRef.current = nextOffset;
          animPan.setValue(nextOffset);
        },
        onPanResponderRelease: (event, gesture) => {
          const isTap = Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8;
          if (isTap) {
            const now = Date.now();
            const tap = {
              time: now,
              x: event.nativeEvent.locationX,
              y: event.nativeEvent.locationY,
            };
            const lastTap = lastTapRef.current;
            const isDoubleTap =
              now - lastTap.time < 300 &&
              Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) < 46;

            if (isDoubleTap) {
              lastTapRef.current = { time: 0, x: 0, y: 0 };
              if (zoomRef.current > normalZoom + 0.02) {
                resetZoomAnimated();
              } else {
                applyZoomAtPointAnimated(doubleTapZoom, { x: tap.x, y: tap.y });
              }
              pinchStartDistanceRef.current = 0;
              pinchStartZoomRef.current = zoomRef.current;
              return;
            }
            lastTapRef.current = tap;
          }
          panStartRef.current = panOffsetRef.current;
          pinchStartDistanceRef.current = 0;
          pinchStartZoomRef.current = zoomRef.current;
        },
        onPanResponderTerminate: () => {
          panStartRef.current = panOffsetRef.current;
          pinchStartDistanceRef.current = 0;
          pinchStartZoomRef.current = zoomRef.current;
        },
      }),
    [animPan, applyZoomAtPointAnimated, clampPanOffset, resetZoomAnimated],
  );

  const currentStepIndex = zoomSteps.reduce(
    (best, step, i) => (Math.abs(step - zoom) < Math.abs(zoomSteps[best] - zoom) ? i : best),
    0,
  );
  const stepZoomOut = useCallback(() => {
    if (currentStepIndex > 0) {
      applyZoomAtPointAnimated(zoomSteps[currentStepIndex - 1]!, { x: viewportWidth / 2, y: viewportHeight / 2 });
    }
  }, [applyZoomAtPointAnimated, currentStepIndex, viewportHeight, viewportWidth, zoomSteps]);
  const stepZoomIn = useCallback(() => {
    if (currentStepIndex < zoomSteps.length - 1) {
      applyZoomAtPointAnimated(zoomSteps[currentStepIndex + 1]!, { x: viewportWidth / 2, y: viewportHeight / 2 });
    }
  }, [applyZoomAtPointAnimated, currentStepIndex, viewportHeight, viewportWidth, zoomSteps]);

  // Sync the imperative API ref so the modal's +/- buttons can call into the chart
  useEffect(() => {
    if (zoomApiRef) {
      zoomApiRef.current = { stepZoomIn, stepZoomOut };
    }
  });
  // Notify parent of zoom changes so the % display stays in sync
  useEffect(() => {
    onZoomChange?.(zoom);
  }, [zoom, onZoomChange]);

  return (
    <View style={styles.fittedChartWrap}>
      <View
        {...chartPanResponder.panHandlers}
        style={[styles.fittedChartPanViewport, { height: viewportHeight, width: viewportWidth }]}>
        <Text pointerEvents="none" style={styles.fittedChartXAxisTitle}>
          Avg Workout Duration
        </Text>
        <Animated.View
          style={[
            styles.fittedChartPanContent,
            {
              height: renderedSvgHeight,
              transform: animPan.getTranslateTransform(),
              width: renderedSvgWidth,
            },
          ]}>
          <Svg width={renderedSvgWidth} height={renderedSvgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            <Defs>
              <SvgLinearGradient id="journey-popup-area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={midnightPurple} stopOpacity="0.34" />
                <Stop offset="1" stopColor={midnightPurple} stopOpacity="0" />
              </SvgLinearGradient>
              <SvgLinearGradient id="journey-popup-line" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#9B7FF0" stopOpacity="1" />
                <Stop offset="1" stopColor={midnightPurple} stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <SvgText
              x={16}
              y={topInset + plotHeight * 0.6}
              fontSize={9}
              fontWeight="900"
              fill="rgba(160,170,185,0.85)"
              textAnchor="middle"
              rotation="-90"
              originX={16}
              originY={topInset + plotHeight * 0.6}>
              Avg Calories Burned
            </SvgText>
            {calorieTicks.map((tick) => {
              const y = topInset + plotHeight - (tick / maxCalories) * plotHeight;
              return (
                <Path
                  key={`popup-calorie-grid-${tick}`}
                  d={`M ${plotOriginX} ${y.toFixed(1)} H ${svgWidth}`}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />
              );
            })}
            {calorieTicks.map((tick) => {
              const y = topInset + plotHeight - (tick / maxCalories) * plotHeight;
              return (
                <SvgText
                  key={`popup-calorie-label-${tick}`}
                  x={plotOriginX - 8}
                  y={y + 3}
                  fontSize={9}
                  fontWeight="900"
                  fill="rgba(255,255,255,0.58)"
                  textAnchor="end">
                  {tick}
                </SvgText>
              );
            })}
            {durationTicks.map((tick) => {
              const x = plotOriginX + (tick / maxDuration) * plotWidth;
              return (
                <Path
                  key={`popup-duration-grid-${tick}`}
                  d={`M ${x.toFixed(1)} ${topInset} V ${topInset + plotHeight}`}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="1"
                />
              );
            })}
            <Path d={`M ${plotOriginX} ${topInset + plotHeight} H ${svgWidth}`} stroke="rgba(255,255,255,0.25)" strokeWidth="1.4" />
            <Path d={`M ${plotOriginX} ${topInset} V ${topInset + plotHeight}`} stroke="rgba(255,255,255,0.25)" strokeWidth="1.4" />
            <Path d={areaPath} fill="url(#journey-popup-area)" transform={`translate(${plotOriginX} ${topInset})`} />
            <Path
              d={caloriePath}
              fill="none"
              stroke={midnightPurple}
              strokeOpacity={0.42}
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform={`translate(${plotOriginX} ${topInset})`}
            />
            <Path
              d={caloriePath}
              fill="none"
              stroke="url(#journey-popup-line)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform={`translate(${plotOriginX} ${topInset})`}
            />
            {plotPoints.map((point, index) => (
              <Circle
                key={`popup-point-${index}`}
                cx={plotOriginX + point.x}
                cy={topInset + point.y}
                r={3.6}
                fill="#9B7FF0"
              />
            ))}
            {durationTicks
              .filter((tick) => tick > 0)
              .map((tick) => {
              const x = plotOriginX + (tick / maxDuration) * plotWidth;
              return (
                <SvgText
                  key={`popup-duration-label-${tick}`}
                  x={x}
                  y={topInset + plotHeight + 22}
                  fontSize={9}
                  fontWeight="900"
                  fill="rgba(255,255,255,0.58)"
                  textAnchor="middle">
                  {formatDurationTick(tick)}
                </SvgText>
              );
            })}
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

export default function JourneyScreen() {
  const theme = useAppTheme();
  const isLightMode = theme.scheme === 'light';
  const [member, setMember] = useState<Member>();
  const [profile, setProfile] = useState<JourneyProfile>();

  const [attendanceDays, setAttendanceDays] = useState<AttendanceDay[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [stats, setStats] = useState<JourneyStats>();
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const [isCalendarEditorOpen, setIsCalendarEditorOpen] = useState(false);
  const [ringMonthIndex, setRingMonthIndex] = useState(new Date().getMonth());
  const [attendanceMonthIndex, setAttendanceMonthIndex] = useState(new Date().getMonth());
  const [analyticsMonthIndex, setAnalyticsMonthIndex] = useState(new Date().getMonth());
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const stylesForTheme = useStyles(theme, timerState);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastCalories, setLastCalories] = useState(0);
  const [pendingVisitDate, setPendingVisitDate] = useState('');
  const [metrics, setMetrics] = useState<JourneyMetrics>();
  const [pendingTimerSeconds, setPendingTimerSeconds] = useState(0);
  const [isCalendarTimeEnabled, setIsCalendarTimeEnabled] = useState(false);
  const [calendarStartTime, setCalendarStartTime] = useState('17:00');
  const [calendarEndTime, setCalendarEndTime] = useState('18:00');
  const [isChartModalVisible, setIsChartModalVisible] = useState(false);
  const [chartZoom, setChartZoom] = useState(1);
  const chartZoomApiRef = useRef<ChartZoomAPI>({ stepZoomIn: () => {}, stepZoomOut: () => {} });
  const chartZoomSteps = [0.62, 0.80, 1.0, 1.3, 1.65];
  const chartZoomStepIndex = chartZoomSteps.reduce(
    (best, step, i) => (Math.abs(step - chartZoom) < Math.abs(chartZoomSteps[best] - chartZoom) ? i : best),
    0,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [ringAnimationSeed, setRingAnimationSeed] = useState(0);
  const timerStartedAtRef = useRef<number | undefined>(undefined);
  const pausedElapsedRef = useRef(0);
  const breathe = useRef(new Animated.Value(0)).current;
  const analyticsMonthRailRef = useRef<ScrollView>(null);
  const journeyMonthRailRef = useRef<ScrollView>(null);
  const attendanceMonthRailRef = useRef<ScrollView>(null);
  const calendarStartTimeRef = useRef<ScrollView>(null);
  const calendarEndTimeRef = useRef<ScrollView>(null);
  const calendarTimeHapticTimersRef = useRef<
    Partial<Record<'start' | 'end', ReturnType<typeof setTimeout>>>
  >({});
  const lastCalendarTimeHapticRef = useRef<Record<'start' | 'end', string>>({
    start: '17:00',
    end: '18:00',
  });

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
        journeyStats,
        journeyMetrics,
        nextAchievements,
        storedTimer,
      ] = await Promise.all([
        memberService.getCurrentMember(),
        journeyService.getJourneyProfile(),
        journeyService.getAttendanceDays(),
        journeyService.getWorkoutSessions(),
        journeyService.getJourneyStats(),
        journeyService.getJourneyMetrics(),
        journeyService.getAchievements(),
        getStoredTimerState(),
      ]);

      setMember(currentMember);
      setProfile(journeyProfile);
      setAttendanceDays(attendance);
      setWorkoutSessions(sessions);
      setStats(journeyStats);
      setMetrics(journeyMetrics);
      setAchievements(nextAchievements);

      if (storedTimer?.state === 'running' && storedTimer.startedAt) {
        timerStartedAtRef.current = storedTimer.startedAt;
        pausedElapsedRef.current = storedTimer.elapsedSeconds;
        setElapsedSeconds(
          storedTimer.elapsedSeconds +
            Math.max(0, (Date.now() - storedTimer.startedAt) / 1000),
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
      setRingAnimationSeed((current) => current + 1);

      const syncJourney = async () => {
        const [attendance, sessions, journeyStats, journeyMetrics] =
          await Promise.all([
            journeyService.getAttendanceDays(),
            journeyService.getWorkoutSessions(),
            journeyService.getJourneyStats(),
            journeyService.getJourneyMetrics(),
          ]);

        if (!isActive) return;

        setAttendanceDays(attendance);
        setWorkoutSessions(sessions);
        setStats(journeyStats);
        setMetrics(journeyMetrics);
        const currentMonthIndex = new Date().getMonth();
        setRingMonthIndex(currentMonthIndex);
        setAttendanceMonthIndex(currentMonthIndex);
        setAnalyticsMonthIndex(currentMonthIndex);
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
      const liveSeconds = (Date.now() - timerStartedAtRef.current) / 1000;
      setElapsedSeconds(pausedElapsedRef.current + liveSeconds);
    }, 50);

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
    Math.max(0, attendanceMonthIndex),
    Math.max(0, attendanceByMonth.length - 1),
  );
  const activeRingMonthIndex = Math.min(
    Math.max(0, ringMonthIndex),
    Math.max(0, attendanceByMonth.length - 1),
  );
  const activeAnalyticsMonthIndex = Math.min(
    Math.max(0, analyticsMonthIndex),
    Math.max(0, attendanceByMonth.length - 1),
  );
  const selectedMonth = attendanceByMonth[activeMonthIndex];
  const ringMonth = attendanceByMonth[activeRingMonthIndex];
  const analyticsMonth = attendanceByMonth[activeAnalyticsMonthIndex];
  const analyticsMonthKey = analyticsMonth?.days[0]?.date.slice(0, 7) ?? '';
  const monthBounds = useMemo(() => {
    const firstAllowedKey = getMonthKey(member?.createdAt ?? new Date());
    const lastAllowedKey = getMonthKey(new Date());
    const firstAllowedIndex = attendanceByMonth.findIndex(
      (month) => month.days[0]?.date.slice(0, 7) >= firstAllowedKey,
    );
    const lastAllowedIndex = attendanceByMonth.findLastIndex(
      (month) => month.days[0]?.date.slice(0, 7) <= lastAllowedKey,
    );

    return {
      first: firstAllowedIndex >= 0 ? firstAllowedIndex : 0,
      last: lastAllowedIndex >= 0 ? lastAllowedIndex : Math.max(0, attendanceByMonth.length - 1),
    };
  }, [attendanceByMonth, member?.createdAt]);
  const canShowPreviousMonth = activeRingMonthIndex > monthBounds.first;
  const canShowNextMonth = activeRingMonthIndex < monthBounds.last;
  const canShowPreviousAttendanceMonth = activeMonthIndex > monthBounds.first;
  const canShowNextAttendanceMonth = activeMonthIndex < monthBounds.last;
  const canShowPreviousAnalyticsMonth = activeAnalyticsMonthIndex > monthBounds.first;
  const canShowNextAnalyticsMonth = activeAnalyticsMonthIndex < monthBounds.last;
  const journeyMonthItems = useMemo(
    () => attendanceByMonth.slice(monthBounds.first, monthBounds.last + 1),
    [attendanceByMonth, monthBounds.first, monthBounds.last],
  );
  useEffect(() => {
    setRingMonthIndex((value) =>
      Math.min(monthBounds.last, Math.max(monthBounds.first, value)),
    );
    setAttendanceMonthIndex((value) =>
      Math.min(monthBounds.last, Math.max(monthBounds.first, value)),
    );
    setAnalyticsMonthIndex((value) =>
      Math.min(monthBounds.last, Math.max(monthBounds.first, value)),
    );
  }, [monthBounds.first, monthBounds.last]);
  const selectedMonthVisitCount = selectedMonth?.days.filter((day) => day.hasVisit).length ?? 0;
  const ringMonthVisitCount = ringMonth?.days.filter((day) => day.hasVisit).length ?? 0;
  const ringMonthCompletionRate = ringMonth
    ? Math.round((ringMonthVisitCount / Math.max(1, ringMonth.days.length)) * 100)
    : 0;
  const analyticsMonthSessions = useMemo(
    () =>
      workoutSessions
        .filter((session) => session.endedAt.startsWith(analyticsMonthKey))
        .sort((left, right) => left.endedAt.localeCompare(right.endedAt)),
    [analyticsMonthKey, workoutSessions],
  );
  const selectedMonthVisitedDays = useMemo(
    () => selectedMonth?.days.filter((day) => day.hasVisit) ?? [],
    [selectedMonth],
  );
  const selectedCalendarDay = useMemo(
    () => attendanceDays.find((day) => day.date === pendingVisitDate),
    [attendanceDays, pendingVisitDate],
  );
  const selectedCalendarDurationMinutes = useMemo(() => {
    const [startHour, startMinute] = calendarStartTime.split(':').map(Number);
    const [endHour, endMinute] = calendarEndTime.split(':').map(Number);
    return endHour * 60 + endMinute - (startHour * 60 + startMinute);
  }, [calendarEndTime, calendarStartTime]);

  const timerCalories = estimateCalories(elapsedSeconds);

  const analyticsAverageDurationMinutes = useMemo(() => {
    if (analyticsMonthSessions.length === 0) {
      return 75;
    }

    const totalDurationMinutes = analyticsMonthSessions.reduce(
      (sum, session) => sum + session.durationSeconds / 60,
      0,
    );

    return Math.max(30, Math.round(totalDurationMinutes / analyticsMonthSessions.length));
  }, [analyticsMonthSessions]);

  const analyticsAverageCalories = useMemo(() => {
    return estimatePersonalizedCalories(
      analyticsAverageDurationMinutes,
      profile?.biography,
    );
  }, [analyticsAverageDurationMinutes, profile?.biography]);

  const chartPoints = useMemo<ChartPoint[]>(() => {
    const averageDuration = analyticsAverageDurationMinutes;
    const averageCalories = analyticsAverageCalories;
    const intervalCount = Math.max(1, Math.ceil(averageDuration / 30));
    const basePoints = Array.from({ length: intervalCount }, (_, index) => {
      const duration = Math.min(averageDuration, (index + 1) * 30);
      const progress = duration / averageDuration;
      const easedCalories = Math.round(averageCalories * Math.pow(progress, 0.92));

      return {
        calories: Math.max(1, easedCalories),
        duration,
        label: `${duration}m`,
      };
    });

    const finalPoint = {
      calories: averageCalories,
      duration: averageDuration,
      label: `${averageDuration}m`,
    };

    if (basePoints[basePoints.length - 1]?.duration === averageDuration) {
      basePoints[basePoints.length - 1] = finalPoint;
      return basePoints;
    }

    return [...basePoints, finalPoint];
  }, [analyticsAverageCalories, analyticsAverageDurationMinutes]);

  const metricCards: { accent: string; key: JourneyMetricKey; label: string; value: string | number }[] =
    [
      { accent: accentBright, key: 'totalVisits', label: 'Total visits', value: metrics?.totalVisits ?? 0 },
      {
        accent: accentBright,
        key: 'averageMonthlyVisits',
        label: 'Monthly avg',
        value: metrics?.averageMonthlyVisits ?? '0',
      },
      {
        accent: accentBright,
        key: 'averageCaloriesBurned',
        label: 'Avg calories burned per session',
        value: metrics?.averageCaloriesBurned ?? 0,
      },
      {
        accent: accentBright,
        key: 'averageWorkoutDuration',
        label: 'Avg duration',
        value: metrics?.averageWorkoutDuration ?? '0 min',
      },
    ];

  const ringMetrics: RingMetric[] = [
    {
      accent: neonRed,
      detail: 'visits',
      label: 'Visits',
      progress: ringMonthCompletionRate / 100,
      symbol: 'calendar',
      value: `${ringMonthVisitCount}`,
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

  const handleChartPressIn = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, []);

  const openChartModal = useCallback(() => {
    setIsChartModalVisible(true);
  }, []);

  const handleSelectCalendarDay = (date: string) => {
    setPendingVisitDate(date);
    setIsCalendarTimeEnabled(false);
    setCalendarStartTime('17:00');
    setCalendarEndTime('18:00');
  };

  const scrollCalendarTimeWheel = useCallback(
    (ref: { current: ScrollView | null }, value: string, animated: boolean) => {
      const nextIndex = Math.max(0, TIME_OPTIONS.indexOf(value));
      ref.current?.scrollTo({
        animated,
        y: nextIndex * calendarTimeOptionHeight,
      });
    },
    [],
  );

  const triggerCalendarTimeHaptic = useCallback((kind: 'start' | 'end', value: string) => {
    if (lastCalendarTimeHapticRef.current[kind] === value) return;
    lastCalendarTimeHapticRef.current[kind] = value;
    Haptics.selectionAsync();
  }, []);

  const scheduleCalendarTimeHaptic = useCallback(
    (kind: 'start' | 'end', value: string) => {
      const timers = calendarTimeHapticTimersRef.current;
      if (timers[kind]) clearTimeout(timers[kind]);
      timers[kind] = setTimeout(() => {
        triggerCalendarTimeHaptic(kind, value);
        delete calendarTimeHapticTimersRef.current[kind];
      }, 180);
    },
    [triggerCalendarTimeHaptic],
  );

  const selectCalendarTimeOption = useCallback(
    (kind: 'start' | 'end', value: string) => {
      if (kind === 'start') {
        setCalendarStartTime(value);
        scrollCalendarTimeWheel(calendarStartTimeRef, value, true);
      } else {
        setCalendarEndTime(value);
        scrollCalendarTimeWheel(calendarEndTimeRef, value, true);
      }
      scheduleCalendarTimeHaptic(kind, value);
    },
    [scheduleCalendarTimeHaptic, scrollCalendarTimeWheel],
  );

  useEffect(
    () => () => {
      Object.values(calendarTimeHapticTimersRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    },
    [],
  );

  useEffect(() => {
    if (!pendingVisitDate || !isCalendarTimeEnabled) return;
    scrollCalendarTimeWheel(calendarStartTimeRef, calendarStartTime, false);
    scrollCalendarTimeWheel(calendarEndTimeRef, calendarEndTime, false);
  }, [
    calendarEndTime,
    calendarStartTime,
    isCalendarTimeEnabled,
    pendingVisitDate,
    scrollCalendarTimeWheel,
  ]);

  const handleCalendarTimeMomentumEnd = useCallback(
    (
      event: NativeSyntheticEvent<NativeScrollEvent>,
      kind: 'start' | 'end',
    ) => {
      const nextIndex = Math.min(
        TIME_OPTIONS.length - 1,
        Math.max(
          0,
          Math.round(event.nativeEvent.contentOffset.y / calendarTimeOptionHeight),
        ),
      );
      const nextValue = TIME_OPTIONS[nextIndex];
      if (!nextValue) return;
      if (kind === 'start') {
        setCalendarStartTime(nextValue);
      } else {
        setCalendarEndTime(nextValue);
      }
      triggerCalendarTimeHaptic(kind, nextValue);
    },
    [triggerCalendarTimeHaptic],
  );

  const handleSaveCalendarEntry = async () => {
    if (!pendingVisitDate) return;
    await Haptics.selectionAsync();
    if (isCalendarTimeEnabled) {
      await journeyService.logWorkoutSessionForDay({
        date: pendingVisitDate,
        startTime: calendarStartTime,
        endTime: calendarEndTime,
      });
    } else {
      await journeyService.markAttendanceDay(pendingVisitDate, true);
    }
    const [nextAttendance, nextSessions] = await Promise.all([
      journeyService.getAttendanceDays(),
      journeyService.getWorkoutSessions(),
    ]);
    setAttendanceDays(nextAttendance);
    setWorkoutSessions(nextSessions);
    setPendingVisitDate('');
    setIsCalendarTimeEnabled(false);
    await refreshStats();
    await refreshMetrics();
  };

  const handleClearCalendarEntry = async () => {
    if (!pendingVisitDate) return;
    await Haptics.selectionAsync();
    const nextAttendance = await journeyService.markAttendanceDay(pendingVisitDate, false);
    setAttendanceDays(nextAttendance);
    setPendingVisitDate('');
    setIsCalendarTimeEnabled(false);
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
    const liveSeconds = (Date.now() - timerStartedAtRef.current) / 1000;
    pausedElapsedRef.current += liveSeconds;
    setElapsedSeconds(pausedElapsedRef.current);
    timerStartedAtRef.current = undefined;
    setTimerState('paused');
    saveStoredTimerState({ elapsedSeconds: pausedElapsedRef.current, state: 'paused' });
  };

  const handleResetTimer = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const liveElapsedSeconds = timerStartedAtRef.current
      ? pausedElapsedRef.current +
        Math.max(0, (Date.now() - timerStartedAtRef.current) / 1000)
      : elapsedSeconds;
    const roundedElapsedSeconds = Math.max(0, Math.round(liveElapsedSeconds));

    if (roundedElapsedSeconds <= 0) {
      setTimerState('idle');
      timerStartedAtRef.current = undefined;
      pausedElapsedRef.current = 0;
      clearStoredTimerState();
      return;
    }

    setElapsedSeconds(liveElapsedSeconds);
    setPendingTimerSeconds(roundedElapsedSeconds);
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
    journeyMonthRailRef.current?.scrollTo({
      animated: true,
      x: (activeRingMonthIndex - monthBounds.first) * journeyMonthRailWidth,
    });
    attendanceMonthRailRef.current?.scrollTo({
      animated: true,
      x: (activeMonthIndex - monthBounds.first) * journeyMonthRailWidth,
    });
    analyticsMonthRailRef.current?.scrollTo({
      animated: true,
      x: (activeAnalyticsMonthIndex - monthBounds.first) * journeyMonthRailWidth,
    });
  }, [activeAnalyticsMonthIndex, activeMonthIndex, activeRingMonthIndex, monthBounds.first]);

  const selectJourneyMonth = useCallback(
    (nextIndex: number) => {
      if (nextIndex !== activeRingMonthIndex) {
        Haptics.selectionAsync();
      }
      setRingMonthIndex(nextIndex);
    },
    [activeRingMonthIndex],
  );

  const selectAttendanceMonth = useCallback(
    (nextIndex: number) => {
      if (nextIndex !== activeMonthIndex) {
        Haptics.selectionAsync();
      }
      setAttendanceMonthIndex(nextIndex);
    },
    [activeMonthIndex],
  );

  const selectAnalyticsMonth = useCallback(
    (nextIndex: number) => {
      if (nextIndex !== activeAnalyticsMonthIndex) {
        Haptics.selectionAsync();
      }
      setAnalyticsMonthIndex(nextIndex);
    },
    [activeAnalyticsMonthIndex],
  );

  const handleJourneyMonthMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (journeyMonthItems.length === 0) return;
      const nextIndex = Math.min(
        monthBounds.last,
        Math.max(
          monthBounds.first,
          monthBounds.first +
            Math.round(event.nativeEvent.contentOffset.x / journeyMonthRailWidth),
        ),
      );
      selectJourneyMonth(nextIndex);
    },
    [journeyMonthItems.length, monthBounds.first, monthBounds.last, selectJourneyMonth],
  );

  const handleAttendanceMonthMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (journeyMonthItems.length === 0) return;
      const nextIndex = Math.min(
        monthBounds.last,
        Math.max(
          monthBounds.first,
          monthBounds.first +
            Math.round(event.nativeEvent.contentOffset.x / journeyMonthRailWidth),
        ),
      );
      selectAttendanceMonth(nextIndex);
    },
    [journeyMonthItems.length, monthBounds.first, monthBounds.last, selectAttendanceMonth],
  );

  const handleAnalyticsMonthMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (journeyMonthItems.length === 0) return;
      const nextIndex = Math.min(
        monthBounds.last,
        Math.max(
          monthBounds.first,
          monthBounds.first +
            Math.round(event.nativeEvent.contentOffset.x / journeyMonthRailWidth),
        ),
      );
      selectAnalyticsMonth(nextIndex);
    },
    [journeyMonthItems.length, monthBounds.first, monthBounds.last, selectAnalyticsMonth],
  );

  if (isLoading || !profile || !stats || !metrics) {
    return (
      <PremiumScreenBackground redHorizonHeight={400}>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <View style={stylesForTheme.loadingState}>
          <ActivityIndicator color={accentBright} />
          <Text style={stylesForTheme.loadingText}>Loading journey...</Text>
        </View>
      </PremiumScreenBackground>
    );
  }

  return (
    <PremiumScreenBackground redHorizonHeight={400}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={stylesForTheme.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={stylesForTheme.header}>
          <View style={stylesForTheme.headerTitleRow}>
            <Text style={[stylesForTheme.headerTitle, stylesForTheme.headerTitleAccent]}>My</Text>
            <Text style={stylesForTheme.headerTitle}> Journey</Text>
          </View>
          <Text style={stylesForTheme.headerTagline}>Track your progress</Text>
        </View>

        <View style={stylesForTheme.calendarPanel}>
          <View style={stylesForTheme.panelTopRow}>
            <View>
              <Text style={stylesForTheme.panelKicker}>Attendance</Text>
              <View style={stylesForTheme.attendanceMonthHeader}>
                {canShowPreviousAttendanceMonth ? (
                  <Pressable
                    onPress={() => selectAttendanceMonth(activeMonthIndex - 1)}
                    style={({ pressed }) => [
                      stylesForTheme.journeyMonthArrow,
                      stylesForTheme.attendanceMonthArrowLeft,
                      pressed && stylesForTheme.buttonPressed,
                    ]}
                    hitSlop={8}>
                    <Text style={stylesForTheme.journeyMonthArrowText}>{'‹'}</Text>
                  </Pressable>
                ) : (
                  <View
                    style={[
                      stylesForTheme.journeyMonthArrowSpacer,
                      stylesForTheme.attendanceMonthArrowLeft,
                    ]}
                  />
                )}
                <View
                  style={[
                    stylesForTheme.journeyMonthMask,
                    stylesForTheme.attendanceMonthMask,
                  ]}>
                  <ScrollView
                    ref={attendanceMonthRailRef}
                    horizontal
                    decelerationRate="fast"
                    onMomentumScrollEnd={handleAttendanceMonthMomentumEnd}
                    showsHorizontalScrollIndicator={false}
                    snapToOffsets={journeyMonthItems.map(
                      (_, index) => index * journeyMonthRailWidth,
                    )}
                    style={stylesForTheme.journeyMonthRail}
                    contentContainerStyle={stylesForTheme.journeyMonthRailContent}>
                    {journeyMonthItems.map((month, index) => (
                      <Pressable
                        key={`attendance-month-${month.month}`}
                        onPress={() => selectAttendanceMonth(monthBounds.first + index)}
                        style={stylesForTheme.journeyMonthRailItem}>
                        <Text
                          adjustsFontSizeToFit
                          minimumFontScale={0.72}
                          numberOfLines={1}
                          style={stylesForTheme.panelTitle}>
                          {month.month}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
                {canShowNextAttendanceMonth ? (
                  <Pressable
                    onPress={() => selectAttendanceMonth(activeMonthIndex + 1)}
                    style={({ pressed }) => [
                      stylesForTheme.journeyMonthArrow,
                      stylesForTheme.attendanceMonthArrowRight,
                      pressed && stylesForTheme.buttonPressed,
                    ]}
                    hitSlop={8}>
                    <Text style={stylesForTheme.journeyMonthArrowText}>{'›'}</Text>
                  </Pressable>
                ) : (
                  <View
                    style={[
                      stylesForTheme.journeyMonthArrowSpacer,
                      stylesForTheme.attendanceMonthArrowRight,
                    ]}
                  />
                )}
              </View>
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
          {isCalendarEditorOpen ? (
            <View style={stylesForTheme.calendarGrid}>
              {selectedMonth?.days.map((day) => (
                <Pressable
                  key={day.id}
                  onPress={() => handleSelectCalendarDay(day.date)}
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
                    {selectedMonthVisitedDays.slice(0, 4).map((day) => (
                      <View key={day.id} style={stylesForTheme.visitDayChip}>
                        <Text style={stylesForTheme.visitDayChipText}>{formatDay(day.date)}</Text>
                      </View>
                    ))}
                    {selectedMonthVisitedDays.length > 4 ? (
                      <Text style={stylesForTheme.visitMoreText}>
                        +{selectedMonthVisitedDays.length - 4} others
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
              <Text style={stylesForTheme.timerValue}>{formatLiveDuration(elapsedSeconds)}</Text>
              <Text style={stylesForTheme.timerMeta}>{timerCalories} kcal live</Text>
            </View>
            <View style={stylesForTheme.timerControls}>
              {timerState !== 'idle' ? (
                <Pressable
                  onPress={handleResetTimer}
                  style={({ pressed }) => [
                    stylesForTheme.timerResetButton,
                    pressed && stylesForTheme.buttonPressed,
                  ]}>
                  <SymbolView
                    name="xmark"
                    size={16}
                    tintColor={theme.colors.text}
                    fallback={<Text style={stylesForTheme.iconFallback}>X</Text>}
                  />
                </Pressable>
              ) : null}
              <Pressable
                onPress={timerState === 'running' ? handlePauseTimer : handleStartTimer}
                style={({ pressed }) => [
                  stylesForTheme.timerMainButton,
                  timerState === 'running' && stylesForTheme.timerPauseButton,
                  pressed && stylesForTheme.buttonPressed,
                ]}>
                <SymbolView
                  name={timerState === 'running' ? 'pause' : 'play.fill'}
                  size={18}
                  tintColor="#FFFFFF"
                  fallback={
                    <Text style={stylesForTheme.timerButtonFallback}>
                      {timerState === 'running' ? '||' : '>'}
                    </Text>
                  }
                />
              </Pressable>
            </View>
          </BlurView>
          {lastCalories > 0 ? (
            <Text style={stylesForTheme.lastSessionText}>Last saved: {lastCalories} kcal</Text>
          ) : null}
        </View>

        <View style={stylesForTheme.dashboardShell}>
          <View style={stylesForTheme.journeyTitleWrap}>
            <View style={stylesForTheme.journeyMonthHeader}>
              {canShowPreviousMonth ? (
                <Pressable
                  onPress={() => selectJourneyMonth(activeRingMonthIndex - 1)}
                  style={({ pressed }) => [
                    stylesForTheme.journeyMonthArrow,
                    pressed && stylesForTheme.buttonPressed,
                  ]}
                  hitSlop={8}>
                  <Text style={stylesForTheme.journeyMonthArrowText}>{'‹'}</Text>
                </Pressable>
              ) : (
                <View style={stylesForTheme.journeyMonthArrowSpacer} />
              )}
              <View style={stylesForTheme.journeyMonthMask}>
                <ScrollView
                  ref={journeyMonthRailRef}
                  horizontal
                  decelerationRate="fast"
                  onMomentumScrollEnd={handleJourneyMonthMomentumEnd}
                  showsHorizontalScrollIndicator={false}
                  snapToOffsets={journeyMonthItems.map(
                    (_, index) => index * journeyMonthRailWidth,
                  )}
                  style={stylesForTheme.journeyMonthRail}
                  contentContainerStyle={stylesForTheme.journeyMonthRailContent}>
                  {journeyMonthItems.map((month, index) => {
                    return (
                      <Pressable
                        key={`journey-month-${month.month}`}
                        onPress={() => selectJourneyMonth(monthBounds.first + index)}
                        style={stylesForTheme.journeyMonthRailItem}>
                        <Text
                          adjustsFontSizeToFit
                          minimumFontScale={0.72}
                          numberOfLines={1}
                          style={stylesForTheme.journeyTitle}>
                          {month.month}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              {canShowNextMonth ? (
                <Pressable
                  onPress={() => selectJourneyMonth(activeRingMonthIndex + 1)}
                  style={({ pressed }) => [
                    stylesForTheme.journeyMonthArrow,
                    pressed && stylesForTheme.buttonPressed,
                  ]}
                  hitSlop={8}>
                  <Text style={stylesForTheme.journeyMonthArrowText}>{'›'}</Text>
                </Pressable>
              ) : (
                <View style={stylesForTheme.journeyMonthArrowSpacer} />
              )}
            </View>
            <View style={stylesForTheme.journeyTitleUnderline} />
          </View>

          <View style={stylesForTheme.ringsGrid}>
            {ringMetrics.map((metric, index) => (
              <MetricRing
                key={metric.label}
                metric={metric}
                index={index}
                seed={ringAnimationSeed}
                trackColor={isLightMode ? theme.colors.border : undefined}
                valueColor={isLightMode ? theme.colors.text : undefined}
                detailColor={isLightMode ? theme.colors.text : undefined}
                labelColor={isLightMode ? theme.colors.text : undefined}
              />
            ))}
          </View>
        </View>

        <View style={[stylesForTheme.analyticsPanel, isLightMode && stylesForTheme.analyticsPanelLight]}>
          <View style={stylesForTheme.panelTopRow}>
            <View>
              <Text style={stylesForTheme.panelKicker}>Analytics</Text>
              <Text style={stylesForTheme.panelTitle}>Avg Calories/Session</Text>
            </View>
            <View
              style={[
                stylesForTheme.journeyMonthHeader,
                stylesForTheme.analyticsMonthHeader,
              ]}>
              {canShowPreviousAnalyticsMonth ? (
                <Pressable
                  onPress={() => selectAnalyticsMonth(activeAnalyticsMonthIndex - 1)}
                  style={({ pressed }) => [
                    stylesForTheme.journeyMonthArrow,
                    stylesForTheme.analyticsMonthArrowLeft,
                    pressed && stylesForTheme.buttonPressed,
                  ]}
                  hitSlop={8}>
                  <Text style={stylesForTheme.journeyMonthArrowText}>{'‹'}</Text>
                </Pressable>
              ) : (
                <View
                  style={[
                    stylesForTheme.journeyMonthArrowSpacer,
                    stylesForTheme.analyticsMonthArrowLeft,
                  ]}
                />
              )}
              <View
                style={[
                  stylesForTheme.journeyMonthMask,
                  stylesForTheme.analyticsMonthMask,
                ]}>
                <ScrollView
                  ref={analyticsMonthRailRef}
                  horizontal
                  decelerationRate="fast"
                  onMomentumScrollEnd={handleAnalyticsMonthMomentumEnd}
                  showsHorizontalScrollIndicator={false}
                  snapToOffsets={journeyMonthItems.map(
                    (_, index) => index * journeyMonthRailWidth,
                  )}
                  style={stylesForTheme.journeyMonthRail}
                  contentContainerStyle={stylesForTheme.journeyMonthRailContent}>
                  {journeyMonthItems.map((month, index) => (
                    <Pressable
                      key={`analytics-month-${month.month}`}
                      onPress={() => selectAnalyticsMonth(monthBounds.first + index)}
                      style={stylesForTheme.journeyMonthRailItem}>
                      <Text
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        numberOfLines={1}
                        style={stylesForTheme.chartMonthTitle}>
                        {month.month}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              {canShowNextAnalyticsMonth ? (
                <Pressable
                  onPress={() => selectAnalyticsMonth(activeAnalyticsMonthIndex + 1)}
                  style={({ pressed }) => [
                    stylesForTheme.journeyMonthArrow,
                    stylesForTheme.analyticsMonthArrowRight,
                    pressed && stylesForTheme.buttonPressed,
                  ]}
                  hitSlop={8}>
                  <Text style={stylesForTheme.journeyMonthArrowText}>{'›'}</Text>
                </Pressable>
              ) : (
                <View
                  style={[
                    stylesForTheme.journeyMonthArrowSpacer,
                    stylesForTheme.analyticsMonthArrowRight,
                  ]}
                />
              )}
            </View>
          </View>
          <TrendChart
            points={chartPoints}
            onLongPress={openChartModal}
            onPressIn={handleChartPressIn}
          />
        </View>

        <View style={stylesForTheme.metricHeader}>
          <View style={stylesForTheme.panelHeadingRow}>
            <View style={stylesForTheme.panelAccentBar} />
            <View>
              <Text style={stylesForTheme.panelKicker}>All-time</Text>
              <Text style={stylesForTheme.panelTitle}>Metrics</Text>
            </View>
          </View>
        </View>

        <View style={stylesForTheme.metricsGrid}>
          {metricCards.map((metric) => (
            <View key={metric.key} style={stylesForTheme.metricModule}>
              <View style={[stylesForTheme.metricModuleAccent, { backgroundColor: metric.accent }]} />
              <Text style={[stylesForTheme.metricModuleValue, { color: isLightMode ? theme.colors.text : '#FFFFFF' }]}>
                {metric.value}
              </Text>
              <Text style={stylesForTheme.metricModuleLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>

        <View style={stylesForTheme.achievementHeader}>
          <View style={stylesForTheme.panelHeadingRow}>
            <View style={stylesForTheme.panelAccentBar} />
            <View>
              <Text style={stylesForTheme.panelKicker}>Milestones</Text>
              <Text style={stylesForTheme.panelTitle}>Achievements</Text>
            </View>
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

      <Modal transparent visible={isChartModalVisible} animationType="fade">
        <View style={stylesForTheme.centerModalOverlay}>
          <Pressable
            style={stylesForTheme.modalBackdrop}
            onPress={() => setIsChartModalVisible(false)}
          />
          <View style={stylesForTheme.chartModalCard}>
            <View style={stylesForTheme.chartModalTopBar}>
              <View style={stylesForTheme.chartZoomControls}>
                <Pressable
                  onPress={() => chartZoomApiRef.current.stepZoomOut()}
                  disabled={chartZoomStepIndex === 0}
                  style={({ pressed }) => [
                    stylesForTheme.chartZoomBtn,
                    pressed && stylesForTheme.buttonPressed,
                    chartZoomStepIndex === 0 && { opacity: 0.28 },
                  ]}>
                  <View style={stylesForTheme.chartZoomMinusBar} />
                </Pressable>
                <Text style={stylesForTheme.chartZoomPct}>{Math.round(chartZoom * 100)}%</Text>
                <Pressable
                  onPress={() => chartZoomApiRef.current.stepZoomIn()}
                  disabled={chartZoomStepIndex === chartZoomSteps.length - 1}
                  style={({ pressed }) => [
                    stylesForTheme.chartZoomBtn,
                    pressed && stylesForTheme.buttonPressed,
                    chartZoomStepIndex === chartZoomSteps.length - 1 && { opacity: 0.28 },
                  ]}>
                  <Text style={stylesForTheme.chartZoomBtnText}>+</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => setIsChartModalVisible(false)}
                style={({ pressed }) => [
                  stylesForTheme.chartModalClose,
                  pressed && stylesForTheme.buttonPressed,
                ]}
                accessibilityLabel="Close expanded chart"
                accessibilityRole="button">
                <Text style={stylesForTheme.chartModalCloseText}>×</Text>
              </Pressable>
            </View>
            <View style={stylesForTheme.chartModalGraphWrap}>
              <FittedTrendChart
                onZoomChange={setChartZoom}
                points={chartPoints}
                xAxisTitleColor={isLightMode ? theme.colors.text : undefined}
                zoomApiRef={chartZoomApiRef}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={Boolean(pendingVisitDate)} animationType="fade">
        <View style={stylesForTheme.centerModalOverlay}>
          <Pressable
            style={stylesForTheme.modalBackdrop}
            onPress={() => {
              setPendingVisitDate('');
              setIsCalendarTimeEnabled(false);
            }}
          />
          <View style={[stylesForTheme.confirmCard, stylesForTheme.calendarConfirmCard]}>
            <View style={stylesForTheme.calendarLoggerTopRow}>
              <View style={stylesForTheme.calendarLoggerHeader}>
                <Text style={stylesForTheme.modalKicker}>Attendance</Text>
                <Text style={[stylesForTheme.confirmTitle, stylesForTheme.calendarConfirmTitle]}>
                  Log this day?
                </Text>
                {pendingVisitDate ? (
                  <Text style={[stylesForTheme.calendarLoggerDate, stylesForTheme.calendarLoggerDateCentered]}>
                    {formatCalendarDate(pendingVisitDate)}
                  </Text>
                ) : null}
              </View>
              {selectedCalendarDay?.hasVisit ? (
                <Text style={stylesForTheme.calendarLoggerBadge}>Visited</Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => setIsCalendarTimeEnabled((value) => !value)}
              style={({ pressed }) => [
                stylesForTheme.calendarTimeToggle,
                pressed && stylesForTheme.buttonPressed,
              ]}>
                <View
                  style={[
                    stylesForTheme.calendarCheckbox,
                    isCalendarTimeEnabled && stylesForTheme.calendarCheckboxActive,
                ]}>
                {isCalendarTimeEnabled ? (
                  <Text style={stylesForTheme.calendarCheckboxTick}>✓</Text>
                ) : null}
              </View>
              <Text style={stylesForTheme.calendarTimeToggleTitle}>Add duration</Text>
            </Pressable>
            {isCalendarTimeEnabled ? (
              <>
                <View style={stylesForTheme.calendarTimePickers}>
                  <View style={stylesForTheme.calendarTimeColumn}>
                    <Text style={stylesForTheme.calendarTimeLabel}>Start time</Text>
                    <View style={stylesForTheme.calendarTimeWheelFrame}>
                      <SymbolView
                        name="chevron.up"
                        size={10}
                        tintColor={theme.colors.textMuted}
                        style={stylesForTheme.calendarTimeWheelArrowTop}
                        fallback={<Text style={stylesForTheme.calendarTimeWheelArrowText}>^</Text>}
                      />
                      <View style={stylesForTheme.calendarTimeWheel}>
                        <ScrollView
                          ref={calendarStartTimeRef}
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                          snapToInterval={calendarTimeOptionHeight}
                          decelerationRate="fast"
                          onMomentumScrollEnd={(event) =>
                            handleCalendarTimeMomentumEnd(event, 'start')
                          }
                          style={stylesForTheme.calendarTimeList}
                          contentContainerStyle={stylesForTheme.calendarTimeListContent}>
                          {TIME_OPTIONS.map((timeOption) => (
                            <Pressable
                              key={`start-${timeOption}`}
                              onPress={() => selectCalendarTimeOption('start', timeOption)}
                              style={({ pressed }) => [
                                stylesForTheme.calendarTimeOption,
                                pressed && stylesForTheme.buttonPressed,
                              ]}>
                              <Text
                                style={[
                                  stylesForTheme.calendarTimeOptionText,
                                  calendarStartTime === timeOption &&
                                    stylesForTheme.calendarTimeOptionTextActive,
                                ]}>
                                {formatTimeOptionLabel(timeOption)}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                      <SymbolView
                        name="chevron.down"
                        size={10}
                        tintColor={theme.colors.textMuted}
                        style={stylesForTheme.calendarTimeWheelArrowBottom}
                        fallback={<Text style={stylesForTheme.calendarTimeWheelArrowText}>v</Text>}
                      />
                    </View>
                  </View>
                  <View style={stylesForTheme.calendarTimeColumn}>
                    <Text style={stylesForTheme.calendarTimeLabel}>End time</Text>
                    <View style={stylesForTheme.calendarTimeWheelFrame}>
                      <SymbolView
                        name="chevron.up"
                        size={10}
                        tintColor={theme.colors.textMuted}
                        style={stylesForTheme.calendarTimeWheelArrowTop}
                        fallback={<Text style={stylesForTheme.calendarTimeWheelArrowText}>^</Text>}
                      />
                      <View style={stylesForTheme.calendarTimeWheel}>
                        <ScrollView
                          ref={calendarEndTimeRef}
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                          snapToInterval={calendarTimeOptionHeight}
                          decelerationRate="fast"
                          onMomentumScrollEnd={(event) =>
                            handleCalendarTimeMomentumEnd(event, 'end')
                          }
                          style={stylesForTheme.calendarTimeList}
                          contentContainerStyle={stylesForTheme.calendarTimeListContent}>
                          {TIME_OPTIONS.map((timeOption) => (
                            <Pressable
                              key={`end-${timeOption}`}
                              onPress={() => selectCalendarTimeOption('end', timeOption)}
                              style={({ pressed }) => [
                                stylesForTheme.calendarTimeOption,
                                pressed && stylesForTheme.buttonPressed,
                              ]}>
                              <Text
                                style={[
                                  stylesForTheme.calendarTimeOptionText,
                                  calendarEndTime === timeOption &&
                                    stylesForTheme.calendarTimeOptionTextActive,
                                ]}>
                                {formatTimeOptionLabel(timeOption)}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                      <SymbolView
                        name="chevron.down"
                        size={10}
                        tintColor={theme.colors.textMuted}
                        style={stylesForTheme.calendarTimeWheelArrowBottom}
                        fallback={<Text style={stylesForTheme.calendarTimeWheelArrowText}>v</Text>}
                      />
                    </View>
                  </View>
                </View>
                <Text style={[stylesForTheme.calendarLoggerHint, stylesForTheme.calendarLoggerHintCentered]}>
                  {selectedCalendarDurationMinutes > 0
                    ? `Duration: ${Math.floor(selectedCalendarDurationMinutes / 60)}h ${selectedCalendarDurationMinutes % 60}m`
                    : 'End time must be later than start time.'}
                </Text>
              </>
            ) : null}
            <View style={stylesForTheme.confirmRow}>
              {selectedCalendarDay?.hasVisit ? (
                <Pressable
                  onPress={handleClearCalendarEntry}
                  style={({ pressed }) => [
                    stylesForTheme.confirmSecondary,
                    pressed && stylesForTheme.buttonPressed,
                  ]}>
                  <Text style={stylesForTheme.confirmSecondaryText}>Clear</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  setPendingVisitDate('');
                  setIsCalendarTimeEnabled(false);
                }}
                style={({ pressed }) => [
                  stylesForTheme.confirmSecondary,
                  pressed && stylesForTheme.buttonPressed,
                ]}>
                <Text style={stylesForTheme.confirmSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={isCalendarTimeEnabled && selectedCalendarDurationMinutes <= 0}
                onPress={handleSaveCalendarEntry}
                style={({ pressed }) => [
                  stylesForTheme.confirmPrimaryWrap,
                  isCalendarTimeEnabled &&
                    selectedCalendarDurationMinutes <= 0 &&
                    stylesForTheme.disabledButton,
                  pressed && stylesForTheme.buttonPressed,
                ]}>
                <LinearGradient
                  colors={['#FF2638', '#B11226', '#2A0308']}
                  locations={[0, 0.58, 1]}
                  start={{ x: 0.08, y: 0 }}
                  end={{ x: 0.92, y: 1 }}
                  style={stylesForTheme.confirmPrimary}>
                  <View pointerEvents="none" style={stylesForTheme.confirmPrimaryGloss} />
                  <Text style={stylesForTheme.confirmPrimaryText}>Add</Text>
                </LinearGradient>
              </Pressable>
            </View>
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
                  stylesForTheme.confirmPrimaryWrap,
                  pressed && stylesForTheme.buttonPressed,
                ]}>
                <LinearGradient
                  colors={['#FF2638', '#B11226', '#2A0308']}
                  locations={[0, 0.58, 1]}
                  start={{ x: 0.08, y: 0 }}
                  end={{ x: 0.92, y: 1 }}
                  style={stylesForTheme.confirmPrimary}>
                  <View pointerEvents="none" style={stylesForTheme.confirmPrimaryGloss} />
                  <Text style={stylesForTheme.confirmPrimaryText}>Save</Text>
                </LinearGradient>
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
  chartRowExpanded: {
    width: '100%',
    alignSelf: 'center',
  },
  chartYAxisTitleCol: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartYAxisTitleColExpanded: {
    width: 34,
  },
  chartCanvasGlow: {
    flex: 1,
    borderRadius: 22,
    shadowColor: midnightPurple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius: 16,
    elevation: 8,
  },
  chartCanvasGlowExpanded: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  chartPlotRow: {
    flexDirection: 'row',
  },
  chartCanvas: {
    flex: 1,
    minHeight: 214,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 22,
    backgroundColor: 'rgba(3, 5, 10, 0.54)',
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 18,
  },
  chartPreviewHoldTarget: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  chartCanvasExpanded: {
    minHeight: 284,
    paddingTop: 12,
    paddingRight: 10,
    paddingBottom: 12,
  },
  chartCanvasInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  chartCanvasInnerExpanded: {
    width: '100%',
  },
  chartPlotScroll: {
    flexGrow: 0,
  },
  chartPlotScrollContent: {
    minWidth: '100%',
  },
  chartPlotInner: {
    position: 'relative',
  },
  chartLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 8,
  },
  chartYAxisTitle: {
    width: 136,
    color: 'rgba(255,255,255,0.42)',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    transform: [{ rotate: '-90deg' }],
  },
  chartYAxisTitleExpanded: {
    width: 178,
    fontSize: 10,
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
  chartHoldHint: {
    position: 'absolute',
    left: 14,
    bottom: 10,
    zIndex: 6,
    color: 'rgba(255,255,255,0.52)',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  fittedChartWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    transform: [{ translateY: 18 }],
  },
  fittedChartPanViewport: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(3, 5, 10, 0.54)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  fittedChartPanContent: {
    position: 'relative',
  },
  fittedChartXAxisTitle: {
    position: 'absolute',
    bottom: 7,
    left: 0,
    right: 0,
    color: 'rgba(160,170,185,0.85)',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    zIndex: 4,
  },
  zoomControlsOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(4, 5, 12, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  zoomBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    includeFontPadding: false,
  },
  zoomPct: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '900',
    minWidth: 34,
    textAlign: 'center',
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
        headerTitleRow: {
          flexDirection: 'row',
          alignItems: 'baseline',
        },
        headerTitle: {
          color: theme.colors.text,
          fontSize: 52,
          fontWeight: '900',
          fontStyle: 'italic',
          letterSpacing: -1,
          lineHeight: 56,
        },
        headerTitleAccent: {
          color: accentBright,
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
          borderColor: theme.scheme === 'dark' ? 'rgba(255,255,255,0.13)' : theme.colors.border,
          borderRadius: 30,
          backgroundColor: theme.scheme === 'dark' ? 'transparent' : 'rgba(255,255,255,0.56)',
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
        journeyMonthHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
        },
        attendanceMonthHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-start',
          marginLeft: -6,
        },
        analyticsMonthHeader: {
          justifyContent: 'flex-start',
          marginLeft: -12,
          paddingRight: 4,
        },
        journeyMonthArrow: {
          width: 18,
          height: 18,
          alignItems: 'center',
          justifyContent: 'center',
        },
        journeyMonthArrowSpacer: {
          width: 18,
          height: 18,
        },
        journeyMonthArrowText: {
          color: theme.colors.text,
          fontSize: 16,
          fontWeight: '900',
          includeFontPadding: false,
          lineHeight: 16,
        },
        journeyMonthMask: {
          width: journeyMonthRailWidth,
          height: 34,
          overflow: 'hidden',
        },
        attendanceMonthMask: {
          marginLeft: -2,
          marginRight: -5,
        },
        analyticsMonthMask: {
          marginLeft: -7,
          marginRight: -7,
        },
        attendanceMonthArrowLeft: {
          marginRight: -3,
        },
        attendanceMonthArrowRight: {
          marginLeft: -6,
        },
        analyticsMonthArrowLeft: {
          marginRight: -7,
        },
        analyticsMonthArrowRight: {
          marginLeft: -7,
        },
        journeyMonthRail: {
          width: journeyMonthRailWidth,
          height: 34,
          overflow: 'hidden',
        },
        journeyMonthRailContent: {
          alignItems: 'center',
          flexGrow: 0,
        },
        journeyMonthRailItem: {
          width: journeyMonthRailWidth,
          height: 34,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
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
          borderColor: theme.scheme === 'dark' ? theme.ink(0.11) : theme.colors.border,
          borderRadius: 28,
          backgroundColor:
            theme.scheme === 'dark' ? 'rgba(16,18,26,0.78)' : 'rgba(255,255,255,0.56)',
          padding: 16,
          marginBottom: 16,
          ...theme.shadow,
        },
        analyticsPanelLight: {
          marginLeft: -12,
          paddingLeft: 28,
        },
        panelTopRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        },
        panelHeadingRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        panelAccentBar: {
          width: 4,
          height: 36,
          borderRadius: 3,
          backgroundColor: accentBright,
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
        chartMonthTitle: {
          color: theme.colors.text,
          fontSize: 15,
          fontWeight: '900',
          textAlign: 'center',
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
          borderColor: 'rgba(177,18,38,0.30)',
          borderRadius: 999,
          backgroundColor: 'transparent',
          paddingHorizontal: 12,
        },
        historyButtonText: {
          color: accentColor,
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
          borderColor: 'rgba(104, 16, 27, 0.72)',
          borderRadius: 999,
          backgroundColor: 'rgba(28, 10, 14, 0.72)',
          paddingHorizontal: 11,
        },
        tinyUndoText: {
          color: '#F6D5DA',
          fontSize: 10,
          fontWeight: '900',
          textTransform: 'uppercase',
        },
        tinyGreenButton: {
          minHeight: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          backgroundColor: '#22C55E',
          paddingHorizontal: 11,
          shadowColor: '#22C55E',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.24,
          shadowRadius: 10,
          elevation: 4,
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
          borderColor: theme.scheme === 'dark' ? theme.ink(0.1) : theme.colors.border,
          borderRadius: 22,
          backgroundColor: theme.scheme === 'dark' ? 'transparent' : 'rgba(255,255,255,0.56)',
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
          borderColor: 'rgba(104, 16, 27, 0.72)',
          backgroundColor: 'rgba(28, 10, 14, 0.72)',
        },
        metricUndoText: {
          color: '#F6D5DA',
        },
        metricSaveButton: {
          minHeight: 28,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          backgroundColor: '#22C55E',
          paddingHorizontal: 10,
          shadowColor: '#22C55E',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.22,
          shadowRadius: 10,
          elevation: 4,
        },
        metricSaveText: {
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: '900',
          textTransform: 'uppercase',
        },
        calendarPanel: {
          borderWidth: 1,
          borderColor: theme.scheme === 'dark' ? theme.ink(0.11) : theme.colors.border,
          borderRadius: 28,
          backgroundColor: theme.scheme === 'dark' ? 'transparent' : 'rgba(255,255,255,0.56)',
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
        calendarDaySelected: {
          borderColor: theme.colors.text,
          borderWidth: 1.5,
        },
        calendarDayText: {
          color: theme.colors.textMuted,
          fontSize: 12,
          fontWeight: '900',
        },
        calendarDayTextActive: {
          color: '#FFFFFF',
        },
        calendarDaySelectedText: {
          color: theme.colors.text,
        },
        calendarLoggerCard: {
          borderWidth: 1,
          borderColor: theme.ink(0.1),
          borderRadius: 22,
          backgroundColor: theme.ink(0.045),
          marginTop: 12,
          padding: 14,
          gap: 12,
        },
        calendarLoggerTopRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          position: 'relative',
          marginBottom: 8,
          paddingTop: 6,
        },
        calendarLoggerHeader: {
          flex: 1,
          alignItems: 'center',
        },
        calendarLoggerTitle: {
          color: theme.colors.text,
          fontSize: 15,
          fontWeight: '900',
        },
        calendarLoggerDate: {
          color: theme.colors.textMuted,
          fontSize: 12,
          fontWeight: '800',
          marginTop: 8,
        },
        calendarLoggerDateCentered: {
          textAlign: 'center',
        },
        calendarLoggerBadge: {
          position: 'absolute',
          right: 0,
          top: 10,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(177,18,38,0.26)',
          borderRadius: 999,
          backgroundColor: 'rgba(177,18,38,0.10)',
          color: accentBright,
          fontSize: 10,
          fontWeight: '900',
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        calendarTimeToggle: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'transparent',
          paddingTop: 8,
          paddingBottom: 4,
        },
        calendarCheckbox: {
          width: 18,
          height: 18,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.2,
          borderColor: theme.ink(0.2),
          borderRadius: 6,
          backgroundColor: 'transparent',
        },
        calendarCheckboxActive: {
          borderColor: accentBright,
          backgroundColor: accentColor,
        },
        calendarCheckboxTick: {
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: '900',
        },
        calendarTimeToggleBody: {
          flex: 1,
        },
        calendarTimeToggleTitle: {
          color: theme.colors.text,
          fontSize: 11,
          fontWeight: '900',
          textTransform: 'uppercase',
        },
        calendarTimeToggleHint: {
          color: theme.colors.textMuted,
          fontSize: 11,
          fontWeight: '700',
          lineHeight: 16,
          marginTop: 2,
        },
        calendarTimePickers: {
          flexDirection: 'row',
          gap: 12,
          marginTop: 8,
        },
        calendarTimeColumn: {
          flex: 1,
          alignItems: 'center',
        },
        calendarTimeLabel: {
          color: theme.colors.text,
          fontSize: 12,
          fontWeight: '900',
          marginBottom: 10,
          textAlign: 'center',
        },
        calendarTimeWheelFrame: {
          width: 104,
          minHeight: 88,
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor: theme.ink(0.11),
          borderRadius: 18,
          backgroundColor: 'rgba(255,255,255,0.02)',
          paddingVertical: 6,
        },
        calendarTimeWheel: {
          height: calendarTimeOptionHeight,
          width: 88,
          overflow: 'hidden',
          backgroundColor: 'transparent',
        },
        calendarTimeWheelArrowTop: {
          marginBottom: 2,
        },
        calendarTimeWheelArrowBottom: {
          marginTop: 2,
        },
        calendarTimeWheelArrowText: {
          color: theme.colors.textMuted,
          fontSize: 10,
          fontWeight: '900',
        },
        calendarTimeList: {
          height: calendarTimeOptionHeight,
        },
        calendarTimeListContent: {
          paddingVertical: calendarTimeWheelPadding,
          paddingHorizontal: 0,
        },
        calendarTimeOption: {
          height: calendarTimeOptionHeight,
          alignItems: 'center',
          justifyContent: 'center',
          width: 88,
          paddingHorizontal: 4,
        },
        calendarTimeOptionText: {
          color: theme.colors.text,
          fontSize: 17,
          fontWeight: '900',
        },
        calendarTimeOptionTextActive: {
          color: theme.colors.text,
        },
        calendarLoggerHint: {
          color: theme.colors.textMuted,
          fontSize: 11,
          fontWeight: '800',
          marginTop: 12,
        },
        calendarLoggerHintCentered: {
          textAlign: 'center',
        },
        calendarLoggerActions: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: 8,
        },
        calendarLoggerSecondary: {
          minHeight: 38,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.ink(0.11),
          borderRadius: 14,
          backgroundColor: theme.colors.surfaceSoft,
          paddingHorizontal: 14,
        },
        calendarLoggerSecondaryText: {
          color: theme.colors.text,
          fontSize: 12,
          fontWeight: '900',
        },
        calendarLoggerPrimary: {
          minHeight: 38,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 14,
          backgroundColor: accentColor,
          paddingHorizontal: 16,
        },
        calendarLoggerPrimaryText: {
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: '900',
        },
        calendarSummaryCard: {
          minHeight: 70,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderWidth: 1,
          borderColor: theme.ink(0.1),
          borderRadius: 22,
          backgroundColor: 'transparent',
          paddingHorizontal: 12,
          paddingVertical: 10,
        },
        calendarSummaryStat: {
          width: 76,
          alignItems: 'center',
          justifyContent: 'center',
          borderRightWidth: 1,
          borderRightColor: theme.ink(0.1),
          paddingRight: 12,
        },
        calendarSummaryValue: {
          color: accentBright,
          fontSize: 28,
          fontWeight: '900',
          lineHeight: 31,
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
          fontSize: 12,
          fontWeight: '900',
          marginBottom: 6,
        },
        visitDayChips: {
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          gap: 6,
          overflow: 'hidden',
        },
        visitDayChip: {
          minWidth: 34,
          minHeight: 24,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          backgroundColor: 'rgba(177,18,38,0.12)',
          paddingHorizontal: 8,
        },
        visitDayChipText: {
          color: accentBright,
          fontSize: 10,
          fontWeight: '900',
        },
        visitMoreText: {
          color: theme.colors.textMuted,
          fontSize: 10,
          fontWeight: '900',
          flexShrink: 1,
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
        timerResetButton: {
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
          borderColor: theme.scheme === 'dark' ? theme.ink(0.1) : theme.colors.border,
          borderRadius: 22,
          backgroundColor: theme.scheme === 'dark' ? 'transparent' : 'rgba(255,255,255,0.56)',
          opacity: 0.54,
          padding: 16,
        },
        achievementCardUnlocked: {
          opacity: 1,
          borderColor: 'rgba(177,18,38,0.30)',
          backgroundColor: theme.scheme === 'dark' ? 'transparent' : 'rgba(255,255,255,0.56)',
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
        chartModalCard: {
          width: '98%',
          maxWidth: 720,
          minHeight: 382,
          maxHeight: '86%',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.ink(0.14),
          borderRadius: 26,
          backgroundColor: theme.scheme === 'light' ? 'rgba(192, 200, 214, 0.98)' : 'rgba(5, 7, 13, 0.96)',
          paddingHorizontal: 10,
          paddingTop: 10,
          paddingBottom: 34,
          ...theme.shadow,
        },
        chartModalTopBar: {
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 4,
          marginBottom: 8,
        },
        chartZoomControls: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: theme.scheme === 'light' ? 'rgba(226, 232, 240, 0.92)' : theme.ink(0.12),
          borderWidth: 1,
          borderColor: theme.scheme === 'light' ? 'rgba(148, 163, 184, 0.45)' : theme.ink(0.15),
          borderRadius: 999,
          paddingVertical: 5,
          paddingHorizontal: 10,
        },
        chartZoomBtn: {
          width: 26,
          height: 26,
          alignItems: 'center',
          justifyContent: 'center',
        },
        chartZoomBtnText: {
          color: theme.colors.text,
          fontSize: 20,
          fontWeight: '600',
          lineHeight: 24,
          includeFontPadding: false,
        },
        chartZoomMinusBar: {
          width: 11,
          height: 2,
          borderRadius: 1,
          backgroundColor: theme.colors.text,
        },
        chartZoomPct: {
          color: theme.scheme === 'light' ? theme.colors.text : theme.colors.textMuted,
          fontSize: 12,
          fontWeight: '900',
          minWidth: 40,
          textAlign: 'center',
        },
        chartModalGraphWrap: {
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        },
        chartModalClose: {
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.scheme === 'light' ? 'rgba(148, 163, 184, 0.45)' : theme.ink(0.16),
          borderRadius: 18,
          backgroundColor: theme.scheme === 'light' ? 'rgba(226, 232, 240, 0.92)' : theme.ink(0.08),
        },
        chartModalCloseText: {
          color: theme.colors.text,
          fontSize: 24,
          fontWeight: '900',
          lineHeight: 26,
        },
        calendarConfirmCard: {
          paddingTop: 24,
          paddingBottom: 24,
        },
        modalKicker: {
          color: accentColor,
          fontSize: 12,
          fontWeight: '900',
          marginBottom: 6,
          textTransform: 'uppercase',
          textAlign: 'center',
        },
        confirmTitle: {
          color: theme.colors.text,
          fontSize: 24,
          fontWeight: '900',
          lineHeight: 29,
        },
        calendarConfirmTitle: {
          marginTop: 6,
          textAlign: 'center',
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
          borderWidth: 1.4,
          borderColor: 'rgba(225,29,46,0.55)',
          borderRadius: 999,
          backgroundColor: 'rgba(7,2,5,0.45)',
        },
        confirmSecondaryText: {
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: '900',
        },
        confirmPrimaryWrap: {
          flex: 1,
          borderRadius: 999,
          shadowColor: accentBright,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 6,
        },
        confirmPrimary: {
          minHeight: 52,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderWidth: 1.2,
          borderColor: 'rgba(255,91,106,0.72)',
          borderRadius: 999,
        },
        confirmPrimaryGloss: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '42%',
          backgroundColor: 'rgba(255,255,255,0.075)',
        },
        confirmPrimaryText: {
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: '900',
          letterSpacing: 0.3,
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
        historyTopActions: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        historyPanelTitle: {
          color: theme.colors.text,
          fontSize: 25,
          fontWeight: '900',
          lineHeight: 30,
        },
        historyClearButton: {
          minHeight: 36,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(104, 16, 27, 0.72)',
          borderRadius: 18,
          backgroundColor: 'rgba(28, 10, 14, 0.72)',
          paddingHorizontal: 12,
        },
        historyClearButtonText: {
          color: '#F6D5DA',
          fontSize: 10,
          fontWeight: '900',
          textTransform: 'uppercase',
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
