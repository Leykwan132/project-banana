import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, ChevronRight, Shield, FileText } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SettingsOption {
    id: string;
    title: string;
    icon: React.ReactNode;
    onPress: () => void;
}

export default function SettingsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const handlePrivacyPress = () => {
        // Could navigate to a privacy page or open a URL
        Linking.openURL('https://example.com/privacy');
    };

    const handleTermsPress = () => {
        // Could navigate to a terms page or open a URL
        Linking.openURL('https://example.com/terms');
    };

    const settingsOptions: SettingsOption[] = [
        {
            id: 'privacy',
            title: 'Privacy',
            icon: <Shield size={24} color={theme.text} />,
            onPress: handlePrivacyPress,
        },
        {
            id: 'terms',
            title: 'Terms and Conditions',
            icon: <FileText size={24} color={theme.text} />,
            onPress: handleTermsPress,
        },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={theme.text} />
                </Pressable>
                <ThemedText type="title" style={styles.headerTitle}>
                    Settings
                </ThemedText>
                <View style={styles.placeholder} />
            </View>

            {/* Settings Options */}
            <View style={styles.content}>
                {settingsOptions.map((option, index) => (
                    <View key={option.id}>
                        <Pressable
                            style={styles.optionRow}
                            onPress={option.onPress}
                        >
                            <View style={styles.iconContainer}>
                                {option.icon}
                            </View>
                            <ThemedText style={styles.optionLabel}>{option.title}</ThemedText>
                            <ChevronRight size={20} color="#999" />
                        </Pressable>
                        {index < settingsOptions.length - 1 && (
                            <View style={styles.divider} />
                        )}
                    </View>
                ))}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'GoogleSans_700Bold',
    },
    placeholder: {
        width: 40,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    iconContainer: {
        width: 40,
        alignItems: 'center',
        marginRight: 16,
    },
    optionLabel: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'GoogleSans_400Regular',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginLeft: 56,
    },
});
