import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

// Brand accent is identical in both themes.
const accentColor = '#E11D2E';

function BackHeaderButton() {
  const router = useRouter();
  const theme = useAppTheme();

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
      <Text style={[styles.backArrow, { color: theme.colors.text }]}>‹</Text>
    </Pressable>
  );
}

export default function RootLayout() {
  const theme = useAppTheme();

  // Navigation theme follows the device scheme so the navigator container,
  // cards, and scene backgrounds match the app — never a white flash in dark
  // mode, never a dark flash in light mode.
  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const marvelNavTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.redBright,
      background: theme.colors.background,
      card: theme.colors.background,
      text: theme.colors.text,
      border: 'transparent',
      notification: theme.colors.redBright,
    },
  };

  return (
    <ThemeProvider value={marvelNavTheme}>
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerBackTitle: '',
        headerShown: false,
        headerTitle: '',
        title: '',
        contentStyle: { backgroundColor: theme.colors.background },
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
        name="payment-vouchers"
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
            color: theme.colors.text,
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
            color: theme.colors.text,
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
            color: theme.colors.text,
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
    backgroundColor: 'transparent',
    marginLeft: 12,
  },
  backButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    includeFontPadding: false,
    lineHeight: 42,
    textAlign: 'center',
    textAlignVertical: 'center',
    width: 42,
    marginLeft:-13,
  },
});
