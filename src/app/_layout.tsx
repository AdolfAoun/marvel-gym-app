import { Stack } from 'expo-router';

import { premiumColors } from '@/constants/premiumTheme';

const accentColor = premiumColors.redBright;

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerBackTitle: '',
        headerShown: false,
        headerTitle: '',
        title: '',
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="create-account" />
      <Stack.Screen name="admin" />
      <Stack.Screen
        name="(tabs)"
        options={{
          headerTitle: '',
          title: '',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerBackTitle: '',
          headerTitle: '',
          headerBackground: () => null,
          headerTransparent: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: accentColor,
          headerTitleStyle: {
            color: premiumColors.text,
            fontSize: 18,
            fontWeight: '900',
          },
          title: '',
        }}
      />
      <Stack.Screen
        name="machine-guide"
        options={{
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          headerShown: true,
          headerTitle: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: premiumColors.background },
          headerTintColor: accentColor,
          headerTitleStyle: {
            color: premiumColors.text,
            fontSize: 18,
            fontWeight: '900',
          },
          title: '',
        }}
      />
    </Stack>
  );
}
