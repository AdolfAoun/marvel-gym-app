import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';

import { premiumColors } from '@/constants/premiumTheme';

const accentColor = premiumColors.redBright;

// Dark navigation theme so the navigator container, cards, and scene
// backgrounds are always the Marvel Gym charcoal — never white during a load
// or a screen transition.
const marvelNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: premiumColors.redBright,
    background: premiumColors.background,
    card: premiumColors.background,
    text: premiumColors.text,
    border: 'transparent',
    notification: premiumColors.redBright,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={marvelNavTheme}>
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerBackTitle: '',
        headerShown: false,
        headerTitle: '',
        title: '',
        contentStyle: { backgroundColor: premiumColors.background },
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
        name="how-to-use"
        options={{
          headerBackTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          headerShown: true,
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
    </Stack>
    </ThemeProvider>
  );
}
