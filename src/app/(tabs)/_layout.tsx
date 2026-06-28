import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
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
import { memberService } from '@/services';
import type { Member } from '@/types';

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
  const [member, setMember] = useState<Member>();
  const loadMember = useCallback(async () => {
    const currentMember = await memberService.getCurrentMember();
    setMember(currentMember);
  }, []);
  useEffect(() => { loadMember(); }, [loadMember]);
  useFocusEffect(useCallback(() => { loadMember(); }, [loadMember]));

  return (
    <Pressable
      accessibilityLabel="Open profile"
      hitSlop={10}
      onPress={() => router.push('/profile')}
      style={({ pressed }) => [styles.profileButton, pressed && styles.profileButtonPressed]}>
      <View style={styles.profileButtonCenter}>
        <Image source={profileIconImage} style={styles.profileButtonImage} resizeMode="contain" />
      </View>
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

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <HalfCircleFABBar {...props} />}
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
    opacity: 0.58,
    transform: [{ translateY: 10 }],
  },
  profileButtonPressed: {
    opacity: 0.42,
    transform: [{ scale: 0.95 }],
  },
  profileButtonCenter: {
    width: 86,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 43,
    overflow: 'hidden',
    backgroundColor: 'rgba(3, 5, 10, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  profileButtonImage: {
    width: 86,
    height: 86,
  },
});
