import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { premiumColors } from '@/constants/premiumTheme';

const accentColor = premiumColors.redBright;
const inactiveColor = 'rgba(255,255,255,0.55)';

const FAB_W = 40;
const FAB_H = 80;
const FAN_RADIUS = 115;
const ITEM_SIZE = 52;

function TabIcon({
  fallback,
  focused,
  activeIcon,
  icon,
}: {
  fallback: string;
  focused: boolean;
  activeIcon: SFSymbol;
  icon: SFSymbol;
}) {
  const color = focused ? accentColor : inactiveColor;
  return (
    <SymbolView
      name={focused ? activeIcon : icon}
      size={22}
      tintColor={color}
      weight={focused ? 'semibold' : 'regular'}
      fallback={<Text style={[styles.tabFallbackIcon, { color }]}>{fallback}</Text>}
    />
  );
}

function ProfileTabIcon({ focused }: { focused: boolean }) {
  return (
    <TabIcon
      activeIcon="person.crop.circle.fill"
      fallback="P"
      focused={focused}
      icon="person.crop.circle"
    />
  );
}

function GlassTabIconWrap({
  children,
}: {
  children: ReactNode;
}) {
  return <Animated.View style={styles.glassTabIconWrap}>{children}</Animated.View>;
}

function getTabLabel(options: BottomTabBarProps['descriptors'][string]['options'], routeName: string) {
  if (typeof options.tabBarLabel === 'string') return options.tabBarLabel;
  return options.title ?? routeName;
}

function FanItem({
  index,
  isFocused,
  label,
  openProgress,
  options,
  route,
  total,
  onPress,
}: {
  index: number;
  isFocused: boolean;
  label: string;
  openProgress: SharedValue<number>;
  options: BottomTabBarProps['descriptors'][string]['options'];
  route: { key: string; name: string };
  total: number;
  onPress: () => void;
}) {
  const angle = (index / Math.max(1, total - 1)) * 80 * (Math.PI / 180);
  const tx = Math.sin(angle) * FAN_RADIUS;
  const ty = -Math.cos(angle) * FAN_RADIUS;

  const animStyle = useAnimatedStyle(() => ({
    opacity: withTiming(openProgress.value, { duration: 200, easing: Easing.out(Easing.cubic) }),
    transform: [
      { translateX: tx * openProgress.value },
      { translateY: ty * openProgress.value },
      { scale: withSpring(0.4 + 0.6 * openProgress.value, { damping: 18, stiffness: 220 }) },
    ],
  }));

  return (
    <Animated.View style={[styles.fanItemWrapper, animStyle]}>
      <Pressable onPress={onPress} style={styles.fanItemPress}>
        <BlurView intensity={80} tint="systemThinMaterialDark" style={styles.fanItemBlur}>
          <LinearGradient
            colors={
              isFocused
                ? ['rgba(225,29,46,0.38)', 'rgba(225,29,46,0.14)']
                : ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.05)']
            }
            style={StyleSheet.absoluteFillObject}
          />
          {/* top sheen */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.6 }}
            style={StyleSheet.absoluteFillObject}
          />
          {options.tabBarIcon?.({
            color: isFocused ? accentColor : inactiveColor,
            focused: isFocused,
            size: 22,
          }) ?? <Text style={[styles.tabFallbackIcon, { color: isFocused ? accentColor : inactiveColor }]}>{label.slice(0, 1)}</Text>}
        </BlurView>
        <Text style={[styles.fanItemLabel, isFocused && { color: accentColor }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function HalfCircleFABBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const openProgress = useSharedValue(0);
  const pressScale = useSharedValue(1);

  const visibleRoutes = state.routes.filter(
    (route) =>
      route.name !== 'help' &&
      (descriptors[route.key].options as { href?: unknown }).href !== null,
  );
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key].options;

  const toggle = useCallback(() => {
    const next = !isOpen;
    setIsOpen(next);
    openProgress.value = withSpring(next ? 1 : 0, { damping: 20, stiffness: 200, mass: 0.9 });
  }, [isOpen, openProgress]);

  const triggerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: openProgress.value * 0.45,
    pointerEvents: openProgress.value > 0.01 ? 'auto' : 'none',
  }));

  return (
    <>
      {/* Backdrop — tap to close */}
      <Animated.View style={[StyleSheet.absoluteFillObject, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={toggle} />
      </Animated.View>

      <View
        pointerEvents="box-none"
        style={[styles.fabHost, { bottom: Math.max(16, insets.bottom + 8) }]}>

        {/* Fan items — rendered first so they're behind trigger */}
        {visibleRoutes.map((route, i) => (
          <FanItem
            key={route.key}
            index={i}
            isFocused={route.key === focusedRoute.key}
            label={getTabLabel(descriptors[route.key].options, route.name)}
            openProgress={openProgress}
            options={descriptors[route.key].options}
            route={route}
            total={visibleRoutes.length}
            onPress={() => {
              toggle();
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
          />
        ))}

        {/* D-shape trigger: half circle flat on left edge */}
        <Pressable
          onPress={toggle}
          onPressIn={() => { pressScale.value = withSpring(0.92, { damping: 18, stiffness: 260 }); }}
          onPressOut={() => { pressScale.value = withSpring(1, { damping: 16, stiffness: 220 }); }}>
          <Animated.View style={[styles.fabTrigger, triggerAnimStyle]}>
            <BlurView intensity={90} tint="systemThinMaterialDark" style={styles.fabTriggerBlur}>
              {/* main glass fill */}
              <LinearGradient
                colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)', 'rgba(10,10,14,0.18)']}
                locations={[0, 0.55, 1]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              {/* right-edge vertical sheen */}
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.04)']}
                start={{ x: 1, y: 0.2 }}
                end={{ x: 0.4, y: 0.8 }}
                style={StyleSheet.absoluteFillObject}
              />
              {/* active icon */}
              <View style={styles.fabTriggerIcon}>
                {focusedOptions.tabBarIcon?.({
                  color: accentColor,
                  focused: true,
                  size: 22,
                }) ?? <Text style={[styles.tabFallbackIcon, { color: accentColor }]}>•</Text>}
              </View>
              {/* red glow at bottom */}
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(225,29,46,0)', 'rgba(225,29,46,0.28)']}
                start={{ x: 0.5, y: 0.4 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </BlurView>
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

// iOS liquid-glass pill tab bar: a transparent glass capsule with a tinted
// selection pill that glides between tabs, and a soft water-reflection sheen
// around the top edge. Uses the real iOS 26 Liquid Glass API when available,
// falling back to a frosted blur on older iOS.
function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const visibleRoutes = state.routes.filter(
    (route) =>
      route.name !== 'help' &&
      (descriptors[route.key].options as { href?: unknown }).href !== null,
  );
  const focusedKey = state.routes[state.index].key;
  const activeIndex = Math.max(
    0,
    visibleRoutes.findIndex((route) => route.key === focusedKey),
  );

  const innerPadding = 6;
  const tabCount = Math.max(1, visibleRoutes.length);
  const tabWidth = barWidth > 0 ? (barWidth - innerPadding * 2) / tabCount : 0;

  // pillX = pill left offset; pillGrow expands the active bubble when selected;
  // barScale/barDrop handle idle position, barFloat is steady while held, and
  // pillWobble gives the dragged pill a tiny droplet-like response.
  const pillX = useSharedValue(0);
  const pillGrow = useSharedValue(1);
  const pillCompact = useSharedValue(0);
  const pillWobble = useSharedValue(0);
  const barScale = useSharedValue(1);
  const barDrop = useSharedValue(0);
  const barFloat = useSharedValue(0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef(0);
  const previewIndexRef = useRef<number | null>(null);
  const shrinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest geometry/routes for the PanResponder closures (created once).
  const tabWidthRef = useRef(tabWidth);
  tabWidthRef.current = tabWidth;
  const routesRef = useRef(visibleRoutes);
  routesRef.current = visibleRoutes;
  const focusedRef = useRef(focusedKey);
  focusedRef.current = focusedKey;

  const selectIndex = useCallback(
    (index: number) => {
      const route = routesRef.current[index];
      if (!route) return;
      if (route.key !== focusedRef.current) {
        Haptics.selectionAsync();
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      }
    },
    [navigation],
  );

  // Pop the bar back to full size and (re)arm the idle-shrink timer.
  const wakeBar = useCallback(() => {
    barScale.value = withSpring(1, { damping: 16, stiffness: 200 });
    barDrop.value = withSpring(0, { damping: 18, stiffness: 210 });
    barFloat.value = withSpring(0, { damping: 18, stiffness: 210 });
    pillCompact.value = withSpring(0, { damping: 18, stiffness: 210 });
    if (shrinkTimer.current) clearTimeout(shrinkTimer.current);
    if (isDraggingRef.current) {
      shrinkTimer.current = null;
      return;
    }
    shrinkTimer.current = setTimeout(() => {
      if (isDraggingRef.current) {
        shrinkTimer.current = null;
        return;
      }
      barScale.value = withTiming(0.82, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
      barDrop.value = withTiming(0, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
      pillCompact.value = withTiming(1.28, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
    }, 2600);
  }, [barScale, barDrop, barFloat, pillCompact]);

  const updatePreviewIndex = useCallback(
    (index: number | null) => {
      if (previewIndexRef.current === index) return;
      previewIndexRef.current = index;
      setPreviewIndex(index);
    },
    [],
  );

  useEffect(() => {
    wakeBar();
    return () => {
      if (shrinkTimer.current) clearTimeout(shrinkTimer.current);
    };
  }, [wakeBar]);

  // Glide the pill to the active tab on selection/layout changes (not mid-drag).
  useEffect(() => {
    if (tabWidth > 0 && !isDraggingRef.current) {
      pillGrow.value = 0.72;
      pillX.value = withSpring(innerPadding + activeIndex * tabWidth, {
        damping: 18,
        stiffness: 200,
        mass: 0.8,
      });
      pillGrow.value = withSpring(1, {
        damping: 15,
        stiffness: 240,
        mass: 0.7,
      });
    }
  }, [activeIndex, tabWidth, pillX, pillGrow]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        dragStartRef.current = pillX.value;
        wakeBar();
        updatePreviewIndex(activeIndex);
        barScale.value = withTiming(1.08, {
          duration: 120,
          easing: Easing.out(Easing.cubic),
        });
        barDrop.value = withTiming(0, {
          duration: 120,
          easing: Easing.out(Easing.cubic),
        });
        barFloat.value = withTiming(1, {
          duration: 120,
          easing: Easing.out(Easing.cubic),
        });
        pillGrow.value = withSpring(1.16, { damping: 20, stiffness: 220 });
      },
      onPanResponderMove: (_, gesture) => {
        const w = tabWidthRef.current;
        const max = innerPadding + (routesRef.current.length - 1) * w;
        let next = dragStartRef.current + gesture.dx;
        if (next < innerPadding) next = innerPadding;
        if (next > max) next = max;
        pillX.value = next;
        const nextIndex = Math.max(
          0,
          Math.min(routesRef.current.length - 1, Math.round((next - innerPadding) / (w || 1))),
        );
        updatePreviewIndex(nextIndex);
        pillWobble.value = withSpring(Math.max(-1, Math.min(1, gesture.vx / 1.8)), {
          damping: 13,
          stiffness: 180,
          mass: 0.5,
        });
      },
      onPanResponderRelease: () => {
        const w = tabWidthRef.current || 1;
        const idx = Math.round((pillX.value - innerPadding) / w);
        const clamped = Math.max(0, Math.min(routesRef.current.length - 1, idx));
        isDraggingRef.current = false;
        updatePreviewIndex(null);
        pillWobble.value = withSpring(0, { damping: 12, stiffness: 170 });
        pillX.value = withSpring(innerPadding + clamped * w, {
          damping: 18,
          stiffness: 200,
          mass: 0.8,
        });
        selectIndex(clamped);
        wakeBar();
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        updatePreviewIndex(null);
        pillWobble.value = withSpring(0, { damping: 12, stiffness: 170 });
        wakeBar();
      },
    }),
  ).current;

  const pillStyle = useAnimatedStyle(() => ({
    width: tabWidth + 10 * pillGrow.value + 8 * barFloat.value - 22 * pillCompact.value,
    transform: [
      { translateX: pillX.value - 5 * pillGrow.value - 4 * barFloat.value + 11 * pillCompact.value },
      { scaleX: 1 + 0.035 * Math.abs(pillWobble.value) },
      { scaleY: 0.96 + 0.04 * pillGrow.value + 0.08 * barFloat.value - 0.2 * pillCompact.value - 0.025 * Math.abs(pillWobble.value) },
      { skewX: `${pillWobble.value * 2.2}deg` },
    ],
  }));

  const barStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: barDrop.value },
      { scale: barScale.value },
    ],
    opacity: 0.62 + (barScale.value - 0.82) * 2.65,
  }));

  const hasLiquidGlass = isLiquidGlassAvailable();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.glassBarHost, { bottom: Math.max(14, insets.bottom + 6) }]}>
      <Animated.View
        onTouchStart={wakeBar}
        style={[styles.glassBar, barStyle]}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        {...panResponder.panHandlers}>
        {hasLiquidGlass ? (
          <GlassView glassEffectStyle="clear" style={StyleSheet.absoluteFill} />
        ) : (
          <BlurView
            intensity={60}
            tint="systemThinMaterialDark"
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* top water-reflection sheen */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.30)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.7 }}
          style={styles.glassBarSheen}
        />

        {/* gliding / draggable selection bubble */}
        {tabWidth > 0 ? (
          <Animated.View style={[styles.glassPill, pillStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0.28)', 'rgba(176,182,196,0.12)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              pointerEvents="none"
              colors={[
                'rgba(255,255,255,0)',
                'rgba(178,224,255,0.28)',
                'rgba(255,232,202,0.3)',
                'rgba(205,238,224,0.2)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.pillWaterReflection}
            />
            <View pointerEvents="none" style={styles.pillEdgeReflection} />
          </Animated.View>
        ) : null}

        <View style={[styles.glassTabRow, { paddingHorizontal: innerPadding }]}>
          {visibleRoutes.map((route, index) => {
            const isFocused = route.key === focusedKey;
            const isPreviewed = previewIndex === index;
            const iconFocused = isFocused || isPreviewed;
            const options = descriptors[route.key].options;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={getTabLabel(options, route.name)}
                onPress={() => {
                  wakeBar();
                  selectIndex(index);
                }}
                style={styles.glassTabButton}>
                <GlassTabIconWrap>
                  {options.tabBarIcon?.({
                    color: iconFocused ? accentColor : inactiveColor,
                    focused: iconFocused,
                    size: 22,
                  }) ?? (
                    <Text
                      style={[
                        styles.tabFallbackIcon,
                        { color: iconFocused ? accentColor : inactiveColor },
                      ]}>
                      {getTabLabel(options, route.name).slice(0, 1)}
                    </Text>
                  )}
                </GlassTabIconWrap>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) =>
        Platform.OS === 'ios' ? (
          <GlassTabBar {...props} />
        ) : (
          <HalfCircleFABBar {...props} />
        )
      }
      detachInactiveScreens={false}
      screenOptions={{
        animation: 'fade',
        lazy: false,
        freezeOnBlur: false,
        sceneStyle: { backgroundColor: premiumColors.background },
        headerBackground: () => null,
        headerShadowVisible: false,
        headerShown: true,
        headerTitle: () => null,
        headerStyle: { backgroundColor: 'transparent' },
        headerTransparent: true,
        headerTintColor: accentColor,
        headerTitleAlign: 'left',
        headerTitleStyle: {
          color: premiumColors.text,
          fontSize: 18,
          fontWeight: '900',
        },
        tabBarActiveTintColor: accentColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon activeIcon="house" fallback="H" focused={focused} icon="house" />
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          tabBarIcon: ({ focused }) => (
            <TabIcon activeIcon="calendar" fallback="C" focused={focused} icon="calendar" />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Gym Shop',
          tabBarIcon: ({ focused }) => (
            <TabIcon activeIcon="bag.fill" fallback="S" focused={focused} icon="bag" />
          ),
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: 'Journey',
          tabBarIcon: ({ focused }) => (
            <TabIcon activeIcon="chart.bar.fill" fallback="J" focused={focused} icon="chart.bar" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="help"
        options={{ href: null, title: 'Help' }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
    height: 0,
  },
  tabFallbackIcon: {
    fontSize: 16,
    fontWeight: '900',
  },

  // iOS liquid-glass pill tab bar
  glassBarHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  glassBar: {
    flexDirection: 'row',
    width: '78%',
    maxWidth: 390,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.34,
    shadowRadius: 22,
    elevation: 14,
  },
  glassBarSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  glassPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.52)',
  },
  pillWaterReflection: {
    position: 'absolute',
    top: 0,
    left: -8,
    right: -8,
    bottom: 0,
    opacity: 0.82,
  },
  pillEdgeReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.42)',
    backgroundColor: 'transparent',
  },
  glassTabRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  glassTabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassTabIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Backdrop shown when menu is open
  backdrop: {
    backgroundColor: '#000',
    zIndex: 90,
  },

  // Absolute host anchored bottom-left
  fabHost: {
    position: 'absolute',
    left: 0,
    zIndex: 100,
  },

  // D-shape: semicircle, flat side left
  fabTrigger: {
    width: FAB_W,
    height: FAB_H,
    borderTopRightRadius: FAB_W,
    borderBottomRightRadius: FAB_W,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius: 18,
    elevation: 14,
  },
  fabTriggerBlur: {
    flex: 1,
    borderTopRightRadius: FAB_W,
    borderBottomRightRadius: FAB_W,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderLeftWidth: 0,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabTriggerIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },

  // Fan item wrapper — positioned absolutely at trigger origin
  fanItemWrapper: {
    position: 'absolute',
    bottom: (FAB_H - ITEM_SIZE) / 2,
    left: (FAB_W - ITEM_SIZE) / 2,
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  fanItemPress: {
    alignItems: 'center',
  },
  fanItemBlur: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 10,
  },
  fanItemLabel: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

});
