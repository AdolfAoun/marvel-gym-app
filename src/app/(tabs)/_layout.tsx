import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { premiumColors } from '@/constants/premiumTheme';
import { avatarService, memberService } from '@/services';
import type { Member } from '@/types';

const accentColor = premiumColors.redBright;
const inactiveColor = premiumColors.textMuted;

function TabIcon({
  fallback,
  focused,
  name,
  color,
}: {
  fallback: string;
  focused?: boolean;
  name: SFSymbol;
  color: string;
}) {
  const isFocused = focused ?? (color === accentColor || color === '#FFFFFF');

  return (
    <View style={[styles.tabIconBubble, isFocused && styles.tabIconBubbleActive]}>
      {isFocused ? (
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(255, 255, 255, 0.28)',
            'rgba(255, 255, 255, 0.12)',
            'rgba(255, 255, 255, 0.05)',
          ]}
          locations={[0, 0.42, 1]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {isFocused ? <View pointerEvents="none" style={styles.tabIconReflection} /> : null}
      <SymbolView
        name={name}
        size={23}
        tintColor={color}
        weight="bold"
        fallback={<Text style={[styles.tabFallbackIcon, { color }]}>{fallback}</Text>}
      />
    </View>
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

function TabBarBackground() {
  return (
    <View style={styles.tabBarBackground}>
      <BlurView
        intensity={82}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[
          'rgba(255, 255, 255, 0.18)',
          'rgba(20, 22, 28, 0.22)',
          'rgba(3, 4, 7, 0.24)',
        ]}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.tabBarTopLight} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerBackground: () => null,
        tabBarBackground: () => <TabBarBackground />,
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
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: inactiveColor,
        tabBarShowLabel: false,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '900',
          letterSpacing: 0,
        },
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarItemStyle: {
          borderRadius: 999,
          marginHorizontal: 1,
          marginVertical: 6,
          paddingVertical: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 54,
          right: 54,
          bottom: 18,
          height: 52,
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 999,
          borderTopWidth: 1,
          backgroundColor: 'transparent',
          paddingTop: 3,
          paddingBottom: 3,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 22,
          elevation: 9,
          overflow: 'hidden',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} fallback="⌂" focused={focused} name="house.fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} fallback="◆" focused={focused} name="bag.fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: 'Journey',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon color={color} fallback="↗" focused={focused} name="figure.run" />
          ),
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          href: null,
          title: 'Help',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              color={color}
              fallback="?"
              focused={focused}
              name="questionmark.circle.fill"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 999,
  },
  tabBarTopLight: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  tabFallbackIcon: {
    fontSize: 18,
    fontWeight: '900',
  },
  tabIconBubble: {
    width: 46,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 999,
  },
  tabIconBubbleActive: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  tabIconReflection: {
    position: 'absolute',
    top: 4,
    left: 9,
    right: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  profileButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 19,
    backgroundColor: 'transparent',
    shadowColor: premiumColors.redBright,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 0,
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
    color: accentColor,
    fontSize: 15,
    fontWeight: '900',
  },
});
