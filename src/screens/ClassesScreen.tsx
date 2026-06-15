import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumShadow } from '@/constants/premiumTheme';
import { classService } from '@/services';
import type { GymClass } from '@/types';

const categories = [
  'Fitness Classes',
  'Martial Arts',
  'Gymnastics',
  'Extra Classes',
] as const;
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getClassDay(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date(value));
}

function formatClassTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatClassDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function formatClassDuration(startTime: string, endTime: string) {
  const duration = Math.max(
    0,
    Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
  );

  return `${duration} min`;
}

export default function ClassesScreen() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof categories)[number]>('Fitness Classes');
  const [selectedDay, setSelectedDay] = useState('Wednesday');
  const [pendingClassAction, setPendingClassAction] = useState<{
    action: 'cancel' | 'reserve';
    gymClass: GymClass;
  }>();
  const [isLoading, setIsLoading] = useState(true);

  const loadClasses = useCallback(async () => {
    const scheduledClasses = await classService.getScheduledClasses();

    setClasses(scheduledClasses.filter((gymClass) => gymClass.isActive));
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClasses();
    }, [loadClasses]),
  );

  const selectedClasses = useMemo(() => {
    return classes
      .filter(
        (gymClass) =>
          gymClass.location === selectedCategory &&
          getClassDay(gymClass.startTime) === selectedDay,
      )
      .sort((first, second) => first.startTime.localeCompare(second.startTime));
  }, [classes, selectedCategory, selectedDay]);

  const registeredClasses = useMemo(
    () => classes.filter((gymClass) => gymClass.isRegistered),
    [classes],
  );

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
          <ActivityIndicator color={premiumColors.red} />
          <Text style={styles.loadingText}>Loading classes...</Text>
        </View>
      </PremiumScreenBackground>
    );
  }

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>Classes</Text>
          <Text style={styles.heroTitle}>Reserve your next session.</Text>
          <Text style={styles.heroBody}>
            Browse the weekly Marvel Gym schedule by category, day, coach, and time.
          </Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatValue}>{classes.length}</Text>
              <Text style={styles.heroStatLabel}>weekly classes</Text>
            </View>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatValue}>{registeredClasses.length}</Text>
              <Text style={styles.heroStatLabel}>reserved</Text>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryTabs}>
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            const count = classes.filter(
              (gymClass) => gymClass.location === category,
            ).length;

            return (
              <Pressable
                key={category}
                onPress={() => setSelectedCategory(category)}
                style={[
                  styles.categoryTab,
                  isSelected && styles.categoryTabSelected,
                ]}>
                <Text
                  style={[
                    styles.categoryTabText,
                    isSelected && styles.categoryTabTextSelected,
                  ]}>
                  {category}
                </Text>
                <Text
                  style={[
                    styles.categoryCount,
                    isSelected && styles.categoryCountSelected,
                  ]}>
                  {count} classes
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.scheduleCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>{selectedCategory}</Text>
              <Text style={styles.sectionTitle}>{selectedDay} schedule</Text>
            </View>
            <Text style={styles.sectionHint}>{selectedClasses.length} classes</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayTabs}>
            {days.map((day) => {
              const isSelected = selectedDay === day;
              const count = classes.filter(
                (gymClass) =>
                  gymClass.location === selectedCategory &&
                  getClassDay(gymClass.startTime) === day,
              ).length;

              return (
                <Pressable
                  key={day}
                  onPress={() => setSelectedDay(day)}
                  style={[styles.dayTab, isSelected && styles.dayTabSelected]}>
                  <Text
                    style={[
                      styles.dayTabText,
                      isSelected && styles.dayTabTextSelected,
                    ]}>
                    {day.slice(0, 3)}
                  </Text>
                  <Text
                    style={[
                      styles.dayCount,
                      isSelected && styles.dayCountSelected,
                    ]}>
                    {count} classes
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.classList}>
            {selectedClasses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No classes scheduled</Text>
                <Text style={styles.emptyBody}>
                  Choose another day or category to see available sessions.
                </Text>
              </View>
            ) : (
              selectedClasses.map((gymClass) => {
                const isReserved = Boolean(gymClass.isRegistered);
                const isFull = gymClass.status === 'Full' && !isReserved;

                return (
                  <View key={gymClass.id} style={styles.classCard}>
                    <View style={styles.instructorImage}>
                      <Text style={styles.instructorImageText}>
                        {gymClass.instructorName.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.timeRail}>
                      <Text style={styles.classTime}>
                        {formatClassTime(gymClass.startTime)}
                      </Text>
                      <View style={styles.timeDot} />
                    </View>
                    <View style={styles.classBodyBlock}>
                      <View style={styles.classTopRow}>
                        <View style={styles.classTitleBlock}>
                          <Text style={styles.classTitle}>{gymClass.title}</Text>
                          <Text style={styles.classCoach}>
                            Coach {gymClass.instructorName}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.availabilityPill,
                            isReserved && styles.availabilityPillReserved,
                            isFull && styles.availabilityPillFull,
                          ]}>
                          <Text style={styles.availabilityText}>
                            {isReserved ? 'Reserved' : gymClass.status}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.metaRow}>
                        <Text style={styles.metaText}>
                          {formatClassDuration(gymClass.startTime, gymClass.endTime)}
                        </Text>
                        <Text style={styles.metaText}>
                          {gymClass.enrolledCount}/{gymClass.capacity} booked
                        </Text>
                      </View>

                      <Pressable
                        disabled={isFull}
                        onPress={() =>
                          setPendingClassAction({
                            action: isReserved ? 'cancel' : 'reserve',
                            gymClass,
                          })
                        }
                        style={({ pressed }) => [
                          styles.reserveButton,
                          isReserved && styles.cancelButton,
                          isFull && styles.disabledButton,
                          pressed && !isFull && styles.buttonPressed,
                        ]}>
                        <Text
                          style={[
                            styles.reserveButtonText,
                            isReserved && styles.cancelButtonText,
                          ]}>
                          {isReserved ? 'Cancel Reservation' : 'Reserve'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={Boolean(pendingClassAction)} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setPendingClassAction(undefined)}
          />
          <View style={styles.confirmCard}>
            <Text style={styles.cardLabel}>Confirm</Text>
            <Text style={styles.confirmTitle}>
              {pendingClassAction?.action === 'cancel'
                ? 'Cancel reservation?'
                : 'Reserve this class?'}
            </Text>
            {pendingClassAction ? (
              <>
                <Text style={styles.confirmBody}>
                  {pendingClassAction.gymClass.title}
                </Text>
                <Text style={styles.confirmMeta}>
                  {formatClassDateTime(pendingClassAction.gymClass.startTime)}
                </Text>
                <Text style={styles.confirmMeta}>
                  Coach {pendingClassAction.gymClass.instructorName}
                </Text>
              </>
            ) : null}
            <View style={styles.confirmRow}>
              <Pressable
                onPress={() => setPendingClassAction(undefined)}
                style={({ pressed }) => [
                  styles.confirmSecondary,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.confirmSecondaryText}>No</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!pendingClassAction) {
                    return;
                  }

                  if (pendingClassAction.action === 'cancel') {
                    handleCancel(pendingClassAction.gymClass.id);
                    return;
                  }

                  handleReserve(pendingClassAction.gymClass.id);
                }}
                style={({ pressed }) => [
                  styles.confirmPrimary,
                  pressed && styles.buttonPressed,
                ]}>
                <Text style={styles.confirmPrimaryText}>Yes</Text>
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
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 26,
    backgroundColor: 'rgba(18, 20, 28, 0.72)',
    padding: 20,
    marginBottom: 18,
    ...premiumShadow,
  },
  kicker: {
    color: premiumColors.redBright,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: premiumColors.text,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    marginTop: 8,
  },
  heroBody: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 10,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  heroStatPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
    padding: 14,
  },
  heroStatValue: {
    color: premiumColors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: premiumColors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  categoryTabs: {
    gap: 10,
    paddingBottom: 14,
  },
  categoryTab: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 999,
    backgroundColor: premiumColors.surface,
    paddingHorizontal: 15,
  },
  categoryTabSelected: {
    borderColor: premiumColors.red,
    backgroundColor: 'rgba(177, 18, 38, 0.16)',
  },
  categoryTabText: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  categoryTabTextSelected: {
    color: premiumColors.text,
  },
  categoryCount: {
    color: premiumColors.textFaint,
    fontSize: 11,
    fontWeight: '900',
  },
  categoryCountSelected: {
    color: premiumColors.redBright,
  },
  scheduleCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 28,
    backgroundColor: premiumColors.surface,
    padding: 16,
    ...premiumShadow,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  cardLabel: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: premiumColors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  sectionHint: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  dayTabs: {
    gap: 8,
    paddingBottom: 16,
  },
  dayTab: {
    width: 82,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
  },
  dayTabSelected: {
    borderColor: premiumColors.red,
    backgroundColor: premiumColors.red,
  },
  dayTabText: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  dayTabTextSelected: {
    color: '#FFFFFF',
  },
  dayCount: {
    color: premiumColors.textFaint,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 3,
    textAlign: 'center',
  },
  dayCountSelected: {
    color: '#FFFFFF',
  },
  classList: {
    gap: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 22,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 18,
  },
  emptyTitle: {
    color: premiumColors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyBody: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
  classCard: {
    flexDirection: 'row',
    gap: 13,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 24,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 13,
  },
  instructorImage: {
    width: 48,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.borderStrong,
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
  },
  instructorImageText: {
    color: premiumColors.redBright,
    fontSize: 18,
    fontWeight: '900',
  },
  timeRail: {
    width: 56,
    alignItems: 'center',
    gap: 8,
    paddingTop: 3,
  },
  classTime: {
    color: premiumColors.redBright,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  timeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: premiumColors.red,
  },
  classBodyBlock: {
    flex: 1,
  },
  classTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  classTitleBlock: {
    flex: 1,
  },
  classTitle: {
    color: premiumColors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  classCoach: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  availabilityPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  availabilityPillReserved: {
    backgroundColor: 'rgba(177, 18, 38, 0.2)',
  },
  availabilityPillFull: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  availabilityText: {
    color: premiumColors.text,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  metaText: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  reserveButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: premiumColors.red,
    marginTop: 14,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.26)',
    backgroundColor: 'rgba(177, 18, 38, 0.08)',
  },
  disabledButton: {
    opacity: 0.46,
  },
  reserveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  cancelButtonText: {
    color: premiumColors.redBright,
  },
  buttonPressed: {
    opacity: 0.76,
  },
  modalOverlay: {
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
    borderRadius: 26,
    backgroundColor: premiumColors.surface,
    padding: 20,
    ...premiumShadow,
  },
  confirmTitle: {
    color: premiumColors.text,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 4,
  },
  confirmBody: {
    color: premiumColors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 12,
  },
  confirmMeta: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 5,
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
    borderColor: premiumColors.borderStrong,
    borderRadius: 18,
    backgroundColor: premiumColors.surfaceSoft,
  },
  confirmSecondaryText: {
    color: premiumColors.redBright,
    fontSize: 13,
    fontWeight: '900',
  },
  confirmPrimary: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: premiumColors.red,
  },
  confirmPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
