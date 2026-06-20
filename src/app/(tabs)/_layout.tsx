import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { premiumColors } from '@/constants/premiumTheme';
import { avatarService, memberService } from '@/services';
import type { Member } from '@/types';

const accentColor = premiumColors.redBright;
const inactiveColor = premiumColors.textMuted;

const BAR_PADDING = 8;
const BAR_HEIGHT = 52;
const BUBBLE_WIDTH = 60;
const BUBBLE_HEIGHT = 38;
const EXPANDED_HORIZONTAL_INSET = 20;
const COMPACT_ITEM_WIDTH = 58;

type TabRoute = 'index' | 'classes' | 'shop' | 'journey';

type TabConfig = {
  icon: SFSymbol;
  activeIcon: SFSymbol;
  label: string;
  route: TabRoute;
  fallback: string;
  badge?: boolean;
};

const TAB_CONFIG: TabConfig[] = [
  {
    route: 'index',
    label: 'Home',
    icon: 'house',
    activeIcon: 'house.fill',
    fallback: 'H',
  },
  {
    route: 'classes',
    label: 'Classes',
    icon: 'figure.strengthtraining.traditional',
    activeIcon: 'dumbbell.fill',
    fallback: 'C',
  },
  {
    route: 'shop',
    label: 'Shop',
    icon: 'bag',
    activeIcon: 'bag.fill',
    fallback: 'S',
  },
  {
    route: 'journey',
    label: 'Journey',
    icon: 'chart.line.uptrend.xyaxis',
    activeIcon: 'chart.line.uptrend.xyaxis.circle.fill',
    fallback: 'J',
  },
];

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
  const color = focused ? '#FFFFFF' : inactiveColor;

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

/** Floating liquid-glass tab bar with an idle compact state and drag selection. */
function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const visibleTabs = TAB_CONFIG.flatMap((tab) => {
    const route = state.routes.find((candidate) => candidate.name === tab.route);

    return route ? [{ ...tab, route }] : [];
  });
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(
    0,
    visibleTabs.findIndex((tab) => tab.route.key === activeKey),
  );
  const barHeight = screenWidth >= 600 ? 58 : BAR_HEIGHT;

  const expandedWidth = Math.max(
    260,
    screenWidth - EXPANDED_HORIZONTAL_INSET * 2,
  );
  const compactWidth = Math.min(
    expandedWidth,
    visibleTabs.length * COMPACT_ITEM_WIDTH + BAR_PADDING * 2,
  );
  const compactScale = compactWidth / expandedWidth;
  const expandedItemWidth =
    (expandedWidth - BAR_PADDING * 2) / Math.max(1, visibleTabs.length);
  const barScale = useRef(new Animated.Value(1)).current;
  const bubbleX = useRef(new Animated.Value(0)).current;
  const bubbleScale = useRef(new Animated.Value(1.15)).current;
  const shrinkTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const activeIndexRef = useRef(activeIndex);
  const isDraggingRef = useRef(false);
  const isExpandedRef = useRef(true);
  const skipNextWakeRef = useRef(false);
  const dragStartXRef = useRef(0);
  const bubbleXForIndex = useCallback(
    (index: number, itemWidth: number) =>
      BAR_PADDING + index * itemWidth + (itemWidth - BUBBLE_WIDTH) / 2,
    [],
  );
  const iconScaleX = barScale.interpolate({
    inputRange: [compactScale, 1],
    outputRange: [1 / compactScale, 1],
    extrapolate: 'clamp',
  });

  const clearIdleTimer = useCallback(() => {
    if (shrinkTimer.current) {
      clearTimeout(shrinkTimer.current);
      shrinkTimer.current = undefined;
    }
  }, []);

  const animateToExpanded = useCallback(
    (index = activeIndexRef.current) => {
      clearIdleTimer();
      barScale.stopAnimation();
      bubbleX.stopAnimation();
      bubbleScale.stopAnimation();
      isExpandedRef.current = true;
      Animated.parallel([
        Animated.timing(barScale, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(bubbleX, {
          toValue: bubbleXForIndex(index, expandedItemWidth),
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(bubbleScale, {
          toValue: 1.15,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [
      barScale,
      bubbleScale,
      bubbleX,
      bubbleXForIndex,
      clearIdleTimer,
      expandedItemWidth,
    ],
  );

  const animateToCompact = useCallback(() => {
    if (!isExpandedRef.current) {
      return;
    }

    isExpandedRef.current = false;
    Animated.parallel([
      Animated.timing(barScale, {
        toValue: compactScale,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(bubbleScale, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [barScale, bubbleScale, compactScale]);

  const scheduleIdle = useCallback(() => {
    clearIdleTimer();
    shrinkTimer.current = setTimeout(animateToCompact, 3000);
  }, [animateToCompact, clearIdleTimer]);

  const wake = useCallback(
    (index = activeIndexRef.current) => {
      animateToExpanded(index);
      scheduleIdle();
    },
    [animateToExpanded, scheduleIdle],
  );

  const selectRoute = useCallback(
    (index: number) => {
      const tab = visibleTabs[index];

      if (!tab) {
        return;
      }

      const event = navigation.emit({
        type: 'tabPress',
        target: tab.route.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.navigate(tab.route.name);
      }
    },
    [navigation, visibleTabs],
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 4 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        wake(activeIndexRef.current);
        dragStartXRef.current = bubbleXForIndex(
          activeIndexRef.current,
          expandedItemWidth,
        );
        bubbleX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const minX = bubbleXForIndex(0, expandedItemWidth);
        const maxX = bubbleXForIndex(visibleTabs.length - 1, expandedItemWidth);
        const nextX = Math.min(
          maxX,
          Math.max(minX, dragStartXRef.current + gestureState.dx),
        );
        const nextIndex = Math.min(
          visibleTabs.length - 1,
          Math.max(0, Math.round((nextX - minX) / expandedItemWidth)),
        );

        bubbleX.setValue(nextX);

        if (nextIndex !== activeIndexRef.current) {
          activeIndexRef.current = nextIndex;
          selectRoute(nextIndex);
        }
      },
      onPanResponderRelease: () => {
        isDraggingRef.current = false;
        Animated.timing(bubbleX, {
          toValue: bubbleXForIndex(activeIndexRef.current, expandedItemWidth),
          duration: 160,
          useNativeDriver: true,
        }).start();
        scheduleIdle();
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        scheduleIdle();
      },
    }),
  ).current;

  useEffect(() => {
    activeIndexRef.current = activeIndex;

    if (skipNextWakeRef.current) {
      skipNextWakeRef.current = false;
      return;
    }

    if (!isDraggingRef.current) {
      wake(activeIndex);
    }

    return () => {
      clearIdleTimer();
    };
  }, [activeIndex, clearIdleTimer, wake]);

  useEffect(() => {
    barScale.setValue(isExpandedRef.current ? 1 : compactScale);
    bubbleX.setValue(bubbleXForIndex(activeIndexRef.current, expandedItemWidth));
  }, [barScale, bubbleX, bubbleXForIndex, compactScale, expandedItemWidth]);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.barWrap, { paddingBottom: Math.max(insets.bottom - 8, 8) }]}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.bar,
          {
            width: expandedWidth,
            height: barHeight,
            transform: [{ scaleX: barScale }],
          },
        ]}>
        <View style={styles.glassClip}>
          <BlurView
            intensity={28}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          {/* Clear see-through glass — just a whisper of white sheen, mostly
              the blur of whatever sits behind the bar. */}
          <LinearGradient
            colors={[
              'rgba(38, 42, 52, 0.38)',
              'rgba(17, 20, 27, 0.3)',
              'rgba(5, 7, 12, 0.36)',
            ]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.bubble,
            {
              top: (barHeight - BUBBLE_HEIGHT) / 2,
              transform: [
                { translateX: bubbleX },
                { scale: bubbleScale },
              ],
            },
          ]}>
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.34)',
              'rgba(220, 224, 232, 0.23)',
              'rgba(177, 184, 196, 0.15)',
            ]}
            locations={[0, 0.6, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.row}>
          {visibleTabs.map((tab, index) => {
            const { options } = descriptors[tab.route.key];
            const focused = tab.route.key === activeKey;

            const onPress = () => {
              wake(index);
              const event = navigation.emit({
                type: 'tabPress',
                target: tab.route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                skipNextWakeRef.current = true;
                navigation.navigate(tab.route.name);
              }
            };

            return (
              <Pressable
                key={tab.route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options.title ?? tab.label}
                onPress={onPress}
                style={[styles.item, { height: barHeight }]}>
                <Animated.View style={{ transform: [{ scaleX: iconScaleX }] }}>
                  <TabIcon
                    activeIcon={tab.activeIcon}
                    fallback={tab.fallback}
                    focused={focused}
                    icon={tab.icon}
                  />
                </Animated.View>
                {tab.badge ? <View pointerEvents="none" style={styles.badge} /> : null}
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
      tabBar={(props) => <FloatingTabBar {...props} />}
      detachInactiveScreens={false}
      screenOptions={{
        animation: 'fade',
        // Keep every tab mounted so the fade never reveals an empty (black)
        // scene while a lazily-mounted screen is still rendering.
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
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 96,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Gym Shop',
          tabBarLabel: 'Shop',
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: 'Journey',
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
  barWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    position: 'relative',
    flexDirection: 'row',
    height: BAR_HEIGHT,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: BAR_PADDING,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  glassClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: 'hidden',
  },
  bubble: {
    position: 'absolute',
    top: (BAR_HEIGHT - BUBBLE_HEIGHT) / 2,
    left: 0,
    width: BUBBLE_WIDTH,
    height: BUBBLE_HEIGHT,
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.34)',
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  item: {
    flex: 1,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabFallbackIcon: {
    fontSize: 19,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: '28%',
    width: 7,
    height: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(8, 10, 15, 0.8)',
    backgroundColor: premiumColors.redBright,
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
