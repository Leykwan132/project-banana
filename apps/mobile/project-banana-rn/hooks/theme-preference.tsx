import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type PropsWithChildren,
} from 'react';
import { Platform, useColorScheme as useDeviceColorScheme, type ColorSchemeName } from 'react-native';

import { storage } from '@/lib/storage';

const THEME_PREFERENCE_KEY = 'themePreference';

type AppColorScheme = Exclude<ColorSchemeName, null>;

interface ThemePreferenceContextValue {
    colorScheme: AppColorScheme;
    hasLoadedPreference: boolean;
    setColorScheme: (nextColorScheme: AppColorScheme) => Promise<void>;
    toggleColorScheme: () => Promise<void>;
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
    const rawDeviceColorScheme = useDeviceColorScheme();
    const [hasHydrated, setHasHydrated] = useState(Platform.OS !== 'web');
    const [storedColorScheme, setStoredColorScheme] = useState<AppColorScheme | null>(null);
    const [hasLoadedPreference, setHasLoadedPreference] = useState(false);

    useEffect(() => {
        if (Platform.OS === 'web') {
            setHasHydrated(true);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadPreference = async () => {
            const storedPreference = await storage.getItem(THEME_PREFERENCE_KEY);
            const nextColorScheme = storedPreference === 'dark' || storedPreference === 'light'
                ? storedPreference
                : null;

            if (!isMounted) {
                return;
            }

            setStoredColorScheme(nextColorScheme);
            setHasLoadedPreference(true);
        };

        void loadPreference();

        return () => {
            isMounted = false;
        };
    }, []);

    const setColorScheme = useCallback(async (nextColorScheme: AppColorScheme) => {
        setStoredColorScheme(nextColorScheme);
        await storage.setItem(THEME_PREFERENCE_KEY, nextColorScheme);
    }, []);

    const deviceColorScheme = hasHydrated ? (rawDeviceColorScheme ?? 'light') : 'light';
    const colorScheme = storedColorScheme ?? deviceColorScheme;

    const toggleColorScheme = useCallback(async () => {
        const nextColorScheme = colorScheme === 'dark' ? 'light' : 'dark';
        await setColorScheme(nextColorScheme);
    }, [colorScheme, setColorScheme]);

    return (
        <ThemePreferenceContext.Provider
            value={{
                colorScheme,
                hasLoadedPreference,
                setColorScheme,
                toggleColorScheme,
            }}
        >
            {children}
        </ThemePreferenceContext.Provider>
    );
}

function useThemePreferenceContext() {
    const context = useContext(ThemePreferenceContext);

    if (!context) {
        throw new Error('useThemePreference must be used within ThemePreferenceProvider');
    }

    return context;
}

export function useThemePreference() {
    return useThemePreferenceContext();
}

export function useColorScheme() {
    return useThemePreferenceContext().colorScheme;
}
