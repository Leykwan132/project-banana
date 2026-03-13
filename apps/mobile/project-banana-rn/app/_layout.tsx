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
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { ThemePreferenceProvider, useColorScheme } from '@/hooks/use-color-scheme';
import {
  ConvexReactClient,
  useMutation,
} from "convex/react";
import { PostHogProvider } from 'posthog-react-native'
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "@/lib/auth-client"
import Toast from 'react-native-toast-message';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';
import * as Notifications from 'expo-notifications';
import { extractNotificationPayload, navigateFromNotification } from '@/lib/notificationRedirect';
import { api } from '../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../packages/backend/convex/_generated/dataModel';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL as string, {
  // Optionally pause queries until the user is authenticated
  expectAuth: true,
  unsavedChangesWarning: false,
});

function NotificationResponseHandler() {
  const router = useRouter();
  const markNotificationAsRead = useMutation(api.notifications.markAsRead);
  const handledNotificationId = useRef<string | null>(null);

  useEffect(() => {
    const handleNotificationResponse = async (response: Notifications.NotificationResponse | null) => {
      if (!response) {
        return;
      }

      const identifier = response.notification.request.identifier;
      if (handledNotificationId.current === identifier) {
        return;
      }

      handledNotificationId.current = identifier;

      const payload = extractNotificationPayload(response);
      if (payload?.notificationId) {
        try {
          await markNotificationAsRead({ notificationId: payload.notificationId as Id<"notifications"> });
        } catch (error) {
          console.error('Failed to mark notification as read before navigation:', error);
        }
      }

      navigateFromNotification(router, response);
      await Notifications.clearLastNotificationResponseAsync();
    };

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      void handleNotificationResponse(response);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleNotificationResponse(response);
    });

    return () => {
      responseListener.remove();
    };
  }, [markNotificationAsRead, router]);

  return null;
}

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
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
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <PostHogProvider
      apiKey="phc_Eg1WmAo9rYJfbI3V46iDdWyC6setYTdu6aj8fJmkp6F"
      options={{
        host: "https://us.i.posthog.com",
      }}
      autocapture
    >
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <GestureHandlerRootView>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <GlobalErrorBoundary>
              <NotificationResponseHandler />
              <Stack initialRouteName="welcome">
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="welcome" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            </GlobalErrorBoundary>
          </ThemeProvider>
          <Toast />
        </GestureHandlerRootView>
      </ConvexBetterAuthProvider>
    </PostHogProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <RootLayoutContent />
    </ThemePreferenceProvider>
  );
}
