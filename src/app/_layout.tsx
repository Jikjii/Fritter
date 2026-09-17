import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { analytics } from '@/services/analytics';
import { fetchRemoteCatalog } from '@/services/catalog';
import { purchases } from '@/services/purchases';
import { useAppStore } from '@/store/use-app-store';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const scheme = useColorScheme();
  const hydrated = useAppStore((s) => s.hydrated);
  const setPro = useAppStore((s) => s.setPro);
  const setCatalog = useAppStore((s) => s.setCatalog);

  useEffect(() => {
    analytics.init().catch(() => undefined);
    purchases
      .configure()
      .then(() => purchases.isPro())
      .then((pro) => {
        if (pro) setPro(true);
      })
      .catch(() => undefined);
    fetchRemoteCatalog()
      .then((remote) => {
        if (remote) setCatalog(remote, new Date());
      })
      .catch(() => undefined);
  }, [setPro, setCatalog]);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => undefined);
  }, [hydrated]);

  const palette = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  if (!hydrated) return null;

  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: {
          ...navTheme.colors,
          primary: palette.primary,
          background: palette.background,
          card: palette.background,
          text: palette.text,
          border: palette.border,
        },
      }}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', gestureEnabled: false }} />
        <Stack.Screen name="opportunity/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="claim/[id]" options={{ headerShown: true, title: 'Prepare claim' }} />
        <Stack.Screen name="form/[id]" options={{ headerShown: true, title: 'Your form' }} />
      </Stack>
    </ThemeProvider>
  );
}
