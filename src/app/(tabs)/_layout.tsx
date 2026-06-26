import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { premiumColors } from '@/constants/premiumTheme';
import { avatarService, memberService } from '@/services';
import type { Member } from '@/types';

const accentColor = premiumColors.redBright;
const inactiveColor = 'rgba(255,255,255,0.62)';

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
      size={25}
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

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  useFocusEffect(
    useCallback(() => {
      loadMember();
    }, [loadMember]),
  );

  const avatar = avatarService.getMemberAvatarDisplay(member);

  return (
    <Pressable
      accessibilityLabel="Open profile"
      hitSlop={10}
      onPress={() => router.push('/profile')}
      style={({ pressed }) => [
        styles.profileButton,
        pressed && styles.profileButtonPressed,
      ]}>
      {avatar.imageUri ? (
        <Image
          source={{ uri: avatar.imageUri }}
          style={styles.profileButtonImage}
          resizeMode="cover"
        />
      ) : (
        <Text style={styles.profileButtonText}>{avatar.fallbackLabel}</Text>
      )}
    </Pressable>
  );
}

const visibleTabPadding = 10;
const floatingBarHeight = 72;
const bubbleHeight = 48;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getTabLabel(options: BottomTabBarProps['descriptors'][string]['options'], routeName: string) {
  if (typeof options.tabBarLabel === 'string') {
    return options.tabBarLabel;
  }

  return options.title ?? routeName;
}

function LiquidGlassTabButton({
  barPressScale,
  icon,
  isFocused,
  label,
  onLongPress,
  onPress,
}: {
  barPressScale: SharedValue<number>;
  icon: (props: { focused: boolean }) => ReactNode;
  isFocused: boolean;
  label: string;
  onLongPress: () => void;
  onPress: () => void;
}) {
  const focusProgress = useSharedValue(isFocused ? 1 : 0);
  const pressProgress = useSharedValue(1);

  useEffect(() => {
    focusProgress.value = withTiming(isFocused ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [focusProgress, isFocused]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focusProgress.value, [0, 1], [0.74, 1]),
    transform: [
      { scale: pressProgress.value * interpolate(focusProgress.value, [0, 1], [1, 1.06]) },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={() => {
        pressProgress.value = withSpring(0.94, { damping: 18, stiffness: 260 });
        barPressScale.value = withSpring(0.985, { damping: 18, stiffness: 240 });
      }}
      onPressOut={() => {
        pressProgress.value = withSpring(1, { damping: 16, stiffness: 220 });
        barPressScale.value = withSpring(1, { damping: 16, stiffness: 200 });
      }}
      style={styles.liquidTabButton}>
      <Animated.View style={[styles.liquidTabButtonInner, iconStyle]}>
        {icon({ focused: isFocused })}
      </Animated.View>
    </Pressable>
  );
}

function LiquidGlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const activeIndex = useSharedValue(0);
  const breathProgress = useSharedValue(0);
  const barPressScale = useSharedValue(1);
  const dragStartIndexRef = useRef(0);
  const isDraggingRef = useRef(false);
  const visibleRoutes = state.routes.filter(
    (route) => (descriptors[route.key].options as { href?: unknown }).href !== null,
  );
  const focusedRoute = state.routes[state.index];
  const focusedVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex((route) => route.key === focusedRoute.key),
  );
  const barWidth = Math.max(0, width - 32);
  const itemWidth = (barWidth - visibleTabPadding * 2) / Math.max(1, visibleRoutes.length);
  const bubbleWidth = Math.max(54, Math.min(66, itemWidth - 18));
  const bubbleOffset = visibleTabPadding + (itemWidth - bubbleWidth) / 2;
  const maxVisibleIndex = Math.max(0, visibleRoutes.length - 1);

  const navigateToVisibleIndex = useCallback(
    (nextIndex: number) => {
      const nextRoute = visibleRoutes[nextIndex];

      if (!nextRoute || nextRoute.key === focusedRoute.key) {
        activeIndex.value = withSpring(focusedVisibleIndex, {
          damping: 19,
          stiffness: 180,
          mass: 0.85,
        });
        return;
      }

      const event = navigation.emit({
        type: 'tabPress',
        target: nextRoute.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.navigate(nextRoute.name, nextRoute.params);
      }
    },
    [activeIndex, focusedRoute.key, focusedVisibleIndex, navigation, visibleRoutes],
  );

  const bubblePanResponder = useMemo(
    () =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        Math.abs(gestureState.dx) > 7 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        dragStartIndexRef.current = focusedVisibleIndex;
        barPressScale.value = withSpring(0.988, { damping: 18, stiffness: 240 });
      },
      onPanResponderMove: (_, gestureState) => {
        activeIndex.value = clamp(
          dragStartIndexRef.current + gestureState.dx / Math.max(1, itemWidth),
          0,
          maxVisibleIndex,
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        const nextIndex = Math.round(
          clamp(
            dragStartIndexRef.current + gestureState.dx / Math.max(1, itemWidth),
            0,
            maxVisibleIndex,
          ),
        );

        isDraggingRef.current = false;
        barPressScale.value = withSpring(1, { damping: 16, stiffness: 200 });
        activeIndex.value = withSpring(nextIndex, {
          damping: 19,
          stiffness: 180,
          mass: 0.85,
        });
        navigateToVisibleIndex(nextIndex);
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        barPressScale.value = withSpring(1, { damping: 16, stiffness: 200 });
        activeIndex.value = withSpring(focusedVisibleIndex, {
          damping: 19,
          stiffness: 180,
          mass: 0.85,
        });
      },
      onPanResponderTerminationRequest: () => false,
    }),
    [
      activeIndex,
      barPressScale,
      focusedVisibleIndex,
      itemWidth,
      maxVisibleIndex,
      navigateToVisibleIndex,
    ],
  );

  useEffect(() => {
    if (isDraggingRef.current) {
      return;
    }

    activeIndex.value = withSpring(focusedVisibleIndex, {
      damping: 19,
      stiffness: 180,
      mass: 0.85,
    });
  }, [activeIndex, focusedVisibleIndex]);

  useEffect(() => {
    breathProgress.value = withRepeat(
      withTiming(1, {
        duration: 2200,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [breathProgress]);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: barPressScale.value }],
  }));

  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathProgress.value, [0, 1], [0.82, 0.96]),
    transform: [
      { translateX: bubbleOffset + activeIndex.value * itemWidth },
      { scale: interpolate(breathProgress.value, [0, 1], [1, 1.018]) },
    ],
    width: bubbleWidth,
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.liquidTabBarHost,
        { bottom: insets.bottom - 15, height: 70 },
      ]}>
      <Animated.View style={[styles.liquidTabBarShell, barAnimatedStyle]}>
        <BlurView
          intensity={48}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={styles.liquidTabBlur}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.08)', 'rgba(12,12,16,0.18)', 'rgba(0,0,0,0.16)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.34)',
              'rgba(255,45,85,0.16)',
              'rgba(80,160,255,0.12)',
              'rgba(180,120,255,0.10)',
              'rgba(255,255,255,0.18)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.liquidEdgeHighlight}
          />
          <Animated.View
            style={[styles.movingBubble, bubbleAnimatedStyle]}
            {...bubblePanResponder.panHandlers}>
            <View pointerEvents="none" style={styles.movingBubbleFill} />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0.02)']}
              start={{ x: 0.25, y: 0 }}
              end={{ x: 0.75, y: 1 }}
              style={styles.movingBubbleHighlight}
            />
          </Animated.View>
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(225,29,46,0)',
              'rgba(225,29,46,0.45)',
              'rgba(225,29,46,0)',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.bottomRedReflection}
          />
          <View style={styles.liquidTabContent}>
            {visibleRoutes.map((route) => {
              const options = descriptors[route.key].options;
              const label = getTabLabel(options, route.name);
              const isFocused = route.key === focusedRoute.key;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              return (
                <LiquidGlassTabButton
                  key={route.key}
                  barPressScale={barPressScale}
                  icon={(props) =>
                    options.tabBarIcon?.({
                      color: props.focused ? accentColor : 'rgba(255,255,255,0.62)',
                      focused: props.focused,
                      size: 25,
                    }) ?? <Text style={styles.tabFallbackIcon}>{label.slice(0, 1)}</Text>
                  }
                  isFocused={isFocused}
                  label={label}
                  onLongPress={onLongPress}
                  onPress={onPress}
                />
              );
            })}
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      detachInactiveScreens={false}
      screenOptions={{
        animation: 'fade',
        lazy: false,
        freezeOnBlur: false,
        sceneStyle: { backgroundColor: premiumColors.background },
        headerBackground: () => null,
        headerRight: () => <ProfileHeaderButton />,
        headerRightContainerStyle: {
          paddingRight: 20,
        },
        headerShadowVisible: false,
        headerShown: true,
        headerTitle: () => null,
        headerStyle: {
          backgroundColor: 'transparent',
        },
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
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabBarIcon,
      }}>
      <Tabs.Screen
      name="index"
      options={{
        title: 'Home',
        tabBarIcon: ({ focused }) => (
          <TabIcon
            activeIcon="house.fill"
            fallback="H"
            focused={focused}
            icon="house"
            />
          ),
        }}
      />
      <Tabs.Screen
      name="classes"
      options={{
        title: 'Classes',
        tabBarIcon: ({ focused }) => (
          <TabIcon
              activeIcon="calendar"
              fallback="C"
              focused={focused}
              icon="calendar"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Gym Shop',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              activeIcon="bag.fill"
              fallback="S"
              focused={focused}
              icon="bag"
            />
          ),
        }}
      />
      <Tabs.Screen
      name="journey"
      options={{
        title: 'Journey',
        tabBarIcon: ({ focused }) => (
          <TabIcon
              activeIcon="chart.bar.fill"
              fallback="J"
              focused={focused}
              icon="chart.bar"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          href: null,
          title: 'Help',
        }}
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
  },
  tabBarItem: {
    paddingTop: 2,
  },
  tabBarIcon: {
    marginTop: 0,
  },
  tabFallbackIcon: {
    fontSize: 19,
    fontWeight: '800',
  },
  liquidTabBarHost: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: floatingBarHeight,
    backgroundColor: 'transparent',
  },
  liquidTabBarShell: {
    flex: 1,
    borderRadius: 36,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 10,
  },
  liquidTabBlur: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 36,
    backgroundColor: 'rgba(12,12,16,0.52)',
  },
  liquidEdgeHighlight: {
    position: 'absolute',
    top: 0,
    left: 3,
    right: 3,
    height: 22,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    opacity: 0.52,
  },
  liquidTabContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: visibleTabPadding,
    paddingVertical: 10,
  },
  liquidTabButton: {
    flex: 1,
    height: bubbleHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  liquidTabButtonInner: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  movingBubble: {
    position: 'absolute',
    top: (floatingBarHeight - bubbleHeight) / 2,
    height: bubbleHeight,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  movingBubbleFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  movingBubbleHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  bottomRedReflection: {
    position: 'absolute',
    left: 52,
    right: 52,
    bottom: 1,
    height: 2,
  },
  profileButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(225, 29, 46, 0.65)',
    borderRadius: 17,
    backgroundColor: 'rgba(18, 20, 28, 0.66)',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  profileButtonImage: {
    width: '100%',
    height: '100%',
  },
  profileButtonPressed: {
    opacity: 0.75,
  },
  profileButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
