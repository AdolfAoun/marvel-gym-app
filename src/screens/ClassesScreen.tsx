import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewStyle } from 'react-native';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumGlow, premiumShadow } from '@/constants/premiumTheme';
import { classService, voucherService } from '@/services';
import type { ClassCategory, GymClass, Voucher } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DATE_NAV_BUTTON_W = 34;
const DATE_PAGE_W = SCREEN_WIDTH - 128;
const DATE_CELL_GAP = 6;
const DATE_CELL_W = Math.floor((DATE_PAGE_W - DATE_CELL_GAP * 4) / 5);
const CELL_STEP = DATE_CELL_W + (DATE_PAGE_W - 5 * DATE_CELL_W) / 4;
const accentColor = premiumColors.red;
const mutedColor = premiumColors.textMuted;
const classHeartPurple = '#3B1D7A';
const classHeartPurpleBg = 'rgba(46,16,101,0.30)';
const classHeartPurpleBorder = 'rgba(76,42,158,0.52)';

const SPA_CARD_W = SCREEN_WIDTH - 88;
const FEAT_CARD_W = SCREEN_WIDTH - 40;
const FEAT_PAGE_W = FEAT_CARD_W - 2;
const SPA_CARD_GAP = 12;

const BOOKINGS_SIGN = require('@/assets/images/marvel-logo-startup-sign-dot.png');
const VOUCHERS_SIGN = require('@/assets/images/marvel-logo-startup-sign-x.png');

const CATEGORY_IMAGES: Record<ClassCategory, string> = {
  'Fitness Classes':
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80',
  'Martial Arts':
    'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=900&q=80',
  Gymnastics:
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=900&q=80',
  'Extra Classes':
    'https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?w=900&q=80',
};

const SPECIAL_SESSIONS = [
  {
    id: 'spa-facial',
    title: 'Facial',
    subtitle: 'SKINCARE',
    description: 'Deep cleansing, hydration & anti-aging treatments tailored to your skin type.',
    duration: '60 MIN',
    colors: ['#3A0810', '#1A0407', '#0D0205'] as const,
  },
  {
    id: 'spa-tanning',
    title: 'Tanning',
    subtitle: 'SUNBED',
    description: 'Come for the tan, leave with the glow! Your golden tan is waiting — book your sunbed session now.',
    duration: '20–30 MIN',
    colors: ['#1A1200', '#0D0800', '#060400'] as const,
  },
  {
    id: 'spa-mesotherapy',
    title: 'Mesotherapy',
    subtitle: 'TREATMENT',
    description: 'Microinjection therapy delivering vitamins & hyaluronic acid for skin rejuvenation.',
    duration: '45 MIN',
    colors: ['#2D0A15', '#150308', '#0A0105'] as const,
  },
  {
    id: 'spa-deep-tissue',
    title: 'Deep Tissue Massage',
    subtitle: 'MASSAGE',
    description: 'Targets deep muscle layers to relieve chronic tension, knots and post-workout soreness.',
    duration: '60 MIN',
    colors: ['#2A0D14', '#120408', '#080204'] as const,
  },
  {
    id: 'spa-relaxing',
    title: 'Relaxing Massage',
    subtitle: 'MASSAGE',
    description: 'Full-body Swedish techniques to melt away stress and calm your nervous system.',
    duration: '60 MIN',
    colors: ['#1E0B12', '#0E0307', '#060103'] as const,
  },
  {
    id: 'spa-maderotherapy',
    title: 'Maderotherapy',
    subtitle: 'BODY TREATMENT',
    description: 'Cellulite & water retention massage using sculpted natural wood tools.',
    duration: '90 MIN',
    colors: ['#320810', '#180409', '#0C0204'] as const,
  },
  {
    id: 'spa-laser',
    title: 'Laser Hair Removal',
    subtitle: 'LASER',
    description: 'Advanced laser technology for smooth, permanent hair reduction on any area.',
    duration: '30–60 MIN',
    colors: ['#250811', '#120309', '#080105'] as const,
  },
] as const;

const PT_TRAINERS = [
  {
    id: 'pt-1',
    initials: 'AR',
    name: 'Alex Rodriguez',
    specialty: 'Strength & Conditioning',
    availableHours: '07:00 – 14:00',
    available: true,
    tagline: 'Power through every plateau.',
  },
  {
    id: 'pt-2',
    initials: 'SM',
    name: 'Sara Mansour',
    specialty: 'Yoga & Mobility',
    availableHours: '09:00 – 17:00',
    available: true,
    tagline: 'Move better. Feel better.',
  },
  {
    id: 'pt-3',
    initials: 'MH',
    name: 'Mike Hassan',
    specialty: 'Boxing & HIIT',
    availableHours: 'Not available today',
    available: false,
    tagline: 'Train harder than yesterday.',
  },
] as const;

type ScheduleFilter = 'ALL' | ClassCategory;

const SCHEDULE_FILTERS: { key: ScheduleFilter; label: string }[] = [
  { key: 'ALL', label: 'ALL' },
  { key: 'Fitness Classes', label: 'FITNESS' },
  { key: 'Martial Arts', label: 'MARTIAL ARTS' },
  { key: 'Gymnastics', label: 'GYMNASTICS' },
  { key: 'Extra Classes', label: 'EXTRA' },
];

type ChipLayout = { x: number; width: number };

const WEEKDAY_SHORTS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAY_FULLS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

function getWeekDays(weekOffset: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() + weekOffset * 5);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const offset = Math.round((d.getTime() - today.getTime()) / 86400000);
    return {
      short: WEEKDAY_SHORTS[d.getDay()],
      num: d.getDate(),
      iso: d.toISOString(),
      offset,
      isToday: offset === 0,
    };
  });
}

function getDayByOffset(offset: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(today);
  d.setDate(today.getDate() + offset);

  return {
    short: WEEKDAY_SHORTS[d.getDay()],
    num: d.getDate(),
    iso: d.toISOString(),
    offset,
    isToday: offset === 0,
  };
}

function offsetFromToday(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function relativeDayLabel(offset: number) {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  if (offset === -1) return 'Yesterday';
  if (offset > 1) return `In ${offset} days`;
  return `${Math.abs(offset)} days ago`;
}

function fmtFullDate(iso: string) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function fmt24(value: string) {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function fmtDuration(start: string, end: string) {
  const mins = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  );
  return `${mins} MIN`;
}

function fmtVoucherDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getWeekdayName(iso: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date(iso));
}

function statusColor(status: string) {
  if (status === 'Confirmed') return premiumColors.success;
  if (status === 'Canceled') return premiumColors.textMuted;
  return premiumColors.warning;
}

function initial(name: string) {
  return name.slice(0, 1).toUpperCase();
}

// ── Animated heart button with haptics ───────────────────────────────────────
function HeartButton({
  isFav,
  onToggle,
  btnSize = 36,
  iconSize = 16,
  style,
}: {
  isFav: boolean;
  onToggle: () => void;
  btnSize?: number;
  iconSize?: number;
  style?: ViewStyle;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const breatheScale = useRef(new Animated.Value(1)).current;
  const combined = useRef(Animated.multiply(pressScale, breatheScale)).current;

  useEffect(() => {
    if (isFav) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheScale, {
            toValue: 1.20,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(breatheScale, {
            toValue: 0.88,
            duration: 850,
            useNativeDriver: true,
          }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }
    Animated.timing(breatheScale, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFav, breatheScale]);

  const handlePress = () => {
    void (isFav
      ? Haptics.selectionAsync()
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    ).catch(() => undefined);
    Animated.sequence([
      Animated.timing(pressScale, {
        toValue: 1.45,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(pressScale, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 18,
        speed: 12,
      }),
    ]).start();
    onToggle();
  };

  return (
    <Pressable
      hitSlop={8}
      onPress={handlePress}
      style={[
        hStyles.btn,
        { width: btnSize, height: btnSize, borderRadius: btnSize / 2 },
        isFav && hStyles.btnLiked,
        style,
      ]}>
      <Animated.View style={{ transform: [{ scale: combined }] }}>
        <SymbolView
          name={isFav ? 'heart.fill' : 'heart'}
          size={isFav ? iconSize : iconSize + 2}
          tintColor={classHeartPurple}
          weight={isFav ? 'semibold' : 'bold'}
          fallback={
            <Text style={[hStyles.glyph, { fontSize: isFav ? iconSize : iconSize + 2 }]}>
              {isFav ? '♥' : '♡'}
            </Text>
          }
        />
      </Animated.View>
    </Pressable>
  );
}

const hStyles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  btnLiked: {
    backgroundColor: classHeartPurpleBg,
    borderColor: classHeartPurpleBorder,
    shadowColor: classHeartPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
    elevation: 6,
  },
  glyph: { color: classHeartPurple, fontWeight: '900' },
});
// ─────────────────────────────────────────────────────────────────────────────

function WeekPageStrip({
  week,
  weekIdx,
  selectedOffset,
  onSelect,
}: {
  week: ReturnType<typeof getWeekDays>;
  weekIdx: number;
  selectedOffset: number;
  onSelect: (iso: string) => void;
}) {
  const weekStartOffset = (weekIdx - 1) * 5;
  const indexInWeek = selectedOffset - weekStartOffset;
  const isInThisWeek = indexInWeek >= 0 && indexInWeek <= 4;

  const pillX = useRef(new Animated.Value(isInThisWeek ? indexInWeek * CELL_STEP : 0)).current;
  const pillOpacity = useRef(new Animated.Value(isInThisWeek ? 1 : 0)).current;

  useEffect(() => {
    if (isInThisWeek) {
      Animated.parallel([
        Animated.spring(pillX, {
          toValue: indexInWeek * CELL_STEP,
          useNativeDriver: true,
          tension: 220,
          friction: 18,
        }),
        Animated.timing(pillOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(pillOpacity, { toValue: 0, duration: 80, useNativeDriver: true }).start();
    }
  // pillX and pillOpacity are stable refs; intentionally omitted
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexInWeek, isInThisWeek]);

  return (
    <View style={styles.weekPage}>
      <Animated.View
        pointerEvents="none"
        style={[styles.dayPill, { transform: [{ translateX: pillX }], opacity: pillOpacity }]}
      />
      {week.map((day) => {
        const selected = day.offset === selectedOffset;
        return (
          <Pressable
            key={day.iso}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              onSelect(day.iso);
            }}
            style={styles.dayCell}>
            <Text style={[styles.dayCellShort, selected && styles.dayCellTextActive]}>
              {day.short}
            </Text>
            <Text style={[styles.dayCellNum, selected && styles.dayCellTextActive]}>
              {day.num}
            </Text>
            {day.isToday ? (
              <View style={[styles.todayDot, selected && styles.todayDotActive]} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ClassesScreen() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [classVouchers, setClassVouchers] = useState<Voucher[]>([]);
  const [selectedIso, setSelectedIso] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  });
  const [weekOffset, setWeekOffset] = useState(0);
  const weekScrollRef = useRef<ScrollView>(null);

  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('ALL');
  const [pendingAction, setPendingAction] = useState<{
    action: 'reserve' | 'cancel';
    gymClass: GymClass;
  }>();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedBox, setExpandedBox] = useState<'vouchers' | 'bookings' | null>(null);
  const [ordersTab, setOrdersTab] = useState<'Confirmed' | 'Canceled'>('Confirmed');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [ptBookPending, setPtBookPending] = useState<string | undefined>(undefined);
  const [ptSearchOpen, setPtSearchOpen] = useState(false);
  const [ptSearch, setPtSearch] = useState('');
  const [ptShowFavoritesOnly, setPtShowFavoritesOnly] = useState(false);
  const [chipLayouts, setChipLayouts] = useState<Partial<Record<ScheduleFilter, ChipLayout>>>({});
  const chipPillX = useRef(new Animated.Value(0)).current;
  const chipPillW = useRef(new Animated.Value(0)).current;

  const allWeeksData = useMemo(() => [-1, 0, 1].map(getWeekDays), []);

  const selectedOffset = offsetFromToday(selectedIso);
  const selectedDay = getWeekdayName(selectedIso);
  const normalizedSearch = search.trim().toLowerCase();
  const normalizedPtSearch = ptSearch.trim().toLowerCase();

  const filteredTrainers = PT_TRAINERS.filter((t) => {
    if (ptShowFavoritesOnly && !favorites.has(t.id)) return false;
    if (normalizedPtSearch && !`${t.name} ${t.specialty}`.toLowerCase().includes(normalizedPtSearch)) return false;
    return true;
  });

  // Sync weekOffset changes from arrow presses → animated scroll
  useEffect(() => {
    const pageIdx = weekOffset + 1;
    weekScrollRef.current?.scrollTo({ x: pageIdx * DATE_PAGE_W, animated: true });
  }, [weekOffset]);

  useEffect(() => {
    const layout = chipLayouts[scheduleFilter];
    if (!layout) return;

    Animated.parallel([
      Animated.spring(chipPillX, {
        toValue: layout.x,
        useNativeDriver: false,
        tension: 220,
        friction: 20,
      }),
      Animated.spring(chipPillW, {
        toValue: layout.width,
        useNativeDriver: false,
        tension: 220,
        friction: 20,
      }),
    ]).start();
  }, [chipLayouts, scheduleFilter, chipPillW, chipPillX]);

  const toggleFavorite = (id: string) =>
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const loadData = useCallback(async () => {
    const [scheduledClasses, vouchers] = await Promise.all([
      classService.getScheduledClasses(),
      voucherService.getVouchers(),
    ]);
    setClasses(scheduledClasses.filter((c) => c.isActive));
    setClassVouchers(vouchers.filter((v) => v.type === 'Class Reservation'));
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const featuredClasses = useMemo(
    () =>
      [...classes]
        .sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0))
        .slice(0, 5),
    [classes],
  );

  const todayClasses = useMemo(
    () =>
      classes
        .filter((c) => {
          if (getWeekdayName(c.startTime) !== selectedDay) return false;
          if (scheduleFilter !== 'ALL' && c.category !== scheduleFilter) return false;
          if (showFavoritesOnly && !favorites.has(c.id)) return false;
          if (normalizedSearch) {
            const haystack =
              `${c.title} ${c.instructorName} ${c.category}`.toLowerCase();
            if (!haystack.includes(normalizedSearch)) return false;
          }
          return true;
        })
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        ),
    [classes, selectedDay, scheduleFilter, showFavoritesOnly, favorites, normalizedSearch],
  );

  const selectedDayCategoryCounts = useMemo(() => {
    const counts: Record<ScheduleFilter, number> = {
      ALL: 0,
      'Fitness Classes': 0,
      'Martial Arts': 0,
      Gymnastics: 0,
      'Extra Classes': 0,
    };

    classes.forEach((gymClass) => {
      if (getWeekdayName(gymClass.startTime) !== selectedDay) return;
      counts.ALL += 1;
      counts[gymClass.category] += 1;
    });

    return counts;
  }, [classes, selectedDay]);

  const pendingVouchers = classVouchers.filter((v) => v.status === 'Pending');
  const historyVouchers = classVouchers.filter((v) => v.status !== 'Pending');
  const ordersFiltered = historyVouchers.filter((v) => v.status === ordersTab);

  // Up to 5 featured items drive the "Most Popular" carousel.
  const carouselItems =
    featuredClasses.length > 0 ? featuredClasses : classes.slice(0, 5);

  const handleReserve = async (classId: string) => {
    await classService.registerForClass(classId);
    await loadData();
    setPendingAction(undefined);
  };

  const handleCancel = async (classId: string) => {
    await classService.cancelClassRegistration(classId);
    await loadData();
    setPendingAction(undefined);
  };

  const handleCancelVoucher = async (voucherId: string) => {
    await voucherService.cancelVoucher(voucherId);
    await loadData();
  };

  // The carousel renders [lastClone, ...items, firstClone] so it can loop
  // seamlessly. Real item `i` lives at page index `i + 1`; `currentIndexRef`
  // tracks that PAGE index (so it starts at 1, the first real item), and
  // `featuredScrollX` starts one page in to match.
  const featuredScrollX = useRef(new Animated.Value(FEAT_PAGE_W)).current;
  const featuredScrollRef = useRef<ScrollView>(null);
  const specialScrollX = useRef(new Animated.Value(0)).current;
  const specialScrollRef = useRef<ScrollView>(null);
  const autoplayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentIndexRef = useRef(1);

  useEffect(() => {
    if (!carouselItems || carouselItems.length <= 1) return;

    const startAutoplay = () => {
      if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
      autoplayIntervalRef.current = setInterval(() => {
        // Always step forward by one page. When this lands on the trailing
        // first-clone, onMomentumScrollEnd silently snaps back to the real
        // first page, so it never scrolls backward through every item.
        const next = currentIndexRef.current + 1;
        currentIndexRef.current = next;
        featuredScrollRef.current?.scrollTo({ x: next * FEAT_PAGE_W, animated: true });
      }, 3000);
    };

    startAutoplay();
    return () => {
      if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, [carouselItems]);

  if (isLoading) {
    return (
      <PremiumScreenBackground>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
          <Text style={styles.loadingText}>Loading classes...</Text>
        </View>
      </PremiumScreenBackground>
    );
  }

  const canGoPrev = weekOffset > -1;
  const canGoNext = weekOffset < 1;

  // Seamless loop: clone the last item before the first and the first after
  // the last. Single-item carousels stay as-is.
  const hasLoop = carouselItems.length > 1;
  const loopItems = hasLoop
    ? [carouselItems[carouselItems.length - 1], ...carouselItems, carouselItems[0]]
    : carouselItems;
  const featInitialOffset = hasLoop ? FEAT_PAGE_W : 0;

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* ── HEADER ───────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>CLASSES</Text>
            <Text style={styles.headerTagline}>
              Challenge yourself. Become{' '}
              <Text style={styles.headerAccent}>legendary.</Text>
            </Text>
          </View>
        </View>

        {/* ── FEATURED — fixed widget, swipe inside to change ──────── */}
        <View style={styles.featuredOuterLabel}>
          <Text style={styles.featuredOuterLabelText}>MOST POPULAR</Text>
        </View>

        <View style={styles.featuredWidget}>
          <View style={styles.featuredCard}>
            <Animated.ScrollView
              ref={featuredScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate={0.95}
              scrollEventThrottle={16}
              contentOffset={{ x: featInitialOffset, y: 0 }}
              style={{ flex: 1 }}
              onScrollBeginDrag={() => {
                if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
                if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
              }}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: featuredScrollX } } }],
                { useNativeDriver: true },
              )}
              onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                const n = carouselItems.length;
                let page = Math.round(e.nativeEvent.contentOffset.x / FEAT_PAGE_W);
                // Jumped onto a clone at either seam — snap (no animation) onto
                // the matching real page so the loop is invisible.
                if (hasLoop && page === n + 1) {
                  page = 1;
                  featuredScrollRef.current?.scrollTo({ x: FEAT_PAGE_W, animated: false });
                } else if (hasLoop && page === 0) {
                  page = n;
                  featuredScrollRef.current?.scrollTo({ x: n * FEAT_PAGE_W, animated: false });
                }
                currentIndexRef.current = page;
                if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
                resumeTimeoutRef.current = setTimeout(() => {
                  if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
                  autoplayIntervalRef.current = setInterval(() => {
                    const next = currentIndexRef.current + 1;
                    currentIndexRef.current = next;
                    featuredScrollRef.current?.scrollTo({ x: next * FEAT_PAGE_W, animated: true });
                  }, 3000);
                }, 4000);
              }}>
              {loopItems.map((gymClass, i) => {
                const isReserved = Boolean(gymClass.isRegistered);
                const isFull = gymClass.status === 'Full' && !isReserved;
                const isFav = favorites.has(gymClass.id);
                const imgUri = gymClass.coverImageUrl || CATEGORY_IMAGES[gymClass.category];
                const pageScale = featuredScrollX.interpolate({
                  inputRange: [(i - 1) * FEAT_PAGE_W, i * FEAT_PAGE_W, (i + 1) * FEAT_PAGE_W],
                  outputRange: [0.7, 1, 0.7],
                  extrapolate: 'clamp',
                });
                return (
                  <View key={`feat-${i}`} style={styles.featuredPage}>
                    <Animated.View style={[StyleSheet.absoluteFillObject, styles.featuredPageInner, { transform: [{ scale: pageScale }] }]}>
                      <Image source={{ uri: imgUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                      <LinearGradient
                        pointerEvents="none"
                        colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'rgba(8,3,8,0.88)']}
                        locations={[0, 0.32, 1]}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <LinearGradient
                        pointerEvents="none"
                        colors={['rgba(255,255,255,0.10)', 'transparent', 'rgba(255,255,255,0.05)']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <View style={styles.featuredTopRow}>
                        <HeartButton isFav={isFav} onToggle={() => toggleFavorite(gymClass.id)} />
                      </View>
                      <View style={styles.featuredBottom}>
                        <Text style={styles.featuredTitle}>{gymClass.title.toUpperCase()}</Text>
                        <Text style={styles.featuredDesc} numberOfLines={1}>
                          Coach {gymClass.instructorName}
                        </Text>
                        <View style={styles.statsRow}>
                          <View style={styles.stat}>
                            <SymbolView
                              name="clock"
                              size={12}
                              tintColor="rgba(255,255,255,0.72)"
                              fallback={<Text style={styles.statGlyph}>○</Text>}
                            />
                            <Text style={styles.statText}>
                              {fmtDuration(gymClass.startTime, gymClass.endTime)}
                            </Text>
                          </View>
                          <View style={styles.statDivider} />
                          <View style={styles.stat}>
                            <SymbolView
                              name="person.2.fill"
                              size={12}
                              tintColor="rgba(255,255,255,0.72)"
                              fallback={<Text style={styles.statGlyph}>◎</Text>}
                            />
                            <Text style={styles.statText}>
                              {isFull ? 'FULL' : 'SPOTS AVAILABLE'}
                            </Text>
                          </View>
                        </View>
                        <Pressable
                          disabled={isFull}
                          onPress={() =>
                            setPendingAction({ action: isReserved ? 'cancel' : 'reserve', gymClass })
                          }
                          style={({ pressed }) => [
                            styles.featuredBookBtn,
                            isFull && styles.featuredBookBtnDisabled,
                            pressed && !isFull && styles.btnPressed,
                          ]}>
                          <Text style={styles.featuredBookBtnText}>
                            {isReserved ? 'CANCEL BOOKING' : isFull ? 'CLASS FULL' : 'BOOK NOW'}
                          </Text>
                          {!isFull ? <Text style={styles.featuredBookBtnArrow}> ›</Text> : null}
                        </Pressable>
                      </View>
                    </Animated.View>
                  </View>
                );
              })}
            </Animated.ScrollView>
            <View pointerEvents="none" style={styles.featuredGlassSpecular} />
          </View>

        </View>

        {/* ── WELLNESS & SPA SESSIONS ───────────────────────────── */}
        <View style={styles.spaSectionHeading}>
          <View style={styles.accentBar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.spaEyebrow}>Marvel the Gym</Text>
            <Text style={styles.spaHeadingTitle}>Featured</Text>
          </View>
          <View style={styles.spaTagPill}>
            <Text style={styles.spaTagText}>WELLNESS & SPA</Text>
          </View>
        </View>

        <Animated.ScrollView
          ref={specialScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={SPA_CARD_W + SPA_CARD_GAP}
          snapToAlignment="start"
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: specialScrollX } } }],
            { useNativeDriver: false },
          )}
          style={styles.specialCarousel}>
          {SPECIAL_SESSIONS.map((session, idx) => (
            <View key={session.id} style={styles.specialSlide}>
              {/* Neon bloom behind card */}
              <View style={styles.specialCardGlow} />
              <LinearGradient
                colors={session.colors}
                start={{ x: 0.18, y: 0 }}
                end={{ x: 0.82, y: 1 }}
                style={styles.specialCard}>
                {/* Glass highlight at top */}
                <View pointerEvents="none" style={styles.specialCardHighlight} />
                {/* Top row */}
                <View style={styles.specialCardTopRow}>
                  <Text style={styles.specialSubtitle}>{session.subtitle}</Text>
                  <View style={styles.specialDurationPill}>
                    <Text style={styles.specialDurationText}>{session.duration}</Text>
                  </View>
                </View>
                {/* Big title */}
                <View style={styles.specialCardBody}>
                  <Text style={styles.specialTitle}>{session.title}</Text>
                  <Text style={styles.specialDesc}>{session.description}</Text>
                </View>
                {/* CTA */}
                <Pressable
                  style={({ pressed }) => [styles.specialBookBtn, pressed && styles.btnPressed]}>
                  <Text style={styles.specialBookText}>Book Session</Text>
                  <Text style={styles.specialBookArrow}> ›</Text>
                </Pressable>
              </LinearGradient>
            </View>
          ))}
        </Animated.ScrollView>

        {/* Dots for special sessions */}
        <View style={styles.specialDots}>
          {SPECIAL_SESSIONS.map((_, i) => {
            const pageOffset = i * (SPA_CARD_W + SPA_CARD_GAP);
            const dotColor = specialScrollX.interpolate({
              inputRange: [
                pageOffset - (SPA_CARD_W + SPA_CARD_GAP),
                pageOffset,
                pageOffset + (SPA_CARD_W + SPA_CARD_GAP),
              ],
              outputRange: [
                'rgba(255,255,255,0.22)',
                premiumColors.redBright,
                'rgba(255,255,255,0.22)',
              ],
              extrapolate: 'clamp',
            });

            return (
              <Pressable
                key={i}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Go to featured ${i + 1}`}
                onPress={() => {
                  Haptics.selectionAsync();
                  specialScrollRef.current?.scrollTo({ x: pageOffset, animated: true });
                }}>
                <Animated.View
                  style={[
                    styles.specialDot,
                    {
                      backgroundColor: dotColor,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        {/* ── DATES — paging strip with edge arrows ─────────────── */}
        <View style={styles.datesHeader}>
          <Text style={styles.datesTitle}>Dates</Text>
        </View>

        {/* Container: strip + arrows overlaid at edges */}
        <View style={styles.weekWrapper}>
          {/* Left arrow — only when not on first page */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWeekOffset((w) => Math.max(-1, w - 1));
            }}
            style={({ pressed }) => [
              styles.weekEdgeBtn,
              styles.weekEdgeBtnLeft,
              !canGoPrev && styles.weekEdgeBtnHidden,
              pressed && { transform: [{ scale: 0.86 }], opacity: 0.7 },
            ]}
            disabled={!canGoPrev}
            hitSlop={6}>
            <SymbolView
              name="chevron.left"
              size={13}
              tintColor="#FFFFFF"
              fallback={<Text style={styles.weekEdgeGlyph}>‹</Text>}
            />
          </Pressable>
          {/* Paging scroll strip */}
          <ScrollView
            ref={weekScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            decelerationRate="fast"
            contentOffset={{ x: DATE_PAGE_W, y: 0 }}
            onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
              const page = Math.round(e.nativeEvent.contentOffset.x / DATE_PAGE_W);
              const newOffset = (page - 1) as -1 | 0 | 1;
              if (newOffset !== weekOffset) setWeekOffset(newOffset);
            }}
            style={styles.weekStripScroll}
            contentContainerStyle={styles.weekStripContainer}>
            {allWeeksData.map((week, wIdx) => (
              <WeekPageStrip
                key={wIdx}
                week={week}
                weekIdx={wIdx}
                selectedOffset={selectedOffset}
                onSelect={setSelectedIso}
              />
            ))}
          </ScrollView>

          {/* Right arrow — only when not on last page */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWeekOffset((w) => Math.min(1, w + 1));
            }}
            style={({ pressed }) => [
              styles.weekEdgeBtn,
              styles.weekEdgeBtnRight,
              !canGoNext && styles.weekEdgeBtnHidden,
              pressed && { transform: [{ scale: 0.86 }], opacity: 0.7 },
            ]}
            disabled={!canGoNext}
            hitSlop={6}>
            <SymbolView
              name="chevron.right"
              size={13}
              tintColor="#FFFFFF"
              fallback={<Text style={styles.weekEdgeGlyph}>›</Text>}
            />
          </Pressable>
        </View>

        {/* ── SELECTED-DAY HEADER + SEARCH / FAVORITES ────────── */}
        <View style={styles.todayRow}>
          <View style={styles.todayLabelBlock}>
            <Text style={styles.todayLabel} numberOfLines={1}>
              {relativeDayLabel(selectedOffset).toUpperCase()}
            </Text>
            <Text style={styles.todayDate} numberOfLines={1}>
              {fmtFullDate(selectedIso)}
            </Text>
          </View>
          <View style={styles.sectionIcons}>
            <HeartButton
              isFav={showFavoritesOnly}
              onToggle={() => setShowFavoritesOnly((v) => !v)}
              btnSize={40}
              iconSize={18}
            />
            {searchOpen ? (
              <View style={styles.searchExpanded}>
                <SymbolView
                  name="magnifyingglass"
                  size={15}
                  tintColor={premiumColors.textFaint}
                  fallback={<Text style={styles.searchGlyphSmall}>⌕</Text>}
                />
                <TextInput
                  autoFocus
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search"
                  placeholderTextColor={premiumColors.textFaint}
                  style={styles.searchExpandedInput}
                  returnKeyType="search"
                  autoCorrect={false}
                  onBlur={() => {
                    if (!search) setSearchOpen(false);
                  }}
                />
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setSearch('');
                    setSearchOpen(false);
                  }}>
                  <SymbolView
                    name="xmark"
                    size={13}
                    tintColor={premiumColors.textMuted}
                    fallback={<Text style={styles.searchGlyphSmall}>×</Text>}
                  />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setSearchOpen(true)}
                style={styles.iconBtnSmall}>
                <SymbolView
                  name="magnifyingglass"
                  size={18}
                  tintColor="#FFFFFF"
                  fallback={<Text style={styles.iconGlyph}>⌕</Text>}
                />
              </Pressable>
            )}
          </View>
        </View>

        {/* ── CATEGORY CHIPS ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRail}>
          <View style={styles.chipRailInner}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.chipActivePill,
                {
                  opacity: chipPillW.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                    extrapolate: 'clamp',
                  }),
                  transform: [{ translateX: chipPillX }],
                  width: chipPillW,
                },
              ]}
            />
            {SCHEDULE_FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout;
                  setChipLayouts((current) => {
                    const existing = current[f.key];
                    if (existing?.x === x && existing.width === width) return current;
                    return { ...current, [f.key]: { x, width } };
                  });
                }}
                onPress={() => setScheduleFilter(f.key)}
                style={[styles.chip, scheduleFilter === f.key && styles.chipSelected]}>
                <Text
                  style={[
                    styles.chipText,
                    scheduleFilter === f.key && styles.chipTextActive,
                  ]}>
                  {f.label}
                </Text>
                <View
                  style={[
                    styles.chipCountBadge,
                    scheduleFilter === f.key && styles.chipCountBadgeActive,
                  ]}>
                  <Text
                    style={[
                      styles.chipCountText,
                      scheduleFilter === f.key && styles.chipCountTextActive,
                    ]}>
                    {selectedDayCategoryCounts[f.key]}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {todayClasses.length === 0 ? (
          <View style={[styles.emptyCard, { marginHorizontal: 20 }]}>
            <Text style={styles.emptyTitle}>
              {showFavoritesOnly ? 'No favorite classes' : 'No classes'}
            </Text>
            <Text style={styles.emptyBody}>
              {showFavoritesOnly
                ? 'Tap the heart on a class to add it here.'
                : 'Try another day, category, or search term.'}
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            <View pointerEvents="none" style={styles.timelineBarGlow} />
            <View style={styles.timelineBar} />
            {todayClasses.map((gymClass) => {
              const isReserved = Boolean(gymClass.isRegistered);
              const isFull = gymClass.status === 'Full' && !isReserved;
              const isFav = favorites.has(gymClass.id);
              const imgUri =
                gymClass.coverImageUrl || CATEGORY_IMAGES[gymClass.category];
              const nameParts = gymClass.instructorName.split(' ');
              const shortName =
                nameParts[0] +
                (nameParts[1] ? ` ${nameParts[1].slice(0, 1)}.` : '');
              return (
                <View key={gymClass.id} style={styles.timelineRow}>
                  <View style={styles.timelineTimCol}>
                    <View style={styles.timelineTimTop}>
                      <View style={styles.timelineDot} />
                      <Text style={styles.timelineStartTime}>
                        {fmt24(gymClass.startTime)}
                      </Text>
                    </View>
                    <Text style={styles.timelineEndTime}>
                      {fmt24(gymClass.endTime)}
                    </Text>
                  </View>
                  <View style={styles.timelineCard}>
                    <Image
                      source={{ uri: imgUri }}
                      style={styles.timelineThumb}
                      resizeMode="cover"
                    />
                    <View style={styles.timelineBody}>
                      <Text style={styles.timelineTitle} numberOfLines={1}>
                        {gymClass.title.toUpperCase()}
                      </Text>
                      <Text style={styles.timelineCat}>{gymClass.category}</Text>
                      <View style={styles.timelineMeta}>
                        <SymbolView
                          name="person.2.fill"
                          size={11}
                          tintColor={isFull ? premiumColors.warning : premiumColors.success}
                          fallback={<Text style={styles.metaGlyph}>◎</Text>}
                        />
                        <Text
                          style={[
                            styles.timelineMetaText,
                            { color: isFull ? premiumColors.warning : premiumColors.success },
                          ]}>
                          {isFull ? 'Full' : 'Spots available'}
                        </Text>
                      </View>
                      <Pressable
                        disabled={isFull}
                        onPress={() =>
                          setPendingAction({
                            action: isReserved ? 'cancel' : 'reserve',
                            gymClass,
                          })
                        }
                        style={({ pressed }) => [
                          styles.timelineBookNow,
                          isReserved && styles.timelineBookNowReserved,
                          isFull && styles.timelineBookNowDisabled,
                          pressed && !isFull && styles.btnPressed,
                        ]}>
                        <Text
                          style={[
                            styles.timelineBookNowText,
                            isReserved && styles.timelineBookNowTextMuted,
                          ]}>
                          {isReserved
                            ? 'VIEW BOOKING'
                            : isFull
                              ? 'FULL'
                              : 'BOOK NOW'}
                        </Text>
                      </Pressable>
                    </View>
                    {/* Right column: avatar + name + heart (stacked, no overlap) */}
                    <View style={styles.timelineRight}>
                      {gymClass.instructorImageUrl ? (
                        <Image
                          source={{ uri: gymClass.instructorImageUrl }}
                          style={styles.instructorAvatar}
                        />
                      ) : (
                        <View style={styles.instructorAvatarFallback}>
                          <Text style={styles.instructorAvatarText}>
                            {initial(gymClass.instructorName)}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.instructorName} numberOfLines={1}>
                        {shortName}
                      </Text>
                      <HeartButton
                        isFav={isFav}
                        onToggle={() => toggleFavorite(gymClass.id)}
                        btnSize={30}
                        iconSize={13}
                        style={styles.timelineHeart}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── RESERVE YOUR PT ─────────────────────────────────────── */}
        <View style={styles.ptSectionWrap}>
          <View style={styles.ptSectionHeading}>
            <View style={styles.accentBar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ptHeadingTitle}>Personal Trainers</Text>
              <Text style={styles.ptReserveNow}>Reserve Now</Text>
            </View>
            <View style={styles.sectionIcons}>
              <HeartButton
                isFav={ptShowFavoritesOnly}
                onToggle={() => setPtShowFavoritesOnly((v) => !v)}
                btnSize={40}
                iconSize={18}
              />
              {ptSearchOpen ? (
                <View style={styles.searchExpanded}>
                  <SymbolView
                    name="magnifyingglass"
                    size={15}
                    tintColor={premiumColors.textFaint}
                    fallback={<Text style={styles.searchGlyphSmall}>⌕</Text>}
                  />
                  <TextInput
                    autoFocus
                    value={ptSearch}
                    onChangeText={setPtSearch}
                    placeholder="Search"
                    placeholderTextColor={premiumColors.textFaint}
                    style={styles.searchExpandedInput}
                    returnKeyType="search"
                    autoCorrect={false}
                    onBlur={() => { if (!ptSearch) setPtSearchOpen(false); }}
                  />
                  <Pressable
                    hitSlop={8}
                    onPress={() => { setPtSearch(''); setPtSearchOpen(false); }}>
                    <SymbolView
                      name="xmark"
                      size={13}
                      tintColor={premiumColors.textMuted}
                      fallback={<Text style={styles.searchGlyphSmall}>×</Text>}
                    />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setPtSearchOpen(true)} style={styles.iconBtnSmall}>
                  <SymbolView
                    name="magnifyingglass"
                    size={18}
                    tintColor="#FFFFFF"
                    fallback={<Text style={styles.iconGlyph}>⌕</Text>}
                  />
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ptRail}>
            {filteredTrainers.map((trainer) => (
              <Pressable
                key={trainer.id}
                onPress={() => setPtBookPending(trainer.id)}
                style={({ pressed }) => [styles.ptCard, pressed && styles.btnPressed]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.01)']}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                {/* Top row: badge + heart */}
                <View style={styles.ptCardTopRow}>
                  <View style={[styles.ptAvailBadge, trainer.available && styles.ptAvailBadgeOn]}>
                    <View style={[styles.ptAvailDot, trainer.available && styles.ptAvailDotOn]} />
                    <Text style={[styles.ptAvailText, trainer.available && styles.ptAvailTextOn]}>
                      {trainer.available ? 'Available' : 'Busy'}
                    </Text>
                  </View>
                  <HeartButton
                    isFav={favorites.has(trainer.id)}
                    onToggle={() => toggleFavorite(trainer.id)}
                    btnSize={32}
                    iconSize={14}
                  />
                </View>
                {/* Avatar */}
                <View style={styles.ptAvatar}>
                  <Text style={styles.ptAvatarText}>{trainer.initials}</Text>
                  <View style={styles.ptAvatarRing} />
                </View>
                {/* Name & specialty */}
                <Text style={styles.ptName}>{trainer.name}</Text>
                <Text style={styles.ptSpecialty}>{trainer.specialty}</Text>
                <Text style={styles.ptTagline}>{trainer.tagline}</Text>
                {/* Available time */}
                <View style={styles.ptStatsRow}>
                  <SymbolView
                    name="clock"
                    size={11}
                    tintColor={trainer.available ? premiumColors.redBright : mutedColor}
                    fallback={<Text style={[styles.ptSessionCount, { color: trainer.available ? premiumColors.redBright : mutedColor }]}>○</Text>}
                  />
                  <Text style={[styles.ptSessionCount, trainer.available && { color: 'rgba(255,255,255,0.8)' }]}>
                    {trainer.availableHours}
                  </Text>
                </View>
                {/* CTA */}
                <View style={[styles.ptBookBtn, trainer.available ? styles.ptBookBtnActive : styles.ptBookBtnDisabled]}>
                  <Text style={[styles.ptBookText, !trainer.available && styles.ptBookTextMuted]}>
                    {trainer.available ? 'Book Session' : 'Unavailable'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── BOOKINGS + VOUCHERS ──────────────────────────────────── */}
        <View style={styles.boxesHeading}>
          <View style={styles.accentBar} />
          <View>
            <Text style={styles.boxesEyebrow}>My activity</Text>
            <Text style={styles.boxesTitle}>Bookings &amp; Vouchers</Text>
          </View>
        </View>
        <View style={styles.boxesRow}>
          <Pressable
            onPress={() =>
              setExpandedBox(expandedBox === 'bookings' ? null : 'bookings')
            }
            style={[
              styles.actBox,
              expandedBox === 'bookings' && styles.actBoxActive,
            ]}>
            <Image source={BOOKINGS_SIGN} style={styles.boxWatermark} resizeMode="contain" />
            <SymbolView
              name="list.bullet.clipboard"
              size={24}
              tintColor={premiumColors.redBright}
              fallback={<Text style={styles.boxGlyph}>≡</Text>}
            />
            <Text style={styles.actBoxCount}>{historyVouchers.length}</Text>
            <Text style={styles.actBoxLabel}>Bookings</Text>
            <Text style={styles.actBoxSub}>History</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setExpandedBox(expandedBox === 'vouchers' ? null : 'vouchers')
            }
            style={[
              styles.actBox,
              expandedBox === 'vouchers' && styles.actBoxActive,
            ]}>
            <Image source={VOUCHERS_SIGN} style={styles.boxWatermark} resizeMode="contain" />
            <SymbolView
              name="ticket.fill"
              size={24}
              tintColor={premiumColors.redBright}
              fallback={<Text style={styles.boxGlyph}>▤</Text>}
            />
            <Text style={styles.actBoxCount}>{pendingVouchers.length}</Text>
            <Text style={styles.actBoxLabel}>Vouchers</Text>
            <Text style={styles.actBoxSub}>Pending approval</Text>
          </Pressable>
        </View>

        {expandedBox === 'vouchers' ? (
          <View style={styles.expandedPanel}>
            <Text style={styles.expandedTitle}>Pending Vouchers</Text>
            <Text style={styles.expandedSub}>
              Awaiting admin approval. You can cancel before confirmation.
            </Text>
            {pendingVouchers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No pending vouchers</Text>
                <Text style={styles.emptyBody}>Book a class to generate a pending voucher.</Text>
              </View>
            ) : (
              <View style={styles.voucherList}>
                {pendingVouchers.map((v) => (
                  <View key={v.id} style={styles.voucherRow}>
                    <View style={[styles.voucherRail, { backgroundColor: premiumColors.warning }]} />
                    <View style={styles.voucherBody}>
                      <Text style={styles.voucherTitle}>{v.description}</Text>
                      <Text style={styles.voucherMeta}>{fmtVoucherDate(v.date)} · Pending</Text>
                    </View>
                    <Pressable
                      onPress={() => handleCancelVoucher(v.id)}
                      style={({ pressed }) => [styles.voucherCancelBtn, pressed && styles.btnPressed]}>
                      <Text style={styles.voucherCancelText}>Cancel</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {expandedBox === 'bookings' ? (
          <View style={styles.expandedPanel}>
            <Text style={styles.expandedTitle}>Booking History</Text>
            <Text style={styles.expandedSub}>Confirmed and canceled class reservations.</Text>
            <View style={styles.tabsRow}>
              {(['Confirmed', 'Canceled'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setOrdersTab(tab)}
                  style={[styles.tab, ordersTab === tab && styles.tabActive]}>
                  <Text style={[styles.tabText, ordersTab === tab && styles.tabTextActive]}>
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>
            {ordersFiltered.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No {ordersTab.toLowerCase()} bookings</Text>
                <Text style={styles.emptyBody}>
                  {ordersTab === 'Confirmed'
                    ? 'Approved bookings will appear here.'
                    : 'Canceled bookings will appear here.'}
                </Text>
              </View>
            ) : (
              <View style={styles.voucherList}>
                {ordersFiltered.map((v) => (
                  <View key={v.id} style={styles.voucherRow}>
                    <View style={[styles.voucherRail, { backgroundColor: statusColor(v.status) }]} />
                    <View style={styles.voucherBody}>
                      <Text style={styles.voucherTitle}>{v.description}</Text>
                      <Text style={styles.voucherMeta}>{fmtVoucherDate(v.date)}</Text>
                    </View>
                    <View style={[styles.statusChip, { borderColor: statusColor(v.status) }]}>
                      <Text style={[styles.statusChipText, { color: statusColor(v.status) }]}>
                        {v.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* ── PT BOOKING MODAL ──────────────────────────────────────── */}
      <Modal transparent visible={Boolean(ptBookPending)} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPtBookPending(undefined)} />
          <View style={styles.modalCard}>
            {ptBookPending ? (
              <>
                <Text style={styles.modalKicker}>Personal Training</Text>
                <Text style={styles.modalTitle}>
                  {PT_TRAINERS.find((t) => t.id === ptBookPending)?.name}
                </Text>
                <Text style={styles.modalMeta}>
                  {PT_TRAINERS.find((t) => t.id === ptBookPending)?.specialty}
                </Text>
                <Text style={styles.modalNote}>
                  PT session requests are reviewed within 24 hours. Your trainer will confirm a time slot directly with you.
                </Text>
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => setPtBookPending(undefined)}
                    style={({ pressed }) => [styles.modalSecBtn, pressed && styles.btnPressed]}>
                    <Text style={styles.modalSecText}>Back</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPtBookPending(undefined)}
                    style={({ pressed }) => [styles.modalPrimBtn, pressed && styles.btnPressed]}>
                    <Text style={styles.modalPrimText}>Request Session</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ── BOOKING MODAL ─────────────────────────────────────────── */}
      <Modal transparent visible={Boolean(pendingAction)} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPendingAction(undefined)} />
          <View style={styles.modalCard}>
            {pendingAction ? (
              <>
                <Text style={styles.modalKicker}>
                  {pendingAction.action === 'reserve' ? 'Reserve class' : 'Cancel reservation'}
                </Text>
                <Text style={styles.modalTitle}>{pendingAction.gymClass.title}</Text>
                <Text style={styles.modalMeta}>
                  Coach {pendingAction.gymClass.instructorName} ·{' '}
                  {fmt24(pendingAction.gymClass.startTime)}
                </Text>
                {pendingAction.action === 'reserve' ? (
                  <Text style={styles.modalNote}>
                    A pending booking is created and must be confirmed by staff.
                  </Text>
                ) : null}
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => setPendingAction(undefined)}
                    style={({ pressed }) => [styles.modalSecBtn, pressed && styles.btnPressed]}>
                    <Text style={styles.modalSecText}>Back</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!pendingAction) return;
                      if (pendingAction.action === 'cancel') {
                        handleCancel(pendingAction.gymClass.id);
                      } else {
                        handleReserve(pendingAction.gymClass.id);
                      }
                    }}
                    style={({ pressed }) => [styles.modalPrimBtn, pressed && styles.btnPressed]}>
                    <Text style={styles.modalPrimText}>
                      {pendingAction.action === 'reserve' ? 'Confirm' : 'Cancel booking'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 60, paddingBottom: 130 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: mutedColor, fontSize: 14, fontWeight: '700' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -1,
    lineHeight: 56,
  },
  headerTagline: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 20,
  },
  headerAccent: { color: premiumColors.redBright, fontWeight: '800' },
  iconGlyph: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },

  // Section icons
  sectionIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtnSmall: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  iconBtnActive: {
    borderColor: 'rgba(225,29,46,0.55)',
    backgroundColor: 'rgba(177,18,38,0.2)',
  },

  // Glowy liquid search
  searchExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 188,
    height: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(225,29,46,0.60)',
    borderRadius: 20,
    backgroundColor: 'rgba(177,18,38,0.10)',
    paddingHorizontal: 12,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 6,
  },
  searchExpandedInput: {
    flex: 1,
    color: premiumColors.text,
    fontSize: 14,
    fontWeight: '700',
    padding: 0,
  },
  searchGlyphSmall: { color: premiumColors.textMuted, fontSize: 13, fontWeight: '800' },

  // Dates header
  datesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  datesTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', fontStyle: 'italic' },

  // Week strip wrapper — position:relative so arrows overlay correctly
  weekWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  weekStripScroll: {
    width: DATE_PAGE_W,
    flexGrow: 0,
  },
  weekStripContainer: {
    width: DATE_PAGE_W * 3,
  },
  weekPage: {
    width: DATE_PAGE_W,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  weekEdgeBtn: {
    width: DATE_NAV_BUTTON_W,
    height: DATE_NAV_BUTTON_W,
    borderRadius: DATE_NAV_BUTTON_W / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,5,5,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  weekEdgeBtnLeft: {},
  weekEdgeBtnRight: {},
  weekEdgeBtnHidden: { opacity: 0, pointerEvents: 'none' } as ViewStyle,
  weekEdgeGlyph: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  featuredWidget: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  featuredPage: {
    width: FEAT_PAGE_W,
    height: 220,
  },
  featuredPageInner: {
    justifyContent: 'space-between',
    borderRadius: 26,
    overflow: 'hidden',
  },
  featuredOuterLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  featuredOuterLabelText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  featuredOuterCounter: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  featuredOuterCounterFaint: {
    color: 'rgba(255,255,255,0.28)',
    fontWeight: '700',
  },
  featuredGlassSpecular: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  featuredPrevArea: {
    position: 'absolute',
    top: 0,
    left: 20,
    width: '28%',
    bottom: 10,
  },
  featuredNextArea: {
    position: 'absolute',
    top: 0,
    right: 20,
    width: '28%',
    bottom: 10,
  },

  // Circular red bloom behind card (1px source = large circular halo)
  featuredCircleGlow: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: premiumColors.redBright,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 55,
    elevation: 20,
  },
  featuredCard: {
    height: 220,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    ...premiumShadow,
  },
  featuredTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 16,
  },
  featuredBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(225,29,46,0.75)',
    backgroundColor: 'rgba(225,29,46,0.10)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 8,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  featuredBottom: { padding: 13 },
  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
    lineHeight: 29,
  },
  featuredDesc: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800' },
  statDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.25)' },
  statGlyph: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  featuredBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: premiumColors.red,
    paddingVertical: 6,
    paddingHorizontal: 14,
    ...premiumGlow,
  },
  featuredBookBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    shadowOpacity: 0,
    elevation: 0,
  },
  featuredBookBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  featuredBookBtnArrow: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  btnPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },

  specialDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.22)' },

  // Today header
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  todayLabelBlock: { flex: 1 },
  todayLabel: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', fontStyle: 'italic' },
  todayDate: { color: mutedColor, fontSize: 12, fontWeight: '700', marginTop: 2 },

  // Timeline
  timeline: { paddingHorizontal: 20, marginBottom: 20, position: 'relative' },
  timelineBarGlow: {
    position: 'absolute',
    left: 47,
    top: 7,
    bottom: 12,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 42, 61, 0.08)',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  timelineBar: {
    position: 'absolute',
    left: 48,
    top: 7,
    bottom: 12,
    width: 2,
    borderRadius: 1,
    backgroundColor: premiumColors.redBright,
    opacity: 0.7,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 9,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 14 },
  timelineTimCol: {
    width: 60,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  timelineTimTop: { alignItems: 'center', width: 58 },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: premiumColors.redBright,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    marginBottom: 6,
    zIndex: 1,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 9,
    elevation: 8,
  },
  timelineStartTime: { color: premiumColors.red, fontSize: 15, fontWeight: '900', textAlign: 'center', width: 58 },
  timelineEndTime: { color: mutedColor, fontSize: 15, fontWeight: '800', textAlign: 'center', width: 58 },
  timelineCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 20,
    backgroundColor: premiumColors.surface,
    padding: 10,
    ...premiumShadow,
  },
  timelineThumb: { width: 64, height: 64, borderRadius: 32 },
  timelineBody: { flex: 1, paddingRight: 24 },
  timelineTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  timelineCat: { color: premiumColors.redBright, fontSize: 11, fontWeight: '800', marginTop: 3 },
  timelineMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  timelineMetaText: { color: mutedColor, fontSize: 11, fontWeight: '700' },
  metaGlyph: { color: mutedColor, fontSize: 10 },
  timelineRight: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  instructorAvatar: { width: 42, height: 42, borderRadius: 21 },
  instructorAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructorAvatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  instructorName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
  timelineHeart: {
    marginTop: 6,
    right: 2,
    zIndex: 2,
  },
  timelineBookNow: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    marginTop: 9,
    borderRadius: 12,
    backgroundColor: premiumColors.red,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...premiumGlow,
  },
  timelineBookNowReserved: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowOpacity: 0,
    elevation: 0,
  },
  timelineBookNowDisabled: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    shadowOpacity: 0,
    elevation: 0,
  },
  timelineBookNowText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  timelineBookNowTextMuted: { color: mutedColor },
  timelineBtn: {
    display: 'none',
    marginTop: 5,
    borderRadius: 10,
    backgroundColor: premiumColors.red,
    paddingHorizontal: 8,
    paddingVertical: 6,
    ...premiumGlow,
  },
  timelineBtnReserved: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowOpacity: 0,
    elevation: 0,
  },
  timelineBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    shadowOpacity: 0,
    elevation: 0,
  },
  timelineBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
  timelineBtnTextMuted: { color: mutedColor },

  // Category chips
  chipRail: { paddingHorizontal: 20, paddingBottom: 4, marginBottom: 22 },
  chipRailInner: {
    position: 'relative',
    flexDirection: 'row',
    gap: 8,
  },
  chipActivePill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
    backgroundColor: premiumColors.red,
    borderWidth: 1,
    borderColor: premiumColors.redBright,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.42,
    shadowRadius: 10,
    elevation: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipSelected: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  chipText: { color: mutedColor, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  chipTextActive: { color: '#FFFFFF' },
  chipCountBadge: {
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.11)',
    paddingHorizontal: 5,
  },
  chipCountBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  chipCountText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 10,
  },
  chipCountTextActive: { color: '#FFFFFF' },

  // Day picker — smaller cells
  dayCell: {
    width: DATE_CELL_W,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dayCellActive: {},
  dayPill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DATE_CELL_W,
    borderRadius: 12,
    backgroundColor: premiumColors.red,
    borderWidth: 1,
    borderColor: premiumColors.redBright,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  dayCellShort: { color: mutedColor, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  dayCellNum: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginTop: 2 },
  dayCellTextActive: { color: '#FFFFFF' },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: premiumColors.redBright,
    marginTop: 3,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  todayDotActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
  },

  // Boxes heading
  boxesHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  accentBar: {
    width: 4,
    height: 34,
    borderRadius: 999,
    backgroundColor: premiumColors.redBright,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.36,
    shadowRadius: 8,
  },
  boxesEyebrow: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  boxesTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },

  // Two boxes
  boxesRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 14 },
  actBox: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 22,
    backgroundColor: premiumColors.surface,
    paddingVertical: 22,
    paddingHorizontal: 10,
    gap: 4,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  actBoxActive: {
    borderColor: 'rgba(225,29,46,0.55)',
    backgroundColor: 'rgba(177,18,38,0.12)',
  },
  boxWatermark: {
    position: 'absolute',
    right: -12,
    top: -10,
    width: 80,
    height: 80,
    opacity: 0.12,
    tintColor: '#FFFFFF',
    transform: [{ rotate: '14deg' }],
  },
  boxGlyph: { color: premiumColors.redBright, fontSize: 22 },
  actBoxCount: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 4 },
  actBoxLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  actBoxSub: { color: mutedColor, fontSize: 11, fontWeight: '700' },

  // Expanded panel
  expandedPanel: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 22,
    backgroundColor: premiumColors.surface,
    padding: 16,
  },
  expandedTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginBottom: 4 },
  expandedSub: { color: mutedColor, fontSize: 12, fontWeight: '700', marginBottom: 14, lineHeight: 17 },
  voucherList: { gap: 10 },
  voucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  voucherRail: { width: 4, alignSelf: 'stretch' },
  voucherBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  voucherTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', lineHeight: 18 },
  voucherMeta: { color: mutedColor, fontSize: 11, fontWeight: '700', marginTop: 3 },
  voucherCancelBtn: {
    borderWidth: 1,
    borderColor: 'rgba(225,29,46,0.3)',
    borderRadius: 10,
    backgroundColor: 'rgba(177,18,38,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  voucherCancelText: { color: premiumColors.redBright, fontSize: 12, fontWeight: '900' },
  statusChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 12,
  },
  statusChipText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 14,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: premiumColors.red,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  tabText: { color: mutedColor, fontSize: 13, fontWeight: '900' },
  tabTextActive: { color: '#FFFFFF' },

  // Empty
  emptyCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 18,
    marginBottom: 8,
  },
  emptyTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  emptyBody: { color: mutedColor, fontSize: 13, fontWeight: '700', lineHeight: 18, marginTop: 5 },

  // Modal
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,5,8,0.72)' },
  modalCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 26,
    backgroundColor: premiumColors.charcoal,
    padding: 22,
    ...premiumShadow,
  },
  modalKicker: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modalTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', marginTop: 6 },
  modalMeta: { color: mutedColor, fontSize: 13, fontWeight: '800', marginTop: 6 },
  modalNote: {
    color: premiumColors.warning,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: premiumColors.warning,
    paddingLeft: 10,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalSecBtn: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
  },
  modalSecText: { color: mutedColor, fontSize: 14, fontWeight: '900' },
  modalPrimBtn: {
    flex: 1.4,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: premiumColors.red,
    ...premiumGlow,
  },
  modalPrimText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },

  // ── Spa section heading ──────────────────────────────────────────────────
  spaSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  spaEyebrow: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  spaHeadingTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  spaTagPill: {
    borderWidth: 1,
    borderColor: 'rgba(225,29,46,0.45)',
    borderRadius: 999,
    backgroundColor: 'rgba(225,29,46,0.09)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  spaTagText: {
    color: premiumColors.redBright,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // ── Swipeable special sessions ────────────────────────────────────────────
  specialCarousel: { marginBottom: 8 },
  specialSlide: {
    width: SPA_CARD_W,
    marginRight: SPA_CARD_GAP,
    paddingBottom: 8,
  },
  specialCardGlow: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: premiumColors.redBright,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 20,
  },
  specialCard: {
    height: 195,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(225,29,46,0.55)',
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 12,
  },
  specialCardHighlight: {
    position: 'absolute',
    top: 0,
    left: 22,
    right: 22,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  specialCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  specialSubtitle: {
    color: premiumColors.redBright,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  specialDurationPill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  specialDurationText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  specialCardBody: { flex: 1, justifyContent: 'center', paddingVertical: 4 },
  specialTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  specialDesc: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 6,
  },
  specialCounter: {
    color: 'rgba(255,255,255,0.28)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  specialBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(225,29,46,0.65)',
    borderRadius: 14,
    backgroundColor: 'rgba(225,29,46,0.15)',
    paddingVertical: 9,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 5,
  },
  specialBookText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  specialBookArrow: {
    color: premiumColors.redBright,
    fontSize: 16,
    fontWeight: '900',
  },
  specialDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },

  // ── Reserve Your PT ──────────────────────────────────────────────────────
  ptSectionWrap: { marginBottom: 28 },
  ptSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  ptEyebrow: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  ptHeadingTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },
  ptReserveNow: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    opacity: 0.72,
  },
  ptSubText: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  ptRail: {
    paddingHorizontal: 20,
    gap: 14,
    paddingBottom: 4,
  },
  ptCard: {
    width: 210,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 26,
    backgroundColor: 'rgba(14,16,22,0.82)',
    padding: 18,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  ptCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ptAvailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  ptAvailBadgeOn: {
    borderColor: 'rgba(34,197,94,0.4)',
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  ptAvailDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: mutedColor,
  },
  ptAvailDotOn: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  ptAvailText: {
    color: mutedColor,
    fontSize: 10,
    fontWeight: '800',
  },
  ptAvailTextOn: { color: '#22C55E' },
  ptAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(177,18,38,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(225,29,46,0.55)',
    marginBottom: 14,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
  },
  ptAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(225,29,46,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  ptAvatarRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(225,29,46,0.22)',
  },
  ptName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  ptSpecialty: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  ptTagline: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
    marginTop: 5,
    lineHeight: 16,
  },
  ptStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  ptRating: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
  },
  ptStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  ptSessionCount: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '700',
  },
  ptBookBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
  },
  ptBookBtnActive: {
    backgroundColor: premiumColors.red,
    borderColor: premiumColors.redBright,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
  ptBookBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  ptBookText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  ptBookTextMuted: { color: mutedColor },
});
