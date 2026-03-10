/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#000';
const tintColorDark = '#ECEDEE';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    screenBackground: '#FFFFFF',
    navBackground: '#FFFFFF',
    primaryButton: '#FC4C02',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    labelBackground: '#000000',
  },
  dark: {
    text: '#ECEDEE',
    background: '#000000',
    screenBackground: '#0D0D0D',
    navBackground: '#1A1A1A',
    primaryButton: '#FC4C02',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    labelBackground: '#1A1A1A',
  },
};

export const Fonts = {
  sans: 'GoogleSans_400Regular',
  serif: 'GoogleSans_400Regular',
  rounded: 'GoogleSans_400Regular',
  mono: 'GoogleSans_400Regular',
};
