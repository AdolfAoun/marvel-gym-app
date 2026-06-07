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

import {
  journeyService,
  machineGuideService,
  memberService,
} from '@/services';
import type {
  Achievement,
  AttendanceDay,
  JourneyProfile,
  JourneyStats,
  MachineGuide,
  Member,
} from '@/types';

const accentColor = '#B11226';
const wineColor = '#58111B';
const backgroundColor = '#FFF8F7';
const surfaceColor = '#FFFFFF';
const textColor = '#181A20';
const mutedColor = '#667085';

function formatAttendanceDay(value: string) {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
  }).format(new Date(value));
}

export default function JourneyScreen() {
  const [member, setMember] = useState<Member>();
  const [profile, setProfile] = useState<JourneyProfile>();
  const [biographyDraft, setBiographyDraft] = useState('');
  const [attendanceDays, setAttendanceDays] = useState<AttendanceDay[]>([]);
  const [stats, setStats] = useState<JourneyStats>();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [machineGuides, setMachineGuides] = useState<MachineGuide[]>([]);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadJourney = async () => {
      const [
        currentMember,
        journeyProfile,
        attendance,
        journeyStats,
        nextAchievements,
        guides,
      ] = await Promise.all([
        memberService.getCurrentMember(),
        journeyService.getJourneyProfile(),
        journeyService.getAttendanceDays(),
        journeyService.getJourneyStats(),
        journeyService.getAchievements(),
        machineGuideService.getMachineGuides(),
      ]);

      setMember(currentMember);
      setProfile(journeyProfile);
      setBiographyDraft(journeyProfile.biography);
      setAttendanceDays(attendance);
      setStats(journeyStats);
      setAchievements(nextAchievements);
      setMachineGuides(guides);
      setIsLoading(false);
    };

    loadJourney();
  }, []);

  const unlockedCount = useMemo(
    () => achievements.filter((item) => item.isUnlocked).length,
    [achievements],
  );

  const handleSaveBiography = async () => {
    const nextProfile = await journeyService.updateJourneyProfile({
      biography: biographyDraft.trim(),
    });

    setProfile(nextProfile);
    setBiographyDraft(nextProfile.biography);
    setIsEditingBio(false);
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
            Attendance, progress, achievements, and machine guidance in one
            personal space.
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
              style={styles.bioInput}
            />
          ) : (
            <Text style={styles.bodyText}>{profile.biography}</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>Attendance Calendar</Text>
              <Text style={styles.sectionTitle}>Recent visits</Text>
            </View>
            <Text style={styles.sectionHint}>June</Text>
          </View>

          <View style={styles.calendarGrid}>
            {attendanceDays.map((day) => (
              <View
                key={day.id}
                style={[
                  styles.calendarDay,
                  day.hasVisit && styles.calendarDayActive,
                ]}>
                <Text
                  style={[
                    styles.calendarDayText,
                    day.hasVisit && styles.calendarDayTextActive,
                  ]}>
                  {formatAttendanceDay(day.date)}
                </Text>
              </View>
            ))}
          </View>
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
            <Text style={styles.statValue}>{stats.consecutiveStreak}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </View>
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

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.cardLabel}>How It Works</Text>
              <Text style={styles.sectionTitle}>Machine guide</Text>
            </View>
            <View style={styles.aiPill}>
              <Text style={styles.aiPillText}>AI Coach Coming Soon</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.machineList}>
            {machineGuides.map((machine) => (
              <View key={machine.id} style={styles.machineCard}>
                <View style={styles.machineImage}>
                  <Text style={styles.machineImageText}>{machine.imageLabel}</Text>
                </View>
                <Text style={styles.machineName}>{machine.name}</Text>
                <Text style={styles.machineDescription}>
                  {machine.description}
                </Text>
                <View style={styles.instructionList}>
                  {machine.instructions.map((instruction) => (
                    <View key={instruction} style={styles.instructionRow}>
                      <View style={styles.instructionDot} />
                      <Text style={styles.instructionText}>{instruction}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
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
  bioInput: {
    minHeight: 104,
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
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calendarDay: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.1)',
    borderRadius: 14,
    backgroundColor: '#FFF8F7',
  },
  calendarDayActive: {
    borderColor: accentColor,
    backgroundColor: accentColor,
  },
  calendarDayText: {
    color: '#8E6670',
    fontSize: 12,
    fontWeight: '900',
  },
  calendarDayTextActive: {
    color: '#FFFFFF',
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
  aiPill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#FFF1F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  aiPillText: {
    color: wineColor,
    fontSize: 11,
    fontWeight: '900',
  },
  machineList: {
    gap: 12,
    paddingRight: 4,
  },
  machineCard: {
    width: 246,
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 22,
    backgroundColor: '#FFF8F7',
    padding: 14,
  },
  machineImage: {
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: accentColor,
    marginBottom: 12,
  },
  machineImageText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  machineName: {
    color: textColor,
    fontSize: 16,
    fontWeight: '900',
  },
  machineDescription: {
    color: mutedColor,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 5,
  },
  instructionList: {
    gap: 8,
    marginTop: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  instructionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: accentColor,
    marginTop: 6,
  },
  instructionText: {
    flex: 1,
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  buttonPressed: {
    opacity: 0.76,
  },
});
