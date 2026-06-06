import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const accentColor = '#E11D2E';

function TabIcon({ label, color }: { label: string; color: string }) {
  return (
    <Text
      style={{
        color,
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0,
      }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accentColor,
        tabBarInactiveTintColor: '#8B95A5',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 0,
        },
        tabBarStyle: {
          height: 72,
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          borderTopWidth: 1,
          backgroundColor: '#080809',
          paddingTop: 8,
          paddingBottom: 10,
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
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon color={color} label="P" />,
        }}
      />
    </Tabs>
  );
}
