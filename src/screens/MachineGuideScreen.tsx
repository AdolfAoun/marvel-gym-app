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
import { premiumColors, premiumShadow } from '@/constants/premiumTheme';
import { machineGuideService } from '@/services';
import type { MachineGuide } from '@/types';

const accentColor = premiumColors.red;
const wineColor = premiumColors.redBright;
const backgroundColor = premiumColors.background;
const surfaceColor = premiumColors.surface;
const textColor = premiumColors.text;
const mutedColor = premiumColors.textMuted;
const muscleOrder: MachineGuide['muscleGroup'][] = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
];

export default function MachineGuideScreen() {
  const [guides, setGuides] = useState<MachineGuide[]>([]);
  const [selectedGroup, setSelectedGroup] =
    useState<MachineGuide['muscleGroup']>('Chest');
  const [selectedGuide, setSelectedGuide] = useState<MachineGuide>();
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

  if (isLoading) {
    return (
      <PremiumScreenBackground>
        <StatusBar style="light" />
        <View style={styles.loadingState}>
          <ActivityIndicator color={accentColor} />
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
        <View style={styles.heroCard}>
          <View pointerEvents="none" style={styles.heroGlow} />
          <Text style={styles.kicker}>Equipment Guide</Text>
          <Text style={styles.heroTitle}>Machine Guide</Text>
          <Text style={styles.heroBody}>
            Choose a muscle group, then open a machine for setup cues.
          </Text>
          <View style={styles.aiPill}>
            <Text style={styles.aiPillText}>AI Coach Coming Soon</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Muscle groups</Text>
          <View style={styles.categoryGrid}>
            {availableGroups.map((group) => {
              const isSelected = selectedGroup === group;
              const count = guides.filter(
                (guide) => guide.muscleGroup === group,
              ).length;

              return (
                <Pressable
                  key={group}
                  onPress={() => setSelectedGroup(group)}
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                  ]}>
                  <Text
                    style={[
                      styles.categoryTitle,
                      isSelected && styles.categoryTitleSelected,
                    ]}>
                    {group}
                  </Text>
                  <Text
                    style={[
                      styles.categoryCount,
                      isSelected && styles.categoryCountSelected,
                    ]}>
                    {count} machines
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.cardLabel}>Machines</Text>
            <Text style={styles.sectionTitle}>{selectedGroup}</Text>
          </View>
          <Text style={styles.sectionHint}>{selectedGuides.length} available</Text>
        </View>

        <View style={styles.machineGrid}>
          {selectedGuides.map((guide) => (
            <Pressable
              key={guide.id}
              onPress={() => setSelectedGuide(guide)}
              style={({ pressed }) => [
                styles.machineCard,
                pressed && styles.buttonPressed,
              ]}>
              <View style={styles.machineImage}>
                {guide.imageUri ? (
                  <Image
                    source={{ uri: guide.imageUri }}
                    style={styles.machinePhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.machineImageText}>{guide.imageLabel}</Text>
                )}
              </View>
              <Text style={styles.machineName}>{guide.name}</Text>
              <Text style={styles.machineTarget}>{guide.target}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal transparent visible={Boolean(selectedGuide)} animationType="fade">
        <SafeAreaView
          edges={['top', 'right', 'bottom', 'left']}
          style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSelectedGuide(undefined)}
          />
          <View style={styles.detailCard}>
            <Pressable
              onPress={() => setSelectedGuide(undefined)}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.buttonPressed,
              ]}
              accessibilityLabel="Close machine details">
              <Text style={styles.closeButtonText}>X</Text>
            </Pressable>

            <View style={styles.detailTopRow}>
              <View style={styles.detailImage}>
                {selectedGuide?.imageUri ? (
                  <Image
                    source={{ uri: selectedGuide.imageUri }}
                    style={styles.detailPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.detailImageText}>
                    {selectedGuide?.imageLabel}
                  </Text>
                )}
              </View>
              <View style={styles.detailCopy}>
                <Text style={styles.modalKicker}>
                  Muscle Targeted: {selectedGuide?.target}
                </Text>
                <Text style={styles.modalTitle}>{selectedGuide?.name}</Text>
              </View>
            </View>

            <Text style={styles.machineDescription}>
              {selectedGuide?.description}
            </Text>

            <View style={styles.instructionList}>
              {selectedGuide?.instructions.map((instruction) => (
                <View key={instruction} style={styles.instructionRow}>
                  <View style={styles.instructionDot} />
                  <Text style={styles.instructionText}>{instruction}</Text>
                </View>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 42,
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
    borderWidth: 1,
    borderColor: premiumColors.borderStrong,
    borderRadius: 28,
    backgroundColor: premiumColors.surfaceAlt,
    padding: 20,
    marginBottom: 18,
    ...premiumShadow,
  },
  heroGlow: {
    position: 'absolute',
    right: -78,
    top: -82,
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
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 37,
    marginTop: 6,
  },
  heroBody: {
    color: '#FCE7EA',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 10,
  },
  aiPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  aiPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  card: {
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 26,
    backgroundColor: surfaceColor,
    padding: 16,
    marginBottom: 18,
    ...premiumShadow,
  },
  cardLabel: {
    color: accentColor,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    minHeight: 78,
    flexBasis: '30%',
    flexGrow: 1,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.12)',
    borderRadius: 20,
    backgroundColor: premiumColors.surfaceSoft,
    padding: 12,
  },
  categoryCardSelected: {
    borderColor: accentColor,
    backgroundColor: accentColor,
  },
  categoryTitle: {
    color: textColor,
    fontSize: 14,
    fontWeight: '900',
  },
  categoryTitleSelected: {
    color: '#FFFFFF',
  },
  categoryCount: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
  },
  categoryCountSelected: {
    color: '#FCE7EA',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    color: textColor,
    fontSize: 20,
    fontWeight: '900',
  },
  sectionHint: {
    color: mutedColor,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  machineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  machineCard: {
    minHeight: 142,
    flexBasis: '30%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 22,
    backgroundColor: surfaceColor,
    padding: 12,
    ...premiumShadow,
  },
  machineImage: {
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: premiumColors.surfaceSoft,
    marginBottom: 10,
  },
  machineImageText: {
    color: accentColor,
    fontSize: 17,
    fontWeight: '900',
  },
  machinePhoto: {
    width: '100%',
    height: '100%',
  },
  machineName: {
    color: textColor,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  machineTarget: {
    color: mutedColor,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 5,
  },
  buttonPressed: {
    opacity: 0.76,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24, 26, 32, 0.42)',
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  detailCard: {
    position: 'relative',
    width: '100%',
    maxWidth: 430,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: premiumColors.border,
    borderRadius: 28,
    backgroundColor: premiumColors.surface,
    padding: 20,
    ...premiumShadow,
  },
  closeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
    zIndex: 2,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: premiumColors.surfaceSoft,
  },
  closeButtonText: {
    color: wineColor,
    fontSize: 13,
    fontWeight: '900',
  },
  detailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 34,
  },
  detailImage: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: accentColor,
  },
  detailImageText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },
  detailPhoto: {
    width: '100%',
    height: '100%',
  },
  detailCopy: {
    flex: 1,
  },
  modalKicker: {
    color: accentColor,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: textColor,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  machineDescription: {
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 16,
  },
  instructionList: {
    gap: 9,
    marginTop: 14,
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
    color: mutedColor,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
});
