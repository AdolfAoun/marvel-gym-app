import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
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
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { premiumColors } from '@/constants/premiumTheme';

const accentColor = premiumColors.redBright;
const inactiveColor = 'rgba(255,255,255,0.55)';
const profileIconImage = require('@/assets/images/profileicon.png');

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

function ProfileHeaderButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel="Open profile"
      hitSlop={12}
      onPress={() => router.push('/profile')}
      style={({ pressed }) => [styles.profileButton, pressed && styles.profileButtonPressed]}>
      <Image source={profileIconImage} style={styles.profileButtonImage} resizeMode="contain" />
    </Pressable>
  );
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

  // pillX = pill left offset; grow = 0..1 selection/drag swell; wobble loops
  // 0↔1 to make the bubble's edges flow while held; barScale shrinks the whole
  // bar toward 0.9 when it's left untouched.
  const pillX = useSharedValue(0);
  const grow = useSharedValue(0);
  const wobble = useSharedValue(0.5);
  const barScale = useSharedValue(1);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef(0);
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
    if (shrinkTimer.current) clearTimeout(shrinkTimer.current);
    shrinkTimer.current = setTimeout(() => {
      barScale.value = withTiming(0.9, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
    }, 2600);
  }, [barScale]);

  // Quick bubble pop + settle when a tab is tapped (without dragging).
  const pulseBubble = useCallback(() => {
    grow.value = withSequence(
      withTiming(1, { duration: 140 }),
      withSpring(0, { damping: 16, stiffness: 200 }),
    );
    wobble.value = withSequence(
      withTiming(1, { duration: 160 }),
      withTiming(0.5, { duration: 240 }),
    );
  }, [grow, wobble]);

  useEffect(() => {
    wakeBar();
    return () => {
      if (shrinkTimer.current) clearTimeout(shrinkTimer.current);
    };
  }, [wakeBar]);

  // Glide the pill to the active tab on selection/layout changes (not mid-drag).
  useEffect(() => {
    if (tabWidth > 0 && !isDraggingRef.current) {
      pillX.value = withSpring(innerPadding + activeIndex * tabWidth, {
        damping: 18,
        stiffness: 200,
        mass: 0.8,
      });
    }
  }, [activeIndex, tabWidth, pillX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        grow.value = withSpring(1, { damping: 14, stiffness: 180 });
        // Edges keep "flowing" like a soap bubble while the finger is down.
        wobble.value = withRepeat(
          withTiming(1, { duration: 620, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        );
        dragStartRef.current = pillX.value;
        wakeBar();
      },
      onPanResponderMove: (_, gesture) => {
        const w = tabWidthRef.current;
        const max = innerPadding + (routesRef.current.length - 1) * w;
        let next = dragStartRef.current + gesture.dx;
        if (next < innerPadding) next = innerPadding;
        if (next > max) next = max;
        pillX.value = next;
      },
      onPanResponderRelease: () => {
        const w = tabWidthRef.current || 1;
        const idx = Math.round((pillX.value - innerPadding) / w);
        const clamped = Math.max(0, Math.min(routesRef.current.length - 1, idx));
        isDraggingRef.current = false;
        // Bubble settles once the finger lifts.
        grow.value = withSpring(0, { damping: 16, stiffness: 200 });
        wobble.value = withTiming(0.5, { duration: 300 });
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
        grow.value = withSpring(0, { damping: 16, stiffness: 200 });
        wobble.value = withTiming(0.5, { duration: 300 });
      },
    }),
  ).current;

  const pillStyle = useAnimatedStyle(() => ({
    width: tabWidth,
    transform: [
      { translateX: pillX.value },
      // Swell while held, with a tiny bubble jiggle.
      { scale: 1 + grow.value * 0.16 + grow.value * (wobble.value - 0.5) * 0.05 },
    ],
  }));

  // Iridescent sheen that sweeps across the bubble's edges while it's held.
  const bubbleEdgeStyle = useAnimatedStyle(() => ({
    opacity: grow.value * (0.25 + wobble.value * 0.55),
    transform: [{ translateX: (wobble.value - 0.5) * (tabWidth || 0) * 0.7 }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scale: barScale.value }],
    opacity: 0.7 + (barScale.value - 0.9) * 3,
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
            {/* greyish translucent glass fill */}
            <LinearGradient
              colors={['rgba(255,255,255,0.24)', 'rgba(176,182,196,0.10)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* soap-bubble iridescent edge that flows while held */}
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, bubbleEdgeStyle]}>
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0)',
                  'rgba(150,210,255,0.55)',
                  'rgba(255,190,235,0.5)',
                  'rgba(190,255,220,0.45)',
                  'rgba(255,255,255,0)',
                ]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            {/* top specular highlight */}
            <View pointerEvents="none" style={styles.pillSpecular} />
          </Animated.View>
        ) : null}

        <View style={[styles.glassTabRow, { paddingHorizontal: innerPadding }]}>
          {visibleRoutes.map((route, index) => {
            const isFocused = route.key === focusedKey;
            const options = descriptors[route.key].options;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={getTabLabel(options, route.name)}
                onPress={() => {
                  wakeBar();
                  pulseBubble();
                  selectIndex(index);
                }}
                style={styles.glassTabButton}>
                {options.tabBarIcon?.({
                  color: isFocused ? accentColor : inactiveColor,
                  focused: isFocused,
                  size: 22,
                }) ?? (
                  <Text
                    style={[
                      styles.tabFallbackIcon,
                      { color: isFocused ? accentColor : inactiveColor },
                    ]}>
                    {getTabLabel(options, route.name).slice(0, 1)}
                  </Text>
                )}
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
        headerRight: () => <ProfileHeaderButton />,
        headerRightContainerStyle: { paddingRight: 18, paddingTop: 16 },
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
            <TabIcon activeIcon="house.fill" fallback="H" focused={focused} icon="house" />
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
    fontSize: 17,
    fontWeight: '800',
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
    width: '86%',
    maxWidth: 460,
    height: 62,
    borderRadius: 31,
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
    top: 6,
    bottom: 6,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  pillSpecular: {
    position: 'absolute',
    top: 2,
    left: 6,
    right: 6,
    height: '42%',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
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

  // Profile button
  profileButton: {
    width: 92,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    backgroundColor: 'transparent',
    opacity: 0.82,
    transform: [{ translateY: 10 }],
  },
  profileButtonPressed: {
    opacity: 0.68,
    // Keep the same translateY as the resting state so the icon scales in
    // place instead of jumping upward on the first tap.
    transform: [{ translateY: 10 }, { scale: 0.95 }],
  },
  profileButtonImage: {
    width: 86,
    height: 86,
  },
});
