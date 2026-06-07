import { Stack } from 'expo-router';

import { premiumColors } from '@/constants/premiumTheme';

const accentColor = premiumColors.redBright;

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="create-account" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: premiumColors.background },
          headerTintColor: accentColor,
          headerTitleStyle: {
            color: premiumColors.text,
            fontSize: 18,
            fontWeight: '900',
          },
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name="machine-guide"
        options={{
          headerBackTitle: '',
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: premiumColors.background },
          headerTintColor: accentColor,
          headerTitleStyle: {
            color: premiumColors.text,
            fontSize: 18,
            fontWeight: '900',
          },
          title: 'Machine Guide',
        }}
      />
    </Stack>
  );
}
