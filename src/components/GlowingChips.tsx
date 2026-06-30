import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { premiumColors } from '@/constants/premiumTheme';

export type GlowingChipItem = {
  key: string;
  label: string;
  sublabel?: string;
  dotColor?: string;
  trailingLabel?: string;
};

type ChipLayout = {
  x: number;
  width: number;
};

type GlowingChipsProps = {
  items: GlowingChipItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
  /**
   * `scroll` keeps chips compact in a horizontal rail (e.g. day selector).
   * `segment` spreads chips evenly across the full width (e.g. Low/High sort)
   * and supports swiping/dragging left-right to change the selection.
   */
  variant?: 'scroll' | 'segment';
  style?: StyleProp<ViewStyle>;
  chipStyle?: StyleProp<ViewStyle>;
  unselectedChipStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  /** Fill color of the gliding selection pill. Defaults to the red accent. */
  indicatorColor?: string;
  /** Border/glow color of the selection pill. Defaults to the bright red accent. */
  indicatorGlowColor?: string;
};

/**
 * Pill selector whose subtle red glow indicator glides smoothly to the selected
 * chip instead of disappearing and reappearing. Used across Home, Classes and
 * Shop so every selectable rail feels consistent and premium. The `segment`
 * variant can also be swiped left/right, not only tapped.
 */
export function GlowingChips({
  items,
  selectedKey,
  onSelect,
  variant = 'scroll',
  style,
  chipStyle,
  unselectedChipStyle,
  labelStyle,
  indicatorColor = premiumColors.red,
  indicatorGlowColor = premiumColors.redBright,
}: GlowingChipsProps) {
  const [layouts, setLayouts] = useState<Record<string, ChipLayout>>({});
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const hasPositioned = useRef(false);

  const isSegment = variant === 'segment';

  // Live refs for the pan handler (PanResponder is created once).
  const rowWidthRef = useRef(0);
  const rowLeftRef = useRef(0);
  const itemsRef = useRef(items);
  const selectedRef = useRef(selectedKey);
  const onSelectRef = useRef(onSelect);

  itemsRef.current = items;
  selectedRef.current = selectedKey;
  onSelectRef.current = onSelect;

  useEffect(() => {
    const layout = layouts[selectedKey];

    if (!layout) {
      return;
    }

    if (!hasPositioned.current) {
      indicatorX.setValue(layout.x);
      indicatorWidth.setValue(layout.width);
      hasPositioned.current = true;
      return;
    }

    Animated.parallel([
      Animated.timing(indicatorX, {
        toValue: layout.x,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(indicatorWidth, {
        toValue: layout.width,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [selectedKey, layouts, indicatorX, indicatorWidth]);

  const handleChipLayout = (key: string) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;

    setLayouts((previous) => {
      const existing = previous[key];

      if (existing && existing.x === x && existing.width === width) {
        return previous;
      }

      return { ...previous, [key]: { x, width } };
    });
  };

  const selectByAbsoluteX = (absoluteX: number) => {
    const currentItems = itemsRef.current;

    if (currentItems.length === 0 || rowWidthRef.current <= 0) {
      return;
    }

    const localX = absoluteX - rowLeftRef.current;
    const segmentWidth = rowWidthRef.current / currentItems.length;
    const index = Math.min(
      currentItems.length - 1,
      Math.max(0, Math.floor(localX / segmentWidth)),
    );
    const nextKey = currentItems[index].key;

    if (nextKey !== selectedRef.current) {
      onSelectRef.current(nextKey);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 6 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderGrant: (event) => {
        rowLeftRef.current =
          event.nativeEvent.pageX - event.nativeEvent.locationX;
      },
      onPanResponderMove: (event) => {
        selectByAbsoluteX(event.nativeEvent.pageX);
      },
    }),
  ).current;

  const row = (
    <View
      style={[styles.row, isSegment && styles.rowSegment, style]}
      onLayout={
        isSegment
          ? (event) => {
              rowWidthRef.current = event.nativeEvent.layout.width;
            }
          : undefined
      }
      {...(isSegment ? panResponder.panHandlers : {})}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          {
            transform: [{ translateX: indicatorX }],
            width: indicatorWidth,
            backgroundColor: indicatorColor,
            borderColor: indicatorGlowColor,
            shadowColor: indicatorGlowColor,
          },
        ]}
      />
      {items.map((item) => {
        const isSelected = item.key === selectedKey;

        return (
          <Pressable
            key={item.key}
            onLayout={handleChipLayout(item.key)}
            onPress={() => onSelect(item.key)}
            style={({ pressed }) => [
              styles.chip,
              isSegment && styles.chipSegment,
              chipStyle,
              !isSelected && unselectedChipStyle,
              pressed && styles.chipPressed,
            ]}>
            <View style={styles.chipContent}>
              {item.dotColor ? (
                <View style={[styles.chipDot, { backgroundColor: item.dotColor }]} />
              ) : null}
              <Text
                style={[
                  styles.label,
                  isSelected && styles.labelSelected,
                  labelStyle,
                ]}>
                {item.label}
              </Text>
              {item.trailingLabel ? (
                <Text style={[styles.chipCount, isSelected && styles.chipCountSelected]}>
                  {item.trailingLabel}
                </Text>
              ) : null}
            </View>
            {item.sublabel ? (
              <Text
                style={[
                  styles.sublabel,
                  isSelected && styles.sublabelSelected,
                ]}>
                {item.sublabel}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  if (isSegment) {
    return row;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      {row}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: 2,
  },
  row: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  rowSegment: {
    flex: 1,
    gap: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 4,
  },
  // Subtle glowing pill — fully rounded, soft iOS glow, and no Android box
  // shadow (elevation 0) so nothing ever reads as a square light/rectangle.
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: premiumColors.red,
    borderWidth: 1,
    borderColor: premiumColors.redBright,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  chip: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
  },
  chipSegment: {
    flex: 1,
    paddingHorizontal: 8,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  chipCount: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    color: premiumColors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  chipCountSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#FFFFFF',
  },
  label: {
    color: premiumColors.textMuted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  labelSelected: {
    color: '#FFFFFF',
  },
  sublabel: {
    color: premiumColors.textFaint,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  sublabelSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
