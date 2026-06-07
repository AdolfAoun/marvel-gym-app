import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

const accentColor = '#B11226';
const inactiveColor = '#8E6670';

function TabIcon({ label, color }: { label: string; color: string }) {
  return (
    <Text
      style={{
        color,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0,
      }}>
      {label}
    </Text>
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
        headerRight: () => <ProfileHeaderButton />,
        headerRightContainerStyle: {
          paddingRight: 20,
        },
        headerShadowVisible: false,
        headerShown: true,
        headerStyle: {
          backgroundColor: '#FFF8F7',
        },
        headerTintColor: accentColor,
        headerTitleAlign: 'left',
        headerTitleStyle: {
          color: '#181A20',
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
          height: 72,
          borderTopColor: 'rgba(177, 18, 38, 0.12)',
          borderTopWidth: 1,
          backgroundColor: '#FFFFFF',
          paddingTop: 8,
          paddingBottom: 10,
          shadowColor: '#1D0A0D',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.06,
          shadowRadius: 18,
          elevation: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon color={color} label="H" />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <TabIcon color={color} label="S" />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <TabIcon color={color} label="A" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(177, 18, 38, 0.26)',
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1D0A0D',
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
