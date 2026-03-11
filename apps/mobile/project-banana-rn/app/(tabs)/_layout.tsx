import { Tabs } from 'expo-router';
import { ChartSpline, Grip, House } from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const screenBackgroundColor = isDark ? theme.screenBackground : '#F4F3EE';
  const tabBarBackgroundColor = isDark ? '#111111' : '#F7F4ED';
  const tabBarBorderColor = isDark ? '#222222' : '#E7E2D8';

  return (
    <Tabs
      screenOptions={{
        sceneStyle: {
          backgroundColor: screenBackgroundColor,
        },
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.icon,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: tabBarBackgroundColor,
          borderTopWidth: 1,
          borderTopColor: tabBarBorderColor,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.03,
          shadowRadius: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <House size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="posts"
        options={{
          title: 'Posts',
          tabBarIcon: ({ color }) => (
            <ExpoImage
              source={require('@/assets/images/icon-dark.svg')}
              style={{ width: 24, height: 24, tintColor: color }}
              contentFit="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <ChartSpline size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="withdraw"
        options={{
          title: 'Withdraw',
          tabBarIcon: ({ color }) => <Grip size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
