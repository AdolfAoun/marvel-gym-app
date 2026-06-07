import { Stack } from 'expo-router';

const accentColor = '#B11226';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#FFF8F7' },
          headerTintColor: accentColor,
          headerTitleStyle: {
            color: '#181A20',
            fontSize: 18,
            fontWeight: '900',
          },
          title: 'Profile',
        }}
      />
    </Stack>
  );
}
