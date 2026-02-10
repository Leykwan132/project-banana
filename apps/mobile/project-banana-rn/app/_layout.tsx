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
import { Redirect, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';;
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Providers } from '../lib/AuthProvider';
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
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

  if (!loaded) {
    return null;
  }

  return (
    <Providers>
      <GestureHandlerRootView>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack initialRouteName="onboarding">
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </GestureHandlerRootView>
    </Providers>
  );
}
