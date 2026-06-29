import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Body, { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumShadow } from '@/constants/premiumTheme';
import { machineGuideService } from '@/services';
import type { MachineGuide } from '@/types';

// ─── Per-muscle neon colors ──────────────────────────────────────────────────
type MuscleGroupKey = MachineGuide['muscleGroup'];

const MUSCLE_COLORS: Record<MuscleGroupKey, string> = {
  'Chest':      '#38BDF8',
  'Upper Back': '#A78BFA',
  'Lower Back': '#7C3AED',
  'Traps':      '#C4B5FD',
  'Shoulders':  '#FB923C',
  'Biceps':     '#34D399',
  'Triceps':    '#10B981',
  'Forearms':   '#6EE7B7',
  'Quads':      '#FCD34D',
  'Hamstrings': '#FBBF24',
  'Calves':     '#F59E0B',
  'Glutes':     '#F97316',
  'Adductors':  '#EF4444',
  'Abs':        '#F472B6',
  'Obliques':   '#EC4899',
};

const MUSCLE_TINTS: Record<MuscleGroupKey, string> = {
  'Chest':      'rgba(56,189,248,0.10)',
  'Upper Back': 'rgba(167,139,250,0.10)',
  'Lower Back': 'rgba(124,58,237,0.10)',
  'Traps':      'rgba(196,181,253,0.10)',
  'Shoulders':  'rgba(251,146,60,0.10)',
  'Biceps':     'rgba(52,211,153,0.10)',
  'Triceps':    'rgba(16,185,129,0.10)',
  'Forearms':   'rgba(110,231,183,0.10)',
  'Quads':      'rgba(252,211,77,0.10)',
  'Hamstrings': 'rgba(251,191,36,0.10)',
  'Calves':     'rgba(245,158,11,0.10)',
  'Glutes':     'rgba(249,115,22,0.10)',
  'Adductors':  'rgba(239,68,68,0.10)',
  'Abs':        'rgba(244,114,182,0.10)',
  'Obliques':   'rgba(236,72,153,0.10)',
};

const MUSCLE_GLOW: Record<MuscleGroupKey, string> = {
  'Chest':      'rgba(56,189,248,0.32)',
  'Upper Back': 'rgba(167,139,250,0.32)',
  'Lower Back': 'rgba(124,58,237,0.32)',
  'Traps':      'rgba(196,181,253,0.32)',
  'Shoulders':  'rgba(251,146,60,0.32)',
  'Biceps':     'rgba(52,211,153,0.32)',
  'Triceps':    'rgba(16,185,129,0.32)',
  'Forearms':   'rgba(110,231,183,0.32)',
  'Quads':      'rgba(252,211,77,0.32)',
  'Hamstrings': 'rgba(251,191,36,0.32)',
  'Calves':     'rgba(245,158,11,0.32)',
  'Glutes':     'rgba(249,115,22,0.32)',
  'Adductors':  'rgba(239,68,68,0.32)',
  'Abs':        'rgba(244,114,182,0.32)',
  'Obliques':   'rgba(236,72,153,0.32)',
};

// ─── Slug ↔ muscle-group mappings (react-native-body-highlighter) ────────────
const SLUG_TO_GROUP: Partial<Record<Slug, MuscleGroupKey>> = {
  'chest':      'Chest',
  'abs':        'Abs',
  'obliques':   'Obliques',
  'lower-back': 'Lower Back',
  'upper-back': 'Upper Back',
  'trapezius':  'Traps',
  'deltoids':   'Shoulders',
  'biceps':     'Biceps',
  'triceps':    'Triceps',
  'forearm':    'Forearms',
  'quadriceps': 'Quads',
  'tibialis':   'Quads',
  'adductors':  'Adductors',
  'hamstring':  'Hamstrings',
  'calves':     'Calves',
  'gluteal':    'Glutes',
};

const GROUP_TO_SLUGS: Record<MuscleGroupKey, Slug[]> = {
  'Chest':      ['chest'],
  'Abs':        ['abs'],
  'Obliques':   ['obliques'],
  'Lower Back': ['lower-back'],
  'Upper Back': ['upper-back'],
  'Traps':      ['trapezius'],
  'Shoulders':  ['deltoids'],
  'Biceps':     ['biceps'],
  'Triceps':    ['triceps'],
  'Forearms':   ['forearm'],
  'Quads':      ['quadriceps', 'tibialis'],
  'Adductors':  ['adductors'],
  'Hamstrings': ['hamstring'],
  'Calves':     ['calves'],
  'Glutes':     ['gluteal'],
};

// Which side each muscle is visible on (drives the auto front/back switch)
const GROUP_SLUGS_BY_SIDE: Record<MuscleGroupKey, { front: Slug[]; back: Slug[] }> = {
  'Chest':      { front: ['chest'],                    back: [] },
  'Abs':        { front: ['abs'],                      back: [] },
  'Obliques':   { front: ['obliques'],                 back: [] },
  'Lower Back': { front: [],                           back: ['lower-back'] },
  'Upper Back': { front: [],                           back: ['upper-back'] },
  'Traps':      { front: [],                           back: ['trapezius'] },
  'Shoulders':  { front: ['deltoids'],                 back: ['deltoids'] },
  'Biceps':     { front: ['biceps'],                   back: [] },
  'Triceps':    { front: [],                           back: ['triceps'] },
  'Forearms':   { front: ['forearm'],                  back: ['forearm'] },
  'Quads':      { front: ['quadriceps', 'tibialis'],   back: [] },
  'Adductors':  { front: ['adductors'],                back: [] },
  'Hamstrings': { front: [],                           back: ['hamstring'] },
  'Calves':     { front: ['calves'],                   back: ['calves'] },
  'Glutes':     { front: [],                           back: ['gluteal'] },
};

const muscleOrder: MuscleGroupKey[] = [
  'Chest', 'Upper Back', 'Lower Back', 'Traps', 'Shoulders',
  'Biceps', 'Triceps', 'Forearms',
  'Quads', 'Hamstrings', 'Calves', 'Glutes', 'Adductors',
  'Abs', 'Obliques',
];

// ─── Machine image lookup ────────────────────────────────────────────────────
const MACHINE_IMAGES: Record<string, string> = {
  'Leg Press':
    'https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?w=600&q=80',
  'Leg Curl':
    'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=600&q=80',
  'Smith Machine Shrug':
    'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&q=80',
  'Lat Pulldown':
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
  'Seated Row':
    'https://images.unsplash.com/photo-1485395578879-6ba080fdddaa?w=600&q=80',
  'Chest Press':
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80',
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80';

function getMachineImage(name: string, imageUri?: string): string {
  if (imageUri) return imageUri;
  return MACHINE_IMAGES[name] ?? FALLBACK_IMAGE;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function MachineGuideScreen() {
  const [guides, setGuides]               = useState<MachineGuide[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroupKey>('Chest');
  const [selectedGuide, setSelectedGuide] = useState<MachineGuide | undefined>();
  const [bodySide, setBodySide]           = useState<'front' | 'back'>('front');
  const [isLoading, setIsLoading]         = useState(true);

  const scrollRef        = useRef<ScrollView>(null);
  const machinesSectionY = useRef(0);

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const nextGuides = await machineGuideService.getMachineGuides();
      const first =
        muscleOrder.find((g) => nextGuides.some((m) => m.muscleGroup === g)) ?? 'Chest';
      setGuides(nextGuides);
      setSelectedGroup(first);
      setIsLoading(false);
    };
    load();
  }, []);

  const availableGroups = useMemo(
    () => muscleOrder.filter((g) => guides.some((m) => m.muscleGroup === g)),
    [guides],
  );

  const selectedGuides = useMemo(
    () => guides.filter((m) => m.muscleGroup === selectedGroup),
    [guides, selectedGroup],
  );

  // Build the highlighter data: selected muscle = bright neon, the rest faded.
  // Every muscle is its own group, so only the tapped one lights up.
  const bodyData = useMemo((): ExtendedBodyPart[] => {
    const parts: ExtendedBodyPart[] = [];
    for (const group of availableGroups) {
      const color = group === selectedGroup
        ? MUSCLE_COLORS[group]
        : 'rgba(255,255,255,0.10)';
      for (const slug of GROUP_TO_SLUGS[group] ?? []) {
        parts.push({ slug, color });
      }
    }
    return parts;
  }, [availableGroups, selectedGroup]);

  // Auto-switch to the side where a muscle is actually visible
  const showMuscleSide = (group: MuscleGroupKey) => {
    const frontSlugs = GROUP_SLUGS_BY_SIDE[group].front;
    const backSlugs  = GROUP_SLUGS_BY_SIDE[group].back;
    if (frontSlugs.length === 0 && backSlugs.length > 0) setBodySide('back');
    if (backSlugs.length === 0 && frontSlugs.length > 0) setBodySide('front');
  };

  // Tap a muscle on the body
  const handleBodyPartPress = (part: ExtendedBodyPart) => {
    if (!part.slug) return;
    const group = SLUG_TO_GROUP[part.slug];
    if (!group || !availableGroups.includes(group)) return;
    setSelectedGroup(group);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showMuscleSide(group);
  };

  // Tap a muscle chip
  const handleChipPress = (group: MuscleGroupKey) => {
    setSelectedGroup(group);
    Haptics.selectionAsync();
    showMuscleSide(group);
  };

  const activeColor = MUSCLE_COLORS[selectedGroup] ?? premiumColors.redBright;
  const activeTint  = MUSCLE_TINTS[selectedGroup]  ?? 'rgba(177,18,38,0.10)';

  const selectedMuscleColor = selectedGuide
    ? (MUSCLE_COLORS[selectedGuide.muscleGroup] ?? premiumColors.redBright)
    : premiumColors.redBright;
  const selectedMuscleTint = selectedGuide
    ? (MUSCLE_TINTS[selectedGuide.muscleGroup] ?? 'rgba(177,18,38,0.10)')
    : 'rgba(177,18,38,0.10)';

  if (isLoading) {
    return (
      <PremiumScreenBackground>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={premiumColors.redBright} size="large" />
          <Text style={styles.loadingText}>Loading machine guide...</Text>
        </View>
      </PremiumScreenBackground>
    );
  }

  return (
    <PremiumScreenBackground>
      <StatusBar style="light" />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageEyebrow}>MARVEL GYM</Text>
          <Text style={styles.pageTitle}>MACHINE{'\n'}GUIDE</Text>
          <Text style={styles.pageSubtitle}>
            Tap a muscle on the body to see the machines that train it.
          </Text>
          <View style={styles.headerDivider} />
        </View>

        {/* ── Interactive Body Map ─────────────────────────────────────── */}
        <View style={styles.bodyMapSection}>

          {/* Front / Back toggle */}
          <View style={styles.viewToggle}>
            {(['front', 'back'] as const).map((side) => {
              const isActive = bodySide === side;
              return (
                <Pressable
                  key={side}
                  onPress={() => { setBodySide(side); Haptics.selectionAsync(); }}
                  style={({ pressed }) => [
                    styles.viewToggleBtn,
                    isActive && styles.viewToggleBtnActive,
                    pressed && { opacity: 0.75 },
                  ]}>
                  <Text style={[styles.viewToggleText, isActive && styles.viewToggleTextActive]}>
                    {side === 'front' ? 'Front' : 'Back'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Anatomical SVG body — each muscle is individually selectable */}
          <Body
            data={bodyData}
            side={bodySide}
            gender="male"
            scale={1.7}
            border="none"
            defaultFill="rgba(255,255,255,0.06)"
            defaultStroke="rgba(255,255,255,0.12)"
            defaultStrokeWidth={0.8}
            onBodyPartPress={handleBodyPartPress}
          />

          {/* Selected muscle info pill */}
          <View style={[styles.bodySelectedPill, {
            backgroundColor: activeTint,
            borderColor: activeColor,
          }]}>
            <View style={[styles.bodySelectedDot, { backgroundColor: activeColor }]} />
            <Text style={[styles.bodySelectedText, { color: activeColor }]}>
              {selectedGroup} · {selectedGuides.length} machine{selectedGuides.length === 1 ? '' : 's'}
            </Text>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: activeColor }]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
              <Text style={styles.legendText}>Other groups</Text>
            </View>
          </View>

          {/* Attribution */}
          <Pressable
            onPress={() => Linking.openURL('https://musclewiki.com')}
            accessibilityRole="link"
            style={({ pressed }) => [styles.creditRow, pressed && { opacity: 0.55 }]}>
            <Text style={styles.creditText}>
              Body map concept inspired by{' '}
              <Text style={styles.creditLink}>MuscleWiki</Text>
            </Text>
          </Pressable>
        </View>

        {/* ── Muscle Chips ─────────────────────────────────────────────── */}
        <View style={styles.chipSectionLabel}>
          <Text style={styles.chipSectionTitle}>Or browse by muscle</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroller}>
          {availableGroups.map((group) => {
            const isSelected = selectedGroup === group;
            const color = MUSCLE_COLORS[group];
            const tint  = MUSCLE_TINTS[group];
            const glow  = MUSCLE_GLOW[group];
            const count = guides.filter((m) => m.muscleGroup === group).length;
            return (
              <Pressable
                key={group}
                onPress={() => handleChipPress(group)}
                style={({ pressed }) => [
                  styles.chip,
                  isSelected && {
                    backgroundColor: tint,
                    borderColor: color,
                    shadowColor: glow,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 14,
                    elevation: 8,
                  },
                  !isSelected && styles.chipInactive,
                  pressed && { opacity: 0.72 },
                ]}>
                <Text style={[
                  styles.chipLabel,
                  { color: isSelected ? color : premiumColors.textMuted },
                  isSelected && { fontWeight: '900' },
                ]}>
                  {group}
                </Text>
                <Text style={[
                  styles.chipCount,
                  { color: isSelected ? color : premiumColors.textFaint },
                ]}>
                  {count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Machines Section Header ──────────────────────────────────── */}
        <View
          style={styles.machinesSectionHeader}
          onLayout={(e) => { machinesSectionY.current = e.nativeEvent.layout.y; }}>
          <View style={[styles.accentBar, { backgroundColor: activeColor }]} />
          <View style={styles.machinesSectionText}>
            <Text style={[styles.machinesSectionEyebrow, { color: activeColor }]}>
              {selectedGroup.toUpperCase()}
            </Text>
            <Text style={styles.machinesSectionTitle}>Machines</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: activeTint, borderColor: activeColor }]}>
            <Text style={[styles.countBadgeText, { color: activeColor }]}>
              {selectedGuides.length}
            </Text>
          </View>
        </View>

        {/* ── Machines Grid ────────────────────────────────────────────── */}
        <View style={styles.machineGrid}>
          {selectedGuides.map((guide) => {
            const imageUri = getMachineImage(guide.name, guide.imageUri);
            const color = MUSCLE_COLORS[guide.muscleGroup] ?? premiumColors.redBright;
            const tint  = MUSCLE_TINTS[guide.muscleGroup]  ?? 'rgba(177,18,38,0.10)';
            const glow  = MUSCLE_GLOW[guide.muscleGroup]   ?? 'rgba(177,18,38,0.28)';
            return (
              <Pressable
                key={guide.id}
                onPress={() => setSelectedGuide(guide)}
                style={({ pressed }) => [
                  styles.machineCard,
                  {
                    shadowColor: glow,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: pressed ? 0.5 : 0.3,
                    shadowRadius: 18,
                    elevation: 8,
                    borderColor: pressed ? color : premiumColors.border,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}>
                <View style={[styles.cardAccentBar, { backgroundColor: color }]} />
                <View style={styles.machineImageContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.machinePhoto}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(10,11,15,0.72)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={[styles.muscleTag, { backgroundColor: tint, borderColor: color }]}>
                    <Text style={[styles.muscleTagText, { color }]}>
                      {guide.muscleGroup}
                    </Text>
                  </View>
                </View>
                <View style={styles.machineCardBody}>
                  <Text style={styles.machineName} numberOfLines={2}>{guide.name}</Text>
                  <Text style={styles.machineTarget} numberOfLines={2}>{guide.target}</Text>
                  <View style={styles.tapHint}>
                    <View style={[styles.tapDot, { backgroundColor: color }]} />
                    <Text style={[styles.tapHintText, { color }]}>View guide</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

      </ScrollView>

      {/* ── Detail Modal ─────────────────────────────────────────────── */}
      <Modal
        transparent
        visible={Boolean(selectedGuide)}
        animationType="slide"
        statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setSelectedGuide(undefined)}
          />
          <View style={styles.detailSheet}>
            <View style={styles.sheetHandle} />
            <Pressable
              onPress={() => setSelectedGuide(undefined)}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}>
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedGuide && (
                <>
                  <View style={styles.modalImageContainer}>
                    <Image
                      source={{ uri: getMachineImage(selectedGuide.name, selectedGuide.imageUri) }}
                      style={styles.modalHeroImage}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(10,11,15,0.92)']}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: selectedMuscleTint }]} />
                  </View>

                  <View style={styles.modalInfoHeader}>
                    <View style={[styles.modalGroupPill, {
                      backgroundColor: selectedMuscleTint,
                      borderColor: selectedMuscleColor,
                    }]}>
                      <Text style={[styles.modalGroupPillText, { color: selectedMuscleColor }]}>
                        {selectedGuide.muscleGroup}
                      </Text>
                    </View>
                    <Text style={styles.modalMachineName}>{selectedGuide.name}</Text>
                    <View style={styles.modalTargetRow}>
                      <View style={[styles.targetDot, { backgroundColor: selectedMuscleColor }]} />
                      <Text style={styles.modalTargetText}>Targets: {selectedGuide.target}</Text>
                    </View>
                  </View>

                  <View style={[styles.modalDivider, {
                    backgroundColor: selectedMuscleColor,
                    opacity: 0.28,
                  }]} />

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>About</Text>
                    <Text style={styles.modalDescription}>{selectedGuide.description}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Step-by-Step</Text>
                    <View style={styles.instructionList}>
                      {selectedGuide.instructions.map((step, idx) => (
                        <View key={`${idx}-${step.slice(0, 16)}`} style={styles.instructionRow}>
                          <View style={[styles.stepNumber, {
                            backgroundColor: selectedMuscleTint,
                            borderColor: selectedMuscleColor,
                          }]}>
                            <Text style={[styles.stepNumberText, { color: selectedMuscleColor }]}>
                              {idx + 1}
                            </Text>
                          </View>
                          <Text style={styles.instructionText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={{ height: 32 }} />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </PremiumScreenBackground>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  content: {
    paddingTop: 60,
    paddingBottom: 130,
  },
  pageHeader: {
    paddingHorizontal: 22,
    marginBottom: 28,
  },
  pageEyebrow: {
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 6,
  },
  pageTitle: {
    color: premiumColors.text,
    fontSize: 44,
    fontWeight: '900',
    fontStyle: 'italic',
    lineHeight: 48,
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  pageSubtitle: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    marginTop: 10,
    maxWidth: 300,
  },
  headerDivider: {
    height: 1,
    backgroundColor: premiumColors.border,
    marginTop: 20,
  },

  // ── Body map
  bodyMapSection: {
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 28,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: premiumColors.border,
    backgroundColor: premiumColors.surfaceSoft,
    marginBottom: 16,
  },
  viewToggleBtn: {
    paddingHorizontal: 26,
    paddingVertical: 9,
    borderRadius: 999,
  },
  viewToggleBtnActive: {
    backgroundColor: premiumColors.redBright,
  },
  viewToggleText: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  bodySelectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  bodySelectedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  bodySelectedText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  legend: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 10,
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
    color: premiumColors.textFaint,
    fontSize: 11,
    fontWeight: '700',
  },
  creditRow: {
    marginTop: 10,
  },
  creditText: {
    color: premiumColors.textFaint,
    fontSize: 11,
    fontWeight: '600',
  },
  creditLink: {
    color: premiumColors.textMuted,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  // ── Chips
  chipSectionLabel: {
    paddingHorizontal: 22,
    marginBottom: 10,
  },
  chipSectionTitle: {
    color: premiumColors.textFaint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  chipsScroller: {
    marginBottom: 28,
  },
  chipsRow: {
    paddingHorizontal: 20,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipInactive: {
    backgroundColor: premiumColors.surfaceSoft,
    borderColor: premiumColors.border,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  chipCount: {
    fontSize: 10,
    fontWeight: '800',
    minWidth: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },

  // ── Machines section
  machinesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    gap: 12,
    marginBottom: 16,
  },
  accentBar: {
    width: 4,
    height: 38,
    borderRadius: 3,
  },
  machinesSectionText: {
    flex: 1,
  },
  machinesSectionEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 2,
  },
  machinesSectionTitle: {
    color: premiumColors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  countBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },

  // ── Machine grid
  machineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 16,
  },
  machineCard: {
    flexBasis: '47%',
    flexGrow: 1,
    maxWidth: '50%',
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: premiumColors.surface,
    overflow: 'hidden',
    ...premiumShadow,
  },
  cardAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    zIndex: 2,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
  },
  machineImageContainer: {
    height: 136,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  machinePhoto: {
    width: '100%',
    height: '100%',
  },
  muscleTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  muscleTagText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  machineCardBody: {
    padding: 12,
    paddingLeft: 16,
  },
  machineName: {
    color: premiumColors.text,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
    marginBottom: 4,
  },
  machineTarget: {
    color: premiumColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    marginBottom: 8,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tapDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  tapHintText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  // ── Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  detailSheet: {
    backgroundColor: '#0E0F14',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderColor: premiumColors.glassBorder,
    maxHeight: '92%',
    paddingBottom: 16,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: premiumColors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: premiumColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  modalImageContainer: {
    height: 220,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    marginTop: 8,
  },
  modalHeroImage: {
    width: '100%',
    height: '100%',
  },
  modalInfoHeader: {
    paddingHorizontal: 22,
    paddingTop: 20,
    gap: 8,
  },
  modalGroupPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  modalGroupPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  modalMachineName: {
    color: premiumColors.text,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  modalTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  modalTargetText: {
    color: premiumColors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    marginHorizontal: 22,
    marginTop: 20,
    marginBottom: 4,
  },
  modalSection: {
    paddingHorizontal: 22,
    paddingTop: 18,
    gap: 10,
  },
  modalSectionLabel: {
    color: premiumColors.textFaint,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  modalDescription: {
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  instructionList: {
    gap: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '900',
  },
  instructionText: {
    flex: 1,
    color: premiumColors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
});
