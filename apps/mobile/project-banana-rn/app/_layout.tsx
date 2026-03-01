import {
  GoogleSans_400Regular,
  GoogleSans_400Regular_Italic,
  GoogleSans_500Medium,
  GoogleSans_500Medium_Italic,
  GoogleSans_600SemiBold,
  GoogleSans_600SemiBold_Italic,
  GoogleSans_700Bold,
  GoogleSans_700Bold_Italic,
  useFonts,
} from '@expo-google-fonts/google-sans';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';;
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ConvexReactClient,
} from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "@/lib/auth-client"
import Toast from 'react-native-toast-message';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL as string, {
  // Optionally pause queries until the user is authenticated
  expectAuth: true,
  unsavedChangesWarning: false,
});
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [loaded] = useFonts({
    GoogleSans_400Regular,
    GoogleSans_400Regular_Italic,
    GoogleSans_500Medium,
    GoogleSans_500Medium_Italic,
    GoogleSans_600SemiBold,
    GoogleSans_600SemiBold_Italic,
    GoogleSans_700Bold,
    GoogleSans_700Bold_Italic,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // useEffect(() => {
  //   if (!loaded || isSessionPending) return;

  //   const isOnOnboarding = segments[0] === "welcome";

  //   if (!session && !isOnOnboarding) {
  //     router.replace("/welcome");
  //     return;
  //   }

  //   if (session && isOnOnboarding) {
  //     router.replace("/(tabs)");
  //   }
  // }, [loaded, isSessionPending, segments, session, router]);

  // if (!loaded) {
  //   return null;
  // }

  return (

    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <GestureHandlerRootView>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <GlobalErrorBoundary>
            <Stack initialRouteName="welcome">
              <Stack.Screen name="welcome" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </GlobalErrorBoundary>
        </ThemeProvider>
        <Toast />
      </GestureHandlerRootView>
    </ConvexBetterAuthProvider>

  );
}
