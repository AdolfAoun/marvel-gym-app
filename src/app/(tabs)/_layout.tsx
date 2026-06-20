import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { premiumColors } from '@/constants/premiumTheme';
import { avatarService, memberService } from '@/services';
import type { Member } from '@/types';

const accentColor = premiumColors.redBright;
const inactiveColor = premiumColors.textMuted;

const ITEM_WIDTH = 58;
const BAR_PADDING = 8;
const BUBBLE_WIDTH = 46;
const BUBBLE_HEIGHT = 42;

function TabIcon({
  fallback,
  focused,
  name,
}: {
  fallback: string;
  focused: boolean;
  name: SFSymbol;
}) {
  const color = focused ? '#FFFFFF' : inactiveColor;

  return (
    <SymbolView
      name={name}
      size={24}
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

/**
 * Compact, centered, floating liquid-glass tab bar. A subtle bubble sits behind
 * the selected icon and glides smoothly between tabs; the whole bar gently
 * grows then settles back on each switch for a soft, premium response.
 */
function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((route) => {
    const href = (descriptors[route.key].options as { href?: unknown }).href;

    return href !== null && route.name !== 'help';
  });
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(
    0,
    visibleRoutes.findIndex((route) => route.key === activeKey),
  );

  const translateX = useRef(new Animated.Value(activeIndex * ITEM_WIDTH)).current;
  // 0 = idle (compact), 1 = expanded. Grows on a tab switch then settles back.
  const expand = useRef(new Animated.Value(0)).current;
  const shrinkTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: activeIndex * ITEM_WIDTH,
      useNativeDriver: true,
      friction: 9,
      tension: 90,
    }).start();

    if (shrinkTimer.current) {
      clearTimeout(shrinkTimer.current);
    }

    Animated.spring(expand, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 130,
    }).start();

    shrinkTimer.current = setTimeout(() => {
      Animated.spring(expand, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 60,
      }).start();
    }, 1100);

    return () => {
      if (shrinkTimer.current) {
        clearTimeout(shrinkTimer.current);
      }
    };
  }, [activeIndex, expand, translateX]);

  const scale = expand.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  return (
    <View
      pointerEvents="box-none"
      style={[styles.barWrap, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <Animated.View style={[styles.bar, { transform: [{ scale }] }]}>
        <View style={styles.glassClip}>
          <BlurView
            intensity={38}
            tint="light"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          {/* Clear see-through glass — just a whisper of white sheen, mostly
              the blur of whatever sits behind the bar. */}
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.1)',
              'rgba(255, 255, 255, 0.02)',
              'rgba(255, 255, 255, 0)',
            ]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.barTopLight} />
        </View>

        <Animated.View
          pointerEvents="none"
          style={[styles.bubble, { transform: [{ translateX }] }]}>
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.32)',
              'rgba(225, 29, 46, 0.3)',
              'rgba(177, 18, 38, 0.2)',
            ]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={styles.row}>
          {visibleRoutes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = index === activeIndex;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={options.title}
                onPress={onPress}
                style={styles.item}>
                {options.tabBarIcon?.({
                  focused,
                  color: focused ? '#FFFFFF' : inactiveColor,
                  size: 24,
                })}
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
          tabBarIcon: ({ focused }) => (
            <TabIcon fallback="⌂" focused={focused} name="house" />
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              fallback="C"
              focused={focused}
              name="figure.strengthtraining.traditional"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Gym Shop',
          tabBarLabel: 'Shop',
          tabBarIcon: ({ focused }) => (
            <TabIcon fallback="◇" focused={focused} name="bag" />
          ),
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: 'Journey',
          tabBarIcon: ({ focused }) => (
            <TabIcon fallback="↗" focused={focused} name="figure.run" />
          ),
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          href: null,
          title: 'Help',
          tabBarIcon: ({ focused }) => (
            <TabIcon fallback="?" focused={focused} name="questionmark.circle" />
          ),
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
    height: 60,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: BAR_PADDING,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 12,
  },
  glassClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barTopLight: {
    position: 'absolute',
    top: 0,
    left: 22,
    right: 22,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  bubble: {
    position: 'absolute',
    top: (60 - BUBBLE_HEIGHT) / 2,
    left: BAR_PADDING + (ITEM_WIDTH - BUBBLE_WIDTH) / 2,
    width: BUBBLE_WIDTH,
    height: BUBBLE_HEIGHT,
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.34)',
    shadowColor: accentColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
  },
  item: {
    width: ITEM_WIDTH,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabFallbackIcon: {
    fontSize: 19,
    fontWeight: '800',
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
