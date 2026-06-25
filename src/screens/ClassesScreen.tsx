import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  premiumColors,
  premiumGlow,
  premiumShadow,
} from '@/constants/premiumTheme';
import { classService, voucherService } from '@/services';
import type { ClassCategory, GymClass, Voucher } from '@/types';

const accentColor = premiumColors.red;
const mutedColor = premiumColors.textMuted;

const heroImage =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80';

const categories: ClassCategory[] = [
  'Fitness Classes',
  'Martial Arts',
  'Gymnastics',
  'Extra Classes',
];

const categorySymbols: Record<ClassCategory, { symbol: string; fallback: string }> = {
  'Fitness Classes': { symbol: 'dumbbell.fill', fallback: 'Fit' },
  'Martial Arts': { symbol: 'figure.boxing', fallback: 'MA' },
  Gymnastics: { symbol: 'figure.gymnastics', fallback: 'Gym' },
  'Extra Classes': { symbol: 'sparkles', fallback: 'Ex' },
};

const weekdayOrder = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

type BookingsTab = 'Confirmed' | 'Canceled';

function getWeekday(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date(value));
}

function formatClassTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatClassDayLabel(value: string) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatDuration(startTime: string, endTime: string) {
  const minutes = Math.max(
    0,
    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
  );
  return `${minutes} min`;
}

function formatVoucherDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getBookingStatusColor(status: string) {
  if (status === 'Confirmed') return premiumColors.success;
  if (status === 'Canceled') return premiumColors.textMuted;
  return premiumColors.warning;
}

function getInitials(name: string) {
  return name.slice(0, 1).toUpperCase();
}

export default function ClassesScreen() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<ClassCategory>('Fitness Classes');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingClassAction, setPendingClassAction] = useState<{
    action: 'reserve' | 'cancel';
    gymClass: GymClass;
  }>();
  const [isLoading, setIsLoading] = useState(true);
  const [classVouchers, setClassVouchers] = useState<Voucher[]>([]);
  const [bookingsTab, setBookingsTab] = useState<BookingsTab>('Confirmed');
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  const loadClasses = useCallback(async () => {
    const [scheduledClasses, vouchers] = await Promise.all([
      classService.getScheduledClasses(),
      voucherService.getVouchers(),
    ]);
    setClasses(scheduledClasses.filter((gymClass) => gymClass.isActive));
    setClassVouchers(vouchers.filter((v) => v.type === 'Class Reservation'));
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [loadClasses]),
  );

  const registeredClasses = useMemo(
    () => classes.filter((gymClass) => gymClass.isRegistered),
    [classes],
  );

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return classes.filter(
      (gymClass) =>
        gymClass.title.toLowerCase().includes(trimmedQuery) ||
        gymClass.instructorName.toLowerCase().includes(trimmedQuery),
    );
  }, [classes, isSearching, trimmedQuery]);

  const upcomingClasses = useMemo(
    () =>
      [...classes]
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        )
        .slice(0, 6),
    [classes],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<ClassCategory, number>();
    classes.forEach((gymClass) => {
      counts.set(gymClass.category, (counts.get(gymClass.category) ?? 0) + 1);
    });
    return counts;
  }, [classes]);

  const dayMeta = useMemo(() => {
    return weekdayOrder.map((weekday) => {
      const sample = classes.find(
        (gymClass) => getWeekday(gymClass.startTime) === weekday,
      );
      const dateNum = sample
        ? new Intl.DateTimeFormat('en', { day: '2-digit' }).format(
            new Date(sample.startTime),
          )
        : '--';
      return { key: weekday, short: weekday.slice(0, 3), dateNum };
    });
  }, [classes]);

  const scheduleClasses = useMemo(() => {
    return classes
      .filter(
        (gymClass) =>
          getWeekday(gymClass.startTime) === selectedDay &&
          gymClass.category === selectedCategory,
      )
      .sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
  }, [classes, selectedDay, selectedCategory]);

  const pendingBookingVouchers = classVouchers.filter((v) => v.status === 'Pending');
  const tabBookingVouchers = classVouchers.filter((v) => v.status === bookingsTab);

  const toggleBookmark = (classId: string) => {
    setBookmarked((current) => {
      const next = new Set(current);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  const handleReserve = async (classId: string) => {
    await classService.registerForClass(classId);
    await loadClasses();
    setPendingClassAction(undefined);
  };

  const handleCancel = async (classId: string) => {
    await classService.cancelClassRegistration(classId);
    await loadClasses();
    setPendingClassAction(undefined);
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

  const renderClassRow = (gymClass: GymClass) => {
    const isReserved = Boolean(gymClass.isRegistered);
    const isFull = gymClass.status === 'Full' && !isReserved;
    const spotsLeft = Math.max(0, gymClass.capacity - gymClass.enrolledCount);
    return (
      <View key={gymClass.id} style={styles.scheduleRow}>
        <View style={styles.scheduleThumbWrap}>
          {gymClass.coverImageUrl ? (
            <Image
              source={{ uri: gymClass.coverImageUrl }}
              style={styles.scheduleThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.scheduleThumb, styles.thumbFallback]}>
              <Text style={styles.thumbFallbackText}>{getInitials(gymClass.title)}</Text>
            </View>
          )}
          <View style={styles.scheduleTimePill}>
            <Text style={styles.scheduleTimeText}>{formatClassTime(gymClass.startTime)}</Text>
            <Text style={styles.scheduleDurationText}>
              {formatDuration(gymClass.startTime, gymClass.endTime)}
            </Text>
          </View>
        </View>

        <View style={styles.scheduleBody}>
          <Text style={styles.scheduleTitle} numberOfLines={1}>
            {gymClass.title}
          </Text>
          <Text style={styles.scheduleCoach}>Coach {gymClass.instructorName}</Text>
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{gymClass.category}</Text>
            </View>
            {gymClass.level ? (
              <View style={styles.tagMuted}>
                <Text style={styles.tagMutedText}>{gymClass.level}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.scheduleActions}>
          <Pressable
            disabled={isFull}
            onPress={() =>
              setPendingClassAction({
                action: isReserved ? 'cancel' : 'reserve',
                gymClass,
              })
            }
            style={({ pressed }) => [
              styles.bookButton,
              isReserved && styles.bookButtonReserved,
              isFull && styles.bookButtonDisabled,
              pressed && !isFull && styles.buttonPressed,
            ]}>
            <Text
              style={[
                styles.bookButtonText,
                isReserved && styles.bookButtonTextReserved,
              ]}>
              {isReserved ? 'Cancel' : isFull ? 'Full' : 'Book'}
            </Text>
          </Pressable>
          <Text style={styles.spotsText}>
            {isFull ? 'No spots' : `${spotsLeft} left`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top brand row */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brandKicker}>Marvel</Text>
            <Text style={styles.brandTitle}>Classes</Text>
          </View>
          {pendingBookingVouchers.length > 0 ? (
            <View style={styles.calendarBadge}>
              <SymbolView
                name="calendar"
                size={18}
                tintColor="#FFFFFF"
                fallback={<Text style={styles.calendarGlyph}>{'▦'}</Text>}
              />
              <View style={styles.calendarCount}>
                <Text style={styles.calendarCountText}>
                  {pendingBookingVouchers.length}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(10, 11, 15, 0.35)', 'rgba(10, 11, 15, 0.92)']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>CLASSES</Text>
            <Text style={styles.heroSubtitle}>
              Join our expert-led classes and achieve your goals.
            </Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatPill}>
                <Text style={styles.heroStatValue}>{classes.length}</Text>
                <Text style={styles.heroStatLabel}>weekly</Text>
              </View>
              <View style={styles.heroStatPill}>
                <Text style={styles.heroStatValue}>{registeredClasses.length}</Text>
                <Text style={styles.heroStatLabel}>reserved</Text>
              </View>
              <View style={styles.heroStatPill}>
                <Text style={styles.heroStatValue}>{pendingBookingVouchers.length}</Text>
                <Text style={styles.heroStatLabel}>pending</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <SymbolView
            name="magnifyingglass"
            size={18}
            tintColor={premiumColors.textFaint}
            fallback={<Text style={styles.searchGlyph}>{'⌕'}</Text>}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search classes by name or coach"
            placeholderTextColor={premiumColors.textFaint}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>

        {isSearching ? (
          <>
            <View style={styles.sectionHeading}>
              <View style={styles.accentBar} />
              <View style={styles.sectionHeadingText}>
                <Text style={styles.sectionEyebrow}>Search</Text>
                <Text style={styles.sectionHeadingTitle}>Matching classes</Text>
              </View>
              <Text style={styles.sectionHint}>{searchResults.length} found</Text>
            </View>
            {searchResults.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No matching classes</Text>
                <Text style={styles.emptyBody}>Try a different class name or coach.</Text>
              </View>
            ) : (
              <View style={styles.scheduleList}>{searchResults.map(renderClassRow)}</View>
            )}
          </>
        ) : (
          <>
            {/* Upcoming Classes */}
            <View style={styles.sectionHeading}>
              <View style={styles.accentBar} />
              <View style={styles.sectionHeadingText}>
                <Text style={styles.sectionEyebrow}>Next up</Text>
                <Text style={styles.sectionHeadingTitle}>Upcoming Classes</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.upcomingRail}>
              {upcomingClasses.map((gymClass) => {
                const isReserved = Boolean(gymClass.isRegistered);
                const isFull = gymClass.status === 'Full' && !isReserved;
                const isBookmarked = bookmarked.has(gymClass.id);
                return (
                  <View key={gymClass.id} style={styles.upcomingCard}>
                    <View style={styles.upcomingImageWrap}>
                      {gymClass.coverImageUrl ? (
                        <Image
                          source={{ uri: gymClass.coverImageUrl }}
                          style={styles.upcomingImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.upcomingImage, styles.thumbFallback]}>
                          <Text style={styles.thumbFallbackText}>
                            {getInitials(gymClass.title)}
                          </Text>
                        </View>
                      )}
                      <LinearGradient
                        pointerEvents="none"
                        colors={['transparent', 'rgba(10, 11, 15, 0.85)']}
                        style={styles.upcomingImageScrim}
                      />
                      {gymClass.isPopular ? (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularBadgeText}>Popular</Text>
                        </View>
                      ) : null}
                      {gymClass.caloriesBurned ? (
                        <View style={styles.kcalBadge}>
                          <SymbolView
                            name="flame.fill"
                            size={12}
                            tintColor={premiumColors.redBright}
                            fallback={<Text style={styles.kcalGlyph}>{'▴'}</Text>}
                          />
                          <Text style={styles.kcalText}>{gymClass.caloriesBurned} kcal</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.upcomingBody}>
                      <Text style={styles.upcomingTitle} numberOfLines={1}>
                        {gymClass.title}
                      </Text>
                      <View style={styles.coachRow}>
                        {gymClass.instructorImageUrl ? (
                          <Image
                            source={{ uri: gymClass.instructorImageUrl }}
                            style={styles.coachAvatar}
                          />
                        ) : (
                          <View style={[styles.coachAvatar, styles.thumbFallback]}>
                            <Text style={styles.coachAvatarText}>
                              {getInitials(gymClass.instructorName)}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.coachName}>{gymClass.instructorName}</Text>
                      </View>
                      <View style={styles.tagRow}>
                        <View style={styles.tag}>
                          <Text style={styles.tagText}>{gymClass.category}</Text>
                        </View>
                        {gymClass.level ? (
                          <View style={styles.tagMuted}>
                            <Text style={styles.tagMutedText}>{gymClass.level}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.upcomingMetaRow}>
                        <SymbolView
                          name="calendar"
                          size={13}
                          tintColor={premiumColors.textMuted}
                          fallback={<Text style={styles.metaGlyph}>{'▦'}</Text>}
                        />
                        <Text style={styles.upcomingMetaText}>
                          {formatClassDayLabel(gymClass.startTime)} ·{' '}
                          {formatClassTime(gymClass.startTime)}
                        </Text>
                      </View>
                      <View style={styles.upcomingActionRow}>
                        <Pressable
                          disabled={isFull}
                          onPress={() =>
                            setPendingClassAction({
                              action: isReserved ? 'cancel' : 'reserve',
                              gymClass,
                            })
                          }
                          style={({ pressed }) => [
                            styles.upcomingBookButton,
                            isReserved && styles.bookButtonReserved,
                            isFull && styles.bookButtonDisabled,
                            pressed && !isFull && styles.buttonPressed,
                          ]}>
                          <Text
                            style={[
                              styles.bookButtonText,
                              isReserved && styles.bookButtonTextReserved,
                            ]}>
                            {isReserved ? 'Cancel Reservation' : isFull ? 'Full' : 'Book Class'}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => toggleBookmark(gymClass.id)}
                          style={styles.bookmarkButton}>
                          <SymbolView
                            name={isBookmarked ? 'bookmark.fill' : 'bookmark'}
                            size={16}
                            tintColor={
                              isBookmarked ? premiumColors.redBright : premiumColors.textMuted
                            }
                            fallback={
                              <Text
                                style={[
                                  styles.bookmarkGlyph,
                                  isBookmarked && styles.bookmarkGlyphActive,
                                ]}>
                                {isBookmarked ? '❘' : '❙'}
                              </Text>
                            }
                          />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Browse by Category */}
            <View style={styles.sectionHeading}>
              <View style={styles.accentBar} />
              <View style={styles.sectionHeadingText}>
                <Text style={styles.sectionEyebrow}>Disciplines</Text>
                <Text style={styles.sectionHeadingTitle}>Browse by Category</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRail}>
              {categories.map((category) => {
                const isSelected = selectedCategory === category;
                const meta = categorySymbols[category];
                return (
                  <Pressable
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    style={({ pressed }) => [
                      styles.categoryTile,
                      isSelected && styles.categoryTileSelected,
                      pressed && styles.buttonPressed,
                    ]}>
                    <View
                      style={[
                        styles.categoryIconWrap,
                        isSelected && styles.categoryIconWrapSelected,
                      ]}>
                      <SymbolView
                        name={meta.symbol as never}
                        size={24}
                        tintColor={isSelected ? '#FFFFFF' : premiumColors.textMuted}
                        fallback={
                          <Text
                            style={[
                              styles.categoryFallback,
                              isSelected && styles.categoryFallbackSelected,
                            ]}>
                            {meta.fallback}
                          </Text>
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryLabel,
                        isSelected && styles.categoryLabelSelected,
                      ]}>
                      {category}
                    </Text>
                    <Text style={styles.categoryCount}>
                      {categoryCounts.get(category) ?? 0} classes
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* This Week's Schedule */}
            <View style={styles.sectionHeading}>
              <View style={styles.accentBar} />
              <View style={styles.sectionHeadingText}>
                <Text style={styles.sectionEyebrow}>{selectedCategory}</Text>
                <Text style={styles.sectionHeadingTitle}>This Week&apos;s Schedule</Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayRail}>
              {dayMeta.map((day) => {
                const isSelected = selectedDay === day.key;
                return (
                  <Pressable
                    key={day.key}
                    onPress={() => setSelectedDay(day.key)}
                    style={[styles.dayPill, isSelected && styles.dayPillSelected]}>
                    <Text style={[styles.dayShort, isSelected && styles.daySelectedText]}>
                      {day.short}
                    </Text>
                    <Text style={[styles.dayNum, isSelected && styles.daySelectedText]}>
                      {day.dateNum}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {scheduleClasses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No classes scheduled</Text>
                <Text style={styles.emptyBody}>
                  No {selectedCategory.toLowerCase()} on {selectedDay}. Try another day or
                  category.
                </Text>
              </View>
            ) : (
              <View style={styles.scheduleList}>{scheduleClasses.map(renderClassRow)}</View>
            )}
          </>
        )}

        {/* My Bookings */}
        <View style={styles.sectionHeading}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>Approved &amp; history</Text>
            <Text style={styles.sectionHeadingTitle}>My Bookings</Text>
          </View>
        </View>

        <View style={styles.tabsRow}>
          {(['Confirmed', 'Canceled'] as BookingsTab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setBookingsTab(tab)}
              style={[styles.tab, bookingsTab === tab && styles.tabActive]}>
              <Text style={[styles.tabText, bookingsTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {tabBookingVouchers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No {bookingsTab.toLowerCase()} bookings</Text>
            <Text style={styles.emptyBody}>
              {bookingsTab === 'Confirmed'
                ? 'Bookings approved by staff will appear here.'
                : 'Cancelled bookings will appear here.'}
            </Text>
          </View>
        ) : (
          <View style={styles.bookingsList}>
            {tabBookingVouchers.map((voucher) => (
              <View key={voucher.id} style={styles.bookingCard}>
                <View
                  style={[
                    styles.bookingRail,
                    { backgroundColor: getBookingStatusColor(voucher.status) },
                  ]}
                />
                <View style={styles.bookingContent}>
                  <View style={styles.bookingTopRow}>
                    <View style={styles.bookingStatusPill}>
                      <View
                        style={[
                          styles.bookingStatusDot,
                          { backgroundColor: getBookingStatusColor(voucher.status) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.bookingStatusText,
                          { color: getBookingStatusColor(voucher.status) },
                        ]}>
                        {voucher.status}
                      </Text>
                    </View>
                    <Text style={styles.bookingDate}>{formatVoucherDate(voucher.date)}</Text>
                  </View>
                  <Text style={styles.bookingDescription}>{voucher.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Reserve / Cancel modal */}
      <Modal transparent visible={Boolean(pendingClassAction)} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setPendingClassAction(undefined)}
          />
          <View style={styles.modalCard}>
            {pendingClassAction ? (
              <>
                <Text style={styles.modalKicker}>
                  {pendingClassAction.action === 'reserve'
                    ? 'Reserve class'
                    : 'Cancel reservation'}
                </Text>
                <Text style={styles.modalTitle}>{pendingClassAction.gymClass.title}</Text>
                <Text style={styles.modalMeta}>
                  Coach {pendingClassAction.gymClass.instructorName} ·{' '}
                  {formatClassDayLabel(pendingClassAction.gymClass.startTime)}
                </Text>
                {pendingClassAction.action === 'reserve' ? (
                  <Text style={styles.modalNote}>
                    A pending booking is created and must be confirmed by staff.
                  </Text>
                ) : null}
                <View style={styles.modalActionRow}>
                  <Pressable
                    onPress={() => setPendingClassAction(undefined)}
                    style={({ pressed }) => [
                      styles.modalSecondaryButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.modalSecondaryText}>Back</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!pendingClassAction) return;
                      if (pendingClassAction.action === 'cancel') {
                        handleCancel(pendingClassAction.gymClass.id);
                        return;
                      }
                      handleReserve(pendingClassAction.gymClass.id);
                    }}
                    style={({ pressed }) => [
                      styles.modalPrimaryButton,
                      pressed && styles.buttonPressed,
                    ]}>
                    <Text style={styles.modalPrimaryText}>
                      {pendingClassAction.action === 'reserve' ? 'Confirm' : 'Cancel booking'}
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 64,
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandKicker: {
    color: premiumColors.redBright,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 2,
  },
  calendarBadge: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  calendarGlyph: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  calendarCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: premiumColors.redBright,
    paddingHorizontal: 5,
  },
  calendarCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    height: 196,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 28,
    marginBottom: 20,
    shadowColor: premiumColors.red,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
    maxWidth: '74%',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  heroStatPill: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchGlyph: {
    color: premiumColors.textFaint,
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  accentBar: {
    width: 4,
    height: 36,
    borderRadius: 3,
    backgroundColor: premiumColors.redBright,
  },
  sectionHeadingText: {
    flex: 1,
  },
  sectionEyebrow: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  sectionHeadingTitle: {
    color: premiumColors.text,
    fontSize: 21,
    fontWeight: '900',
  },
  sectionHint: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '800',
  },
  upcomingRail: {
    gap: 14,
    paddingRight: 4,
    paddingBottom: 4,
    marginBottom: 22,
  },
  upcomingCard: {
    width: 250,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 22,
    backgroundColor: premiumColors.surface,
    ...premiumShadow,
  },
  upcomingImageWrap: {
    position: 'relative',
    height: 132,
  },
  upcomingImage: {
    width: '100%',
    height: '100%',
  },
  upcomingImageScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  popularBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 999,
    backgroundColor: premiumColors.red,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kcalBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 11, 15, 0.66)',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  kcalGlyph: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
  },
  kcalText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  upcomingBody: {
    padding: 14,
  },
  upcomingTitle: {
    color: premiumColors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  coachAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  coachAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  coachName: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    borderRadius: 8,
    backgroundColor: 'rgba(177, 18, 38, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    color: premiumColors.redBright,
    fontSize: 10,
    fontWeight: '900',
  },
  tagMuted: {
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: premiumColors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagMutedText: {
    color: premiumColors.textMuted,
    fontSize: 10,
    fontWeight: '900',
  },
  upcomingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  metaGlyph: {
    color: premiumColors.textMuted,
    fontSize: 12,
  },
  upcomingMetaText: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  upcomingActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  upcomingBookButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: premiumColors.red,
    ...premiumGlow,
  },
  bookmarkButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bookmarkGlyph: {
    color: premiumColors.textMuted,
    fontSize: 16,
    fontWeight: '900',
  },
  bookmarkGlyphActive: {
    color: premiumColors.redBright,
  },
  categoryRail: {
    gap: 12,
    paddingRight: 4,
    paddingBottom: 4,
    marginBottom: 22,
  },
  categoryTile: {
    width: 116,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  categoryTileSelected: {
    borderColor: 'rgba(225, 29, 46, 0.5)',
    backgroundColor: 'rgba(177, 18, 38, 0.16)',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  categoryIconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  categoryIconWrapSelected: {
    backgroundColor: premiumColors.red,
  },
  categoryFallback: {
    color: premiumColors.textMuted,
    fontSize: 15,
    fontWeight: '900',
  },
  categoryFallbackSelected: {
    color: '#FFFFFF',
  },
  categoryLabel: {
    color: premiumColors.text,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: '#FFFFFF',
  },
  categoryCount: {
    color: premiumColors.textFaint,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  dayRail: {
    gap: 10,
    paddingRight: 4,
    marginBottom: 16,
  },
  dayPill: {
    width: 62,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 10,
  },
  dayPillSelected: {
    borderColor: premiumColors.redBright,
    backgroundColor: premiumColors.red,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 5,
  },
  dayShort: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dayNum: {
    color: premiumColors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  daySelectedText: {
    color: '#FFFFFF',
  },
  scheduleList: {
    gap: 12,
    marginBottom: 24,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 20,
    backgroundColor: premiumColors.surface,
    padding: 10,
    ...premiumShadow,
  },
  scheduleThumbWrap: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  scheduleThumb: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  thumbFallbackText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  scheduleTimePill: {
    position: 'absolute',
    bottom: -6,
    left: -2,
    right: -2,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(10, 11, 15, 0.9)',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    paddingVertical: 1,
  },
  scheduleTimeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  scheduleDurationText: {
    color: premiumColors.textFaint,
    fontSize: 8,
    fontWeight: '800',
  },
  scheduleBody: {
    flex: 1,
  },
  scheduleTitle: {
    color: premiumColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  scheduleCoach: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  scheduleActions: {
    alignItems: 'center',
    gap: 4,
  },
  bookButton: {
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: premiumColors.red,
    paddingHorizontal: 14,
    paddingVertical: 9,
    ...premiumGlow,
  },
  bookButtonReserved: {
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.3)',
    backgroundColor: 'rgba(177, 18, 38, 0.1)',
    shadowOpacity: 0,
    elevation: 0,
  },
  bookButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    shadowOpacity: 0,
    elevation: 0,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  bookButtonTextReserved: {
    color: premiumColors.redBright,
  },
  spotsText: {
    color: premiumColors.textFaint,
    fontSize: 10,
    fontWeight: '800',
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 22,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 20,
    marginBottom: 24,
  },
  emptyTitle: {
    color: premiumColors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyBody: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
    marginBottom: 14,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: premiumColors.red,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  tabText: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  bookingsList: {
    gap: 10,
    marginBottom: 16,
  },
  bookingCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 20,
    backgroundColor: premiumColors.surface,
    ...premiumShadow,
  },
  bookingRail: {
    width: 4,
  },
  bookingContent: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bookingStatusText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  bookingDate: {
    color: premiumColors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  bookingDescription: {
    color: premiumColors.text,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 5, 8, 0.72)',
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
  modalTitle: {
    color: premiumColors.text,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 6,
  },
  modalMeta: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
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
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
  },
  modalSecondaryText: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '900',
  },
  modalPrimaryButton: {
    flex: 1.4,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: premiumColors.red,
    ...premiumGlow,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
