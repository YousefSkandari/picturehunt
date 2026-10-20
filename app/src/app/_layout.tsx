import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { DMSans_500Medium, DMSans_700Bold, useFonts } from '@expo-google-fonts/dm-sans';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SessionProvider, useSession } from '@/lib/session';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.ground, card: colors.ground, primary: colors.gold, text: colors.text },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BricolageGrotesque_800ExtraBold, DMSans_500Medium, DMSans_700Bold });

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <SessionProvider>{fontsLoaded && <Routes />}</SessionProvider>
    </ThemeProvider>
  );
}

function Routes() {
  const { loading, session, profile } = useSession();
  const signedIn = !!session;
  // Onboarding ends when the contestant has picked a stage name.
  const onboarded = signedIn && !!profile?.stage_name;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom', contentStyle: { backgroundColor: colors.ground } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="permissions" />
        <Stack.Screen name="contestant" />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="activity/[id]/index" />
        <Stack.Screen name="activity/[id]/proof" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
      </Stack.Protected>
    </Stack>
  );
}
