import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { journeyService, memberService } from '@/services';
import type {
  Achievement,
  AttendanceDay,
  JourneyProfile,
  JourneyStats,
  Member,
} from '@/types';

const accentColor = '#B11226';
const wineColor = '#58111B';
const backgroundColor = '#FFF8F7';
const surfaceColor = '#FFFFFF';
const textColor = '#181A20';
const mutedColor = '#667085';

type TimerState = 'idle' | 'running' | 'paused';

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

export default function JourneyScreen() {
  const router = useRouter();
  const [member, setMember] = useState<Member>();
  const [profile, setProfile] = useState<JourneyProfile>();
  const [biographyDraft, setBiographyDraft] = useState('');
  const [attendanceDays, setAttendanceDays] = useState<AttendanceDay[]>([]);
  const [stats, setStats] = useState<JourneyStats>();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(new Date().getMonth());
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastCalories, setLastCalories] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadJourney = async () => {
      const [
        currentMember,
        journeyProfile,
        attendance,
        journeyStats,
        nextAchievements,
      ] = await Promise.all([
        memberService.getCurrentMember(),
        journeyService.getJourneyProfile(),
        journeyService.getAttendanceDays(),
        journeyService.getJourneyStats(),
        journeyService.getAchievements(),
      ]);

      setMember(currentMember);
      setProfile(journeyProfile);
      setBiographyDraft(journeyProfile.biography);
      setAttendanceDays(attendance);
      setStats(journeyStats);
      setAchievements(nextAchievements);
      setIsLoading(false);
    };

    loadJourney();
  }, []);

  useEffect(() => {
    if (timerState !== 'running') {
      return undefined;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

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

  const refreshStats = async () => {
    const nextStats = await journeyService.getJourneyStats();

    setStats(nextStats);
  };

  const handleSaveBiography = async () => {
    const nextProfile = await journeyService.updateJourneyProfile({
      biography: biographyDraft.trim(),
    });

    setProfile(nextProfile);
    setBiographyDraft(nextProfile.biography);
    setIsEditingBio(false);
  };

  const handleToggleVisit = async (date: string) => {
    const nextAttendance = await journeyService.toggleAttendanceDay(date);

    setAttendanceDays(nextAttendance);
    await refreshStats();
  };

  const handleStartTimer = () => {
    if (timerState === 'idle') {
      setElapsedSeconds(0);
      setLastCalories(0);
    }

    setTimerState('running');
  };

  const handleEndWorkout = async () => {
    if (elapsedSeconds <= 0) {
      setTimerState('idle');
      return;
    }

    const session = await journeyService.completeWorkoutSession(elapsedSeconds);

    setLastCalories(session.estimatedCaloriesBurned);
    setTimerState('idle');
    setElapsedSeconds(0);
    await refreshStats();
  };

  if (isLoading || !profile || !stats) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
          <Text style={styles.loadingText}>Loading journey...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <Text style={styles.kicker}>Journey</Text>
          <Text style={styles.heroTitle}>
            {member?.firstName ?? 'Member'}'s fitness dashboard
          </Text>
          <Text style={styles.heroBody}>
            Track visits, measure consistency, and time lightweight workouts.
          </Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatValue}>{stats.visitsThisMonth}</Text>
              <Text style={styles.heroStatLabel}>month visits</Text>
            </View>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatValue}>{unlockedCount}</Text>
              <Text style={styles.heroStatLabel}>badges</Text>
            </View>
          </View>
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
              onPress={() => setTimerState('paused')}
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
              Last workout estimate: {lastCalories} calories burned.
            </Text>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.averageWorkoutDuration}</Text>
            <Text style={styles.statLabel}>Avg workout</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.visitsThisMonth}</Text>
            <Text style={styles.statLabel}>Visits this month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.visitsThisYear}</Text>
            <Text style={styles.statLabel}>Visits this year</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.estimatedCaloriesBurned}</Text>
            <Text style={styles.statLabel}>Avg calories burned</Text>
          </View>
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
                    onPress={() => handleToggleVisit(day.date)}
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
              <Text style={styles.cardLabel}>Achievements</Text>
              <Text style={styles.sectionTitle}>Milestones</Text>
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

        <Pressable
          onPress={() => router.push('/machine-guide')}
          style={({ pressed }) => [
            styles.machineGuideButton,
            pressed && styles.buttonPressed,
          ]}>
          <View>
            <Text style={styles.cardLabel}>How It Works</Text>
            <Text style={styles.machineGuideTitle}>Open Machine Guide</Text>
            <Text style={styles.machineGuideBody}>
              Equipment setup by muscle target. AI Coach Coming Soon.
            </Text>
          </View>
          <Text style={styles.machineGuideArrow}>Go</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>About Me</Text>
              <Text style={styles.sectionTitle}>Training note</Text>
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
              placeholder="Write a short training biography"
              placeholderTextColor="#9AA3AF"
              selectionColor={accentColor}
              style={styles.planInput}
            />
          ) : (
            <Text style={styles.bodyText}>{profile.biography}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 108,
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
    borderRadius: 28,
    backgroundColor: accentColor,
    padding: 20,
    marginBottom: 16,
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 26,
    elevation: 7,
  },
  heroGlow: {
    position: 'absolute',
    right: -84,
    top: -84,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  kicker: {
    color: '#F7D6DC',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 35,
    marginTop: 6,
  },
  heroBody: {
    color: '#FCE7EA',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
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
    fontSize: 22,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: '#FCE7EA',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 26,
    backgroundColor: surfaceColor,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  timerCard: {
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 28,
    backgroundColor: surfaceColor,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
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
    color: '#8E6670',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  timerFace: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: '#FFF8F7',
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
    backgroundColor: '#FFFFFF',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    minHeight: 102,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 22,
    backgroundColor: surfaceColor,
    padding: 15,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  statValue: {
    color: textColor,
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
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
    borderColor: 'rgba(177, 18, 38, 0.18)',
    borderRadius: 999,
    backgroundColor: '#FFF1F3',
    paddingHorizontal: 16,
  },
  smallButtonText: {
    color: wineColor,
    fontSize: 12,
    fontWeight: '900',
  },
  bodyText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  planInput: {
    minHeight: 136,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.18)',
    borderRadius: 18,
    backgroundColor: '#FFF8F7',
    color: textColor,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    padding: 14,
    textAlignVertical: 'top',
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
    backgroundColor: '#FFF8F7',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  monthArrowButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFF8F7',
  },
  calendarDayActive: {
    borderColor: accentColor,
    backgroundColor: accentColor,
  },
  calendarDayText: {
    color: '#8E6670',
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
    backgroundColor: '#FFF8F7',
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
    backgroundColor: '#E6E8EC',
  },
  achievementIconUnlocked: {
    backgroundColor: accentColor,
  },
  achievementIconText: {
    color: '#8B95A5',
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
  machineGuideButton: {
    minHeight: 124,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 26,
    backgroundColor: surfaceColor,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#1D0A0D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  machineGuideTitle: {
    color: textColor,
    fontSize: 19,
    fontWeight: '900',
  },
  machineGuideBody: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 250,
  },
  machineGuideArrow: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: accentColor,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonPressed: {
    opacity: 0.76,
  },
});
