import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumGlow, premiumShadow } from '@/constants/premiumTheme';
import { classService, voucherService } from '@/services';
import type { ClassCategory, GymClass, Voucher } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const accentColor = premiumColors.red;
const mutedColor = premiumColors.textMuted;

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

const CATEGORY_LOCATIONS: Record<ClassCategory, string> = {
  'Fitness Classes': 'Main Gym',
  'Martial Arts': 'Boxing Area',
  Gymnastics: 'Studio 1',
  'Extra Classes': 'Studio 2',
};

type ScheduleFilter = 'ALL' | ClassCategory;

const SCHEDULE_FILTERS: { key: ScheduleFilter; label: string }[] = [
  { key: 'ALL', label: 'ALL' },
  { key: 'Fitness Classes', label: 'FITNESS' },
  { key: 'Martial Arts', label: 'MARTIAL ARTS' },
  { key: 'Gymnastics', label: 'GYMNASTICS' },
  { key: 'Extra Classes', label: 'EXTRA' },
];

const WEEKDAY_SHORTS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAY_FULLS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

function getCurrentWeekDays() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      short: WEEKDAY_SHORTS[i],
      num: d.getDate(),
      fullDay: WEEKDAY_FULLS[d.getDay()],
      isToday: d.toDateString() === today.toDateString(),
    };
  });
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

function fmtTodayLabel() {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
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

export default function ClassesScreen() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [classVouchers, setClassVouchers] = useState<Voucher[]>([]);
  const [selectedDay, setSelectedDay] = useState(
    () => WEEKDAY_FULLS[new Date().getDay()],
  );
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('ALL');
  const [pendingAction, setPendingAction] = useState<{
    action: 'reserve' | 'cancel';
    gymClass: GymClass;
  }>();
  const [isLoading, setIsLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [expandedBox, setExpandedBox] = useState<'vouchers' | 'orders' | null>(null);
  const [ordersTab, setOrdersTab] = useState<'Confirmed' | 'Canceled'>('Confirmed');

  const weekDays = useMemo(() => getCurrentWeekDays(), []);

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
          return scheduleFilter === 'ALL' || c.category === scheduleFilter;
        })
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        ),
    [classes, selectedDay, scheduleFilter],
  );

  const pendingVouchers = classVouchers.filter((v) => v.status === 'Pending');
  const historyVouchers = classVouchers.filter((v) => v.status !== 'Pending');
  const ordersFiltered = historyVouchers.filter((v) => v.status === ordersTab);
  const nextBooking = classVouchers.find(
    (v) => v.status === 'Confirmed' || v.status === 'Pending',
  );

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

  const carouselItems =
    featuredClasses.length > 0 ? featuredClasses : classes.slice(0, 5);

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
          <View style={styles.headerIcons}>
            <View style={styles.iconBtn}>
              <SymbolView
                name="magnifyingglass"
                size={18}
                tintColor="#FFFFFF"
                fallback={<Text style={styles.iconGlyph}>⌕</Text>}
              />
            </View>
            <View style={styles.iconBtn}>
              <SymbolView
                name="calendar"
                size={18}
                tintColor="#FFFFFF"
                fallback={<Text style={styles.iconGlyph}>▦</Text>}
              />
              {pendingVouchers.length > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingVouchers.length}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── FEATURED CAROUSEL ─────────────────────────────────── */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
            setCarouselIndex(
              Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH),
            );
          }}
          style={styles.carouselScroll}>
          {carouselItems.map((gymClass) => {
            const isReserved = Boolean(gymClass.isRegistered);
            const isFull = gymClass.status === 'Full' && !isReserved;
            const spotsLeft = Math.max(
              0,
              gymClass.capacity - gymClass.enrolledCount,
            );
            const imgUri =
              gymClass.coverImageUrl || CATEGORY_IMAGES[gymClass.category];
            return (
              <View key={gymClass.id} style={styles.carouselSlide}>
                <View style={styles.featuredCard}>
                  <Image
                    source={{ uri: imgUri }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    pointerEvents="none"
                    colors={[
                      'rgba(0,0,0,0.08)',
                      'rgba(0,0,0,0.0)',
                      'rgba(0,0,0,0.84)',
                    ]}
                    locations={[0, 0.28, 1]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.featuredTopRow}>
                    <View style={styles.featuredBadge}>
                      <Text style={styles.featuredBadgeText}>FEATURED CLASS</Text>
                    </View>
                    <Pressable style={styles.heartBtn}>
                      <SymbolView
                        name="heart"
                        size={16}
                        tintColor="#FFFFFF"
                        fallback={<Text style={styles.heartGlyph}>♡</Text>}
                      />
                    </Pressable>
                  </View>
                  <View style={styles.featuredBottom}>
                    <Text style={styles.featuredTitle}>
                      {gymClass.title.toUpperCase()}
                    </Text>
                    <Text style={styles.featuredDesc} numberOfLines={2}>
                      {gymClass.level} level · Coach {gymClass.instructorName}
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
                          name="chart.bar.fill"
                          size={12}
                          tintColor="rgba(255,255,255,0.72)"
                          fallback={<Text style={styles.statGlyph}>▪</Text>}
                        />
                        <Text style={styles.statText}>
                          {gymClass.level?.toUpperCase() ?? 'ALL LEVELS'}
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
                        <Text style={styles.statText}>{spotsLeft} SPOTS LEFT</Text>
                      </View>
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
                        styles.featuredBookBtn,
                        isFull && styles.featuredBookBtnDisabled,
                        pressed && !isFull && styles.btnPressed,
                      ]}>
                      <Text style={styles.featuredBookBtnText}>
                        {isReserved
                          ? 'CANCEL BOOKING'
                          : isFull
                            ? 'CLASS FULL'
                            : 'BOOK NOW'}
                      </Text>
                      {!isFull ? (
                        <Text style={styles.featuredBookBtnArrow}> ›</Text>
                      ) : null}
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Pagination dots */}
        {carouselItems.length > 1 ? (
          <View style={styles.pagination}>
            {carouselItems.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === carouselIndex && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}

        {/* ── TODAY SCHEDULE ──────────────────────────────────── */}
        <View style={styles.todayRow}>
          <View>
            <Text style={styles.todayLabel}>TODAY</Text>
            <Text style={styles.todayDate}>{fmtTodayLabel()}</Text>
          </View>
          <View style={styles.filterChip}>
            <Text style={styles.filterChipText}>FILTER</Text>
            <SymbolView
              name="slider.horizontal.3"
              size={13}
              tintColor="#FFFFFF"
              fallback={<Text style={styles.filterGlyph}>≡</Text>}
            />
          </View>
        </View>

        {todayClasses.length === 0 ? (
          <View style={[styles.emptyCard, { marginHorizontal: 20 }]}>
            <Text style={styles.emptyTitle}>No classes today</Text>
            <Text style={styles.emptyBody}>
              Try a different day or remove the category filter.
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            <View style={styles.timelineBar} />
            {todayClasses.map((gymClass) => {
              const isReserved = Boolean(gymClass.isRegistered);
              const isFull = gymClass.status === 'Full' && !isReserved;
              const spotsLeft = Math.max(
                0,
                gymClass.capacity - gymClass.enrolledCount,
              );
              const imgUri =
                gymClass.coverImageUrl || CATEGORY_IMAGES[gymClass.category];
              const location = CATEGORY_LOCATIONS[gymClass.category];
              const nameParts = gymClass.instructorName.split(' ');
              const shortName =
                nameParts[0] +
                (nameParts[1] ? ` ${nameParts[1].slice(0, 1)}.` : '');
              return (
                <View key={gymClass.id} style={styles.timelineRow}>
                  <View style={styles.timelineTimCol}>
                    <View style={styles.timelineDot} />
                    <Text style={styles.timelineStartTime}>
                      {fmt24(gymClass.startTime)}
                    </Text>
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
                          name="mappin.circle.fill"
                          size={11}
                          tintColor={mutedColor}
                          fallback={<Text style={styles.metaGlyph}>⊕</Text>}
                        />
                        <Text style={styles.timelineMetaText}>{location}</Text>
                      </View>
                      <View style={styles.timelineMeta}>
                        <SymbolView
                          name="person.2.fill"
                          size={11}
                          tintColor={mutedColor}
                          fallback={<Text style={styles.metaGlyph}>◎</Text>}
                        />
                        <Text style={styles.timelineMetaText}>
                          {spotsLeft} spots left
                        </Text>
                      </View>
                    </View>
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
                      <Text style={styles.instructorLevel}>{gymClass.level}</Text>
                      <Pressable
                        disabled={isFull}
                        onPress={() =>
                          setPendingAction({
                            action: isReserved ? 'cancel' : 'reserve',
                            gymClass,
                          })
                        }
                        style={({ pressed }) => [
                          styles.timelineBtn,
                          isReserved && styles.timelineBtnReserved,
                          isFull && styles.timelineBtnDisabled,
                          pressed && !isFull && styles.btnPressed,
                        ]}>
                        <Text
                          style={[
                            styles.timelineBtnText,
                            isReserved && styles.timelineBtnTextMuted,
                          ]}>
                          {isReserved
                            ? 'VIEW CLASS ›'
                            : isFull
                              ? 'FULL'
                              : 'BOOK NOW ›'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── CATEGORY FILTER CHIPS ──────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRail}>
          {SCHEDULE_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setScheduleFilter(f.key)}
              style={[styles.chip, scheduleFilter === f.key && styles.chipActive]}>
              <Text
                style={[
                  styles.chipText,
                  scheduleFilter === f.key && styles.chipTextActive,
                ]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── MY BOOKINGS CARD ──────────────────────────────────── */}
        <View style={styles.bookingsCard}>
          <View style={styles.bookingsLeft}>
            <Text style={styles.bookingsTitle}>MY BOOKINGS</Text>
            {nextBooking ? (
              <>
                <Text style={styles.bookingsNextDate}>
                  {fmtVoucherDate(nextBooking.date)}
                </Text>
                <Text style={styles.bookingsNextDesc} numberOfLines={2}>
                  {nextBooking.description}
                </Text>
              </>
            ) : (
              <Text style={styles.bookingsEmpty}>No upcoming bookings yet.</Text>
            )}
          </View>
          <Text style={styles.bookingsEmoji}>📅</Text>
        </View>

        {/* ── VOUCHERS + ORDERS — two independent boxes ─────────── */}
        <View style={styles.boxesRow}>
          {/* VOUCHERS: pending class reservations awaiting admin approval */}
          <Pressable
            onPress={() =>
              setExpandedBox(expandedBox === 'vouchers' ? null : 'vouchers')
            }
            style={[
              styles.actBox,
              expandedBox === 'vouchers' && styles.actBoxActive,
            ]}>
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

          {/* ORDERS: confirmed + canceled history */}
          <Pressable
            onPress={() =>
              setExpandedBox(expandedBox === 'orders' ? null : 'orders')
            }
            style={[
              styles.actBox,
              expandedBox === 'orders' && styles.actBoxActive,
            ]}>
            <SymbolView
              name="list.bullet.clipboard"
              size={24}
              tintColor={premiumColors.redBright}
              fallback={<Text style={styles.boxGlyph}>≡</Text>}
            />
            <Text style={styles.actBoxCount}>{historyVouchers.length}</Text>
            <Text style={styles.actBoxLabel}>Orders</Text>
            <Text style={styles.actBoxSub}>History</Text>
          </Pressable>
        </View>

        {/* Vouchers expanded — pending, can cancel */}
        {expandedBox === 'vouchers' ? (
          <View style={styles.expandedPanel}>
            <Text style={styles.expandedTitle}>Pending Vouchers</Text>
            <Text style={styles.expandedSub}>
              Awaiting admin approval. You can cancel before confirmation.
            </Text>
            {pendingVouchers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No pending vouchers</Text>
                <Text style={styles.emptyBody}>
                  Book a class to generate a pending voucher.
                </Text>
              </View>
            ) : (
              <View style={styles.voucherList}>
                {pendingVouchers.map((v) => (
                  <View key={v.id} style={styles.voucherRow}>
                    <View
                      style={[
                        styles.voucherRail,
                        { backgroundColor: premiumColors.warning },
                      ]}
                    />
                    <View style={styles.voucherBody}>
                      <Text style={styles.voucherTitle}>{v.description}</Text>
                      <Text style={styles.voucherMeta}>
                        {fmtVoucherDate(v.date)} · Pending
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleCancelVoucher(v.id)}
                      style={({ pressed }) => [
                        styles.voucherCancelBtn,
                        pressed && styles.btnPressed,
                      ]}>
                      <Text style={styles.voucherCancelText}>Cancel</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Orders expanded — confirmed + canceled history */}
        {expandedBox === 'orders' ? (
          <View style={styles.expandedPanel}>
            <Text style={styles.expandedTitle}>Order History</Text>
            <Text style={styles.expandedSub}>
              Confirmed and canceled class reservations.
            </Text>
            <View style={styles.tabsRow}>
              {(['Confirmed', 'Canceled'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setOrdersTab(tab)}
                  style={[styles.tab, ordersTab === tab && styles.tabActive]}>
                  <Text
                    style={[
                      styles.tabText,
                      ordersTab === tab && styles.tabTextActive,
                    ]}>
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>
            {ordersFiltered.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  No {ordersTab.toLowerCase()} orders
                </Text>
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
                    <View
                      style={[
                        styles.voucherRail,
                        { backgroundColor: statusColor(v.status) },
                      ]}
                    />
                    <View style={styles.voucherBody}>
                      <Text style={styles.voucherTitle}>{v.description}</Text>
                      <Text style={styles.voucherMeta}>
                        {fmtVoucherDate(v.date)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusChip,
                        { borderColor: statusColor(v.status) },
                      ]}>
                      <Text
                        style={[
                          styles.statusChipText,
                          { color: statusColor(v.status) },
                        ]}>
                        {v.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* ── WEEKLY DAY PICKER ───────────────────────────────── */}
        <View style={styles.dayRow}>
          {weekDays.map((day) => (
            <Pressable
              key={day.short}
              onPress={() => setSelectedDay(day.fullDay)}
              style={[
                styles.dayCell,
                selectedDay === day.fullDay && styles.dayCellActive,
              ]}>
              <Text
                style={[
                  styles.dayCellShort,
                  selectedDay === day.fullDay && styles.dayCellTextActive,
                ]}>
                {day.short}
              </Text>
              <Text
                style={[
                  styles.dayCellNum,
                  selectedDay === day.fullDay && styles.dayCellTextActive,
                ]}>
                {day.num}
              </Text>
              {day.isToday ? <View style={styles.todayDot} /> : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* ── BOOKING MODAL ─────────────────────────────────────────── */}
      <Modal transparent visible={Boolean(pendingAction)} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setPendingAction(undefined)}
          />
          <View style={styles.modalCard}>
            {pendingAction ? (
              <>
                <Text style={styles.modalKicker}>
                  {pendingAction.action === 'reserve'
                    ? 'Reserve class'
                    : 'Cancel reservation'}
                </Text>
                <Text style={styles.modalTitle}>
                  {pendingAction.gymClass.title}
                </Text>
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
                    style={({ pressed }) => [
                      styles.modalSecBtn,
                      pressed && styles.btnPressed,
                    ]}>
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
                    style={({ pressed }) => [
                      styles.modalPrimBtn,
                      pressed && styles.btnPressed,
                    ]}>
                    <Text style={styles.modalPrimText}>
                      {pendingAction.action === 'reserve'
                        ? 'Confirm'
                        : 'Cancel booking'}
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
    marginBottom: 22,
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
  headerIcons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  iconGlyph: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: premiumColors.redBright,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },

  // Carousel
  carouselScroll: { marginBottom: 14 },
  carouselSlide: { width: SCREEN_WIDTH, paddingHorizontal: 20 },
  featuredCard: {
    height: 310,
    borderRadius: 26,
    overflow: 'hidden',
    justifyContent: 'space-between',
    ...premiumShadow,
  },
  featuredTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  featuredBadge: {
    borderRadius: 999,
    backgroundColor: premiumColors.red,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heartBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  heartGlyph: { color: '#FFFFFF', fontSize: 16 },
  featuredBottom: { padding: 18 },
  featuredTitle: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  featuredDesc: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800' },
  statDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  statGlyph: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  featuredBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: premiumColors.red,
    paddingVertical: 15,
    ...premiumGlow,
  },
  featuredBookBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    shadowOpacity: 0,
    elevation: 0,
  },
  featuredBookBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  featuredBookBtnArrow: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  btnPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },

  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 26,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotActive: { width: 22, backgroundColor: premiumColors.redBright },

  // Today header
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  todayLabel: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', fontStyle: 'italic' },
  todayDate: { color: mutedColor, fontSize: 12, fontWeight: '700', marginTop: 2 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  filterGlyph: { color: '#FFFFFF', fontSize: 14 },

  // Timeline
  timeline: { paddingHorizontal: 20, marginBottom: 20, position: 'relative' },
  timelineBar: {
    position: 'absolute',
    left: 56,
    top: 10,
    bottom: 10,
    width: 2,
    borderRadius: 1,
    backgroundColor: premiumColors.red,
    opacity: 0.35,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  timelineTimCol: { width: 60, alignItems: 'center', paddingTop: 14 },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: premiumColors.red,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    marginBottom: 6,
    zIndex: 1,
  },
  timelineStartTime: {
    color: premiumColors.red,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  timelineEndTime: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  timelineCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 20,
    backgroundColor: premiumColors.surface,
    padding: 10,
    ...premiumShadow,
  },
  timelineThumb: { width: 64, height: 64, borderRadius: 32 },
  timelineBody: { flex: 1 },
  timelineTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  timelineCat: { color: premiumColors.redBright, fontSize: 11, fontWeight: '800', marginTop: 3 },
  timelineMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  timelineMetaText: { color: mutedColor, fontSize: 11, fontWeight: '700' },
  metaGlyph: { color: mutedColor, fontSize: 10 },
  timelineRight: { alignItems: 'center', width: 86 },
  instructorAvatar: { width: 38, height: 38, borderRadius: 19 },
  instructorAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructorAvatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  instructorName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 5,
    textAlign: 'center',
  },
  instructorLevel: {
    color: mutedColor,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  timelineBtn: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: premiumColors.red,
    paddingHorizontal: 8,
    paddingVertical: 7,
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
  chipRail: { paddingHorizontal: 20, gap: 8, paddingBottom: 4, marginBottom: 22 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chipActive: { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: '#FFFFFF' },
  chipText: { color: mutedColor, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  chipTextActive: { color: '#0A0B0F' },

  // My Bookings
  bookingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 24,
    backgroundColor: premiumColors.surface,
    padding: 18,
    ...premiumShadow,
  },
  bookingsLeft: { flex: 1 },
  bookingsTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.6 },
  bookingsNextDate: {
    color: premiumColors.redBright,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 9,
  },
  bookingsNextDesc: { color: mutedColor, fontSize: 13, fontWeight: '700', marginTop: 4 },
  bookingsEmpty: { color: mutedColor, fontSize: 13, fontWeight: '700', marginTop: 9 },
  bookingsEmoji: { fontSize: 50 },

  // Two boxes
  boxesRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 14 },
  actBox: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 22,
    backgroundColor: premiumColors.surface,
    paddingVertical: 22,
    paddingHorizontal: 10,
    gap: 4,
    ...premiumShadow,
  },
  actBoxActive: {
    borderColor: 'rgba(225, 29, 46, 0.55)',
    backgroundColor: 'rgba(177, 18, 38, 0.12)',
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
  expandedSub: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 14,
    lineHeight: 17,
  },
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
    borderColor: 'rgba(225, 29, 46, 0.3)',
    borderRadius: 10,
    backgroundColor: 'rgba(177, 18, 38, 0.1)',
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

  // Day picker
  dayRow: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 10, gap: 3 },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayCellActive: {
    backgroundColor: premiumColors.red,
    borderColor: premiumColors.redBright,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  dayCellShort: {
    color: mutedColor,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dayCellNum: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', marginTop: 2 },
  dayCellTextActive: { color: '#FFFFFF' },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: premiumColors.redBright,
    marginTop: 3,
  },

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
  emptyBody: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,5,8,0.72)',
  },
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
});
