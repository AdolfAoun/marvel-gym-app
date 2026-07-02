import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import Body, { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';

import { PremiumScreenBackground } from '@/components/PremiumScreenBackground';
import { premiumColors, premiumShadow } from '@/constants/premiumTheme';
import { machineGuideService } from '@/services';
import type { MachineGuide } from '@/types';

// ─── Muscle taxonomy ─────────────────────────────────────────────────────────
// The body figure is labelled with the *general* muscle name people actually say
// at the gym ("Chest", "Shoulders", "Back", "Biceps"...) — that's the `region`.
// Each region is then broken into its trainable parts in the boxes below the
// figure, using common gym names ("Upper Chest", "Front Delts", "Long Head"...) —
// that's `short` (the chip label) and `label` (the standalone/full name).
// `slug` is the broad anatomical area the body highlighter fills; `key` stays the
// data identity used to match machines.
type MuscleGroupKey = MachineGuide['muscleGroup'];

type MuscleDef = {
  key: MuscleGroupKey;
  region: string; // general name shown on the body figure
  label: string; // full standalone name (machine cards, modal)
  short: string; // compact name shown on the sub-part chips
  slug: string;
  side: 'front' | 'back' | 'both';
  color: string;
};

const MUSCLES: MuscleDef[] = [
  // Chest
  { key: 'Upper Chest',          region: 'Chest',     label: 'Upper Chest',      short: 'Upper',          slug: 'chest',      side: 'front', color: '#38BDF8' },
  { key: 'Middle Chest',         region: 'Chest',     label: 'Middle Chest',     short: 'Middle',         slug: 'chest',      side: 'front', color: '#0EA5E9' },
  { key: 'Lower Chest',          region: 'Chest',     label: 'Lower Chest',      short: 'Lower',          slug: 'chest',      side: 'front', color: '#0284C7' },
  // Back — Lats + Upper Back share one block on the figure, so they're boxed
  // together. Lower Back has its own spot, so it stands alone.
  { key: 'Latissimus Dorsi',     region: 'Back',       label: 'Lats',            short: 'Lats',           slug: 'upper-back', side: 'back',  color: '#9B7FF0' },
  { key: 'Upper Back',           region: 'Back',       label: 'Upper Back',      short: 'Upper Back',     slug: 'upper-back', side: 'back',  color: '#6E4FCF' },
  { key: 'Lower Back',           region: 'Lower Back', label: 'Lower Back',      short: 'Lower Back',     slug: 'lower-back', side: 'back',  color: '#4C2A9E' },
  // Traps
  { key: 'Upper Traps',          region: 'Traps',     label: 'Upper Traps',      short: 'Upper',          slug: 'trapezius',  side: 'back',  color: '#C4B5FD' },
  { key: 'Lower Traps',          region: 'Traps',     label: 'Lower Traps',      short: 'Lower',          slug: 'trapezius',  side: 'back',  color: '#DDD6FE' },
  // Shoulders
  { key: 'Anterior Deltoid',     region: 'Shoulders', label: 'Front Delts',      short: 'Front Delts',    slug: 'deltoids',   side: 'front', color: '#FB923C' },
  { key: 'Lateral Deltoid',      region: 'Shoulders', label: 'Side Delts',       short: 'Side Delts',     slug: 'deltoids',   side: 'both',  color: '#F97316' },
  { key: 'Posterior Deltoid',    region: 'Shoulders', label: 'Rear Delts',       short: 'Rear Delts',     slug: 'deltoids',   side: 'back',  color: '#FDBA74' },
  // Biceps
  { key: 'Bicep Long Head',      region: 'Biceps',    label: 'Biceps Long Head', short: 'Long Head',      slug: 'biceps',     side: 'front', color: '#34D399' },
  { key: 'Bicep Short Head',     region: 'Biceps',    label: 'Biceps Short Head',short: 'Short Head',     slug: 'biceps',     side: 'front', color: '#10B981' },
  { key: 'Brachialis',           region: 'Biceps',    label: 'Brachialis',       short: 'Brachialis',     slug: 'biceps',     side: 'front', color: '#6EE7B7' },
  // Triceps
  { key: 'Tricep Long Head',     region: 'Triceps',   label: 'Triceps Long Head',    short: 'Long Head',    slug: 'triceps',    side: 'back',  color: '#2DD4BF' },
  { key: 'Tricep Lateral Head',  region: 'Triceps',   label: 'Triceps Lateral Head', short: 'Lateral Head', slug: 'triceps',    side: 'back',  color: '#14B8A6' },
  { key: 'Tricep Medial Head',   region: 'Triceps',   label: 'Triceps Medial Head',  short: 'Medial Head',  slug: 'triceps',    side: 'back',  color: '#5EEAD4' },
  // Forearms
  { key: 'Forearm Extensors',    region: 'Forearms',  label: 'Forearm Extensors',short: 'Extensors',      slug: 'forearm',    side: 'both',  color: '#A3E635' },
  { key: 'Forearm Flexors',      region: 'Forearms',  label: 'Forearm Flexors',  short: 'Flexors',        slug: 'forearm',    side: 'both',  color: '#84CC16' },
  // Quads
  { key: 'Vastus Lateralis',     region: 'Quads',     label: 'Outer Quad (Sweep)',   short: 'Outer Sweep',   slug: 'quadriceps', side: 'front', color: '#FCD34D' },
  { key: 'Rectus Femoris',       region: 'Quads',     label: 'Mid Quad',             short: 'Mid Quad',      slug: 'quadriceps', side: 'front', color: '#FDE047' },
  { key: 'Vastus Medialis',      region: 'Quads',     label: 'Inner Quad (Teardrop)',short: 'Inner Teardrop',slug: 'quadriceps', side: 'front', color: '#FBBF24' },
  // Hamstrings
  { key: 'Hamstrings',           region: 'Hamstrings',label: 'Hamstrings',       short: 'Hamstrings',     slug: 'hamstring',  side: 'back',  color: '#F59E0B' },
  // Glutes
  { key: 'Gluteus Maximus',      region: 'Glutes',    label: 'Glute Max',        short: 'Glute Max',      slug: 'gluteal',    side: 'back',  color: '#FB7185' },
  { key: 'Gluteus Medius',       region: 'Glutes',    label: 'Glute Med',        short: 'Glute Med',      slug: 'gluteal',    side: 'back',  color: '#F43F5E' },
  { key: 'Gluteus Minimus',      region: 'Glutes',    label: 'Glute Min',        short: 'Glute Min',      slug: 'gluteal',    side: 'back',  color: '#FDA4AF' },
  // Calves & shin — nobody at the gym says "gastroc / soleus", so both machines
  // just live under one "Calves".
  { key: 'Gastrocnemius',        region: 'Calves',    label: 'Calves',           short: 'Calves',         slug: 'calves',     side: 'both',  color: '#FCA5A5' },
  { key: 'Soleus',               region: 'Calves',    label: 'Calves',           short: 'Calves',         slug: 'calves',     side: 'both',  color: '#FCA5A5' },
  { key: 'Tibialis Anterior',    region: 'Shins',     label: 'Shins',            short: 'Shins',          slug: 'tibialis',   side: 'front', color: '#FECACA' },
  // Core — Abs is one block on the figure, so its parts live in the boxes.
  // Obliques have their own spot on the figure, so they stand alone.
  { key: 'Upper Abs',            region: 'Abs',       label: 'Upper Abs',        short: 'Upper',          slug: 'abs',        side: 'front', color: '#F472B6' },
  { key: 'Lower Abs',            region: 'Abs',       label: 'Lower Abs',        short: 'Lower',          slug: 'abs',        side: 'front', color: '#EC4899' },
  { key: 'Transverse Abdominis', region: 'Abs',       label: 'Deep Core (TVA)',  short: 'Deep Core',      slug: 'abs',        side: 'front', color: '#F9A8D4' },
  { key: 'Obliques',             region: 'Obliques',  label: 'Obliques',         short: 'Obliques',       slug: 'obliques',   side: 'front', color: '#DB2777' },
  // Inner thigh
  { key: 'Adductors',            region: 'Inner Thighs', label: 'Inner Thighs',  short: 'Inner Thighs',   slug: 'adductors',  side: 'front', color: '#EF4444' },
];

const MUSCLE_BY_KEY = Object.fromEntries(
  MUSCLES.map((m) => [m.key, m]),
) as Record<MuscleGroupKey, MuscleDef>;

const muscleOrder: MuscleGroupKey[] = MUSCLES.map((m) => m.key);

// Region → its parts, in table order (used to build the sub-part chip boxes).
const REGION_PARTS: Record<string, MuscleDef[]> = MUSCLES.reduce((acc, m) => {
  (acc[m.region] ??= []).push(m);
  return acc;
}, {} as Record<string, MuscleDef[]>);

// Regions that map to several data entries but are shown as a single unit (no
// boxes) because people don't distinguish the parts by name — e.g. "Calves"
// covers both the gastroc and soleus machines.
const ATOMIC_REGIONS = new Set<string>(['Calves']);

// Colour helpers — derive the tint / glow from each muscle's base colour.
const hexToRgba = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const labelOf = (key: MuscleGroupKey): string =>
  MUSCLE_BY_KEY[key]?.label ?? key;
const regionOf = (key: MuscleGroupKey): string =>
  MUSCLE_BY_KEY[key]?.region ?? key;
const colorOf = (key: MuscleGroupKey): string =>
  MUSCLE_BY_KEY[key]?.color ?? premiumColors.redBright;
const tintOf = (key: MuscleGroupKey): string =>
  hexToRgba(MUSCLE_BY_KEY[key]?.color ?? '#B11226', 0.1);
const glowOf = (key: MuscleGroupKey): string =>
  hexToRgba(MUSCLE_BY_KEY[key]?.color ?? '#B11226', 0.32);
const slugOf = (key: MuscleGroupKey): Slug =>
  (MUSCLE_BY_KEY[key]?.slug ?? 'chest') as Slug;

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
const VIEW_TOGGLE_BUTTON_W = 92;

function getMachineImage(name: string, imageUri?: string): string {
  if (imageUri) return imageUri;
  return MACHINE_IMAGES[name] ?? FALLBACK_IMAGE;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function MachineGuideScreen() {
  const [guides, setGuides]               = useState<MachineGuide[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroupKey>('Upper Chest');
  const [selectedGuide, setSelectedGuide] = useState<MachineGuide | undefined>();
  const [bodySide, setBodySide]           = useState<'front' | 'back'>('front');
  const [isLoading, setIsLoading]         = useState(true);

  const scrollRef        = useRef<ScrollView>(null);
  const machinesSectionY = useRef(0);

  // Front/back body pager. It glides only from the segmented buttons; the
  // mannequin itself stays tap-only for muscle selection.
  const { width: windowW } = useWindowDimensions();
  const bodyPageW          = windowW - 44; // section has 22px horizontal padding each side
  const sideIndex          = bodySide === 'front' ? 0 : 1;

  const translateX    = useRef(new Animated.Value(0)).current;
  const togglePillX   = useRef(new Animated.Value(0)).current;
  const committedX    = useRef(0); // current settled offset (0 or -bodyPageW)
  const bodySideRef   = useRef(bodySide);
  bodySideRef.current = bodySide;
  const sideIndexRef  = useRef(sideIndex);
  sideIndexRef.current = sideIndex;
  const toggleDragStartX = useRef(0);

  const animateToIndex = (index: number) => {
    const to = -index * bodyPageW;
    committedX.current = to;
    Animated.spring(translateX, {
      toValue: to,
      useNativeDriver: true,
      speed: 16,
      bounciness: 4,
    }).start();
  };

  // Keep the pager aligned with the active side when it changes via tap/toggle
  useEffect(() => {
    animateToIndex(sideIndex);
    Animated.spring(togglePillX, {
      toValue: sideIndex * VIEW_TOGGLE_BUTTON_W,
      useNativeDriver: false,
      speed: 18,
      bounciness: 5,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sideIndex, bodyPageW]);

  const togglePanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        toggleDragStartX.current = sideIndexRef.current * VIEW_TOGGLE_BUTTON_W;
      },
      onPanResponderMove: (_event, gesture) => {
        const next = Math.max(
          0,
          Math.min(VIEW_TOGGLE_BUTTON_W, toggleDragStartX.current + gesture.dx),
        );
        togglePillX.setValue(next);
      },
      onPanResponderRelease: (_event, gesture) => {
        const next = toggleDragStartX.current + gesture.dx;
        const targetIndex = next > VIEW_TOGGLE_BUTTON_W / 2 ? 1 : 0;
        const nextSide = targetIndex === 0 ? 'front' : 'back';

        if (nextSide !== bodySideRef.current) {
          setBodySide(nextSide);
          Haptics.selectionAsync();
          return;
        }

        Animated.spring(togglePillX, {
          toValue: sideIndexRef.current * VIEW_TOGGLE_BUTTON_W,
          useNativeDriver: false,
          speed: 18,
          bounciness: 5,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(togglePillX, {
          toValue: sideIndexRef.current * VIEW_TOGGLE_BUTTON_W,
          useNativeDriver: false,
          speed: 18,
          bounciness: 5,
        }).start();
      },
    }),
  ).current;

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const nextGuides = await machineGuideService.getMachineGuides();
      const first =
        muscleOrder.find((g) => nextGuides.some((m) => m.muscleGroup === g)) ?? muscleOrder[0];
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

  // The parts (boxes) that belong to the currently selected region. A region with
  // only one part (e.g. Hamstrings) — or an "atomic" region like Calves — has no
  // meaningful sub-division, so we hide the boxes and show every machine in it.
  const selectedRegion = regionOf(selectedGroup);
  const regionParts = REGION_PARTS[selectedRegion] ?? [];
  const showRegionParts = regionParts.length > 1 && !ATOMIC_REGIONS.has(selectedRegion);

  const selectedGuides = useMemo(
    () =>
      showRegionParts
        ? guides.filter((m) => m.muscleGroup === selectedGroup)
        : guides.filter((m) => regionOf(m.muscleGroup) === selectedRegion),
    [guides, selectedGroup, selectedRegion, showRegionParts],
  );

  // Count machines per head so the sub-part boxes can show a badge / disable
  // parts that have nothing to train yet.
  const countByGroup = useMemo(() => {
    const counts = {} as Record<MuscleGroupKey, number>;
    for (const g of guides) counts[g.muscleGroup] = (counts[g.muscleGroup] ?? 0) + 1;
    return counts;
  }, [guides]);

  // Build the highlighter data: the selected muscle's region = bright neon, every
  // other trained region = faded. Slugs are de-duped so heads that share a region
  // (e.g. the three triceps heads) never fight over the same silhouette.
  const bodyData = useMemo((): ExtendedBodyPart[] => {
    const selectedSlug = slugOf(selectedGroup);
    const slugs = new Set(availableGroups.map(slugOf));
    return [...slugs].map((slug) => ({
      slug,
      color: slug === selectedSlug
        ? colorOf(selectedGroup)
        : 'rgba(255,255,255,0.10)',
    }));
  }, [availableGroups, selectedGroup]);

  // Auto-switch to the side where a muscle is actually visible
  const showMuscleSide = (group: MuscleGroupKey) => {
    const side = MUSCLE_BY_KEY[group]?.side;
    if (side === 'front' || side === 'back') setBodySide(side);
  };

  // Tap a region on the body → select the first trained head in that region
  const handleBodyPartPress = (part: ExtendedBodyPart) => {
    if (!part.slug) return;
    const group = availableGroups.find((g) => slugOf(g) === part.slug);
    if (!group) return;
    setSelectedGroup(group);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showMuscleSide(group);
  };

  // Tap a sub-part box → focus that specific head and glide to the side it shows on
  const handlePartPress = (group: MuscleGroupKey) => {
    setSelectedGroup(group);
    Haptics.selectionAsync();
    showMuscleSide(group);
  };

  const activeColor = colorOf(selectedGroup);
  const activeTint  = tintOf(selectedGroup);

  const selectedMuscleColor = selectedGuide
    ? colorOf(selectedGuide.muscleGroup)
    : premiumColors.redBright;
  const selectedMuscleTint = selectedGuide
    ? tintOf(selectedGuide.muscleGroup)
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
          <View style={styles.viewToggle} {...togglePanResponder.panHandlers}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.viewToggleGlide,
                { transform: [{ translateX: togglePillX }] },
              ]}>
              {/* Red sits on the outer edge and fades to black toward the
                  centre — so it mirrors when the pill is on the Back side. */}
              <LinearGradient
                colors={
                  bodySide === 'front'
                    ? ['#FF2638', '#B11226', '#2A0308']
                    : ['#2A0308', '#B11226', '#FF2638']
                }
                locations={bodySide === 'front' ? [0, 0.58, 1] : [0, 0.42, 1]}
                start={{ x: 0.08, y: 0 }}
                end={{ x: 0.92, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            {(['front', 'back'] as const).map((side) => {
              const isActive = bodySide === side;
              return (
                <Pressable
                  key={side}
                  onPress={() => { setBodySide(side); Haptics.selectionAsync(); }}
                  style={({ pressed }) => [
                    styles.viewToggleBtn,
                    side === 'front' ? styles.viewToggleBtnLeft : styles.viewToggleBtnRight,
                    pressed && { opacity: 0.75 },
                  ]}>
                  <Text style={[styles.viewToggleText, isActive && styles.viewToggleTextActive]}>
                    {side === 'front' ? 'Front' : 'Back'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Selected muscle — clean label, top-left under the toggle */}
          <View style={styles.selectedMuscleHeader}>
            <View style={styles.selectedMuscleRow}>
              <View style={[styles.selectedMuscleDot, { backgroundColor: activeColor }]} />
              <Text style={[styles.selectedMuscleName, { color: activeColor }]}>
                {selectedRegion}
              </Text>
            </View>
            <Text style={styles.selectedMuscleMeta}>
              {showRegionParts
                ? `${labelOf(selectedGroup)} · ${selectedGuides.length} machine${selectedGuides.length === 1 ? '' : 's'}`
                : `${selectedGuides.length} machine${selectedGuides.length === 1 ? '' : 's'}`}
            </Text>
          </View>

          {/* Anatomical body — button-controlled front ⇄ back glide */}
          <View
            style={{ width: bodyPageW, alignSelf: 'center', overflow: 'hidden' }}>
            <Animated.View
              style={{
                flexDirection: 'row',
                width: bodyPageW * 2,
                transform: [{ translateX }],
              }}>
              {(['front', 'back'] as const).map((side) => (
                <View key={side} style={[styles.bodyPage, { width: bodyPageW }]}>
                  <Body
                    data={bodyData}
                    side={side}
                    gender="male"
                    scale={1.7}
                    border="none"
                    defaultFill="rgba(255,255,255,0.06)"
                    defaultStroke="rgba(255,255,255,0.12)"
                    defaultStrokeWidth={0.8}
                    onBodyPartPress={handleBodyPartPress}
                  />
                </View>
              ))}
            </Animated.View>
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

        {/* ── Sub-part boxes ──────────────────────────────────────────────
            The figure shows the general muscle (e.g. "Chest"); these boxes
            break it into the parts people actually train (Upper / Middle /
            Lower), using common gym names. */}
        {showRegionParts && (
          <View style={styles.partsSection}>
            <Text style={styles.partsSectionTitle}>
              {selectedRegion.toUpperCase()} · PICK A PART
            </Text>
            <View style={styles.partsRow}>
              {regionParts.map((part) => {
                const isActive = part.key === selectedGroup;
                const count = countByGroup[part.key] ?? 0;
                const disabled = count === 0;
                return (
                  <Pressable
                    key={part.key}
                    disabled={disabled}
                    onPress={() => handlePartPress(part.key)}
                    style={[
                      styles.partChip,
                      isActive
                        ? { backgroundColor: hexToRgba(part.color, 0.16), borderColor: part.color }
                        : styles.partChipInactive,
                      disabled && styles.partChipDisabled,
                    ]}>
                    <View style={[styles.partChipDot, { backgroundColor: part.color }]} />
                    <Text
                      style={[
                        styles.partChipLabel,
                        { color: isActive ? part.color : premiumColors.textMuted },
                      ]}>
                      {part.short}
                    </Text>
                    {count > 0 && (
                      <Text
                        style={[
                          styles.partChipCount,
                          isActive && { color: part.color },
                        ]}>
                        {count}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Machines Section Header ──────────────────────────────────── */}
        <View
          style={styles.machinesSectionHeader}
          onLayout={(e) => { machinesSectionY.current = e.nativeEvent.layout.y; }}>
          <View style={[styles.accentBar, { backgroundColor: activeColor }]} />
          <View style={styles.machinesSectionText}>
            <Text style={[styles.machinesSectionEyebrow, { color: activeColor }]}>
              {labelOf(selectedGroup).toUpperCase()}
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
            const color = colorOf(guide.muscleGroup);
            const tint  = tintOf(guide.muscleGroup);
            const glow  = glowOf(guide.muscleGroup);
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
                      {labelOf(guide.muscleGroup)}
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
                        {labelOf(selectedGuide.muscleGroup)}
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
    paddingTop: 86,
    paddingBottom: 130,
  },
  pageHeader: {
    alignItems: 'center',
    paddingHorizontal: 22,
    marginBottom: 28,
  },
  pageEyebrow: {
    alignSelf: 'center',
    color: premiumColors.redBright,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 6,
    textAlign: 'center',
  },
  pageTitle: {
    color: premiumColors.text,
    fontSize: 44,
    fontWeight: '900',
    fontStyle: 'italic',
    lineHeight: 48,
    letterSpacing: -1,
    textAlign: 'center',
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
    textAlign: 'center',
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
    gap: 0,
    borderRadius: 999,
    marginBottom: 16,
    overflow: 'visible',
  },
  viewToggleGlide: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: VIEW_TOGGLE_BUTTON_W,
    overflow: 'hidden',
    borderRadius: 999,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 6,
  },
  viewToggleBtn: {
    position: 'relative',
    overflow: 'hidden',
    width: VIEW_TOGGLE_BUTTON_W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    zIndex: 2,
  },
  // Inner edge (towards the centre) is a straight line; the outer edge stays round
  viewToggleBtnLeft: {
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  viewToggleBtnRight: {
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  selectedMuscleHeader: {
    alignSelf: 'stretch',
    marginTop: 16,
    marginBottom: 4,
  },
  selectedMuscleEyebrow: {
    color: premiumColors.textFaint,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 6,
  },
  selectedMuscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  selectedMuscleDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  selectedMuscleName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  selectedMuscleMeta: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  bodyPage: {
    alignItems: 'center',
    justifyContent: 'center',
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

  // ── Sub-part boxes (region → parts)
  partsSection: {
    paddingHorizontal: 22,
    marginBottom: 28,
  },
  partsSectionTitle: {
    color: premiumColors.textFaint,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
  },
  partsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  partChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  partChipInactive: {
    backgroundColor: premiumColors.surfaceSoft,
    borderColor: premiumColors.border,
  },
  partChipDisabled: {
    opacity: 0.4,
  },
  partChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  partChipLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  partChipCount: {
    fontSize: 10,
    fontWeight: '900',
    color: premiumColors.textFaint,
    minWidth: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
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
  chipGroupsContainer: {
    paddingHorizontal: 20,
    marginBottom: 28,
    gap: 18,
  },
  chipGroup: {
    gap: 8,
  },
  chipGroupHeader: {
    color: premiumColors.textFaint,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  chipGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
