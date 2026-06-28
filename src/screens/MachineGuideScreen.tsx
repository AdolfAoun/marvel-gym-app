import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumShadow, premiumGlow } from '@/constants/premiumTheme';
import { machineGuideService } from '@/services';
import type { MachineGuide } from '@/types';

// ─── Neon palette per muscle group ──────────────────────────────────────────
const MUSCLE_COLORS: Record<string, string> = {
  Chest: '#00D4FF',
  Back: '#9B59FF',
  Shoulders: '#FF8C00',
  Arms: '#00FF88',
  Legs: '#FFD700',
  Core: '#FF2D78',
};

const MUSCLE_TINTS: Record<string, string> = {
  Chest: 'rgba(0,212,255,0.10)',
  Back: 'rgba(155,89,255,0.10)',
  Shoulders: 'rgba(255,140,0,0.10)',
  Arms: 'rgba(0,255,136,0.10)',
  Legs: 'rgba(255,215,0,0.10)',
  Core: 'rgba(255,45,120,0.10)',
};

const MUSCLE_GLOW: Record<string, string> = {
  Chest: 'rgba(0,212,255,0.32)',
  Back: 'rgba(155,89,255,0.32)',
  Shoulders: 'rgba(255,140,0,0.32)',
  Arms: 'rgba(0,255,136,0.32)',
  Legs: 'rgba(255,215,0,0.32)',
  Core: 'rgba(255,45,120,0.32)',
};

// ─── Unsplash image lookup ───────────────────────────────────────────────────
const MACHINE_IMAGES: Record<string, string> = {
  'Leg Extension Machine':
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
  'Leg Press Machine':
    'https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?w=600&q=80',
  'Seated Leg Curl':
    'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=600&q=80',
  'Smith Machine':
    'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600&q=80',
  'Cable Crossover':
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
  'Chest Press Machine':
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80',
  'Lat Pulldown':
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
  'Seated Row Machine':
    'https://images.unsplash.com/photo-1485395578879-6ba080fdddaa?w=600&q=80',
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80';

function getMachineImage(name: string, imageUri?: string): string {
  if (imageUri) return imageUri;
  return MACHINE_IMAGES[name] ?? FALLBACK_IMAGE;
}

// ─── Order ───────────────────────────────────────────────────────────────────
const muscleOrder: MachineGuide['muscleGroup'][] = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function MachineGuideScreen() {
  const [guides, setGuides] = useState<MachineGuide[]>([]);
  const [selectedGroup, setSelectedGroup] =
    useState<MachineGuide['muscleGroup']>('Chest');
  const [selectedGuide, setSelectedGuide] = useState<MachineGuide | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGuides = async () => {
      const nextGuides = await machineGuideService.getMachineGuides();
      const firstAvailableGroup =
        muscleOrder.find((group) =>
          nextGuides.some((guide) => guide.muscleGroup === group),
        ) ?? 'Chest';

      setGuides(nextGuides);
      setSelectedGroup(firstAvailableGroup);
      setIsLoading(false);
    };

    loadGuides();
  }, []);

  const availableGroups = useMemo(() => {
    return muscleOrder.filter((group) =>
      guides.some((guide) => guide.muscleGroup === group),
    );
  }, [guides]);

  const selectedGuides = useMemo(() => {
    return guides.filter((guide) => guide.muscleGroup === selectedGroup);
  }, [guides, selectedGroup]);

  const activeColor = MUSCLE_COLORS[selectedGroup] ?? premiumColors.redBright;
  const activeTint = MUSCLE_TINTS[selectedGroup] ?? 'rgba(177,18,38,0.10)';
  const activeGlow = MUSCLE_GLOW[selectedGroup] ?? premiumColors.redBright;

  const selectedMuscleColor =
    selectedGuide ? (MUSCLE_COLORS[selectedGuide.muscleGroup] ?? premiumColors.redBright) : premiumColors.redBright;
  const selectedMuscleTint =
    selectedGuide ? (MUSCLE_TINTS[selectedGuide.muscleGroup] ?? 'rgba(177,18,38,0.10)') : 'rgba(177,18,38,0.10)';

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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageEyebrow}>MARVEL GYM</Text>
          <Text style={styles.pageTitle}>MACHINE{'\n'}GUIDE</Text>
          <Text style={styles.pageSubtitle}>
            Select a muscle group and tap any machine for setup cues and form tips.
          </Text>
          <View style={styles.headerDivider} />
        </View>

        {/* ── Muscle Group Chips ───────────────────────────────────────── */}
        <View style={styles.chipSectionLabel}>
          <Text style={styles.chipSectionTitle}>Target Muscle Group</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroller}>
          {availableGroups.map((group) => {
            const isSelected = selectedGroup === group;
            const color = MUSCLE_COLORS[group] ?? premiumColors.redBright;
            const tint = MUSCLE_TINTS[group] ?? 'rgba(177,18,38,0.10)';
            const glow = MUSCLE_GLOW[group] ?? 'rgba(177,18,38,0.28)';
            const count = guides.filter((g) => g.muscleGroup === group).length;

            return (
              <Pressable
                key={group}
                onPress={() => setSelectedGroup(group)}
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
                <Text
                  style={[
                    styles.chipLabel,
                    { color: isSelected ? color : premiumColors.textMuted },
                    isSelected && { fontWeight: '900' },
                  ]}>
                  {group}
                </Text>
                <Text
                  style={[
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
        <View style={styles.machinesSectionHeader}>
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

        {/* ── Machines Grid (2 columns) ────────────────────────────────── */}
        <View style={styles.machineGrid}>
          {selectedGuides.map((guide) => {
            const imageUri = getMachineImage(guide.name, guide.imageUri);
            const color = MUSCLE_COLORS[guide.muscleGroup] ?? premiumColors.redBright;
            const tint = MUSCLE_TINTS[guide.muscleGroup] ?? 'rgba(177,18,38,0.10)';
            const glow = MUSCLE_GLOW[guide.muscleGroup] ?? 'rgba(177,18,38,0.28)';

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
                {/* Colored left accent bar */}
                <View style={[styles.cardAccentBar, { backgroundColor: color }]} />

                {/* Machine image */}
                <View style={styles.machineImageContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.machinePhoto}
                    resizeMode="cover"
                  />
                  {/* Gradient overlay */}
                  <LinearGradient
                    colors={['transparent', 'rgba(10,11,15,0.72)']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  {/* Muscle tag */}
                  <View style={[styles.muscleTag, { backgroundColor: tint, borderColor: color }]}>
                    <Text style={[styles.muscleTagText, { color }]}>
                      {guide.muscleGroup}
                    </Text>
                  </View>
                </View>

                {/* Card info */}
                <View style={styles.machineCardBody}>
                  <Text style={styles.machineName} numberOfLines={2}>
                    {guide.name}
                  </Text>
                  <Text style={styles.machineTarget} numberOfLines={1}>
                    {guide.target}
                  </Text>
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
            {/* Close handle */}
            <View style={styles.sheetHandle} />

            {/* Close button */}
            <Pressable
              onPress={() => setSelectedGuide(undefined)}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityLabel="Close machine details">
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Hero image */}
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
                    {/* Neon tint overlay */}
                    <View
                      style={[
                        StyleSheet.absoluteFillObject,
                        { backgroundColor: selectedMuscleTint },
                      ]}
                    />
                  </View>

                  {/* Machine info header */}
                  <View style={styles.modalInfoHeader}>
                    <View
                      style={[
                        styles.modalGroupPill,
                        {
                          backgroundColor: selectedMuscleTint,
                          borderColor: selectedMuscleColor,
                        },
                      ]}>
                      <Text
                        style={[styles.modalGroupPillText, { color: selectedMuscleColor }]}>
                        {selectedGuide.muscleGroup}
                      </Text>
                    </View>

                    <Text style={styles.modalMachineName}>{selectedGuide.name}</Text>

                    <View style={styles.modalTargetRow}>
                      <View
                        style={[styles.targetDot, { backgroundColor: selectedMuscleColor }]}
                      />
                      <Text style={styles.modalTargetText}>
                        Targets: {selectedGuide.target}
                      </Text>
                    </View>
                  </View>

                  {/* Divider */}
                  <View
                    style={[
                      styles.modalDivider,
                      { backgroundColor: selectedMuscleColor, opacity: 0.28 },
                    ]}
                  />

                  {/* Description */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>About</Text>
                    <Text style={styles.modalDescription}>
                      {selectedGuide.description}
                    </Text>
                  </View>

                  {/* Instructions */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>Step-by-Step</Text>
                    <View style={styles.instructionList}>
                      {selectedGuide.instructions.map((step, idx) => (
                        <View key={`${idx}-${step.slice(0, 16)}`} style={styles.instructionRow}>
                          <View
                            style={[
                              styles.stepNumber,
                              { backgroundColor: selectedMuscleTint, borderColor: selectedMuscleColor },
                            ]}>
                            <Text
                              style={[styles.stepNumberText, { color: selectedMuscleColor }]}>
                              {idx + 1}
                            </Text>
                          </View>
                          <Text style={styles.instructionText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Bottom spacer */}
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
  // Loading
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

  // Main scroll
  content: {
    paddingTop: 60,
    paddingBottom: 130,
  },

  // ── Page Header
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
    maxWidth: 280,
  },
  headerDivider: {
    height: 1,
    backgroundColor: premiumColors.border,
    marginTop: 20,
  },

  // ── Chips
  chipSectionLabel: {
    paddingHorizontal: 22,
    marginBottom: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  chipInactive: {
    backgroundColor: premiumColors.surfaceSoft,
    borderColor: premiumColors.border,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chipCount: {
    fontSize: 11,
    fontWeight: '800',
    minWidth: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },

  // ── Machines section header
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

  // ── Machine grid (2 columns)
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
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  muscleTagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
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
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
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

  // ── Modal / Detail sheet
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
