import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { premiumColors } from '@/constants/premiumTheme';

const accentColor = premiumColors.redBright;

function BackHeaderButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityLabel="Go back"
      hitSlop={12}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace('/(tabs)');
      }}
      style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}>
      <Text style={styles.backArrow}>‹</Text>
    </Pressable>
  );
}

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
        name="shop-orders"
        options={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerBackTitle: '',
          headerBackVisible: false,
          headerLeft: () => <BackHeaderButton />,
          headerTitle: '',
          headerBackground: () => null,
          headerTransparent: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: accentColor,
          title: '',
        }}
      />
      <Stack.Screen
        name="class-bookings"
        options={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerBackTitle: '',
          headerBackVisible: false,
          headerLeft: () => <BackHeaderButton />,
          headerTitle: '',
          headerBackground: () => null,
          headerTransparent: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: accentColor,
          title: '',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerBackTitle: '',
          headerBackVisible: false,
          headerLeft: () => <BackHeaderButton />,
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
          headerBackVisible: false,
          headerLeft: () => <BackHeaderButton />,
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
          headerBackVisible: false,
          headerLeft: () => <BackHeaderButton />,
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

const styles = StyleSheet.create({
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 21,
    // Transparent inside the bubble — only the thin ring remains, no dark disc.
    backgroundColor: 'transparent',
    marginLeft: 12,
  },
  backButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '600',
    lineHeight: 36,
    marginTop: -2,
  },
});
