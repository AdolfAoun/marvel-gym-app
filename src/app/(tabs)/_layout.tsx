import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';

import { premiumColors } from '@/constants/premiumTheme';
import { avatarService, memberService } from '@/services';
import type { Member } from '@/types';

const accentColor = premiumColors.redBright;
const inactiveColor = premiumColors.textMuted;

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

export default function TabsLayout() {
  return (
    <Tabs
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
              activeIcon="dumbbell.fill"
              fallback="C"
              focused={focused}
              icon="figure.strengthtraining.traditional"
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
              activeIcon="chart.line.uptrend.xyaxis.circle.fill"
              fallback="J"
              focused={focused}
              icon="chart.line.uptrend.xyaxis"
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: '#101216',
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
