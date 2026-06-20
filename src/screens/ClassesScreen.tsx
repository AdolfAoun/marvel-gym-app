import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';
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

import { LinearGradient } from 'expo-linear-gradient';
import { GlowingChips } from '@/components/GlowingChips';
import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { MarvelMarks } from '@/components/PremiumUI';
import {
  premiumColors,
  premiumGradients,
  premiumShadow,
} from '@/constants/premiumTheme';
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

function formatClassDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
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
  const [searchQuery, setSearchQuery] = useState('');
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
          gymClass.category === selectedCategory &&
          getClassDay(gymClass.startTime) === selectedDay,
      )
      .sort((first, second) => first.startTime.localeCompare(second.startTime));
  }, [classes, selectedCategory, selectedDay]);

  const registeredClasses = useMemo(
    () => classes.filter((gymClass) => gymClass.isRegistered),
    [classes],
  );

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) {
      return [];
    }

    return classes
      .filter(
        (gymClass) =>
          gymClass.title.toLowerCase().includes(trimmedQuery) ||
          gymClass.instructorName.toLowerCase().includes(trimmedQuery),
      )
      .sort((first, second) => first.startTime.localeCompare(second.startTime));
  }, [classes, isSearching, trimmedQuery]);

  const displayedClasses = isSearching ? searchResults : selectedClasses;

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
        <LinearGradient
          colors={premiumGradients.redPanel}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGloss} />
          <MarvelMarks variant="corner" color="#FFFFFF" />
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
        </LinearGradient>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search classes by name"
            placeholderTextColor={premiumColors.textFaint}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              hitSlop={10}
              onPress={() => setSearchQuery('')}
              style={({ pressed }) => [
                styles.searchClear,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.searchClearText}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {isSearching ? (
          <View style={styles.sectionHeading}>
            <View style={styles.accentBar} />
            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionEyebrow}>Search</Text>
              <Text style={styles.sectionHeadingTitle}>Matching classes</Text>
            </View>
            <Text style={styles.sectionHint}>{searchResults.length} found</Text>
          </View>
        ) : null}

        {!isSearching ? (
        <>
        <View style={styles.selectorRow}>
          <GlowingChips
            items={categories.map((category) => ({
              key: category,
              label: category,
              sublabel: `${classes.filter((gymClass) => gymClass.category === category).length} classes`,
            }))}
            selectedKey={selectedCategory}
            onSelect={(key) =>
              setSelectedCategory(key as (typeof categories)[number])
            }
          />
        </View>

        <View style={styles.sectionHeading}>
          <View style={styles.accentBar} />
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionEyebrow}>{selectedCategory}</Text>
            <Text style={styles.sectionHeadingTitle}>{selectedDay} schedule</Text>
          </View>
          <Text style={styles.sectionHint}>{selectedClasses.length} classes</Text>
        </View>

        <View style={styles.selectorRow}>
          <GlowingChips
            items={days.map((day) => ({
              key: day,
              label: day.slice(0, 3),
              sublabel: `${classes.filter(
                (gymClass) =>
                  gymClass.category === selectedCategory &&
                  getClassDay(gymClass.startTime) === day,
              ).length} classes`,
            }))}
            selectedKey={selectedDay}
            onSelect={setSelectedDay}
          />
        </View>
        </>
        ) : null}

          <View style={styles.classList}>
            {displayedClasses.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  {isSearching ? 'No matching classes' : 'No classes scheduled'}
                </Text>
                <Text style={styles.emptyBody}>
                  {isSearching
                    ? 'Try a different class name or coach.'
                    : 'Choose another day or category to see available sessions.'}
                </Text>
              </View>
            ) : (
              displayedClasses.map((gymClass) => {
                const isReserved = Boolean(gymClass.isRegistered);
                const isFull = gymClass.status === 'Full' && !isReserved;

                return (
                  <View key={gymClass.id} style={styles.classCard}>
                    <View style={styles.instructorImage}>
                      {gymClass.instructorImageUrl ? (
                        <Image
                          source={{ uri: gymClass.instructorImageUrl }}
                          style={styles.instructorPhoto}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.instructorImageText}>
                          {gymClass.instructorName.slice(0, 1).toUpperCase()}
                        </Text>
                      )}
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

                      <View style={styles.classTimeCard}>
                        <Text style={styles.classTimePrimary}>
                          {formatClassTime(gymClass.startTime)}
                        </Text>
                        <Text style={styles.classTimeSecondary}>
                          {formatClassDate(gymClass.startTime)} · {formatClassDuration(gymClass.startTime, gymClass.endTime)}
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
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 26,
    padding: 22,
    marginBottom: 18,
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
    lineHeight: 36,
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroBody: {
    color: 'rgba(255, 255, 255, 0.86)',
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
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    padding: 14,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 46, 0.28)',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: premiumColors.red,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
  searchIcon: {
    color: premiumColors.redBright,
    fontSize: 20,
    fontWeight: '900',
  },
  searchInput: {
    flex: 1,
    color: premiumColors.text,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 12,
  },
  searchClear: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchClearText: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  selectorRow: {
    marginBottom: 16,
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
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
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
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
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
    alignItems: 'center',
    gap: 15,
    borderWidth: 1,
    borderColor: premiumColors.glassBorder,
    borderRadius: 24,
    backgroundColor: premiumColors.surface,
    padding: 14,
    ...premiumShadow,
  },
  instructorImage: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(225, 29, 46, 0.55)',
    borderRadius: 22,
    backgroundColor: premiumColors.surfaceSoft,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 5,
  },
  instructorPhoto: {
    width: '100%',
    height: '100%',
  },
  instructorImageText: {
    color: premiumColors.redBright,
    fontSize: 26,
    fontWeight: '900',
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
  classTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.055)',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  classTimePrimary: {
    color: premiumColors.redBright,
    fontSize: 15,
    fontWeight: '900',
  },
  classTimeSecondary: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  reserveButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 16,
    backgroundColor: premiumColors.red,
    marginTop: 14,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 5,
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
