import { Tabs, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { premiumColors } from '@/constants/premiumTheme';

const accentColor = premiumColors.redBright;
const inactiveColor = premiumColors.textMuted;

function TabIcon({
  fallback,
  name,
  color,
}: {
  fallback: string;
  name: SFSymbol;
  color: string;
}) {
  return (
    <SymbolView
      name={name}
      size={22}
      tintColor={color}
      weight="bold"
      fallback={<Text style={[styles.tabFallbackIcon, { color }]}>{fallback}</Text>}
    />
  );
}

function ProfileHeaderButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel="Open profile"
      hitSlop={10}
      onPress={() => router.push('/profile')}
      style={({ pressed }) => [
        styles.profileButton,
        pressed && styles.profileButtonPressed,
      ]}>
      <Text style={styles.profileButtonText}>P</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
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
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 0,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 12,
          height: 64,
          borderColor: premiumColors.border,
          borderRadius: 24,
          borderTopWidth: 1,
          backgroundColor: 'rgba(8, 10, 15, 0.94)',
          paddingTop: 6,
          paddingBottom: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.06,
          shadowRadius: 18,
          elevation: 8,
          overflow: 'hidden',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} fallback="⌂" name="house.fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: 'Classes',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} fallback="C" name="figure.strengthtraining.traditional" />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Gym Shop',
          tabBarLabel: 'Shop',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} fallback="◆" name="bag.fill" />
          ),
        }}
      />
      <Tabs.Screen
        name="journey"
        options={{
          title: 'Journey',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} fallback="↗" name="figure.run" />
          ),
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          href: null,
          title: 'Help',
          tabBarIcon: ({ color }) => (
            <TabIcon color={color} fallback="?" name="questionmark.circle.fill" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabFallbackIcon: {
    fontSize: 18,
    fontWeight: '900',
  },
  profileButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: premiumColors.borderStrong,
    borderRadius: 19,
    backgroundColor: premiumColors.surface,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
